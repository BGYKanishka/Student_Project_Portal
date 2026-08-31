-- UOK Connect — database creation script
-- Plain SQL, no Node/npm required. Run with:
--   psql "<connection string>" -f schema.sql
-- This mirrors server/scripts/setupDb.js — keep both in sync if the schema changes.

DROP TABLE IF EXISTS comments, notifications, likes, followers, project_tags, projects, users, "session" CASCADE;

-- ── USERS ──────────────────────────────────────────────────────────────────
-- oidc_sub: the "sub" claim from the Asgardeo (OIDC) access/ID token — the
--   authoritative link between a local row and the IdP-authenticated identity.
--   NULL until the user's first successful login (pre-provisioned admins are
--   inserted with oidc_sub NULL and linked on their first admin login).
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

-- ── PROJECTS ─────────────────────────────────────────────────────────────
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

-- ── PROJECT TAGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_tags (
  id         SERIAL       PRIMARY KEY,
  project_id INTEGER      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag        VARCHAR(100) NOT NULL,
  UNIQUE(project_id, tag)
);

-- ── LIKES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  id         SERIAL    PRIMARY KEY,
  user_id    INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER   NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- ── COMMENTS ─────────────────────────────────────────────────────────────
-- is_private: FALSE = public, TRUE = visible only to the comment's author and admins.
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL      PRIMARY KEY,
  project_id  INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  is_private  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── FOLLOWERS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followers (
  id           SERIAL    PRIMARY KEY,
  follower_id  INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id <> following_id)
);

-- ── NOTIFICATIONS ────────────────────────────────────────────────────────
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

-- ── SESSION (connect-pg-simple) ──────────────────────────────────────────
-- Holds only short-lived (10 min) OIDC authorization-flow state (PKCE
-- verifier/state/nonce) — never used for authenticated application requests.
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    VARCHAR      NOT NULL COLLATE "default",
  "sess"   JSON         NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL,
  PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- ── INDEXES ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_status_created ON projects (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
CREATE INDEX IF NOT EXISTS idx_likes_project_id ON likes (project_id);
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments (project_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_project_id ON project_tags (project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications (recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers (following_id);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON projects;
CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_comments_updated_at ON comments;
CREATE TRIGGER trigger_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
