const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('./ApiError');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const cloudinaryReady = () =>
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(new ApiError(400, 'Only JPG, PNG, WEBP or GIF images are allowed')),
}).single('image');

function sendToCloudinary(buffer) {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'eventsphere' }, (err, result) => (err ? reject(err) : resolve(result.secure_url)))
      .end(buffer);
  });
}

// Middleware: parses the multipart form, uploads the image (Cloudinary if configured,
// otherwise the local /uploads folder) and puts the final URL in req.body.image
exports.handleImageUpload = (req, res, next) => {
  multerUpload(req, res, async (err) => {
    if (err) return next(err.code === 'LIMIT_FILE_SIZE' ? new ApiError(400, 'Image must be smaller than 5 MB') : err);
    if (!req.file) return next();
    try {
      if (cloudinaryReady()) {
        req.body.image = await sendToCloudinary(req.file.buffer);
      } else {
        const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const name = crypto.randomBytes(12).toString('hex') + ext;
        fs.writeFileSync(path.join(UPLOAD_DIR, name), req.file.buffer);
        req.body.image = `/uploads/${name}`;
      }
      next();
    } catch (e) {
      next(new ApiError(500, 'Image upload failed: ' + e.message));
    }
  });
};

exports.UPLOAD_DIR = UPLOAD_DIR;
