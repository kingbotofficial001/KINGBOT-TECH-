const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createDatabase } = require('../storage');

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
