require('node:dns').setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

// Same conditional-SSL pattern as config/db.js and setupDb.js: only enable
// SSL for a cloud DATABASE_URL, never for a local discrete DB_* connection
// (a local Postgres install typically doesn't support/need SSL at all).
const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'false' ? false : true } }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
const pool = new Pool(poolConfig);

// Pre-provisions an admin row with no oidc_sub yet. The row is linked to a
// real identity automatically the first time that email signs in through
// Asgardeo with role=admin (see authController.js's provisioning logic) —
// admins are never auto-created purely from an IdP login, only ever linked
// to a row seeded here.
async function addAdmin(email, name) {
  const query = `
    INSERT INTO users (name, email, role)
    VALUES ($1, $2, 'admin')
    ON CONFLICT (email) DO UPDATE
    SET role = 'admin',
        name = EXCLUDED.name;
  `;

  try {
    await pool.query(query, [name || 'Admin User', email]);
    console.log(`Admin row for '${email}' inserted/updated successfully.`);
    console.log(`They can now sign in via the admin portal (Asgardeo login with role=admin) using this email.`);
  } catch (err) {
    console.error('Error executing query:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

const email = process.argv[2] || process.env.ADMIN_EMAIL;
const name = process.argv[3] || process.env.ADMIN_NAME;

if (!email) {
  console.error('Usage: node create_admin.js <email> [name]');
  console.error('Or set ADMIN_EMAIL (and optionally ADMIN_NAME) environment variables.');
  process.exit(1);
}

addAdmin(email, name);
