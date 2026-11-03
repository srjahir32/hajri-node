import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env';
import { UPLOAD_ROOT } from './lib/upload';
import { apiV1 } from './routes';
import { legacyAssetAliases, mobileRouter } from './routes/mobile.routes';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const allowed = new Set([env.WEB_URL.replace(/\/$/, ''), 'http://localhost:3000', 'http://127.0.0.1:3000']);
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || allowed.has(origin) || !isProd),
      credentials: true,
      exposedHeaders: ['Content-Disposition', 'Authorization'],
    }),
  );
  app.use(compression());
  if (env.NODE_ENV !== 'test') app.use(morgan(isProd ? 'combined' : 'dev'));
  app.use(rateLimit({ windowMs: 60_000, limit: isProd ? 600 : 5000, standardHeaders: true, legacyHeaders: false }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.use('/uploads', express.static(UPLOAD_ROOT, { maxAge: '7d', index: false }));
  app.get('/', (_req, res) => res.json({ name: `${env.APP_NAME} API`, version: '1.0.0', docs: '/api/v1/health' }));
  legacyAssetAliases(app, express);
  app.use('/api/v1', apiV1);
  app.use('/api', mobileRouter); // Laravel-compatible endpoints for the existing React Native apps

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
