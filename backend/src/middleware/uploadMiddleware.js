import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitizedExt = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `item-${uniqueSuffix}${sanitizedExt}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isExtValid = ALLOWED_EXTENSIONS.includes(ext);
  const isMimeValid =
    ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    (isExtValid && file.mimetype === 'application/octet-stream');

  if (isExtValid && isMimeValid) {
    cb(null, true);
  } else {
    const error = new Error(
      `Invalid file type '${file.mimetype}'. Only JPG, JPEG, PNG, and WEBP images are allowed.`
    );
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

export const uploadItemImages = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Max 5 images per request
  },
  fileFilter
});

export default uploadItemImages;
