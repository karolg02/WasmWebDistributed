/**
 * Unit tests dla userService
 */

const bcrypt = require('bcryptjs');
const userService = require('../../src/modules/user/userService');
const db = require('../../src/modules/common/db');
const auth = require('../../src/modules/socket/auth');

// Mock dependencies
jest.mock('../../src/modules/common/db');
jest.mock('../../src/modules/socket/auth');
jest.mock('bcryptjs');

describe('UserService', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      body: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const mockDecoded = { id: 1, username: 'testuser' };
      req.headers.authorization = 'Bearer validtoken123';
      auth.verifyToken.mockReturnValue(mockDecoded);

      userService.authenticateToken(req, res, next);

      expect(auth.verifyToken).toHaveBeenCalledWith('validtoken123');
      expect(req.user).toEqual(mockDecoded);
      expect(next).toHaveBeenCalled();
    });

    it('should reject missing token', () => {
      userService.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      req.headers.authorization = 'Bearer invalidtoken';
      auth.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      userService.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('changeEmail', () => {
    beforeEach(() => {
      req.user = { id: 1 };
    });

    it('should change email successfully', async () => {
      req.body.newEmail = 'newemail@test.com';
      db.updateUserEmail.mockResolvedValue();

      await userService.changeEmail(req, res);

      expect(db.updateUserEmail).toHaveBeenCalledWith(1, 'newemail@test.com');
      expect(res.json).toHaveBeenCalledWith({ message: 'Email updated successfully' });
    });

    it('should reject missing email', async () => {
      await userService.changeEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'New email is required' });
    });

    it('should reject invalid email format', async () => {
      req.body.newEmail = 'invalid-email';

      await userService.changeEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email format' });
      expect(db.updateUserEmail).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      req.body.newEmail = 'valid@test.com';
      db.updateUserEmail.mockRejectedValue(new Error('DB Error'));

      await userService.changeEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB Error' });
    });
  });

  describe('changePassword', () => {
    beforeEach(() => {
      req.user = { id: 1 };
    });

    it('should change password successfully', async () => {
      req.body = {
        currentPassword: 'oldpass123',
        newPassword: 'newpass123'
      };
      
      const mockUser = { id: 1, password: 'hashedold' };
      db.getUserById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashednew');
      db.updateUserPassword.mockResolvedValue();

      await userService.changePassword(req, res);

      expect(db.getUserById).toHaveBeenCalledWith(1);
      expect(bcrypt.compare).toHaveBeenCalledWith('oldpass123', 'hashedold');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 10);
      expect(db.updateUserPassword).toHaveBeenCalledWith(1, 'hashednew');
      expect(res.json).toHaveBeenCalledWith({ message: 'Password updated successfully' });
    });

    it('should reject missing passwords', async () => {
      req.body = { currentPassword: 'test' };

      await userService.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Current and new password are required' 
      });
    });

    it('should reject short password', async () => {
      req.body = {
        currentPassword: 'oldpass',
        newPassword: '12345' // only 5 chars
      };

      await userService.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'New password must be at least 6 characters long' 
      });
    });

    it('should reject incorrect current password', async () => {
      req.body = {
        currentPassword: 'wrongpass',
        newPassword: 'newpass123'
      };

      const mockUser = { id: 1, password: 'hashedold' };
      db.getUserById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false); // wrong password

      await userService.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Current password is incorrect' 
      });
      expect(db.updateUserPassword).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      req.body = {
        currentPassword: 'oldpass',
        newPassword: 'newpass123'
      };

      db.getUserById.mockResolvedValue(null);

      await userService.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });

  describe('getUserInfo', () => {
    beforeEach(() => {
      req.user = { id: 1 };
    });

    it('should return user info without password', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'shouldnotreturn'
      };

      db.getUserById.mockResolvedValue(mockUser);

      await userService.getUserInfo(req, res);

      expect(db.getUserById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      });
    });

    it('should handle user not found', async () => {
      db.getUserById.mockResolvedValue(null);

      await userService.getUserInfo(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
});
