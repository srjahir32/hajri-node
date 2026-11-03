import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { HttpError } from '../lib/errors';
import { isProd } from '../config/env';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ status: 0, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ status: 0, message: err.message, ...err.extra });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const where = first?.path?.length ? `${first.path.join('.')}: ` : '';
    return res.status(422).json({
      status: 0,
      message: `${where}${first?.message ?? 'Invalid input'}`,
      errors: z.flattenError(err).fieldErrors,
    });
  }
  if (err instanceof MulterError) {
    return res.status(400).json({ status: 0, message: err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ status: 0, message: 'A record with these details already exists' });
    if (err.code === 'P2025') return res.status(404).json({ status: 0, message: 'Record not found' });
    if (err.code === 'P2003') return res.status(409).json({ status: 0, message: 'This record is referenced by other data' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ status: 0, message: 'Malformed JSON body' });
  }
  console.error(err);
  res.status(500).json({ status: 0, message: isProd ? 'Something went wrong' : String(err?.message ?? err) });
};
