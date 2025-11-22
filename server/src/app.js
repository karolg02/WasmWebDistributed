/**
 * Express application setup
 * Oddzielony od server.js aby umożliwić testowanie
 */

const express = require('express');
const { getMulterUpload, ensureTempDir } = require("./modules/common/config");
const { configureExpress, registerRoutes } = require('./modules/common/expressConfig');
const { uploadWasmHandler } = require("./modules/common/uploadWasm");
const auth = require('./modules/socket/auth');
const monitoring = require('./modules/monitoring/monitoring');
const userService = require('./modules/user/userService');
const path = require('path');

function createApp() {
  const app = express();
  configureExpress(app);
  return app;
}

function setupRoutes(app, options = {}) {
  const {
    io = null,
    activeCustomFunctions = new Map(),
    tempDir = path.join(__dirname, '../temp')
  } = options;

  ensureTempDir(tempDir);
  const upload = getMulterUpload(tempDir);

  // Register routes that require io
  registerRoutes(app, upload, io ? uploadWasmHandler(activeCustomFunctions, io, tempDir) : (req, res) => {
    res.status(503).json({ error: 'Service not initialized' });
  }, tempDir);

  // Authentication endpoints
  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const token = await auth.register(username, email, password);
      res.json({ token });
    } catch (err) {
      if (err.message === 'USER_EXISTS') {
        return res.status(409).json({ error: 'User exists' });
      }
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const { token, user } = await auth.login(username, password);
      res.json({ token, email: user.email, username: user.username });
    } catch (err) {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Monitoring endpoints
  app.get('/api/monitoring/user/:email/history', monitoring.getUserTaskHistory);
  app.get('/api/monitoring/user/:email/stats', monitoring.getUserStats);
  app.get('/api/monitoring/task/:taskId/batches', monitoring.getTaskBatches);
  app.get('/api/monitoring/active', monitoring.getActiveTasksStats);
  app.get('/api/monitoring/reassignments', monitoring.getReassignmentStats);
  app.get('/api/monitoring/stats', monitoring.getSystemStats);

  // User management endpoints
  app.post('/api/user/change-email', userService.authenticateToken, userService.changeEmail);
  app.post('/api/user/change-password', userService.authenticateToken, userService.changePassword);
  app.get('/api/user/info', userService.authenticateToken, userService.getUserInfo);
}

module.exports = { createApp, setupRoutes };
