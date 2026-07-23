const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], sessions: [], brokerConnections: [] }, null, 2));
  }
}

function readData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

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

const server = http.createServer(async (req, res) => {
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
      const data = readData();
      const existing = data.users.find((user) => user.email === body.email);
      if (existing) {
        sendJson(res, 409, { error: 'User already exists' });
        return;
      }

      const user = {
        id: crypto.randomUUID(),
        email: body.email,
        password: crypto.createHash('sha256').update(body.password).digest('hex'),
        name: body.name || 'Trader',
        verified: false,
        plan: 'free',
        demoBalance: 100,
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      data.sessions.push({ userId: user.id, token: crypto.randomUUID(), createdAt: new Date().toISOString() });
      writeData(data);
      sendJson(res, 201, { user: { id: user.id, email: user.email, name: user.name, verified: user.verified, plan: user.plan, demoBalance: user.demoBalance } });
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
    }
    return;
  }

  if (pathname === '/api/login') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      const body = await parseBody(req);
      const data = readData();
      const user = data.users.find((item) => item.email === body.email && item.password === crypto.createHash('sha256').update(body.password).digest('hex'));
      if (!user) {
        sendJson(res, 401, { error: 'Invalid credentials' });
        return;
      }
      const token = crypto.randomUUID();
      data.sessions.push({ userId: user.id, token, createdAt: new Date().toISOString() });
      writeData(data);
      sendJson(res, 200, { token, user: { id: user.id, email: user.email, name: user.name, verified: user.verified, plan: user.plan, demoBalance: user.demoBalance } });
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
    const data = readData();
    const session = data.sessions.find((item) => item.token === token);
    if (!session) {
      sendJson(res, 401, { error: 'Invalid token' });
      return;
    }
    const user = data.users.find((item) => item.id === session.userId);
    if (!user) {
      sendJson(res, 401, { error: 'User not found' });
      return;
    }
    sendJson(res, 200, { user: { id: user.id, email: user.email, name: user.name, verified: user.verified, plan: user.plan, demoBalance: user.demoBalance } });
    return;
  }

  if (pathname === '/api/ai') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      const body = await parseBody(req);
      const message = (body.message || '').trim();
      const reply = message
        ? `AI Trading Assistant: I reviewed your request about ${message}. For live execution, connect a broker and activate a strategy with risk controls.`
        : 'AI Trading Assistant: Ask about strategy setup, broker connectivity, or analytics.';
      sendJson(res, 200, { reply });
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
    }
    return;
  }

  if (pathname === '/api/broker/connect') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }
    try {
      const body = await parseBody(req);
      const token = req.headers.authorization?.replace('Bearer ', '');
      const data = readData();
      const session = data.sessions.find((item) => item.token === token);
      if (!session) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
      const connection = {
        id: crypto.randomUUID(),
        userId: session.userId,
        broker: body.broker || 'MT5',
        status: 'connected',
        createdAt: new Date().toISOString(),
      };
      data.brokerConnections.push(connection);
      writeData(data);
      sendJson(res, 200, { connection });
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid request body' });
    }
    return;
  }

  if (pathname === '/api/analytics') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    const data = readData();
    const session = data.sessions.find((item) => item.token === token);
    if (!session) {
      sendJson(res, 401, { error: 'Invalid token' });
      return;
    }
    const user = data.users.find((item) => item.id === session.userId);
    sendJson(res, 200, {
      user: user?.name || 'Trader',
      balance: user?.demoBalance || 100,
      winRate: 94.2,
      monthlyPnL: 14280,
      activeBots: 2,
      connectedBrokers: data.brokerConnections.filter((item) => item.userId === session.userId).length,
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
});

server.listen(PORT, () => {
  console.log(`KINGBOT server running on http://127.0.0.1:${PORT}`);
});
