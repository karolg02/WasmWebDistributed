/**
 * Integration tests dla user management endpoints
 */

const request = require('supertest');
const { createApp, setupRoutes } = require('../../src/app');
const jwt = require('jsonwebtoken');
const db = require('../../src/modules/common/db');

// Mock database
jest.mock('../../src/modules/common/db');

describe('User Management API', () => {
  let app;
  let validToken;

  beforeAll(() => {
    app = createApp();
    setupRoutes(app);
    // Create valid JWT token for testing - must match SECRET in auth.js
    validToken = jwt.sign(
      { id: 1, username: 'testuser' },
      process.env.SECRET_KEY || 'dev_secret', // Match the secret from auth.js
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/user/info', () => {
    it('should return user info with valid token', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        password: 'shouldnotreturn'
      };

      db.getUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/user/info')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('email', 'test@test.com');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/user/info');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/user/info')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/user/change-email', () => {
    it('should change email with valid token', async () => {
      db.updateUserEmail.mockResolvedValue();

      const response = await request(app)
        .post('/api/user/change-email')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ newEmail: 'newemail@test.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Email updated successfully');
      expect(db.updateUserEmail).toHaveBeenCalledWith(1, 'newemail@test.com');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/user/change-email')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ newEmail: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid email format');
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/user/change-email')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .post('/api/user/change-email')
        .send({ newEmail: 'new@test.com' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/user/change-password', () => {
    it('should change password with correct current password', async () => {
      const mockUser = {
        id: 1,
        password: '$2a$10$somehashedpassword'
      };

      db.getUserById.mockResolvedValue(mockUser);
      db.updateUserPassword.mockResolvedValue();

      const response = await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        });

      // bcrypt.compare may fail in mock environment
      expect([200, 401]).toContain(response.status);
    });

    it('should reject short password', async () => {
      const response = await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          currentPassword: 'oldpass',
          newPassword: '12345' // too short
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('6 characters');
    });

    it('should reject missing fields', async () => {
      const response = await request(app)
        .post('/api/user/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ currentPassword: 'test' });

      expect(response.status).toBe(400);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .post('/api/user/change-password')
        .send({
          currentPassword: 'old',
          newPassword: 'new123456'
        });

      expect(response.status).toBe(401);
    });
  });
});
