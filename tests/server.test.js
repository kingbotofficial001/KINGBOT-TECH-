const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const http = require('node:http');
const { createDatabase } = require('../storage');

function requestJson(port, pathname) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathname, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

test('signup creates an unverified user and verification marks them verified', async () => {
  const dbPath = path.join(__dirname, `tmp-test-${Date.now()}.sqlite`);
  const db = await createDatabase(dbPath);
  const email = `test-${Date.now()}@kingbot.tech`;
  const user = await db.createUser({ name: 'Test Trader', email, password: 'secret123' });
  assert.equal(user.verified, 0);

  const token = await db.createVerificationToken(user.id);
  const verifiedUser = await db.verifyUserByToken(token);
  assert.equal(verifiedUser.verified, 1);
  await db.close();
});

test('risk profiles and academy enrollments persist for a user', async () => {
  const dbPath = path.join(__dirname, `tmp-test-${Date.now()}.sqlite`);
  const db = await createDatabase(dbPath);
  const user = await db.createUser({ name: 'Risk Tester', email: `risk-${Date.now()}@kingbot.tech`, password: 'secret123' });

  const risk = await db.saveRiskProfile(user.id, {
    riskMode: 'balanced',
    riskPercent: 2.5,
    maxDrawdown: 8,
    maxDailyLoss: 400
  });

  assert.equal(risk.riskPercent, 2.5);
  const loadedRisk = await db.getRiskProfile(user.id);
  assert.equal(loadedRisk.maxDailyLoss, 400);

  const courses = await db.getAcademyCourses();
  assert.ok(courses.length > 0);
  const enrollment = await db.enrollInCourse(user.id, courses[0].id);
  assert.equal(enrollment.courseId, courses[0].id);
  const enrolled = await db.getAcademyEnrollments(user.id);
  assert.ok(enrolled.some((entry) => entry.courseId === courses[0].id));

  await db.close();
});

test('market signals can be created and fetched', async () => {
  const dbPath = path.join(__dirname, `tmp-test-${Date.now()}.sqlite`);
  const db = await createDatabase(dbPath);
  const created = await db.createSignal({ symbol: 'EUR/USD', direction: 'long', confidence: 81, price: 1.0912 });

  assert.equal(created.symbol, 'EUR/USD');
  const signals = await db.getSignals();
  assert.ok(signals.some((signal) => signal.symbol === 'EUR/USD'));

  await db.close();
});

test('portfolio trades can be created and fetched for a user', async () => {
  const dbPath = path.join(__dirname, `tmp-test-${Date.now()}.sqlite`);
  const db = await createDatabase(dbPath);
  const user = await db.createUser({ name: 'Trade Tester', email: `trades-${Date.now()}@kingbot.tech`, password: 'secret123' });
  const trade = await db.createTrade({ userId: user.id, symbol: 'BTC/USD', side: 'buy', entryPrice: 62000, exitPrice: 63500, quantity: 0.2, pnl: 300, status: 'closed' });

  assert.equal(trade.symbol, 'BTC/USD');
  const trades = await db.getTrades(user.id);
  assert.ok(trades.some((entry) => entry.symbol === 'BTC/USD'));

  await db.close();
});

test('server exposes portfolio and trades routes without falling back to 404', async () => {
  const { startServer } = require('../server');
  const server = startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));

  const portfolioResponse = await requestJson(server.address().port, '/api/portfolio');
  const tradesResponse = await requestJson(server.address().port, '/api/trades');

  assert.equal(portfolioResponse.statusCode, 401);
  assert.equal(tradesResponse.statusCode, 401);

  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});
