import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wrap async route handlers so rejections reach the error middleware. */
export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const ok = (res: Response, data: unknown = null, message = 'success', extra: Record<string, unknown> = {}) =>
  res.json({ status: 1, message, data, ...extra });

export function pageParams(q: Record<string, unknown>, defaultSize = 20, maxSize = 200) {
  const page = Math.max(1, Number(q.page) || 1);
  const size = Math.min(maxSize, Math.max(1, Number(q.per_page ?? q.limit ?? q.pageSize) || defaultSize));
  return { page, size, skip: (page - 1) * size, take: size };
}

export function pageMeta(page: number, size: number, total: number) {
  return { current_page: page, per_page: size, total, last_page: Math.max(1, Math.ceil(total / size)) };
}
