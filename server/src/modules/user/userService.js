const bcrypt = require('bcryptjs');
const { getUserById, updateUserEmail, updateUserPassword } = require('../common/db');
const { verifyToken } = require('../socket/auth');


function authenticateToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function changeEmail(req, res) {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ error: 'New email is required' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    await updateUserEmail(req.user.id, newEmail);
    
    console.log(`[UserService] Email updated for user ${req.user.id}: ${newEmail}`);
    res.json({ message: 'Email updated successfully' });
  } catch (err) {
    console.error('[UserService] Error changing email:', err);
    res.status(500).json({ error: err.message || 'Failed to update email' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(req.user.id, hashedPassword);

    console.log(`[UserService] Password updated for user ${req.user.id}`);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[UserService] Error changing password:', err);
    res.status(500).json({ error: err.message || 'Failed to update password' });
  }
}

async function getUserInfo(req, res) {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userInfo } = user;
    res.json(userInfo);
  } catch (err) {
    console.error('[UserService] Error fetching user info:', err);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
}

module.exports = {
  authenticateToken,
  changeEmail,
  changePassword,
  getUserInfo
};
