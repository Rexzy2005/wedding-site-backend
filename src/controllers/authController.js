import { generateToken, addToken, removeToken } from '../utils/authStore.js';

/**
 * Admin login
 * POST /admin/login
 */
export const login = async (req, res) => {
  try {
    const { password } = req.body;

    // Validate password exists
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Check password against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(500).json({
        success: false,
        message: 'Admin password not configured'
      });
    }

    if (password !== adminPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Generate and store token
    const token = generateToken();
    addToken(token);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

/**
 * Admin logout
 * POST /admin/logout
 */
export const logout = async (req, res) => {
  try {
    const token = req.adminToken;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Remove token from store
    const removed = removeToken(token);

    if (removed) {
      return res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Token not found'
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

export default {
  login,
  logout
};