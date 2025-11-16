import { verifyToken } from "../utils/authStore.js";

/**
 * Middleware to protect admin routes
 */
const authAdmin = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please provide a valid token.",
      });
    }

    // Extract token and strip surrounding quotes if present
    let token = authHeader.substring(7); // Remove 'Bearer ' prefix
    token = token.replace(/^"|"$/g, ""); // Remove leading/trailing quotes

    // Verify token
    if (!verifyToken(token)) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please login again.",
      });
    }

    // Token is valid, proceed
    req.adminToken = token;
    next();
  } catch (error) {
    console.error("AuthAdmin Middleware Error:", error);
    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

export default authAdmin;
