import { Media } from '../models/index.js';
import { deleteFromCloudinary, validateUploadedFile } from '../utils/uploadHelpers.js';
import { z } from 'zod';
import archiver from 'archiver';
import https from 'https';
import http from 'http';

// Validation schema for update caption
const updateCaptionSchema = z.object({
  caption: z.string().trim()
});

/**
 * Upload media files
 * POST /media/upload (Admin only)
 */
export const uploadMedia = async (req, res) => {
  try {
    const { caption } = req.body;

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Process uploaded files
    const mediaItems = [];
    const errors = [];

    for (const file of req.files) {
      try {
        validateUploadedFile(file);

        const mediaItem = await Media.create({
          url: file.path, // Cloudinary URL
          publicId: file.filename, // Cloudinary public ID
          type: file.mimetype.startsWith('video/') ? 'video' : 'image',
          caption: caption || ''
        });

        mediaItems.push(mediaItem);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Successfully uploaded ${mediaItems.length} file(s)`,
      uploaded: mediaItems.length,
      failed: errors.length,
      media: mediaItems,
      ...(errors.length > 0 && { errors })
    });
  } catch (error) {
    console.error('Upload media error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload media'
    });
  }
};

/**
 * Delete media
 * DELETE /media/:id (Admin only)
 */
export const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;

    // Find media
    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    // Delete from Cloudinary
    try {
      await deleteFromCloudinary(media.publicId, media.type);
    } catch (cloudinaryError) {
      console.error('Cloudinary deletion error:', cloudinaryError);
      // Continue with database deletion even if Cloudinary fails
    }

    // Delete from database
    await Media.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    console.error('Delete media error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete media'
    });
  }
};

/**
 * Get all media with filters (Public - optimized with pagination)
 * GET /media (Public)
 */
export const getMedia = async (req, res) => {
  try {
    const { type, search, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};
    
    if (type && ['image', 'video'].includes(type)) {
      filter.type = type;
    }

    // Search by caption if provided
    if (search) {
      filter.caption = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await Media.countDocuments(filter);

    // Get media with pagination using lean() for performance
    const media = await Media.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return res.status(200).json({
      success: true,
      count: media.length,
      total,
      page: pageNum,
      totalPages,
      hasNextPage,
      hasPrevPage,
      media
    });
  } catch (error) {
    console.error('Get media error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch media'
    });
  }
};

/**
 * Get single media by ID (Public - optimized)
 * GET /media/:id (Public)
 */
export const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await Media.findById(id).lean();

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    return res.status(200).json({
      success: true,
      media
    });
  } catch (error) {
    console.error('Get media by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch media'
    });
  }
};

/**
 * Update media caption
 * PATCH /media/:id/caption (Admin only)
 */
export const updateCaption = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    const validation = updateCaptionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message
      });
    }

    const { caption } = validation.data;

    // Find and update media
    const media = await Media.findByIdAndUpdate(
      id,
      { caption },
      { new: true, runValidators: true }
    );

    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Caption updated successfully',
      media
    });
  } catch (error) {
    console.error('Update caption error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update caption'
    });
  }
};

/**
 * Download all media as ZIP (Admin only)
 * GET /media/download/zip
 */
export const downloadZip = async (req, res) => {
  try {
    const { type } = req.query;

    // Build filter
    const filter = {};
    if (type && ['image', 'video'].includes(type)) {
      filter.type = type;
    }

    // Fetch all media
    const mediaList = await Media.find(filter).sort({ createdAt: -1 });

    if (!mediaList || mediaList.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No media found'
      });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `media-${timestamp}.zip`;

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 6 } // Compression level
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to create ZIP file'
        });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Counter for tracking
    let completed = 0;
    const total = mediaList.length;

    // Add each media file to archive
    for (const media of mediaList) {
      try {
        // Determine file extension
        const urlParts = media.url.split('.');
        const extension = urlParts[urlParts.length - 1].split('?')[0];
        
        // Generate filename: use publicId or create from index
        const publicIdParts = media.publicId.split('/');
        const originalName = publicIdParts[publicIdParts.length - 1];
        const fileName = `${originalName}.${extension}`;

        // Download file from Cloudinary and add to archive
        await new Promise((resolve, reject) => {
          const protocol = media.url.startsWith('https') ? https : http;
          
          protocol.get(media.url, (fileStream) => {
            if (fileStream.statusCode !== 200) {
              console.error(`Failed to download: ${media.url}`);
              resolve(); // Continue with other files
              return;
            }

            archive.append(fileStream, { name: fileName });
            
            fileStream.on('end', () => {
              completed++;
              console.log(`Added to ZIP: ${fileName} (${completed}/${total})`);
              resolve();
            });

            fileStream.on('error', (err) => {
              console.error(`Stream error for ${fileName}:`, err);
              resolve(); // Continue with other files
            });
          }).on('error', (err) => {
            console.error(`Download error for ${media.url}:`, err);
            resolve(); // Continue with other files
          });
        });
      } catch (error) {
        console.error(`Error processing media ${media._id}:`, error);
        // Continue with next file
      }
    }

    // Finalize the archive
    await archive.finalize();
    console.log(`ZIP download completed: ${completed}/${total} files`);

  } catch (error) {
    console.error('Download ZIP error:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create ZIP download'
      });
    }
  }
};

export default {
  uploadMedia,
  deleteMedia,
  getMedia,
  getMediaById,
  updateCaption,
  downloadZip
};