import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface TokenPayload {
  sub: string;
  role: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(password, hash);
}

export function signToken(user: IUser, role = 'user'): string {
  return jwt.sign({ sub: user._id.toString(), role }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function generateReferralCode(name: string): string {
  const base = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'KING';
  return `${base}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'FREE',
  starter: 'VIP',
  professional: 'VIP ELITE',
  enterprise: 'VIP ROYAL',
};

export function planLabel(plan: string): string {
  return PLAN_LABELS[plan] || 'FREE';
}

export function publicUser(user: IUser) {
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
