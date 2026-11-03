import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { expireLapsed, syncSeatsBeforeRenewal } from './services/subscription.service';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`${env.APP_NAME} API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Lightweight in-process schedulers (run a single API instance, or move these to a cron worker when scaling out).
const timers = [
  setInterval(() => expireLapsed().catch((e) => console.error('[cron] expireLapsed', e)), 60 * 60 * 1000),
  setInterval(() => syncSeatsBeforeRenewal().catch((e) => console.error('[cron] syncSeats', e)), 10 * 60 * 1000),
];
timers.forEach((t) => t.unref());

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
