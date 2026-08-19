import mongoose from 'mongoose';
import type { Request, Response, NextFunction } from 'express';
import logger from './utils/logger';

let hasLoggedMissingUri = false;

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (!hasLoggedMissingUri) {
      logger.warn('MONGODB_URI is not set. The API will run in degraded mode until it is configured.');
      hasLoggedMissingUri = true;
    }
    return false;
  }
  mongoose.set('strictQuery', true);
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', err);
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Will retry automatically.');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected.');
  });
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    logger.info('Connected to MongoDB.');
    return true;
  } catch (err) {
    logger.error('Could not connect to MongoDB. The API will run in degraded mode.', err);
    return false;
  }
}

export function requireDatabase(req: Request, res: Response, next: NextFunction): void {
  if (!isDatabaseConnected()) {
    res.status(503).json({ error: 'Database is currently unavailable. Please try again shortly.' });
    return;
  }
  next();
}
