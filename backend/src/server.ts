import http from 'http';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initRedis } from './config/redis';
import { initWebSocket } from './websocket/socket';

async function startServer() {
  await initRedis();

  const server = http.createServer(app);
  initWebSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`🚀 LuxeHaven API Server listening on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`📚 Swagger OpenAPI documentation available at http://localhost:${env.PORT}/api/docs`);
  });
}

startServer().catch((err) => {
  logger.error('Fatal server startup error:', err);
  process.exit(1);
});
