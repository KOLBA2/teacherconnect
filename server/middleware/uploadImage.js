const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Avatars + post images land here and are served statically from /uploads.
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'images');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
    cb(new Error('მხოლოდ სურათებია დაშვებული (PNG, JPG, WEBP, GIF)'));
    return;
  }
  cb(null, true);
}

// Public URL path for a stored file (frontend prefixes with API_ORIGIN).
function publicPath(file) {
  return file ? `/uploads/images/${file.filename}` : null;
}

const uploadImage = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE, files: 1 } });

module.exports = { uploadImage, publicPath };
