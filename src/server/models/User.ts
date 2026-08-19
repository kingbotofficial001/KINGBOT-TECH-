import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  avatar: string | null;
  verified: boolean;
  termsAcceptedAt: Date | null;
  plan: string;
  demoBalance: number;
  mode: string;
  isAdmin: boolean;
  referralCode: string;
  referredBy: Types.ObjectId | null;
  referralCount: number;
  referralEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null },
    avatar: { type: String, default: null },
    verified: { type: Boolean, default: false },
    termsAcceptedAt: { type: Date, default: null },
    plan: { type: String, default: 'free' },
    demoBalance: { type: Number, default: 100 },
    mode: { type: String, default: 'demo' },
    isAdmin: { type: Boolean, default: false },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    referralCount: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>('User', userSchema);

export default User;
