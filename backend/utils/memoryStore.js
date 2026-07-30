//made by cinzia ,adtiya 
const bcrypt = require('bcryptjs');

// In-memory data store for fallback mode (when MongoDB is not connected)
const users = new Map();
const sessions = new Map();

// Helper to generate fake Mongo-like ObjectId
function generateId() {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

class MemoryUser {
  constructor(data) {
    this._id = data._id || generateId();
    this.name = data.name;
    this.email = data.email.toLowerCase();
    this.password = data.password; // hashed password
    this.targetRole = data.targetRole || 'SDE';
    this.role = data.role || 'user';
    this.streak = data.streak || 1;
    this.lastActiveDate = data.lastActiveDate || new Date();
    this.totalSessions = data.totalSessions || 0;
    this.totalPoints = data.totalPoints || 0;
    this.resumeText = data.resumeText || '';
    this.loginAttempts = data.loginAttempts || 0;
    this.lockUntil = data.lockUntil || null;
    this.createdAt = data.createdAt || new Date();
    this.settings = data.settings || {
      theme: 'dark',
      pressureMode: false,
      difficulty: 'Medium',
      notifications: true,
    };
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  isLocked() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
  }

  toSafeObject() {
    return {
      _id: this._id,
      name: this.name,
      email: this.email,
      targetRole: this.targetRole,
      role: this.role,
      streak: this.streak,
      totalSessions: this.totalSessions,
      totalPoints: this.totalPoints,
      settings: this.settings,
      hasResume: !!this.resumeText,
      createdAt: this.createdAt,
    };
  }

  updateStreak() {
    this.streak = (this.streak || 0) + 1;
    this.lastActiveDate = new Date();
  }
}

class MemorySession {
  constructor(data) {
    this._id = data._id || generateId();
    this.user = data.user;
    this.role = data.role || 'SDE';
    this.difficulty = data.difficulty || 'Medium';
    this.pressureMode = !!data.pressureMode;
    this.rounds = data.rounds || ['Technical'];
    this.messages = data.messages || [];
    this.status = data.status || 'in-progress';
    this.duration = data.duration || 0;
    this.evaluation = data.evaluation || null;
    this.codeSubmissions = data.codeSubmissions || [];
    this.antiCheat = data.antiCheat || { tabSwitches: 0, pasteAttempts: 0, flagged: false };
    this.createdAt = data.createdAt || new Date();
    this.completedAt = data.completedAt || null;
  }
}

const memoryStore = {
  async createUser({ name, email, password, targetRole }) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new MemoryUser({ name, email, password: hashedPassword, targetRole });
    users.set(user._id, user);
    users.set(`email:${user.email}`, user);
    return user;
  },

  findUserByEmail(email) {
    if (!email) return null;
    return users.get(`email:${email.toLowerCase()}`) || null;
  },

  findUserById(id) {
    if (!id) return null;
    return users.get(id.toString()) || null;
  },

  createSession(data) {
    const session = new MemorySession(data);
    sessions.set(session._id, session);
    return session;
  },

  findSessionById(id) {
    if (!id) return null;
    return sessions.get(id.toString()) || null;
  },

  getUserSessions(userId) {
    const userSessions = [];
    for (const session of sessions.values()) {
      if (session.user.toString() === userId.toString()) {
        userSessions.push(session);
      }
    }
    return userSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getAllSessions() {
    return Array.from(sessions.values());
  }
};

module.exports = { memoryStore, MemoryUser, MemorySession };
