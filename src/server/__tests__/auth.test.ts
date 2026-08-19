import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'test-secret';

import { hashPassword, comparePassword, signToken, verifyToken } from '../utils/auth';
import type { IUser } from '../models/User';

const fakeUser = (id: string) => ({ _id: { toString: () => id } }) as unknown as IUser;

test('password hashing round trip', async () => {
  const hash = await hashPassword('secret123');
  assert.ok(await comparePassword('secret123', hash));
  assert.equal(await comparePassword('wrong-password', hash), false);
});

test('jwt sign and verify round trip', () => {
  const token = signToken(fakeUser('user-id-123'));
  const payload = verifyToken(token);
  assert.equal(payload?.sub, 'user-id-123');
  assert.equal(payload?.role, 'user');
});

test('jwt embeds admin role when requested', () => {
  const token = signToken(fakeUser('admin-id-456'), 'admin');
  const payload = verifyToken(token);
  assert.equal(payload?.role, 'admin');
});

test('jwt verify rejects invalid token', () => {
  assert.equal(verifyToken('not-a-real-token'), null);
});
