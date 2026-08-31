// Additive, idempotent migration for an existing (pre-OIDC) database.
// For a fresh environment, `npm run db:setup` (which drops and recreates
// everything from scratch) is sufficient and this script isn't needed —
// it exists to document how an existing deployment would be rolled forward
// without losing non-users data (projects, likes, comments, etc.).
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

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

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL...');
    await client.query('BEGIN');

    console.log('Adding OIDC/profile columns to users table...');
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_sub VARCHAR(255) UNIQUE;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number VARCHAR(30);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(255);`);

    console.log('Dropping columns from the retired local-auth/Google-OAuth model...');
    await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS google_id;`);
    await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS password;`);
    await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS admin_verified;`);
    await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS is_email_verified;`);

    await client.query('COMMIT');
    console.log('Migration successful. Existing rows keep their data; oidc_sub is NULL until each user first signs in via Asgardeo (matched/linked by email).');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
