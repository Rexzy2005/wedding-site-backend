import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

// Allowed file formats
const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const ALLOWED_VIDEO_FORMATS = ['mp4', 'mov'];
const ALLOWED_FORMATS = [...ALLOWED_IMAGE_FORMATS, ...ALLOWED_VIDEO_FORMATS];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Use memory storage - files stored in buffer
const storage = multer.memoryStorage();

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
    fileSize: MAX_VIDEO_SIZE // Set to max size
  }
});

/**
 * Helper function to upload buffer to Cloudinary
 */
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Process uploaded files and upload to Cloudinary
 */
const processCloudinaryUpload = async (file) => {
  try {
    // Determine if file is video or image
    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');

    // Validate file size based on type
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      throw new Error(
        `File size exceeds limit. Max: ${isVideo ? '100MB' : '10MB'} for ${isVideo ? 'videos' : 'images'}`
      );
    }

    // Prepare upload options
    const uploadOptions = {
      folder: 'media-uploads',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: isVideo ? ALLOWED_VIDEO_FORMATS : ALLOWED_IMAGE_FORMATS,
    };

    // Add transformation for images
    if (isImage) {
      uploadOptions.transformation = [
        { quality: 'auto', fetch_format: 'auto' }
      ];
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file.buffer, uploadOptions);

    // Return processed file data
    return {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: result.secure_url, // Cloudinary URL
      filename: result.public_id, // Cloudinary public ID
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Middleware for single file upload
export const uploadSingle = (fieldName = 'file') => {
  return async (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, async (err) => {
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

      // Process and upload to Cloudinary if file exists
      if (req.file) {
        try {
          req.file = await processCloudinaryUpload(req.file);
          next();
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: `Upload failed: ${uploadError.message}`
          });
        }
      } else {
        next();
      }
    });
  };
};

// Middleware for multiple file upload
export const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return async (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);
    
    multipleUpload(req, res, async (err) => {
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

      // Process and upload all files to Cloudinary
      if (req.files && req.files.length > 0) {
        try {
          const uploadPromises = req.files.map(file => processCloudinaryUpload(file));
          req.files = await Promise.all(uploadPromises);
          next();
        } catch (uploadError) {
          return res.status(500).json({
            success: false,
            message: `Upload failed: ${uploadError.message}`
          });
        }
      } else {
        next();
      }
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