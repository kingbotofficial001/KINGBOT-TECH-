import 'dotenv/config';
import path from 'path';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { OAuth2Client } from 'google-auth-library';
import type { Server } from 'http';
import { connectDatabase, isDatabaseConnected, requireDatabase } from './db';
import User, { IUser } from './models/User';
import Bot from './models/Bot';
import BrokerConnection from './models/BrokerConnection';
import { hashPassword, comparePassword, signToken, verifyToken, publicUser, generateReferralCode } from './utils/auth';
import logger from './utils/logger';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tokenRole?: string;
      adminUser?: IUser;
    }
  }
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@gibsonfx.online').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@124#';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

const asyncHandler =
  (handler: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.kingbotToken;
  const token = header.startsWith('Bearer ') ? header.slice(7) : cookieToken;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  req.userId = payload.sub;
  req.tokenRole = payload.role;
  next();
}

const requireAdmin: RequestHandler[] = [
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res, next) => {
    if (req.tokenRole !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    const user = await User.findById(req.userId);
    if (!user || !user.isAdmin || user.email !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    req.adminUser = user;
    next();
  }),
];

async function ensureReferralCode(user: IUser): Promise<string> {
  if (user.referralCode) return user.referralCode;
  let code = generateReferralCode(user.name || 'KING');
  while (await User.exists({ referralCode: code })) {
    code = generateReferralCode(user.name || 'KING');
  }
  user.referralCode = code;
  await user.save();
  return code;
}

async function applyReferral(newUser: IUser, refCode: unknown): Promise<void> {
  if (typeof refCode !== 'string' || !refCode.trim()) return;
  const referrer = await User.findOne({ referralCode: refCode.trim().toUpperCase() });
  if (!referrer || referrer._id.equals(newUser._id)) return;
  newUser.referredBy = referrer._id;
  await newUser.save();
  referrer.referralCount += 1;
  await referrer.save();
  logger.info(`Referral recorded: ${newUser.email} joined via ${referrer.email}`);
}

const REFERRAL_TIERS = [
  { name: 'Starter tier', min: 0, rate: 20 },
  { name: 'Elite tier', min: 10, rate: 30 },
  { name: 'Royal tier', min: 25, rate: 40 },
];

function referralTier(count: number) {
  let current = REFERRAL_TIERS[0];
  let next: { name: string; min: number; rate: number } | null = null;
  for (const tier of REFERRAL_TIERS) {
    if (count >= tier.min) current = tier;
    else if (!next) next = tier;
  }
  return { current, next };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'kingbot-platform', database: isDatabaseConnected() ? 'connected' : 'unavailable' });
});

app.get('/api/config', (req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID });
});

app.post('/api/signup', requireDatabase, asyncHandler(async (req, res) => {
  const { name, email, password, acceptedTerms, ref } = req.body || {};
  if (!email || !password || !name) {
    res.status(400).json({ error: 'Name, email and password are required' });
    return;
  }
  if (!acceptedTerms) {
    res.status(400).json({ error: 'You must accept the Terms and Conditions' });
    return;
  }
  const normalizedEmail = String(email).toLowerCase();
  if (normalizedEmail === ADMIN_EMAIL) {
    res.status(403).json({ error: 'This email is reserved. Please use a different email address.' });
    return;
  }
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    res.status(409).json({ error: 'An account with that email already exists' });
    return;
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    termsAcceptedAt: new Date(),
    referralCode: generateReferralCode(name),
  });
  await applyReferral(user, ref);
  const token = signToken(user);
  logger.info(`New account created: ${user.email}`);
  res.status(201).json({ token, user: publicUser(user) });
}));

app.post('/api/login', requireDatabase, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').toLowerCase();
  if (normalizedEmail === ADMIN_EMAIL) {
    res.status(403).json({ error: 'Please use the admin login page for this account.' });
    return;
  }
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
}));

app.post('/api/auth/google', requireDatabase, asyncHandler(async (req, res) => {
  const { credential, acceptedTerms, ref } = req.body || {};
  if (!credential) {
    res.status(400).json({ error: 'Missing Google credential' });
    return;
  }
  if (!googleClient) {
    res.status(500).json({ error: 'Google OAuth is not configured' });
    return;
  }
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    logger.warn('Google credential verification failed');
    res.status(401).json({ error: 'Google sign-in failed' });
    return;
  }
  if (!payload || !payload.email) {
    res.status(400).json({ error: 'Invalid Google credential' });
    return;
  }
  const normalizedEmail = payload.email.toLowerCase();
  if (normalizedEmail === ADMIN_EMAIL) {
    res.status(403).json({ error: 'This account cannot sign in with Google. Use the admin login page.' });
    return;
  }
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: normalizedEmail }] });
  if (!user) {
    if (!acceptedTerms) {
      res.status(412).json({ error: 'terms_required' });
      return;
    }
    user = await User.create({
      name: payload.name || 'Trader',
      email: normalizedEmail,
      googleId: payload.sub,
      avatar: payload.picture || null,
      verified: !!payload.email_verified,
      termsAcceptedAt: new Date(),
      referralCode: generateReferralCode(payload.name || 'Trader'),
    });
    await applyReferral(user, ref);
    logger.info(`New Google account created: ${user.email}`);
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    user.avatar = user.avatar || payload.picture || null;
    await user.save();
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
}));

app.get('/api/me', requireAuth, requireDatabase, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  await ensureReferralCode(user);
  res.json({ user: publicUser(user) });
}));

app.patch('/api/me', requireAuth, requireDatabase, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : null;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : null;
  if (name !== null) {
    if (name.length < 2) {
      res.status(400).json({ error: 'Name must be at least 2 characters' });
      return;
    }
    user.name = name;
  }
  if (email !== null) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }
    const taken = await User.findOne({ email, _id: { $ne: user._id } });
    if (taken) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }
    user.email = email;
  }
  await user.save();
  res.json({ user: publicUser(user) });
}));

app.get('/api/referrals', requireAuth, requireDatabase, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  const code = await ensureReferralCode(user);
  const referredUsers = await User.find({ referredBy: user._id })
    .sort({ createdAt: -1 })
    .select('name plan createdAt');
  const count = referredUsers.length;
  const tier = referralTier(count);
  res.json({
    code,
    count,
    earnings: user.referralEarnings,
    tier: tier.current,
    nextTier: tier.next,
    referrals: referredUsers.map((entry) => ({
      name: entry.name,
      plan: entry.plan,
      joinedAt: entry.createdAt,
    })),
  });
}));

app.get('/api/mode', requireAuth, requireDatabase, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  res.json({ mode: user.mode });
}));

app.post('/api/mode', requireAuth, requireDatabase, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  const mode = req.body.mode === 'live' ? 'live' : 'demo';
  if (mode === 'live' && !['starter', 'professional', 'enterprise'].includes(user.plan)) {
    res.status(403).json({ error: 'Live mode requires a paid plan.' });
    return;
  }
  user.mode = mode;
  await user.save();
  res.json({ mode: user.mode });
}));

app.get('/api/bots', requireAuth, requireDatabase, asyncHandler(async (req, res) => {
  const bots = await Bot.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json({ bots });
}));

app.post('/api/bots', requireAuth, requireDatabase, asyncHandler(async (req, res) => {
  const { action, id } = req.body || {};
  if (action === 'create') {
    const bot = await Bot.create({ user: req.userId, name: `KING BOT #${Math.floor(Math.random() * 900) + 100}` });
    res.json({ bot });
    return;
  }
  if (action === 'toggle') {
    const bot = await Bot.findOne({ _id: id, user: req.userId });
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }
    bot.active = !bot.active;
    await bot.save();
    res.json({ bot });
    return;
  }
  res.status(400).json({ error: 'Invalid bot action' });
}));

app.post('/api/payment', requireAuth, requireDatabase, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  const plan = req.body.plan || 'starter';
  const amounts: Record<string, number> = { starter: 100, professional: 450, enterprise: 1400 };
  const wasFree = user.plan === 'free';
  user.plan = plan;
  await user.save();
  if (wasFree && user.referredBy) {
    const referrer = await User.findById(user.referredBy);
    if (referrer) {
      const tier = referralTier(referrer.referralCount);
      referrer.referralEarnings += ((amounts[plan] || 0) * tier.current.rate) / 100;
      await referrer.save();
    }
  }
  res.json({ message: `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan activated successfully.`, amount: amounts[plan] || 0, user: publicUser(user) });
}));

app.post('/api/broker/connect', requireAuth, requireDatabase, asyncHandler(async (req, res) => {
  const connection = await BrokerConnection.create({ user: req.userId, broker: req.body.broker || 'MT5' });
  res.json({ connection });
}));

app.get('/api/analytics', requireAuth, requireDatabase, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  const [bots, brokers] = await Promise.all([
    Bot.find({ user: req.userId }),
    BrokerConnection.find({ user: req.userId }),
  ]);
  res.json({
    user: user.name || 'Trader',
    balance: user.demoBalance || 100,
    winRate: 87.32,
    monthlyPnL: 1842.35,
    activeBots: bots.filter((bot) => bot.active).length,
    totalBots: bots.length,
    connectedBrokers: brokers.length,
    mode: user.mode,
    plan: user.plan,
  });
}));

app.get('/api/markets', (req, res) => {
  res.json({
    markets: [
      { symbol: 'XAUUSD', price: 2398.45, change: '+0.68%' },
      { symbol: 'EURUSD', price: 1.08936, change: '-0.12%' },
      { symbol: 'GBPUSD', price: 1.27154, change: '+0.23%' },
      { symbol: 'BTCUSD', price: 65342.21, change: '+1.32%' },
    ],
  });
});

app.get('/api/positions', requireAuth, (req, res) => {
  res.json({
    positions: [
      { symbol: 'XAUUSD', side: 'buy', lots: 2.5, entry: 2398.45, current: 2401.92, pnl: 186.45, pnlPct: 3.47 },
      { symbol: 'EURUSD', side: 'buy', lots: 1.2, entry: 1.08936, current: 1.09012, pnl: 42.18, pnlPct: 0.76 },
      { symbol: 'GBPUSD', side: 'sell', lots: 1.0, entry: 1.27154, current: 1.27009, pnl: -15.32, pnlPct: -1.14 },
      { symbol: 'BTCUSD', side: 'buy', lots: 0.1, entry: 65342.21, current: 65701.85, pnl: 35.64, pnlPct: 0.55 },
    ],
  });
});

app.post('/api/admin/login', requireDatabase, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').toLowerCase();
  if (normalizedEmail !== ADMIN_EMAIL) {
    res.status(401).json({ error: 'Invalid admin credentials' });
    return;
  }
  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await User.create({
      name: 'King Bot Admin',
      email: ADMIN_EMAIL,
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      isAdmin: true,
      verified: true,
      plan: 'enterprise',
      termsAcceptedAt: new Date(),
      referralCode: generateReferralCode('KING'),
    });
    logger.info('Admin account created on demand.');
  }
  const valid = await comparePassword(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid admin credentials' });
    return;
  }
  const token = signToken(admin, 'admin');
  res.json({ token, user: publicUser(admin) });
}));

app.get('/api/admin/stats', ...requireAdmin, asyncHandler(async (req, res) => {
  const [totalUsers, totalBots, activeBots, totalBrokers, recentUsers] = await Promise.all([
    User.countDocuments({ isAdmin: { $ne: true } }),
    Bot.countDocuments(),
    Bot.countDocuments({ active: true }),
    BrokerConnection.countDocuments(),
    User.find({ isAdmin: { $ne: true } }).sort({ createdAt: -1 }).limit(8).select('name email plan mode createdAt avatar'),
  ]);
  res.json({ totalUsers, totalBots, activeBots, totalBrokers, recentUsers });
}));

app.get('/api/admin/users', ...requireAdmin, asyncHandler(async (req, res) => {
  const users = await User.find({ isAdmin: { $ne: true } })
    .sort({ createdAt: -1 })
    .select('name email plan mode verified createdAt avatar googleId referralCode referralCount');
  res.json({ users });
}));

const adminRouteMap: Record<string, string> = {
  '/admin': 'admin/login.html',
  '/admin/login': 'admin/login.html',
  '/admin/dashboard': 'admin/dashboard.html',
};

const routeMap: Record<string, string> = {
  '/': 'index.html',
  '/pricing': 'pricing.html',
  '/strategies': 'strategies.html',
  '/settings': 'settings.html',
  '/brokers': 'brokers.html',
  '/dashboard': 'dashboard.html',
  '/signup': 'signup.html',
  '/login': 'login.html',
  '/analytics': 'analytics.html',
  '/trading-bots': 'trading-bots.html',
  '/signals': 'signals.html',
  '/trade-history': 'trade-history.html',
  '/risk-manager': 'risk-manager.html',
  '/academy': 'academy.html',
  '/affiliates': 'affiliates.html',
  '/support': 'support.html',
  '/legal/privacy': 'legal/privacy.html',
  '/legal/terms': 'legal/terms.html',
  '/legal/risk': 'legal/risk.html',
  ...adminRouteMap,
};

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const mapped = routeMap[req.path];
  if (mapped) {
    res.sendFile(path.join(PUBLIC_DIR, mapped));
    return;
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

async function seedAdmin(): Promise<void> {
  if (!isDatabaseConnected()) return;
  try {
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (!existing) {
      await User.create({
        name: 'King Bot Admin',
        email: ADMIN_EMAIL,
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        isAdmin: true,
        verified: true,
        plan: 'enterprise',
        termsAcceptedAt: new Date(),
        referralCode: generateReferralCode('KING'),
      });
      logger.info(`Admin account ready: ${ADMIN_EMAIL}`);
    } else if (!existing.isAdmin) {
      existing.isAdmin = true;
      await existing.save();
    }
  } catch (err) {
    logger.error('Could not seed admin account', err);
  }
}

let server: Server | undefined;

async function start(): Promise<void> {
  const connected = await connectDatabase();
  if (connected) {
    await seedAdmin();
  } else {
    logger.warn('Starting server without a database connection. API routes that need data will return 503 until MONGODB_URI is reachable.');
  }
  server = app.listen(PORT, HOST, () => {
    logger.info(`KING BOT server running on http://${HOST}:${PORT}`);
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully.');
  server?.close(() => process.exit(0));
});

start();

export default app;
