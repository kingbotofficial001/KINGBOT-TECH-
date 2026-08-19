"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const google_auth_library_1 = require("google-auth-library");
const db_1 = require("./db");
const User_1 = __importDefault(require("./models/User"));
const Bot_1 = __importDefault(require("./models/Bot"));
const BrokerConnection_1 = __importDefault(require("./models/BrokerConnection"));
const auth_1 = require("./utils/auth");
const logger_1 = __importDefault(require("./utils/logger"));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@gibsonfx.online').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@124#';
const googleClient = GOOGLE_CLIENT_ID ? new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID) : null;
const PUBLIC_DIR = path_1.default.join(__dirname, '..', '..', 'public');
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const cookieToken = req.cookies?.kingbotToken;
    const token = header.startsWith('Bearer ') ? header.slice(7) : cookieToken;
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const payload = (0, auth_1.verifyToken)(token);
    if (!payload) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
    req.userId = payload.sub;
    req.tokenRole = payload.role;
    next();
}
const requireAdmin = [
    requireAuth,
    db_1.requireDatabase,
    asyncHandler(async (req, res, next) => {
        if (req.tokenRole !== 'admin') {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        const user = await User_1.default.findById(req.userId);
        if (!user || !user.isAdmin || user.email !== ADMIN_EMAIL) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        req.adminUser = user;
        next();
    }),
];
async function ensureReferralCode(user) {
    if (user.referralCode)
        return user.referralCode;
    let code = (0, auth_1.generateReferralCode)(user.name || 'KING');
    while (await User_1.default.exists({ referralCode: code })) {
        code = (0, auth_1.generateReferralCode)(user.name || 'KING');
    }
    user.referralCode = code;
    await user.save();
    return code;
}
async function applyReferral(newUser, refCode) {
    if (typeof refCode !== 'string' || !refCode.trim())
        return;
    const referrer = await User_1.default.findOne({ referralCode: refCode.trim().toUpperCase() });
    if (!referrer || referrer._id.equals(newUser._id))
        return;
    newUser.referredBy = referrer._id;
    await newUser.save();
    referrer.referralCount += 1;
    await referrer.save();
    logger_1.default.info(`Referral recorded: ${newUser.email} joined via ${referrer.email}`);
}
const REFERRAL_TIERS = [
    { name: 'Starter tier', min: 0, rate: 20 },
    { name: 'Elite tier', min: 10, rate: 30 },
    { name: 'Royal tier', min: 25, rate: 40 },
];
function referralTier(count) {
    let current = REFERRAL_TIERS[0];
    let next = null;
    for (const tier of REFERRAL_TIERS) {
        if (count >= tier.min)
            current = tier;
        else if (!next)
            next = tier;
    }
    return { current, next };
}
app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'kingbot-platform', database: (0, db_1.isDatabaseConnected)() ? 'connected' : 'unavailable' });
});
app.get('/api/config', (req, res) => {
    res.json({ googleClientId: GOOGLE_CLIENT_ID });
});
app.post('/api/signup', db_1.requireDatabase, asyncHandler(async (req, res) => {
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
    const existing = await User_1.default.findOne({ email: normalizedEmail });
    if (existing) {
        res.status(409).json({ error: 'An account with that email already exists' });
        return;
    }
    const passwordHash = await (0, auth_1.hashPassword)(password);
    const user = await User_1.default.create({
        name,
        email: normalizedEmail,
        passwordHash,
        termsAcceptedAt: new Date(),
        referralCode: (0, auth_1.generateReferralCode)(name),
    });
    await applyReferral(user, ref);
    const token = (0, auth_1.signToken)(user);
    logger_1.default.info(`New account created: ${user.email}`);
    res.status(201).json({ token, user: (0, auth_1.publicUser)(user) });
}));
app.post('/api/login', db_1.requireDatabase, asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || '').toLowerCase();
    if (normalizedEmail === ADMIN_EMAIL) {
        res.status(403).json({ error: 'Please use the admin login page for this account.' });
        return;
    }
    const user = await User_1.default.findOne({ email: normalizedEmail });
    if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    const valid = await (0, auth_1.comparePassword)(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    const token = (0, auth_1.signToken)(user);
    res.json({ token, user: (0, auth_1.publicUser)(user) });
}));
app.post('/api/auth/google', db_1.requireDatabase, asyncHandler(async (req, res) => {
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
    }
    catch {
        logger_1.default.warn('Google credential verification failed');
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
    let user = await User_1.default.findOne({ $or: [{ googleId: payload.sub }, { email: normalizedEmail }] });
    if (!user) {
        if (!acceptedTerms) {
            res.status(412).json({ error: 'terms_required' });
            return;
        }
        user = await User_1.default.create({
            name: payload.name || 'Trader',
            email: normalizedEmail,
            googleId: payload.sub,
            avatar: payload.picture || null,
            verified: !!payload.email_verified,
            termsAcceptedAt: new Date(),
            referralCode: (0, auth_1.generateReferralCode)(payload.name || 'Trader'),
        });
        await applyReferral(user, ref);
        logger_1.default.info(`New Google account created: ${user.email}`);
    }
    else if (!user.googleId) {
        user.googleId = payload.sub;
        user.avatar = user.avatar || payload.picture || null;
        await user.save();
    }
    const token = (0, auth_1.signToken)(user);
    res.json({ token, user: (0, auth_1.publicUser)(user) });
}));
app.get('/api/me', requireAuth, db_1.requireDatabase, asyncHandler(async (req, res) => {
    const user = await User_1.default.findById(req.userId);
    if (!user) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
    await ensureReferralCode(user);
    res.json({ user: (0, auth_1.publicUser)(user) });
}));
app.patch('/api/me', requireAuth, db_1.requireDatabase, asyncHandler(async (req, res) => {
    const user = await User_1.default.findById(req.userId);
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
        const taken = await User_1.default.findOne({ email, _id: { $ne: user._id } });
        if (taken) {
            res.status(409).json({ error: 'Email already in use' });
            return;
        }
        user.email = email;
    }
    await user.save();
    res.json({ user: (0, auth_1.publicUser)(user) });
}));
app.get('/api/referrals', requireAuth, db_1.requireDatabase, asyncHandler(async (req, res) => {
    const user = await User_1.default.findById(req.userId);
    if (!user) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
    const code = await ensureReferralCode(user);
    const referredUsers = await User_1.default.find({ referredBy: user._id })
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
app.get('/api/mode', requireAuth, db_1.requireDatabase, asyncHandler(async (req, res) => {
    const user = await User_1.default.findById(req.userId);
    if (!user) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
    res.json({ mode: user.mode });
}));
app.post('/api/mode', requireAuth, db_1.requireDatabase, asyncHandler(async (req, res) => {
    const user = await User_1.default.findById(req.userId);
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
app.get('/api/bots', requireAuth, db_1.requireDatabase, asyncHandler(async (req, res) => {
    const bots = await Bot_1.default.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ bots });
}));
app.post('/api/bots', requireAuth, db_1.requireDatabase, asyncHandler(async (req, res) => {
    const { action, id } = req.body || {};
    if (action === 'create') {
        const bot = await Bot_1.default.create({ user: req.userId, name: `KING BOT #${Math.floor(Math.random() * 900) + 100}` });
        res.json({ bot });
        return;
    }
    if (action === 'toggle') {
        const bot = await Bot_1.default.findOne({ _id: id, user: req.userId });
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
app.post('/api/payment', requireAuth, db_1.requireDatabase, asyncHandler(async (req, res) => {
    const user = await User_1.default.findById(req.userId);
    if (!user) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
    const plan = req.body.plan || 'starter';
    const amounts = { starter: 100, professional: 450, enterprise: 1400 };
    const wasFree = user.plan === 'free';
    user.plan = plan;
    await user.save();
    if (wasFree && user.referredBy) {
        const referrer = await User_1.default.findById(user.referredBy);
        if (referrer) {
            const tier = referralTier(referrer.referralCount);
            referrer.referralEarnings += ((amounts[plan] || 0) * tier.current.rate) / 100;
            await referrer.save();
        }
    }
    res.json({ message: `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan activated successfully.`, amount: amounts[plan] || 0, user: (0, auth_1.publicUser)(user) });
}));
app.post('/api/broker/connect', requireAuth, db_1.requireDatabase, asyncHandler(async (req, res) => {
    const connection = await BrokerConnection_1.default.create({ user: req.userId, broker: req.body.broker || 'MT5' });
    res.json({ connection });
}));
app.get('/api/analytics', requireAuth, db_1.requireDatabase, asyncHandler(async (req, res) => {
    const user = await User_1.default.findById(req.userId);
    if (!user) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
    const [bots, brokers] = await Promise.all([
        Bot_1.default.find({ user: req.userId }),
        BrokerConnection_1.default.find({ user: req.userId }),
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
app.post('/api/admin/login', db_1.requireDatabase, asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || '').toLowerCase();
    if (normalizedEmail !== ADMIN_EMAIL) {
        res.status(401).json({ error: 'Invalid admin credentials' });
        return;
    }
    let admin = await User_1.default.findOne({ email: ADMIN_EMAIL });
    if (!admin) {
        admin = await User_1.default.create({
            name: 'King Bot Admin',
            email: ADMIN_EMAIL,
            passwordHash: await (0, auth_1.hashPassword)(ADMIN_PASSWORD),
            isAdmin: true,
            verified: true,
            plan: 'enterprise',
            termsAcceptedAt: new Date(),
            referralCode: (0, auth_1.generateReferralCode)('KING'),
        });
        logger_1.default.info('Admin account created on demand.');
    }
    const valid = await (0, auth_1.comparePassword)(password, admin.passwordHash);
    if (!valid) {
        res.status(401).json({ error: 'Invalid admin credentials' });
        return;
    }
    const token = (0, auth_1.signToken)(admin, 'admin');
    res.json({ token, user: (0, auth_1.publicUser)(admin) });
}));
app.get('/api/admin/stats', ...requireAdmin, asyncHandler(async (req, res) => {
    const [totalUsers, totalBots, activeBots, totalBrokers, recentUsers] = await Promise.all([
        User_1.default.countDocuments({ isAdmin: { $ne: true } }),
        Bot_1.default.countDocuments(),
        Bot_1.default.countDocuments({ active: true }),
        BrokerConnection_1.default.countDocuments(),
        User_1.default.find({ isAdmin: { $ne: true } }).sort({ createdAt: -1 }).limit(8).select('name email plan mode createdAt avatar'),
    ]);
    res.json({ totalUsers, totalBots, activeBots, totalBrokers, recentUsers });
}));
app.get('/api/admin/users', ...requireAdmin, asyncHandler(async (req, res) => {
    const users = await User_1.default.find({ isAdmin: { $ne: true } })
        .sort({ createdAt: -1 })
        .select('name email plan mode verified createdAt avatar googleId referralCode referralCount');
    res.json({ users });
}));
const adminRouteMap = {
    '/admin': 'admin/login.html',
    '/admin/login': 'admin/login.html',
    '/admin/dashboard': 'admin/dashboard.html',
};
const routeMap = {
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
app.use(express_1.default.static(PUBLIC_DIR, { extensions: ['html'] }));
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/'))
        return next();
    const mapped = routeMap[req.path];
    if (mapped) {
        res.sendFile(path_1.default.join(PUBLIC_DIR, mapped));
        return;
    }
    res.sendFile(path_1.default.join(PUBLIC_DIR, 'index.html'));
});
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
app.use((err, req, res, next) => {
    logger_1.default.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
    if (res.headersSent)
        return next(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
async function seedAdmin() {
    if (!(0, db_1.isDatabaseConnected)())
        return;
    try {
        const existing = await User_1.default.findOne({ email: ADMIN_EMAIL });
        if (!existing) {
            await User_1.default.create({
                name: 'King Bot Admin',
                email: ADMIN_EMAIL,
                passwordHash: await (0, auth_1.hashPassword)(ADMIN_PASSWORD),
                isAdmin: true,
                verified: true,
                plan: 'enterprise',
                termsAcceptedAt: new Date(),
                referralCode: (0, auth_1.generateReferralCode)('KING'),
            });
            logger_1.default.info(`Admin account ready: ${ADMIN_EMAIL}`);
        }
        else if (!existing.isAdmin) {
            existing.isAdmin = true;
            await existing.save();
        }
    }
    catch (err) {
        logger_1.default.error('Could not seed admin account', err);
    }
}
let server;
async function start() {
    const connected = await (0, db_1.connectDatabase)();
    if (connected) {
        await seedAdmin();
    }
    else {
        logger_1.default.warn('Starting server without a database connection. API routes that need data will return 503 until MONGODB_URI is reachable.');
    }
    server = app.listen(PORT, HOST, () => {
        logger_1.default.info(`KING BOT server running on http://${HOST}:${PORT}`);
    });
}
process.on('unhandledRejection', (reason) => {
    logger_1.default.error('Unhandled promise rejection', reason instanceof Error ? reason : new Error(String(reason)));
});
process.on('uncaughtException', (err) => {
    logger_1.default.error('Uncaught exception', err);
});
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully.');
    server?.close(() => process.exit(0));
});
start();
exports.default = app;
