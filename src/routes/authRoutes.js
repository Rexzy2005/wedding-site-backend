import express from 'express';
import { login, logout } from '../controllers/authController.js';
import authAdmin from '../middlewares/authAdmin.js';

const router = express.Router();

// Admin login - no auth required
router.post('/login', login);

// Admin logout - auth required
router.post('/logout', authAdmin, logout);

export default router;