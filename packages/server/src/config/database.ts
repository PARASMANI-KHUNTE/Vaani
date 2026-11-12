/**
 * Database Configuration
 * Mongoose connection with transaction support detection
 */

import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../shared/utils/logger';

let isConnected = false;

export const connectDatabase = async (): Promise<mongoose.Connection> => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    mongoose.set('bufferCommands', false); // Fail fast, don't hang
    mongoose.set('strictQuery', true);

    const options = {
      autoIndex: config.isDevelopment(),
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    await mongoose.connect(config.mongodb.uri, options);
    isConnected = true;

    logger.info('MongoDB connected successfully', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

    return mongoose.connection;
  } catch (error) {
    isConnected = false;
    const err = error as Error;

    if (config.isDevelopment()) {
      logger.warn('MongoDB not connected — running with offline fallback', {
        error: err.message,
      });
      return mongoose.connection;
    }

    logger.error('MongoDB connection failed', { error: err.message, stack: err.stack });
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully');
  }
};

export const getConnection = (): mongoose.Connection => mongoose.connection;

export const startSession = (): Promise<mongoose.ClientSession> => mongoose.startSession();

export const isTransactionSupported = (): boolean => {
  const state = mongoose.connection.readyState;
  if (state !== 1) return false;

  const client = mongoose.connection.getClient();
  // Handle different mongoose/mongodb driver versions
  const topologyType = (client as { topology?: { description?: { type?: string } } }).topology?.description?.type;
  // Transactions are only allowed on Replica Sets or Sharded (mongos) clusters.
  // A standalone instance will have the type 'Single'.
  return topologyType !== undefined && topologyType !== 'Single' && topologyType !== 'Unknown';
};

export const withTransaction = async <T>(
  callback: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> => {
  if (!isTransactionSupported()) {
    // Run without transaction if not supported
    return callback(null as unknown as mongoose.ClientSession);
  }

  const session = await startSession();
  session.startTransaction();

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

// Health check
export const checkDatabaseHealth = async (): Promise<{ status: string; latency?: number }> => {
  const start = Date.now();
  try {
    if (mongoose.connection.readyState !== 1) {
      return { status: 'disconnected' };
    }
    await mongoose.connection.db?.admin().ping();
    return { status: 'healthy', latency: Date.now() - start };
  } catch (error) {
    return { status: 'unhealthy', latency: Date.now() - start };
  }
};