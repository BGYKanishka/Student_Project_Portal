const validateMagicBytes = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const { fileTypeFromBuffer } = await import('file-type');
    const type = await fileTypeFromBuffer(req.file.buffer);
    if (!type || !type.mime.startsWith('image/')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid file type. Only real images are allowed.' 
      });
    }
    next();
  } catch (err) {
    console.error('[Upload] Magic bytes validation error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Could not validate file type.' 
    });
  }
};

module.exports = validateMagicBytes;
