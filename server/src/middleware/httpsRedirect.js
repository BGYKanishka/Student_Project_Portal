// Vercel terminates TLS and redirects HTTP->HTTPS at the edge already, so
// this is a no-op there. It exists for a non-Vercel production deployment
// (e.g. bare Node behind a reverse proxy) where nothing else would enforce
// HTTPS at the app layer.
module.exports = function httpsRedirect(req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const isVercel = process.env.VERCEL === '1';
  if (!isProd || isVercel) return next();

  const proto = req.headers['x-forwarded-proto'];
  if (proto && proto !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  next();
};
