const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true } }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
const pool = new Pool(poolConfig);

async function run() {
  try {
    // 1. Add the is_private column if it doesn't exist
    await pool.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;');
    console.log('Ensured is_private column exists in notifications table.');

    // 2. Drop the old type check constraint
    await pool.query('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;');
    
    // 3. Add the new comprehensive type check constraint
    await pool.query("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('like', 'follow', 'project_created', 'comment', 'user_registered', 'admin_action', 'admin_edit', 'admin_delete', 'admin_hide', 'admin_removal'));");
    console.log('Successfully updated notifications_type_check constraint with all types.');
    
    // 4. Add verification token columns to users
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS verification_token VARCHAR(64),
      ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP;
    `);
    console.log('Ensured verification token columns exist in users table.');

    // 5. Create project_views
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_views (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, project_id)
      );
    `);
    console.log('Ensured project_views table exists.');

    // 6. Create refresh_tokens
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Ensured refresh_tokens table exists.');
    
  } catch (err) {
    console.error('Error during migration:', err.message);
  } finally {
    pool.end();
  }
}

run();
