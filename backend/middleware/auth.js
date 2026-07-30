//made by aditya singh , ADITYA JAIN
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized. Please log in.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev');

    // Get user
    let user;
    if (require('mongoose').connection.readyState === 1) {
      user = await User.findById(decoded.id).select('-password');
    } else {
      const { memoryStore } = require('../utils/memoryStore');
      user = memoryStore.findUserById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (user.isLocked && user.isLocked()) {
      return res.status(423).json({ error: 'Account temporarily locked.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    next(err);
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin access required.' });
};

module.exports = { protect, adminOnly };
