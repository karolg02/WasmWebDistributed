const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createUser, getUserByUsername } = require('../common/db');

const SECRET = process.env.SECRET_KEY || 'dev_secret';

async function register(username, email, password) {
  const existing = await getUserByUsername(username);
  if (existing) throw new Error('USER_EXISTS');

  const hashed = await bcrypt.hash(password, 10);
  const user = await createUser(username, email, hashed);
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '1d' });
  return token;
}

async function login(username, password) {
  const user = await getUserByUsername(username);
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error('INVALID_CREDENTIALS');

  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '1d' });
  return token;
}

module.exports = { login, register };