import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBot extends Document {
  user: Types.ObjectId;
  name: string;
  symbol: string;
  strategy: string;
  active: boolean;
  confidence: number;
}

const botSchema = new Schema<IBot>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    symbol: { type: String, default: 'XAUUSD' },
    strategy: { type: String, default: 'SMC AI - Multi-Asset' },
    active: { type: Boolean, default: true },
    confidence: { type: Number, default: 88 },
  },
  { timestamps: true }
);

const Bot = mongoose.model<IBot>('Bot', botSchema);

export default Bot;
