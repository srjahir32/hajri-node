import 'dotenv/config';
import { z } from 'zod';

const bool = (def: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? def : v === 'true' || v === '1'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_NAME: z.string().default('Hajri'),
  API_URL: z.string().default('http://localhost:4000'),
  WEB_URL: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('30d'),
  OTP_TTL_MINUTES: z.coerce.number().default(10),
  OTP_DEV_MODE: bool(true),
  FREE_TRIAL_DAYS: z.coerce.number().default(7),

  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default('v22.0'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Hajri <no-reply@hajri.app>'),

  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),

  CASHFREE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  CASHFREE_CLIENT_ID: z.string().optional(),
  CASHFREE_CLIENT_SECRET: z.string().optional(),
  CASHFREE_API_VERSION: z.string().default('2023-08-01'),
  CASHFREE_WEBHOOK_SECRET: z.string().optional(),

  KELVIQ_API_KEY: z.string().optional(),
  KELVIQ_API_URL: z.string().default('https://sandboxapi.kelviq.com/api/v1'),
  KELVIQ_PLAN_IDENTIFIER: z.string().default('team-plan'),
  KELVIQ_FEATURE_IDENTIFIER: z.string().default('team-seats-new'),
  KELVIQ_SIMULATE: bool(true),

  SUPER_ADMIN_EMAIL: z.string().default('superadmin@hajri.app'),
  SUPER_ADMIN_PASSWORD: z.string().default('ChangeMe123!'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:\n', z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
