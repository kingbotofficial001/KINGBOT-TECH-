const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

function createDatabase(filePath = path.join(__dirname, 'kingbot.sqlite')) {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      plan TEXT NOT NULL DEFAULT 'free',
      mode TEXT NOT NULL DEFAULT 'demo',
      demoBalance REAL NOT NULL DEFAULT 100,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS brokerConnections (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      broker TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'connected',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      strategy TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'paused',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      plan TEXT NOT NULL,
      amount REAL NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS verificationTokens (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS riskProfiles (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE NOT NULL,
      riskMode TEXT NOT NULL DEFAULT 'balanced',
      riskPercent REAL NOT NULL DEFAULT 3,
      maxDrawdown REAL NOT NULL DEFAULT 10,
      maxDailyLoss REAL NOT NULL DEFAULT 500,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS academyCourses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      level TEXT NOT NULL,
      duration TEXT NOT NULL,
      description TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS academyEnrollments (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      courseId TEXT NOT NULL,
      enrolledAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id),
      FOREIGN KEY(courseId) REFERENCES academyCourses(id),
      UNIQUE(userId, courseId)
    );

    CREATE TABLE IF NOT EXISTS adminMetrics (
      id TEXT PRIMARY KEY,
      metric TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketSignals (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      direction TEXT NOT NULL,
      confidence INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tradeHistory (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      entryPrice REAL NOT NULL,
      exitPrice REAL NOT NULL,
      quantity REAL NOT NULL,
      pnl REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'closed',
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );
  `);

  db.prepare(`INSERT OR IGNORE INTO academyCourses (id, title, level, duration, description, createdAt) VALUES
    ('course-smc', 'SMC Trading Foundations', 'Intermediate', '8 lessons', 'Learn Smart Money Concepts, structure, and execution logic.', ?),
    ('course-risk', 'Risk Control Mastery', 'Beginner', '6 lessons', 'Build resilient risk rules for live and demo accounts.', ?),
    ('course-ai', 'AI Trading Signals', 'Advanced', '10 lessons', 'Understand signals, backtesting, and AI-assisted execution.', ?)
  `).run(new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

  db.prepare(`INSERT OR IGNORE INTO adminMetrics (id, metric, value, updatedAt) VALUES
    ('users', 'users', '0', ?),
    ('bots', 'bots', '0', ?),
    ('revenue', 'revenue', '$0', ?)
  `).run(new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

  return {
    db,
    async createUser({ name, email, password }) {
      const id = crypto.randomUUID();
      const hashed = crypto.createHash('sha256').update(password).digest('hex');
      const createdAt = new Date().toISOString();
      db.prepare(`INSERT INTO users (id, name, email, password, verified, plan, mode, demoBalance, createdAt) VALUES (?, ?, ?, ?, 0, 'free', 'demo', 100, ?)`)
        .run(id, name, email, hashed, createdAt);
      return { id, name, email, verified: 0, plan: 'free', mode: 'demo', demoBalance: 100, createdAt };
    },
    async getUserByEmail(email) {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
    },
    async getUserById(userId) {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) || null;
    },
    async validateUser(email, password) {
      const hashed = crypto.createHash('sha256').update(password).digest('hex');
      return db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, hashed) || null;
    },
    async createSession(userId) {
      const token = crypto.randomUUID();
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO sessions (id, userId, token, createdAt) VALUES (?, ?, ?, ?)').run(id, userId, token, createdAt);
      return token;
    },
    async getSessionUser(token) {
      const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
      if (!session) return null;
      return db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) || null;
    },
    async createVerificationToken(userId) {
      const token = crypto.randomUUID();
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO verificationTokens (id, userId, token, createdAt) VALUES (?, ?, ?, ?)').run(id, userId, token, createdAt);
      return token;
    },
    async verifyUserByToken(token) {
      const row = db.prepare('SELECT * FROM verificationTokens WHERE token = ?').get(token);
      if (!row) return null;
      db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(row.userId);
      db.prepare('DELETE FROM verificationTokens WHERE token = ?').run(token);
      return db.prepare('SELECT * FROM users WHERE id = ?').get(row.userId) || null;
    },
    async createBrokerConnection(userId, broker) {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO brokerConnections (id, userId, broker, status, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, userId, broker, 'connected', createdAt);
      return { id, userId, broker, status: 'connected', createdAt };
    },
    async getBrokerConnections(userId) {
      return db.prepare('SELECT * FROM brokerConnections WHERE userId = ?').all(userId);
    },
    async createBot(userId) {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO bots (id, userId, name, strategy, timeframe, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, userId, `Bot ${Date.now()}`, 'Mean Reversion', '1h', 'paused', createdAt);
      return { id, userId, name: 'Bot', strategy: 'Mean Reversion', timeframe: '1h', status: 'paused', createdAt };
    },
    async getBots(userId) {
      return db.prepare('SELECT * FROM bots WHERE userId = ?').all(userId);
    },
    async toggleBot(botId, userId) {
      const bot = db.prepare('SELECT * FROM bots WHERE id = ? AND userId = ?').get(botId, userId);
      if (!bot) return null;
      const newStatus = bot.status === 'running' ? 'paused' : 'running';
      db.prepare('UPDATE bots SET status = ? WHERE id = ?').run(newStatus, botId);
      return { ...bot, status: newStatus };
    },
    async setMode(userId, mode) {
      db.prepare('UPDATE users SET mode = ? WHERE id = ?').run(mode, userId);
      return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) || null;
    },
    async activatePlan(userId, plan) {
      const plans = { starter: 100, professional: 450, enterprise: 1400 };
      const amount = plans[plan] || 100;
      db.prepare('UPDATE users SET plan = ?, demoBalance = 1000 WHERE id = ?').run(plan, userId);
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO payments (id, userId, plan, amount, createdAt) VALUES (?, ?, ?, ?, ?)').run(id, userId, plan, amount, createdAt);
      return { plan, amount };
    },
    async saveRiskProfile(userId, profile) {
      const id = crypto.randomUUID();
      const updatedAt = new Date().toISOString();
      const existing = db.prepare('SELECT * FROM riskProfiles WHERE userId = ?').get(userId);
      if (existing) {
        db.prepare('UPDATE riskProfiles SET riskMode = ?, riskPercent = ?, maxDrawdown = ?, maxDailyLoss = ?, updatedAt = ? WHERE userId = ?').run(profile.riskMode || 'balanced', profile.riskPercent || 3, profile.maxDrawdown || 10, profile.maxDailyLoss || 500, updatedAt, userId);
        return { ...existing, ...profile, updatedAt };
      }
      db.prepare('INSERT INTO riskProfiles (id, userId, riskMode, riskPercent, maxDrawdown, maxDailyLoss, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, userId, profile.riskMode || 'balanced', profile.riskPercent || 3, profile.maxDrawdown || 10, profile.maxDailyLoss || 500, updatedAt);
      return { id, userId, ...profile, updatedAt };
    },
    async getRiskProfile(userId) {
      return db.prepare('SELECT * FROM riskProfiles WHERE userId = ?').get(userId) || null;
    },
    async getAcademyCourses() {
      return db.prepare('SELECT * FROM academyCourses ORDER BY title').all();
    },
    async enrollInCourse(userId, courseId) {
      const id = crypto.randomUUID();
      const enrolledAt = new Date().toISOString();
      db.prepare('INSERT OR IGNORE INTO academyEnrollments (id, userId, courseId, enrolledAt) VALUES (?, ?, ?, ?)').run(id, userId, courseId, enrolledAt);
      return { id, userId, courseId, enrolledAt };
    },
    async getAcademyEnrollments(userId) {
      return db.prepare('SELECT * FROM academyEnrollments WHERE userId = ?').all(userId);
    },
    async getAdminMetrics() {
      return db.prepare('SELECT metric, value FROM adminMetrics ORDER BY metric').all();
    },
    async createSignal({ symbol, direction, confidence, price }) {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO marketSignals (id, symbol, direction, confidence, price, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(id, symbol, direction, confidence, price, createdAt);
      return { id, symbol, direction, confidence, price, createdAt };
    },
    async getSignals() {
      return db.prepare('SELECT * FROM marketSignals ORDER BY createdAt DESC LIMIT 10').all();
    },
    async createTrade({ userId, symbol, side, entryPrice, exitPrice, quantity, pnl, status }) {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      db.prepare('INSERT INTO tradeHistory (id, userId, symbol, side, entryPrice, exitPrice, quantity, pnl, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, userId, symbol, side, entryPrice, exitPrice, quantity, pnl, status || 'closed', createdAt);
      return { id, userId, symbol, side, entryPrice, exitPrice, quantity, pnl, status: status || 'closed', createdAt };
    },
    async getTrades(userId) {
      return db.prepare('SELECT * FROM tradeHistory WHERE userId = ? ORDER BY createdAt DESC LIMIT 10').all(userId);
    },
    async close() {
      db.close();
    }
  };
}

module.exports = { createDatabase };
