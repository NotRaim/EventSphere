const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('./ApiError');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const cloudinaryReady = () =>
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;


function hasValidImageSignature(buffer, mime) {
  if (!Buffer.isBuffer(buffer)) return false;
  if (mime === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === 'image/png') return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === 'image/gif') return buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a';
  if (mime === 'image/webp') return buffer.length > 12 && buffer.subarray(0,4).toString('ascii') === 'RIFF' && buffer.subarray(8,12).toString('ascii') === 'WEBP';
  return false;
}

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
      if (!hasValidImageSignature(req.file.buffer, req.file.mimetype)) return next(new ApiError(400, 'Invalid image file'));
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
      next(new ApiError(500, 'Image upload failed'));
    }
  });
};

exports.UPLOAD_DIR = UPLOAD_DIR;
