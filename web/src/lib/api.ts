export type Role = 'admin' | 'staff' | 'super';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const BASE = `${API_URL}/api/v1`;

const TOKEN_KEY: Record<Role, string> = { admin: 'hajri.admin.token', staff: 'hajri.staff.token', super: 'hajri.super.token' };
const BUSINESS_KEY = 'hajri.admin.business';

const safe = {
  get(k: string) {
    try {
      return typeof window === 'undefined' ? null : window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* private mode */
    }
  },
  del(k: string) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const tokens = {
  get: (role: Role) => safe.get(TOKEN_KEY[role]),
  set: (role: Role, token: string) => safe.set(TOKEN_KEY[role], token),
  clear: (role: Role) => safe.del(TOKEN_KEY[role]),
};

export const business = {
  get: () => Number(safe.get(BUSINESS_KEY)) || undefined,
  set: (id: number) => safe.set(BUSINESS_KEY, String(id)),
  clear: () => safe.del(BUSINESS_KEY),
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: Record<string, unknown>,
  ) {
    super(message);
  }
  get expired() {
    return this.status === 403 && this.body?.is_expired === true;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface Envelope<T> {
  status: number | string | boolean;
  message: string;
  data: T;
  // pagination / extra meta live next to data
  [k: string]: unknown;
}

const LOGIN: Record<Role, string> = { admin: '/a_admin/login', staff: '/employee/login', super: '/super-admin/login' };

function qs(q?: Query) {
  if (!q) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function request<T>(role: Role, method: string, path: string, opts: { query?: Query; body?: unknown; form?: FormData } = {}): Promise<Envelope<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = tokens.get(role);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (role === 'admin') {
    const b = business.get();
    if (b) headers['X-Business-Id'] = String(b);
  }
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${qs(opts.query)}`, { method, headers, body });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  const json = (await res.json().catch(() => ({}))) as Envelope<T>;
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokens.clear(role);
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) window.location.href = LOGIN[role];
    }
    throw new ApiError(String(json.message ?? `Request failed (${res.status})`), res.status, json as Record<string, unknown>);
  }
  return json;
}

export const makeApi = (role: Role) => ({
  get: <T = unknown>(path: string, query?: Query) => request<T>(role, 'GET', path, { query }),
  post: <T = unknown>(path: string, body?: unknown) => request<T>(role, 'POST', path, { body: body ?? {} }),
  put: <T = unknown>(path: string, body?: unknown) => request<T>(role, 'PUT', path, { body: body ?? {} }),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>(role, 'PATCH', path, { body: body ?? {} }),
  del: <T = unknown>(path: string, body?: unknown) => request<T>(role, 'DELETE', path, { body }),
  form: <T = unknown>(method: 'POST' | 'PUT', path: string, form: FormData) => request<T>(role, method, path, { form }),
  /** Download a binary response (xlsx / pdf) using the current session. */
  async download(path: string, query?: Query, fallbackName = 'download') {
    const headers: Record<string, string> = {};
    const token = tokens.get(role);
    if (token) headers.Authorization = `Bearer ${token}`;
    if (role === 'admin') {
      const b = business.get();
      if (b) headers['X-Business-Id'] = String(b);
    }
    const res = await fetch(`${BASE}${path}${qs(query)}`, { headers });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new ApiError(String((j as { message?: string }).message ?? 'Download failed'), res.status);
    }
    const cd = res.headers.get('content-disposition') ?? '';
    const name = /filename="?([^";]+)"?/.exec(cd)?.[1] ?? fallbackName;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
});

export const adminApi = makeApi('admin');
export const staffApi = makeApi('staff');
export const superApi = makeApi('super');
export const publicApi = makeApi('admin'); // for unauthenticated endpoints the token is simply absent
