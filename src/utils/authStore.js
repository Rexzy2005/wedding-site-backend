import crypto from 'crypto';

// In-memory token store
const tokenStore = new Set();

/**
 * Generate a random token
 */
export const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Add token to store
 */
export const addToken = (token) => {
  tokenStore.add(token);
  return token;
};

/**
 * Check if token exists
 */
export const verifyToken = (token) => {
  return tokenStore.has(token);
};

/**
 * Remove token from store
 */
export const removeToken = (token) => {
  return tokenStore.delete(token);
};

/**
 * Clear all tokens (for testing or reset)
 */
export const clearAllTokens = () => {
  tokenStore.clear();
};

export default {
  generateToken,
  addToken,
  verifyToken,
  removeToken,
  clearAllTokens
};