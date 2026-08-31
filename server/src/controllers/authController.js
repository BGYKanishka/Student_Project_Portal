const pool = require('../config/db');
const emitter = require('../events/eventEmitter');
const { getClient, getOidcConfig } = require('../config/oidc');
const { setAuthCookies, clearAuthCookies } = require('../utils/cookies');
const { csrfTokenFor } = require('../middleware/csrf');

const redirectToError = (res, message) =>
  res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(message)}`);

// ── Derive a username when Asgardeo doesn't release preferred_username ──────
const slugifyLocalPart = (email) =>
  email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80) || 'user';

const generateUniqueUsername = async (base) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt}`;
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [candidate]);
    if (!existing.rows.length) return candidate;
  }
  return `${base}${Date.now()}`;
};

// ── Initiate OIDC login (Authorization Code + PKCE) ──────────────────────────
const initiateLogin = async (req, res) => {
  try {
    const { role } = req.query;
    const client = await getClient();
    const config = await getOidcConfig();

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();
    const nonce = client.randomNonce();

    // Stashed in the existing short-lived (10 min) OAuth-flow session — never
    // used for authenticated API requests, only this redirect round-trip.
    req.session.oidc = { codeVerifier, state, nonce, role };

    const url = client.buildAuthorizationUrl(config, {
      redirect_uri: process.env.OIDC_REDIRECT_URI,
      scope: process.env.OIDC_SCOPES || 'openid profile email offline_access',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    });

    res.redirect(url.href);
  } catch (err) {
    console.error('[initiateLogin]', err.message);
    redirectToError(res, 'Unable to start login. Please try again.');
  }
};

// ── OIDC callback: exchange code, validate tokens, provision/log in user ────
const handleCallback = async (req, res) => {
  const stored = req.session.oidc;
  if (!stored) {
    return redirectToError(res, 'Login session expired. Please try again.');
  }
  delete req.session.oidc;

  const { role: state, codeVerifier, state: expectedState, nonce: expectedNonce } = stored;

  try {
    const client = await getClient();
    const config = await getOidcConfig();

    const currentUrl = new URL(req.originalUrl, `${req.protocol}://${req.get('host')}`);
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState,
      expectedNonce,
    });

    let claims = tokens.claims();
    const sub = claims.sub;

    // Some IdPs (Asgardeo among them, depending on configuration) only
    // expose the full attribute set via the UserInfo endpoint rather than
    // embedding everything in the ID token — fall back to it whenever a
    // claim we need is missing, rather than requiring exact console
    // configuration to get this right.
    if (!claims.email || !claims.name) {
      try {
        const userInfo = await client.fetchUserInfo(config, tokens.access_token, sub);
        claims = { ...userInfo, ...claims };
      } catch (userInfoErr) {
        console.error('[handleCallback] fetchUserInfo failed:', userInfoErr.message);
      }
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // This Asgardeo org doesn't release an `email` claim at all (confirmed:
    // neither the ID token nor UserInfo include one), but self-registered
    // accounts use the email address as their username — so if `username`
    // itself looks like an email, treat it as one rather than failing.
    const email = claims.email || (EMAIL_RE.test(claims.username || '') ? claims.username : null);
    const name = claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ') || email;
    const profilePic = claims.picture || null;
    const preferredUsername = claims.preferred_username || claims.username || null;

    if (!email) {
      return redirectToError(res, 'Your identity provider did not return an email address. Check that the "email" claim is enabled under your Asgardeo application\'s User Attributes settings, and that your account has an email address set.');
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE oidc_sub = $1 OR (email = $2 AND oidc_sub IS NULL)',
      [sub, email]
    );

    let user;

    if (result.rows.length > 0) {
      const existing = result.rows[0];

      if (state === 'admin' && existing.role !== 'admin') {
        return redirectToError(res, 'This account is not registered as an admin.');
      }
      if (existing.role === 'admin' && state !== 'admin') {
        return redirectToError(res, 'Admins must log in through the admin portal.');
      }
      if (existing.is_blocked) {
        return redirectToError(res, 'Your account has been suspended.');
      }

      if (!existing.oidc_sub) {
        // Link this pre-provisioned/legacy row to the verified IdP identity.
        const updated = await pool.query(
          'UPDATE users SET oidc_sub = $1, profile_pic = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
          [sub, profilePic, existing.id]
        );
        user = updated.rows[0];
      } else {
        const updated = await pool.query(
          'UPDATE users SET profile_pic = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [profilePic, existing.id]
        );
        user = updated.rows[0];
      }
    } else {
      if (state === 'admin') {
        return redirectToError(res, 'No admin account found for this identity. Contact a super-admin.');
      }
      if (state === 'login') {
        return redirectToError(res, 'No account found. Please sign in as a student or recruiter first.');
      }

      const role = state === 'student' ? 'student' : 'recruiter';
      // preferredUsername may itself be an email (this Asgardeo org uses
      // email-as-username for self-registered accounts) — slugify by its
      // local-part in that case rather than naively stripping the `@`.
      const usernameBase = preferredUsername && preferredUsername.includes('@')
        ? slugifyLocalPart(preferredUsername)
        : (preferredUsername ? preferredUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '') : slugifyLocalPart(email));
      const username = await generateUniqueUsername(usernameBase);

      const insertResult = await pool.query(
        `INSERT INTO users (oidc_sub, name, email, profile_pic, role, username)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [sub, name, email, profilePic, role, username]
      );

      user = insertResult.rows[0];
      emitter.emit('UserRegistered', user);
    }

    setAuthCookies(res, tokens);

    if (user.role === 'student' && !user.student_id) {
      return res.redirect(`${process.env.CLIENT_URL}/complete-profile`);
    }
    if (user.role === 'recruiter' && !user.organization) {
      return res.redirect(`${process.env.CLIENT_URL}/complete-profile`);
    }
    if (user.role === 'admin') {
      return res.redirect(`${process.env.CLIENT_URL}/admin/dashboard`);
    }
    if (user.role === 'recruiter') {
      return res.redirect(`${process.env.CLIENT_URL}/projects`);
    }
    return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  } catch (err) {
    console.error('[handleCallback]', err.message);
    if (state === 'admin') {
      return res.redirect(`${process.env.CLIENT_URL}/admin/auth?error=${encodeURIComponent('Authentication failed.')}`);
    }
    return redirectToError(res, 'Authentication failed.');
  }
};

// ── Refresh ───────────────────────────────────────────────────────────────
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token provided.' });
    }

    const client = await getClient();
    const config = await getOidcConfig();
    const tokens = await client.refreshTokenGrant(config, refreshToken);

    setAuthCookies(res, tokens);
    res.json({ success: true, message: 'Token refreshed.', csrfToken: csrfTokenFor(tokens.access_token) });
  } catch (err) {
    clearAuthCookies(res);
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
};

// ── RP-initiated logout ──────────────────────────────────────────────────────
// Must be a full browser navigation (linked from the client via
// window.location, not called via axios) so the browser follows the
// redirect chain through Asgardeo, which needs to clear its own session.
const logout = async (req, res) => {
  const idToken = req.cookies?.idToken;
  clearAuthCookies(res);

  if (!idToken) {
    return res.redirect(`${process.env.OIDC_POST_LOGOUT_REDIRECT_URI || process.env.CLIENT_URL}`);
  }

  try {
    const client = await getClient();
    const config = await getOidcConfig();
    const url = client.buildEndSessionUrl(config, {
      id_token_hint: idToken,
      post_logout_redirect_uri: process.env.OIDC_POST_LOGOUT_REDIRECT_URI,
    });
    res.redirect(url.href);
  } catch (err) {
    console.error('[logout]', err.message);
    res.redirect(`${process.env.OIDC_POST_LOGOUT_REDIRECT_URI || process.env.CLIENT_URL}`);
  }
};

// ── Get current user ─────────────────────────────────────────────────────────
const getMe = (req, res) => {
  const { id, username, name, email, profile_pic, role, student_id, contact_number, organization } = req.user;
  res.json({
    success: true,
    user: { id, username, name, email, profile_pic, role, student_id, contact_number, organization },
    csrfToken: csrfTokenFor(req.cookies.accessToken),
  });
};

// ── Complete profile (student_id / organization / contact_number) ───────────
const completeProfile = async (req, res) => {
  const { student_id, organization, contact_number } = req.body;

  try {
    if (req.user.role === 'student') {
      const needsStudentId = !req.user.student_id;
      if (needsStudentId) {
        if (!student_id) {
          return res.status(422).json({ success: false, message: 'Student ID is required.' });
        }
        const sid = student_id.trim().toUpperCase();
        if (!/^[A-Za-z0-9/\-]{3,20}$/.test(sid)) {
          return res.status(422).json({ success: false, message: 'Invalid student ID format.' });
        }
        const existing = await pool.query(
          'SELECT id FROM users WHERE student_id = $1 AND id != $2',
          [sid, req.user.id]
        );
        if (existing.rows.length) {
          return res.status(409).json({ success: false, message: 'Student ID already in use.' });
        }
        await pool.query('UPDATE users SET student_id = $1, updated_at = NOW() WHERE id = $2', [sid, req.user.id]);
      }
    }

    if (req.user.role === 'recruiter') {
      const needsOrganization = !req.user.organization;
      if (needsOrganization && !organization) {
        return res.status(422).json({ success: false, message: 'Organization/Business name is required.' });
      }
      if (organization) {
        await pool.query('UPDATE users SET organization = $1, updated_at = NOW() WHERE id = $2', [organization, req.user.id]);
      }
    }

    if (contact_number) {
      await pool.query('UPDATE users SET contact_number = $1, updated_at = NOW() WHERE id = $2', [contact_number, req.user.id]);
    }

    res.json({ success: true, message: 'Profile completed.' });
  } catch (err) {
    console.error('[completeProfile]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  initiateLogin,
  handleCallback,
  refresh,
  logout,
  getMe,
  completeProfile,
};
