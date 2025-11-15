import cloudinary from '../config/cloudinary.js';

/**
 * Delete file from Cloudinary
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });
    return result;
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
  }
};

/**
 * Validate uploaded file data
 */
export const validateUploadedFile = (file) => {
  if (!file) {
    throw new Error('No file uploaded');
  }
  
  if (!file.path) {
    throw new Error('File upload failed - no Cloudinary URL');
  }
  
  return true;
};

export default {
  deleteFromCloudinary,
  validateUploadedFile
};