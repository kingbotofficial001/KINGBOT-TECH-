"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
process.env.JWT_SECRET = 'test-secret';
const auth_1 = require("../utils/auth");
const fakeUser = (id) => ({ _id: { toString: () => id } });
(0, node_test_1.default)('password hashing round trip', async () => {
    const hash = await (0, auth_1.hashPassword)('secret123');
    strict_1.default.ok(await (0, auth_1.comparePassword)('secret123', hash));
    strict_1.default.equal(await (0, auth_1.comparePassword)('wrong-password', hash), false);
});
(0, node_test_1.default)('jwt sign and verify round trip', () => {
    const token = (0, auth_1.signToken)(fakeUser('user-id-123'));
    const payload = (0, auth_1.verifyToken)(token);
    strict_1.default.equal(payload?.sub, 'user-id-123');
    strict_1.default.equal(payload?.role, 'user');
});
(0, node_test_1.default)('jwt embeds admin role when requested', () => {
    const token = (0, auth_1.signToken)(fakeUser('admin-id-456'), 'admin');
    const payload = (0, auth_1.verifyToken)(token);
    strict_1.default.equal(payload?.role, 'admin');
});
(0, node_test_1.default)('jwt verify rejects invalid token', () => {
    strict_1.default.equal((0, auth_1.verifyToken)('not-a-real-token'), null);
});
