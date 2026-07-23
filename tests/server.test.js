const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { createDatabase } = require('../storage');

test('signup creates an unverified user and verification marks them verified', async () => {
  const db = await createDatabase(path.join(__dirname, 'tmp-test.sqlite'));
  const user = await db.createUser({ name: 'Test Trader', email: 'test@kingbot.tech', password: 'secret123' });
  assert.equal(user.verified, 0);

  const token = await db.createVerificationToken(user.id);
  const verifiedUser = await db.verifyUserByToken(token);
  assert.equal(verifiedUser.verified, 1);
  await db.close();
});
