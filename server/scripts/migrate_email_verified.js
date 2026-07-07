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
    
    console.log('Adding is_email_verified column to users table...');
    // Add column, defaulting to TRUE for existing users (so they are not locked out)
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    // But for new users in the future, we want the default to be FALSE.
    // However, if they register via Google, they are automatically verified.
    // So in setupDb, we'll set default to FALSE, and we'll change it here too.
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN is_email_verified SET DEFAULT FALSE;
    `);
    
    await client.query('COMMIT');
    console.log('Migration successful.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
