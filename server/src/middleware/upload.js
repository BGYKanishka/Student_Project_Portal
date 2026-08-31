const multer = require('multer');

// file-type is ESM-only from v17+ (needed for a patched version — see
// package.json comment history / CHANGELOG: 13.0.0-21.3.0 has a known
// infinite-loop DoS on malformed input, GHSA-5v7r-6r5c-r473). Reached via a
// cached dynamic import(), same pattern as server/src/config/oidc.js.
let fileTypePromise;
const getFileTypeFromBuffer = (buffer) => {
  if (!fileTypePromise) {
    fileTypePromise = import('file-type');
  }
  return fileTypePromise.then(({ fileTypeFromBuffer }) => fileTypeFromBuffer(buffer));
};

const storage = multer.memoryStorage();

// First-pass, fast rejection based on the client-supplied Content-Type —
// spoofable, so verifyImageMagicBytes below does the real check on the
// buffered content before it ever reaches Cloudinary.
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Sniffs the actual file content (magic bytes) rather than trusting the
// upload's declared MIME type/extension. Mount immediately after
// upload.single(...) at every call site.
const verifyImageMagicBytes = async (req, res, next) => {
  try {
    if (!req.file) return next();
    const detected = await getFileTypeFromBuffer(req.file.buffer);
    if (!detected || !detected.mime.startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'File content does not match an image type.' });
    }
    next();
  } catch (err) {
    console.error('[verifyImageMagicBytes]', err.message);
    res.status(400).json({ success: false, message: 'Unable to validate uploaded file.' });
  }
};

module.exports = upload;
module.exports.verifyImageMagicBytes = verifyImageMagicBytes;
