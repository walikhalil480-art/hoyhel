import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './docs/swagger.json';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';
import { prisma } from './config/database';
import { isRedisReady } from './config/redis';

// Routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import propertyRoutes from './modules/properties/properties.routes';
import amenityRoutes from './modules/amenities/amenities.routes';
import availabilityRoutes from './modules/availability/availability.routes';
import bookingRoutes from './modules/bookings/booking.routes';
import paymentRoutes from './modules/payments/payments.routes';
import payoutRoutes from './modules/payouts/payouts.routes';
import reviewRoutes from './modules/reviews/reviews.routes';
import favoriteRoutes from './modules/favorites/favorites.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import path from 'path';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

// Security & Base Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Uploads Serving
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Global Rate Limiting
app.use('/api', apiRateLimiter);

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health Probes
app.get('/health', (req: Request, res: Response) => {
  return res.json({
    status: 'UP',
    timestamp: new Date(),
    services: {
      api: 'UP',
      redis: isRedisReady() ? 'UP' : 'DEGRADED (Offline/Connecting)',
    },
  });
});

app.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'READY',
      services: {
        database: 'CONNECTED',
        redis: isRedisReady() ? 'CONNECTED' : 'DEGRADED',
      },
    });
  } catch (err: any) {
    return res.status(503).json({ status: 'UNREADY', error: err.message });
  }
});

app.get('/live', (req: Request, res: Response) => {
  return res.json({ status: 'ALIVE' });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/amenities', amenityRoutes);
app.use('/api/v1/availability', availabilityRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/payouts', payoutRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/messaging', messagingRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
