const isProd = () => process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const baseFlags = () => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: isProd() ? 'none' : 'lax',
});

const REFRESH_MAX_AGE = 24 * 60 * 60 * 1000; // Asgardeo refresh tokens don't carry an expires_in; use a sane cap.

// Stores the Asgardeo-issued tokens themselves (never a locally re-signed
// token) — accessToken is what `authenticate` middleware verifies against
// the IdP's JWKS on every request; idToken is kept only as the
// `id_token_hint` RP-initiated logout requires.
const setAuthCookies = (res, tokens) => {
  const flags = baseFlags();

  res.cookie('accessToken', tokens.access_token, {
    ...flags,
    maxAge: (tokens.expires_in ? tokens.expires_in * 1000 : 15 * 60 * 1000),
  });

  if (tokens.refresh_token) {
    res.cookie('refreshToken', tokens.refresh_token, { ...flags, maxAge: REFRESH_MAX_AGE });
  }

  if (tokens.id_token) {
    res.cookie('idToken', tokens.id_token, { ...flags, maxAge: REFRESH_MAX_AGE });
  }
};

const clearAuthCookies = (res) => {
  const flags = baseFlags();
  res.clearCookie('accessToken', flags);
  res.clearCookie('refreshToken', flags);
  res.clearCookie('idToken', flags);
};

module.exports = { setAuthCookies, clearAuthCookies };
