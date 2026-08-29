require('dotenv').config();
require('./events/notificationHandler'); // register event listeners

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const pool = require('./config/db');
const https = require('https');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');

const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/public');
const app = express();
const PORT = process.env.PORT || 5001;

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://lh3.googleusercontent.com"],
      connectSrc: ["'self'", "https://api.asgardeo.io"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));

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
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok' })
);

// 404 handler
app.use((req, res) =>
  res.status(404).json({ success: false, message: 'Route not found.' })
);

// Global error handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err.message);
  } else {
    console.error('[Error] An error occurred.');
  }
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

if (process.env.NODE_ENV !== 'production') {
  // ── HTTPS with mkcert certificates ──────────────────────────────────────────
  const certDir = path.join(__dirname, '../../certs');
  const certFile = path.join(certDir, 'localhost+2.pem');
  const keyFile = path.join(certDir, 'localhost+2-key.pem');

  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    const sslOptions = {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    };

    https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(`\n🔒 UOK Connect server running on https://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } else {
    console.warn('⚠️  SSL certificates not found. Run: cd certs && mkcert localhost 127.0.0.1 ::1');
    console.warn('   Falling back to HTTP...\n');
    app.listen(PORT, () => {
      console.log(`\n🚀 UOK Connect server running on http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  }
}

module.exports = app;

