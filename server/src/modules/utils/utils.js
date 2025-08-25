const jwt = require('jsonwebtoken');

function sanitizeJsIdentifier(id) {
    if (!id || typeof id !== 'string') return 'unknown_client';
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY || 'dev_secret');
    return decoded;
  } catch (error) {
    return null;
  }
}

module.exports = { sanitizeJsIdentifier, verifyToken };