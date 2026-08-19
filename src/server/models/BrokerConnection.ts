import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBrokerConnection extends Document {
  user: Types.ObjectId;
  broker: string;
  status: string;
}

const brokerConnectionSchema = new Schema<IBrokerConnection>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    broker: { type: String, default: 'MT5' },
    status: { type: String, default: 'connected' },
  },
  { timestamps: true }
);

const BrokerConnection = mongoose.model<IBrokerConnection>('BrokerConnection', brokerConnectionSchema);

export default BrokerConnection;
