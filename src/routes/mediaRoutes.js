import express from 'express';
import { uploadMedia, deleteMedia, getMedia, getMediaById, updateCaption, downloadZip } from '../controllers/mediaController.js';
import { uploadMultiple } from '../middlewares/upload.js';
import authAdmin from '../middlewares/authAdmin.js';

const router = express.Router();

// Public routes
router.get('/', getMedia);
router.get('/:id', getMediaById);

// Admin routes
router.post('/upload', authAdmin, uploadMultiple('files', 20), uploadMedia);
router.get('/download/zip', authAdmin, downloadZip);
router.patch('/:id/caption', authAdmin, updateCaption);
router.delete('/:id', authAdmin, deleteMedia);

export default router;