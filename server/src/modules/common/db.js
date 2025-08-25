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

module.exports = { createUser, getUserByUsername, db };