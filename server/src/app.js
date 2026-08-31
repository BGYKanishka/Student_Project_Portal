require('dotenv').config();
require('./events/notificationHandler'); // register event listeners

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const rateLimit = require('express-rate-limit');
const pool = require('./config/db');
const httpsRedirect = require('./middleware/httpsRedirect');
const { verifyCsrf } = require('./middleware/csrf');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');

const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/public');
const app = express();
const PORT = process.env.PORT || 5001;

// Needed so req.headers['x-forwarded-proto'] etc. are trusted behind
// Vercel's/any reverse proxy's edge.
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(httpsRedirect);
app.use(helmet({ crossOriginEmbedderPolicy: false }));

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});
app.use('/api/auth/', authLimiter);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(session({
  store: new PgSession({ pool, tableName: 'session', createTableIfMissing: false }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
    sameSite: (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes — used only during the OIDC redirect flow
  },
}));

app.use('/api/', verifyCsrf);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV })
);

// 404 handler
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

if (process.env.NODE_ENV !== 'production') {
  // Opt-in local HTTPS: set HTTPS_CERT_PATH/HTTPS_KEY_PATH to a cert/key
  // pair (see certs/cert.pem, certs/key.pem — generate with openssl, see
  // README) to serve this dev server over TLS instead of plain HTTP.
  if (process.env.HTTPS_CERT_PATH && process.env.HTTPS_KEY_PATH) {
    const https = require('https');
    const fs = require('fs');
    const options = {
      cert: fs.readFileSync(process.env.HTTPS_CERT_PATH),
      key: fs.readFileSync(process.env.HTTPS_KEY_PATH),
    };
    https.createServer(options, app).listen(PORT, () => {
      console.log(`\n🔒 UOK Connect server running on https://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } else {
    app.listen(PORT, () => {
      console.log(`\n🚀 UOK Connect server running on http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  }
}

module.exports = app;
