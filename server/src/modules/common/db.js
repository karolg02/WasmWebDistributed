const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, '..', '..', 'data', 'users.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      method TEXT NOT NULL,
      params TEXT NOT NULL,
      total_tasks INTEGER NOT NULL,
      status TEXT NOT NULL,
      worker_ids TEXT,
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER,
      duration REAL,
      result TEXT,
      error TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS task_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_history_id INTEGER NOT NULL,
      worker_id TEXT NOT NULL,
      batch_index INTEGER NOT NULL,
      tasks TEXT NOT NULL,
      status TEXT NOT NULL,
      assigned_at INTEGER NOT NULL,
      completed_at INTEGER,
      reassigned_from TEXT,
      FOREIGN KEY(task_history_id) REFERENCES tasks_history(id)
    );
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_history_user_email ON tasks_history(user_email);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_history_status ON tasks_history(status);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_task_batches_status ON task_batches(status);`);
});

function createUser(username, email, hashedPassword) {
  const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?);`;

  return new Promise((resolve, reject) => {
    db.run(sql, [username, email, hashedPassword], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, username, email });
    });
  });
}

function getUserByUsername(username) {
  const sql = `SELECT id, username, email, password FROM users WHERE username = ?;`;
  
  return new Promise((resolve, reject) => {
    db.get(sql, [username], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function createTaskHistory(clientId, userEmail, method, params, totalTasks, workerIds) {
  const sql = `INSERT INTO tasks_history 
    (client_id, user_email, method, params, total_tasks, status, worker_ids, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;

  return new Promise((resolve, reject) => {
    db.run(sql, [
      clientId,
      userEmail,
      method,
      JSON.stringify(params),
      totalTasks,
      'pending',
      JSON.stringify(workerIds),
      Date.now()
    ], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

function updateTaskHistory(taskHistoryId, updates) {
  const fields = [];
  const values = [];

  if (updates.status) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.started_at) {
    fields.push('started_at = ?');
    values.push(updates.started_at);
  }
  if (updates.completed_at) {
    fields.push('completed_at = ?');
    values.push(updates.completed_at);
  }
  if (updates.duration !== undefined) {
    fields.push('duration = ?');
    values.push(updates.duration);
  }
  if (updates.result !== undefined) {
    fields.push('result = ?');
    values.push(JSON.stringify(updates.result));
  }
  if (updates.error) {
    fields.push('error = ?');
    values.push(updates.error);
  }

  if (fields.length === 0) return Promise.resolve();

  values.push(taskHistoryId);
  const sql = `UPDATE tasks_history SET ${fields.join(', ')} WHERE id = ?;`;

  return new Promise((resolve, reject) => {
    db.run(sql, values, function(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function createTaskBatch(taskHistoryId, workerId, batchIndex, tasks) {
  const sql = `INSERT INTO task_batches 
    (task_history_id, worker_id, batch_index, tasks, status, assigned_at) 
    VALUES (?, ?, ?, ?, ?, ?);`;

  return new Promise((resolve, reject) => {
    db.run(sql, [
      taskHistoryId,
      workerId,
      batchIndex,
      JSON.stringify(tasks),
      'pending',
      Date.now()
    ], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

function updateTaskBatch(batchId, status, completedAt = null) {
  const sql = completedAt 
    ? `UPDATE task_batches SET status = ?, completed_at = ? WHERE id = ?;`
    : `UPDATE task_batches SET status = ? WHERE id = ?;`;

  const params = completedAt 
    ? [status, completedAt, batchId]
    : [status, batchId];

  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function getPendingBatchesForWorker(taskHistoryId, workerId) {
  const sql = `SELECT * FROM task_batches 
    WHERE task_history_id = ? AND worker_id = ? AND status = 'pending';`;

  return new Promise((resolve, reject) => {
    db.all(sql, [taskHistoryId, workerId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function reassignTaskBatch(batchId, newWorkerId) {
  const sql = `UPDATE task_batches 
    SET worker_id = ?, reassigned_from = worker_id, assigned_at = ? 
    WHERE id = ?;`;

  return new Promise((resolve, reject) => {
    db.run(sql, [newWorkerId, Date.now(), batchId], function(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function updateUserEmail(userId, newEmail) {
  const sql = `UPDATE users SET email = ? WHERE id = ?;`;
  
  return new Promise((resolve, reject) => {
    db.run(sql, [newEmail, userId], function(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function updateUserPassword(userId, hashedPassword) {
  const sql = `UPDATE users SET password = ? WHERE id = ?;`;
  
  return new Promise((resolve, reject) => {
    db.run(sql, [hashedPassword, userId], function(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function getUserById(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

module.exports = { 
  createUser, 
  getUserByUsername,
  getUserById,
  updateUserEmail,
  updateUserPassword,
  db,
  createTaskHistory,
  updateTaskHistory,
  createTaskBatch,
  updateTaskBatch,
  getPendingBatchesForWorker,
  reassignTaskBatch
};