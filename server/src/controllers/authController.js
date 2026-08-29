const pool = require('../config/db');
const emitter = require('../events/eventEmitter');

// ── Get current user ─────────────────────────────────────────────────────────
const getMe = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }
  const { id, name, email, profile_pic, role, student_id } = req.user;
  res.json({ success: true, user: { id, name, email, profile_pic, role, student_id } });
};

// ── Sync User from Asgardeo ──────────────────────────────────────────────────
const syncUser = async (req, res) => {
  // `req.auth` comes from `checkJwt`
  if (!req.auth) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  const asgardeoId = req.auth.sub;
  const email = req.auth.email || '';
  const firstName = req.auth.given_name || '';
  const lastName = req.auth.family_name || '';
  const name = `${firstName} ${lastName}`.trim() || 'Unknown User';
  const profilePic = req.auth.picture || null;

  try {
    // 1. Check if user exists by asgardeo_id
    let result = await pool.query('SELECT * FROM users WHERE asgardeo_id = $1', [asgardeoId]);

    // 2. Fallback: check if user exists by email (legacy users)
    if (result.rows.length === 0 && email) {
      result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      
      if (result.rows.length > 0) {
        const user = result.rows[0];

        if (user.is_blocked) {
          return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
        }

        // Link existing account to Asgardeo
        await pool.query(
          'UPDATE users SET asgardeo_id = $1, profile_pic = COALESCE(profile_pic, $2), updated_at = NOW() WHERE email = $3',
          [asgardeoId, profilePic, email]
        );
        
        // If it's an admin, just return them
        if (user.role === 'admin') {
          return res.json({ success: true, isNew: false, user: { ...user, asgardeo_id: asgardeoId } });
        }
        
        // Normal user logic
        if (!user.student_id && user.role === 'student') {
           return res.json({ success: true, isNew: true, requireProfile: true });
        }
        
        return res.json({ success: true, isNew: false, user: { ...user, asgardeo_id: asgardeoId } });
      }
    }

    // 3. New User - We need them to complete their profile (choose role)
    if (result.rows.length === 0) {
      // We don't insert into DB yet, we tell the frontend to prompt for profile info
      return res.json({ success: true, isNew: true, requireProfile: true });
    }

    // User exists and is linked
    const user = result.rows[0];
    if (user.is_blocked) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
    }

    // Update profile pic if it changed in Asgardeo
    if (profilePic && user.profile_pic !== profilePic) {
      await pool.query('UPDATE users SET profile_pic = $1 WHERE id = $2', [profilePic, user.id]);
      user.profile_pic = profilePic;
    }

    res.json({ success: true, isNew: false, user });
  } catch (err) {
    console.error('[syncUser]', err);
    res.status(500).json({ success: false, message: 'Server error during sync.' });
  }
};

// ── Complete Profile (New Users) ─────────────────────────────────────────────
const completeProfile = async (req, res) => {
  // `req.auth` is the Asgardeo token payload
  if (!req.auth) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  const { role, student_id } = req.body;
  const asgardeoId = req.auth.sub;
  const email = req.auth.email || '';
  const firstName = req.auth.given_name || '';
  const lastName = req.auth.family_name || '';
  const name = `${firstName} ${lastName}`.trim() || 'Unknown User';
  const profilePic = req.auth.picture || null;

  try {
    // Double check they don't already exist
    const existing = await pool.query('SELECT id FROM users WHERE asgardeo_id = $1', [asgardeoId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Profile already completed.' });
    }

    let sid = null;
    if (role === 'student') {
      if (!student_id || !student_id.trim()) {
        return res.status(422).json({ success: false, message: 'Student ID is required for student accounts.' });
      }
      sid = student_id.trim().toUpperCase();
      if (!/^[A-Za-z0-9/\-]{3,20}$/.test(sid)) {
        return res.status(422).json({ success: false, message: 'Invalid student ID format.' });
      }
      const existingSid = await pool.query('SELECT id FROM users WHERE student_id = $1', [sid]);
      if (existingSid.rows.length) {
        return res.status(409).json({ success: false, message: 'Student ID already in use.' });
      }
    }

    // Insert new user
    const insertResult = await pool.query(
      `INSERT INTO users (asgardeo_id, name, email, profile_pic, role, student_id, is_email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [asgardeoId, name, email, profilePic, role, sid]
    );

    const newUser = insertResult.rows[0];
    emitter.emit('UserRegistered', { id: newUser.id, name, email, role });

    res.json({ success: true, message: 'Profile completed.', user: newUser });
  } catch (err) {
    console.error('[completeProfile]', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getMe,
  syncUser,
  completeProfile,
};