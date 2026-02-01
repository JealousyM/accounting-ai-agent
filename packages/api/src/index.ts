// IMPORTANT: Load environment variables FIRST before any other imports
import './config/env';

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import credentialsRoutes from './routes/credentials.routes';
import aiChatRoutes from './routes/ai-chat.routes';
import aiCostsRoutes from './routes/ai-costs.routes';
import fileRoutes from './routes/file.routes';
import helpRoutes from './routes/help.routes';
import adminRoutes from './routes/admin.routes';
import subscriptionRoutes from './routes/subscription.routes';
import webhookRoutes from './routes/webhook.routes';
import { globalRateLimiter } from './middleware/rate-limiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';
import { logger } from './utils/logger';
import { seedHelpTopicsIfEmpty } from './services/help-seed.service';

const app: Application = express();
const PORT = process.env.PORT || 3011;

// CORS configuration - fail-secure in production
const corsOrigin = process.env.CORS_ORIGIN;
if (process.env.NODE_ENV === 'production' && !corsOrigin) {
  throw new Error(
    'SECURITY ERROR: CORS_ORIGIN must be set in production environment. ' +
    'Example: CORS_ORIGIN=https://yourdomain.com'
  );
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: corsOrigin || 'http://localhost:3010',
  credentials: true, // Allow cookies for future httpOnly token migration
}));

// IMPORTANT: Webhook routes must be registered BEFORE express.json()
// because Stripe requires raw body for signature verification
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '100kb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Global rate limiter
app.use('/api', globalRateLimiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Accounting AI Agent API', version: '1.0.0' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// User routes
app.use('/api/users', userRoutes);

// Credentials routes
app.use('/api/credentials', credentialsRoutes);

// AI Chat routes
app.use('/api/ai', aiChatRoutes);

// AI Costs routes
app.use('/api/ai/costs', aiCostsRoutes);

// File download routes
app.use('/api/files', fileRoutes);

// Help routes (public - no authentication required)
app.use('/api/help', helpRoutes);

// Admin routes (admin role required)
app.use('/api/admin', adminRoutes);

// Subscription routes
app.use('/api/subscription', subscriptionRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  logger.info(`🚀 API Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV}`);

  // Auto-seed help topics if table is empty
  await seedHelpTopicsIfEmpty();
});

export default app;
