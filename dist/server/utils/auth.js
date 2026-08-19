"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.generateReferralCode = generateReferralCode;
exports.planLabel = planLabel;
exports.publicUser = publicUser;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 10);
}
function comparePassword(password, hash) {
    if (!hash)
        return Promise.resolve(false);
    return bcryptjs_1.default.compare(password, hash);
}
function signToken(user, role = 'user') {
    return jsonwebtoken_1.default.sign({ sub: user._id.toString(), role }, JWT_SECRET, { expiresIn: '30d' });
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
function generateReferralCode(name) {
    const base = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'KING';
    return `${base}${crypto_1.default.randomBytes(3).toString('hex').toUpperCase()}`;
}
const PLAN_LABELS = {
    free: 'FREE',
    starter: 'VIP',
    professional: 'VIP ELITE',
    enterprise: 'VIP ROYAL',
};
function planLabel(plan) {
    return PLAN_LABELS[plan] || 'FREE';
}
function publicUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        verified: user.verified,
        plan: user.plan,
        planLabel: planLabel(user.plan),
        isVip: user.plan !== 'free',
        demoBalance: user.demoBalance,
        mode: user.mode,
        isAdmin: !!user.isAdmin,
        referralCode: user.referralCode,
        referralCount: user.referralCount,
        referralEarnings: user.referralEarnings,
    };
}
