const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../models/db');
const { authMiddleware } = require('./auth');

// Administrator-only guard middleware
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }
  next();
}

/**
 * GET /api/admin/stats
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await db.getStats();
    return res.json({ stats });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});

/**
 * GET /api/admin/users
 */
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const allUsers = await db.getUsers();
    const users = allUsers.map(u => {
      const { passwordHash, ...safeUser } = u;
      return safeUser;
    });
    return res.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

/**
 * POST /api/admin/reset-local-database
 */
router.post('/reset-local-database', authMiddleware, adminOnly, (req, res) => {
  if (db.isMongo()) {
    return res.status(409).json({ error: 'The local database reset is unavailable while MongoDB is active.' });
  }

  try {
    const counts = db.resetLocalStore();
    return res.json({ message: 'Local database restored to seeded demo data.', counts });
  } catch (err) {
    console.error('Local database reset error:', err);
    return res.status(500).json({ error: 'Failed to reset the local database.' });
  }
});

/**
 * POST /api/admin/users
 */
router.post('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, department, year, designation } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const existing = await db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.createUser({
      name,
      email,
      passwordHash,
      role,
      department: department || 'General',
      year: year || 'All',
      designation: designation || ''
    });

    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({ user: safeUser, message: 'User created successfully' });
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

/**
 * POST /api/admin/categories
 */
router.post('/categories', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const newCat = await db.createCategory({
      name: name.trim(),
      description: description || '',
      color: color || '#3b82f6',
      icon: icon || 'bi-tag'
    });

    return res.status(201).json({ category: newCat, message: 'Category added successfully' });
  } catch (err) {
    console.error('Create category error:', err);
    return res.status(500).json({ error: 'Failed to create category.' });
  }
});

module.exports = router;
