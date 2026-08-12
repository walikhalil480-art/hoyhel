import { createClient } from 'redis';
import { env } from './env';
import { logger } from '../utils/logger';

let isConnected = false;
let hasLoggedFailure = false;

export const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        if (!hasLoggedFailure) {
          hasLoggedFailure = true;
          logger.warn(`⚠️ Redis is unreachable at ${env.REDIS_URL}. Redis features will degrade gracefully.`);
        }
        return false; // Stop reconnecting after 3 failed attempts
      }
      return Math.min(retries * 500, 2000);
    },
  },
});

redisClient.on('connect', () => {
  isConnected = true;
  hasLoggedFailure = false;
  logger.info('✅ Redis client connected successfully');
});

redisClient.on('ready', () => {
  isConnected = true;
  hasLoggedFailure = false;
});

redisClient.on('error', (err: Error) => {
  isConnected = false;
  if (!hasLoggedFailure) {
    hasLoggedFailure = true;
    logger.warn(`⚠️ Redis Connection Warning: ${err.message}. Operations relying on Redis will degrade gracefully.`);
  }
});

redisClient.on('end', () => {
  isConnected = false;
});

export async function initRedis(): Promise<void> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err: any) {
    if (!hasLoggedFailure) {
      hasLoggedFailure = true;
      logger.warn(`⚠️ Redis initial connection deferred: ${err.message}`);
    }
  }
}

export function isRedisReady(): boolean {
  return isConnected && redisClient.isOpen;
}

