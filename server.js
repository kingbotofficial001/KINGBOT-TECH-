const http = require('http');
const fs = require('fs');
const path = require('path');
const { createDatabase } = require('./storage');

const PORT = Number(process.env.PORT) || 3000;
const dbPromise = createDatabase(path.join(__dirname, 'kingbot.sqlite'));

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    case '.js': return 'application/javascript';
    case '.json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

const handleRequest = async (req, res) => {
  const db = await dbPromise;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'kingbot-platform' });
    return;
  }

  if (pathname === '/api/signup') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const body = await parseBody(req);
      const existing = await db.getUserByEmail(body.email);
      if (existing) {
        sendJson(res, 409, { error: 'User already exists' });
        return;
      }

      const user = await db.createUser({ name: body.name || 'Trader', email: body.email, password: body.password });
      const token = await db.createSession(user.id);
      const verificationToken = await db.createVerificationToken(user.id);
      sendJson(res, 201, { user: { id: user.id, email: user.email, name: user.name, verified: user.verified, plan: user.plan, demoBalance: user.demoBalance, mode: user.mode }, token, verificationToken });
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
    }
    return;
  }

  if (pathname === '/api/verify') {
    const token = url.searchParams.get('token');
    if (!token) {
      sendJson(res, 400, { error: 'Missing verification token' });
      return;
    }
    const user = await db.verifyUserByToken(token);
    sendJson(res, 200, { verified: !!user, user });
    return;
  }

  if (pathname === '/api/login') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const body = await parseBody(req);
      const user = await db.validateUser(body.email, body.password);
      if (!user) {
        sendJson(res, 401, { error: 'Invalid credentials' });
        return;
      }
      const token = await db.createSession(user.id);
      sendJson(res, 200, { token, user: { id: user.id, email: user.email, name: user.name, verified: user.verified, plan: user.plan, demoBalance: user.demoBalance, mode: user.mode } });
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
    }
    return;
  }

  if (pathname === '/api/me') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    const user = await db.getSessionUser(token);
    if (!user) {
      sendJson(res, 401, { error: 'Invalid token' });
      return;
    }
    sendJson(res, 200, { user: { id: user.id, email: user.email, name: user.name, verified: user.verified, plan: user.plan, demoBalance: user.demoBalance, mode: user.mode } });
    return;
  }

  if (pathname === '/api/mode') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    const user = await db.getSessionUser(token);
    if (!user) {
      sendJson(res, 401, { error: 'Invalid token' });
      return;
    }
    if (req.method === 'GET') {
      sendJson(res, 200, { mode: user.mode });
      return;
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const mode = body.mode === 'live' ? 'live' : 'demo';
      if (mode === 'live' && !['starter', 'professional', 'enterprise'].includes(user.plan)) {
        sendJson(res, 403, { error: 'Live mode requires a paid plan.' });
        return;
      }
      const updated = await db.setMode(user.id, mode);
      sendJson(res, 200, { mode: updated.mode });
      return;
    }
  }

  if (pathname === '/api/bots') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    const user = await db.getSessionUser(token);
    if (!user) {
      sendJson(res, 401, { error: 'Invalid token' });
      return;
    }
    if (req.method === 'GET') {
      const bots = await db.getBots(user.id);
      sendJson(res, 200, { bots });
      return;
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      if (body.action === 'create') {
        const bot = await db.createBot(user.id);
        sendJson(res, 200, { bot });
        return;
      }
      if (body.action === 'toggle') {
        const bot = await db.toggleBot(body.id, user.id);
        if (!bot) {
          sendJson(res, 404, { error: 'Bot not found' });
          return;
        }
        sendJson(res, 200, { bot });
        return;
      }
      sendJson(res, 400, { error: 'Invalid bot action' });
      return;
    }
  }

  if (pathname === '/api/payment') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    const body = await parseBody(req);
    const user = await db.getSessionUser(token);
    if (!user) {
      sendJson(res, 401, { error: 'Invalid token' });
      return;
    }
    const plan = body.plan || 'starter';
    const result = await db.activatePlan(user.id, plan);
    sendJson(res, 200, { message: `${plan} plan activated successfully.`, amount: result.amount });
    return;
  }

  if (pathname === '/api/ai') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    const body = await parseBody(req);
    const message = (body.message || '').trim();
    const reply = message
      ? `AI Trading Assistant: I reviewed your request about ${message}. For live execution, connect a broker and activate a strategy with risk controls.`
      : 'AI Trading Assistant: Ask about strategy setup, broker connectivity, or analytics.';
    sendJson(res, 200, { reply });
    return;
  }

  if (pathname === '/api/broker/connect') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    const token = req.headers.authorization?.replace('Bearer ', '');
    const body = await parseBody(req);
    const user = await db.getSessionUser(token);
    if (!user) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    const connection = await db.createBrokerConnection(user.id, body.broker || 'MT5');
    sendJson(res, 200, { connection });
    return;
  }

  if (pathname === '/api/analytics') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    const user = await db.getSessionUser(token);
    if (!user) {
      sendJson(res, 401, { error: 'Invalid token' });
      return;
    }
    const brokers = await db.getBrokerConnections(user.id);
    const bots = await db.getBots(user.id);
    sendJson(res, 200, {
      user: user.name || 'Trader',
      balance: user.demoBalance || 100,
      winRate: 94.2,
      monthlyPnL: 14280,
      activeBots: bots.length,
      connectedBrokers: brokers.length,
      mode: user.mode,
      plan: user.plan,
    });
    return;
  }

  if (pathname === '/api/markets') {
    sendJson(res, 200, {
      markets: [
        { symbol: 'EUR/USD', price: 1.0894, change: '+0.52%' },
        { symbol: 'BTC/USD', price: 62948.12, change: '+1.14%' },
        { symbol: 'XAU/USD', price: 2374.8, change: '-0.33%' },
        { symbol: 'SPX500', price: 5524.12, change: '+0.81%' }
      ]
    });
    return;
  }

  if (pathname.startsWith('/api/')) {
    sendJson(res, 404, { error: 'Route not found' });
    return;
  }

  const routeMap = {
    '/': '/index.html',
    '/pricing': '/pricing.html',
    '/strategies': '/strategies.html',
    '/settings': '/settings.html',
    '/brokers': '/brokers.html',
    '/dashboard': '/dashboard.html',
    '/signup': '/signup.html',
    '/login': '/login.html',
    '/analytics': '/analytics.html',
  };

  const filePath = routeMap[pathname] || pathname;
  const safePath = path.normalize(filePath).replace(/^\.(?:\/|$)/, '');
  const absolutePath = path.join(__dirname, safePath);
  if (!absolutePath.startsWith(__dirname)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
    serveFile(res, absolutePath, getContentType(absolutePath));
  } else {
    serveFile(res, path.join(__dirname, 'index.html'), 'text/html');
  }
};

function startServer(port) {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('Request failed:', error);
      sendJson(res, 500, { error: 'Internal server error' });
    });
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < 3100) {
      console.warn(`Port ${port} is busy; trying ${port + 1}`);
      startServer(port + 1);
      return;
    }
    console.error(error);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`KINGBOT server running on http://127.0.0.1:${port}`);
  });
}

startServer(PORT);
