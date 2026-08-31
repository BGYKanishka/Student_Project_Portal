require('node:dns').setDefaultResultOrder('ipv4first');
const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'false' ? false : true } }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Do NOT process.exit() here: an idle client erroring (e.g. a transient
// connection drop) is expected and recoverable — the pool automatically
// discards the bad client and opens a fresh one on the next query. Crashing
// the whole server on every idle-connection blip took the app down
// mid-session during testing (a local Postgres connection idling past
// idleTimeoutMillis is enough to trigger this).
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err.message);
});

module.exports = pool;
