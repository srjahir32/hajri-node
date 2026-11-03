import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env';
import { badRequest } from './errors';

export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.xlsx', '.xls', '.csv']);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folder = String((req as { uploadFolder?: string }).uploadFolder || 'misc').replace(/[^a-z0-9_-]/gi, '');
    const dir = path.join(UPLOAD_ROOT, folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(badRequest(`File type ${ext || 'unknown'} is not allowed`));
    cb(null, true);
  },
});

/** Memory upload for spreadsheets that are parsed and discarded. */
export const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const publicUrl = (relative: string) => `${env.API_URL.replace(/\/$/, '')}/uploads/${relative.replace(/^\/+/, '')}`;

export const fileUrl = (file: Express.Multer.File) => publicUrl(`${path.basename(path.dirname(file.path))}/${file.filename}`);

export function removeUploadedFile(url?: string | null) {
  if (!url) return;
  const idx = url.indexOf('/uploads/');
  if (idx < 0) return;
  const rel = url.slice(idx + '/uploads/'.length);
  const full = path.resolve(UPLOAD_ROOT, rel);
  if (full.startsWith(UPLOAD_ROOT) && fs.existsSync(full)) fs.unlink(full, () => undefined);
}

import type { RequestHandler } from 'express';
/** Select the sub-folder of /uploads for the next multer middleware. */
export const folder =
  (name: string): RequestHandler =>
  (req, _res, next) => {
    (req as unknown as { uploadFolder: string }).uploadFolder = name;
    next();
  };
