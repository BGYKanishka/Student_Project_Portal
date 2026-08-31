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

const run = (client, sql) => client.query(sql);

const createTables = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL...');
    await client.query('BEGIN');
    // Drop existing tables to apply schema changes cleanly
    await run(client, `
      DROP TABLE IF EXISTS comments, notifications, likes, followers, project_tags, projects, users, "session" CASCADE;
    `);

    // ── USERS ───────────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS users (
        id             SERIAL        PRIMARY KEY,
        oidc_sub       VARCHAR(255)  UNIQUE,
        username       VARCHAR(100)  UNIQUE,
        name           VARCHAR(255)  NOT NULL,
        email          VARCHAR(255)  UNIQUE NOT NULL,
        profile_pic    VARCHAR(500),
        role           VARCHAR(20)   NOT NULL DEFAULT 'student'
                         CHECK (role IN ('student', 'recruiter', 'admin')),
        student_id     VARCHAR(50)   UNIQUE,
        contact_number VARCHAR(30),
        organization   VARCHAR(255),
        is_blocked     BOOLEAN       NOT NULL DEFAULT FALSE,
        created_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    `);

    // ── PROJECTS ─────────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS projects (
        id            SERIAL        PRIMARY KEY,
        user_id       INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title         VARCHAR(255)  NOT NULL,
        description   TEXT          NOT NULL,
        thumbnail_url VARCHAR(500),
        github_url    VARCHAR(500),
        demo_url      VARCHAR(500),
        tech_stack    JSONB         NOT NULL DEFAULT '[]',
        status        VARCHAR(20)   NOT NULL DEFAULT 'published'
                        CHECK (status IN ('draft', 'published', 'hidden')),
        view_count    INTEGER       NOT NULL DEFAULT 0,
        created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
      );
    `);

    // ── PROJECT TAGS ──────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS project_tags (
        id         SERIAL       PRIMARY KEY,
        project_id INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        tag        VARCHAR(100) NOT NULL,
        UNIQUE(project_id, tag)
      );
    `);

    // ── LIKES ────────────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS likes (
        id         SERIAL    PRIMARY KEY,
        user_id    INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER   NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, project_id)
      );
    `);

    // ── COMMENTS ─────────────────────────────────────────────────────────────
    // is_private: FALSE = public (visible to everyone, like a YouTube comment),
    //   TRUE = private (visible only to the comment's author and admins —
    //   NOT visible to the project owner unless they wrote it themselves)
    await run(client, `
      CREATE TABLE IF NOT EXISTS comments (
        id          SERIAL      PRIMARY KEY,
        project_id  INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content     TEXT        NOT NULL,
        is_private  BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
      );
    `);

    // ── FOLLOWERS ────────────────────────────────────────────────────────────
    await run(client, `
      CREATE TABLE IF NOT EXISTS followers (
        id           SERIAL    PRIMARY KEY,
        follower_id  INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(follower_id, following_id),
        CHECK(follower_id <> following_id)
      );
    `);

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    // actor_id: nullable — system notifications have no actor
    // project_id: nullable — follow notifications have no project
    await run(client, `
      CREATE TABLE IF NOT EXISTS notifications (
        id           SERIAL      PRIMARY KEY,
        recipient_id INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id     INTEGER     REFERENCES users(id) ON DELETE SET NULL,
        project_id   INTEGER     REFERENCES projects(id) ON DELETE SET NULL,
        type         VARCHAR(50) NOT NULL
                       CHECK (type IN ('like', 'follow', 'project_created', 'comment', 'user_registered', 'admin_action', 'admin_edit', 'admin_delete', 'admin_hide')),
        message      TEXT        NOT NULL,
        is_private   BOOLEAN     NOT NULL DEFAULT FALSE,
        is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
        read_at      TIMESTAMP,
        created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
      );
    `);

    // ── SESSION (connect-pg-simple) ───────────────────────────────────────────
    // Managed by the express-session middleware; not used for application data.
    // Separate queries because some pg drivers reject multiple statements in one call.
    await run(client, `
      CREATE TABLE IF NOT EXISTS "session" (
        "sid"    VARCHAR      NOT NULL COLLATE "default",
        "sess"   JSON         NOT NULL,
        "expire" TIMESTAMP(6) NOT NULL,
        PRIMARY KEY ("sid")
      );
    `);
    await run(client, `
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    // ── INDEXES ───────────────────────────────────────────────────────────────
    // projects: most queries filter by status and sort by created_at
    await run(client, `
      CREATE INDEX IF NOT EXISTS idx_projects_status_created
        ON projects (status, created_at DESC);
    `);
    // projects: getUserProjects filters by user_id
    await run(client, `
      CREATE INDEX IF NOT EXISTS idx_projects_user_id
        ON projects (user_id);
    `);
    // likes: subquery groups by project_id to count likes
    await run(client, `
      CREATE INDEX IF NOT EXISTS idx_likes_project_id
        ON likes (project_id);
    `);
    // comments: fetching a project's comment thread filters by project_id
    await run(client, `
      CREATE INDEX IF NOT EXISTS idx_comments_project_id
        ON comments (project_id);
    `);
    // comments: ownership checks (edit/delete, "is this mine?") filter by user_id
    await run(client, `
      CREATE INDEX IF NOT EXISTS idx_comments_user_id
        ON comments (user_id);
    `);
    // project_tags: join filters by project_id
    await run(client, `
      CREATE INDEX IF NOT EXISTS idx_project_tags_project_id
        ON project_tags (project_id);
    `);
    // notifications: getNotifications filters by recipient_id; markAllAsRead also filters is_read
    await run(client, `
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
        ON notifications (recipient_id, is_read);
    `);
    // followers: getUserProfile counts by following_id
    await run(client, `
      CREATE INDEX IF NOT EXISTS idx_followers_following_id
        ON followers (following_id);
    `);

    // ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────
    await run(client, `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    for (const table of ['users', 'projects', 'comments']) {
      await run(client, `
        DROP TRIGGER IF EXISTS trigger_${table}_updated_at ON ${table};
      `);
      await run(client, `
        CREATE TRIGGER trigger_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    await client.query('COMMIT');
    console.log('All tables created successfully.');
    console.log('Tables: users, projects, project_tags, likes, comments, followers, notifications, session');
    console.log('Indexes: status/created, user_id, likes/project, comments/project, comments/user, tags/project, notifications/recipient, followers/following');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database setup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

createTables();