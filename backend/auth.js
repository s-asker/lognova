import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR';
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize users.json with default admin if not exists
const initUsers = () => {
  if (!fs.existsSync(USERS_FILE)) {
    const defaultAdmin = {
      username: 'admin',
      password: bcrypt.hashSync('admin', 10), // Change this default!
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [defaultAdmin] }, null, 2));
  }
};

const getUsers = () => {
  initUsers();
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')).users;
};

const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
};

// Auth Middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin-only middleware
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Auth Controllers
export const AuthController = {
  login: async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });
  },

  // Admin creates new users
  createUser: async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const users = getUsers();
    
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const newUser = {
      username,
      password: bcrypt.hashSync(password, 10),
      role: role || 'viewer',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    res.json({ 
      success: true, 
      user: { username: newUser.username, role: newUser.role } 
    });
  },

  // List all users (admin only)
  listUsers: (req, res) => {
    const users = getUsers().map(u => ({
      username: u.username,
      role: u.role,
      createdAt: u.createdAt
    }));
    res.json(users);
  },

  // Delete user (admin only, can't delete self)
  deleteUser: (req, res) => {
    const { username } = req.params;

    if (username === req.user.username) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    if (username === 'admin') {
      return res.status(400).json({ error: 'Cannot delete default admin account' });
    }

    let users = getUsers();
    const initialLength = users.length;
    users = users.filter(u => u.username !== username);

    if (users.length === initialLength) {
      return res.status(404).json({ error: 'User not found' });
    }

    saveUsers(users);
    res.json({ success: true });
  },

  // Change password
  changePassword: async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === req.user.username);

    if (userIndex === -1 || !bcrypt.compareSync(currentPassword, users[userIndex].password)) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    users[userIndex].password = bcrypt.hashSync(newPassword, 10);
    saveUsers(users);

    res.json({ success: true });
  }
};
