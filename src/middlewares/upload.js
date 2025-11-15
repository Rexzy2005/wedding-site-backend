import multer from 'multer';
import multerCloudinary from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

const CloudinaryStorage = multerCloudinary.CloudinaryStorage;

// Allowed file formats
const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_VIDEO_FORMATS = ['mp4', 'mov'];
const ALLOWED_FORMATS = [...ALLOWED_IMAGE_FORMATS, ...ALLOWED_VIDEO_FORMATS];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine resource type based on mimetype
    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');

    if (!isVideo && !isImage) {
      throw new Error('Only images and videos are allowed');
    }

    return {
      folder: 'media-uploads',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: isVideo ? ALLOWED_VIDEO_FORMATS : ALLOWED_IMAGE_FORMATS,
      transformation: isImage ? [{ quality: 'auto', fetch_format: 'auto' }] : undefined
    };
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  try {
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');

    // Check if file type is allowed
    if (!isImage && !isVideo) {
      return cb(new Error('Only image and video files are allowed'), false);
    }

    // Check file extension
    if (!ALLOWED_FORMATS.includes(fileExtension)) {
      return cb(
        new Error(`File type .${fileExtension} is not allowed. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`),
        false
      );
    }

    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

// Create multer instance with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE // Set to max size, will check specific size in controller
  }
});

// Middleware for single file upload
export const uploadSingle = (fieldName = 'file') => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size too large. Max size: 100MB for videos, 10MB for images'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Middleware for multiple file upload
export const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);
    
    multipleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'One or more files exceed size limit. Max: 100MB for videos, 10MB for images'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: `Too many files. Maximum ${maxCount} files allowed`
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Helper function to validate file size based on type
export const validateFileSize = (file) => {
  const isVideo = file.mimetype.startsWith('video/');
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  
  if (file.size > maxSize) {
    throw new Error(
      `File size exceeds limit. Max: ${isVideo ? '100MB' : '10MB'} for ${isVideo ? 'videos' : 'images'}`
    );
  }
  
  return true;
};

export default upload;