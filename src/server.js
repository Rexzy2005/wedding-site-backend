import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression';
import connectDB from './config/database.js';
import cloudinary from './config/cloudinary.js';
import errorHandler from './middlewares/errorHandler.js';
import notFound from './middlewares/notFound.js';
import logger from './middlewares/logger.js';
import authRoutes from './routes/authRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://eldon-geraldine.netlify.app",
    "http://localhost:8080",
    'http://127.0.0.1:8080',
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Disposition"],
  optionsSuccessStatus: 200,
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Other Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    cloudinary: !!cloudinary.config().cloud_name
  });
});

// Routes
app.use('/media', mediaRoutes);
app.use('/admin', authRoutes);

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Cloudinary configured: ${cloudinary.config().cloud_name}`);
    console.log(`✅ CORS enabled for http://localhost:5173`);
  });
}).catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});