'use client';

/**
 * TeraLoka — API Client
 * Phase 2 · Batch 6 — Dashboard Overview
 * ------------------------------------------------------------
 * Hybrid API client untuk backend teraloka-api (Hono).
 *
 * 2 modes:
 *
 * 1. RAW FUNCTIONS — pass token manual, bisa dipake dimana aja
 *    (effects, callbacks, server actions, non-component code):
 *
 *    import { apiGet, apiPost } from '@/lib/api/client';
 *
 *    const stats = await apiGet<AdminStats>('/admin/stats', { token });
 *    await apiPost('/admin/users/invite', { token, body: { name, phone } });
 *
 * 2. useApi() HOOK — auto-inject token dari useAuth context
 *    (cleaner untuk component code):
 *
 *    const api = useApi();
 *    const stats = await api.get<AdminStats>('/admin/stats');
 *    await api.post('/admin/users/invite', { name, phone });
 *
 * Error handling:
 * - Network error (fetch reject) → throw ApiError dengan message
 * - Response non-2xx → throw ApiError dengan status + body message
 * - Response parseable tapi success=false → throw ApiError dengan server message
 * - Response success=true → return data
 *
 * Semua error normalized ke `ApiError` class — caller cukup catch satu
 * type untuk semua failure modes.
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { ApiResponse } from '@/types/admin';

/* ─── Config ─── */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

/* ─── Error class ─── */

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/* ─── Request options ─── */

interface BaseOptions {
  token?: string | null;
  /** Abort signal (untuk cleanup di useEffect) */
  signal?: AbortSignal;
  /** Custom headers tambahan */
  headers?: Record<string, string>;
}

interface GetOptions extends BaseOptions {
  /** Query params — auto encode. Pakai object: { status: 'pending', page: 1 } */
  params?: Record<string, string | number | boolean | undefined | null>;
}

interface BodyOptions<B = unknown> extends BaseOptions {
  body?: B;
  /** Query params juga bisa (misal PATCH dengan id di query + body data) */
  params?: Record<string, string | number | boolean | undefined | null>;
}

/* ─── URL builder ─── */

function buildUrl(
  path: string,
  params?: Record<string, unknown>
): string {
  const base = path.startsWith('http') ? path : `${API_URL}${path}`;
  if (!params) return base;

  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.append(key, String(value));
  }
  const query = usp.toString();
  return query ? `${base}?${query}` : base;
}

/* ─── Core request function ─── */

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  options: BodyOptions = {}
): Promise<T> {
  const { token, signal, headers, body, params } = options;
  const url = buildUrl(path, params);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  let requestBody: string | FormData | undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      // Biar browser auto-set Content-Type dengan boundary
      requestBody = body;
    } else {
      finalHeaders['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: requestBody,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err; // Biar caller handle abort
    }
    throw new ApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
      'NETWORK_ERROR'
    );
  }

  // Parse body (mungkin bukan JSON kalau error di proxy layer)
  let parsed: ApiResponse<T> | null = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      parsed = (await response.json()) as ApiResponse<T>;
    } catch {
      // Malformed JSON — lanjut ke path error tanpa parsed body
    }
  }

  if (!response.ok) {
    const message =
      (parsed && !parsed.success && parsed.error?.message) ||
      response.statusText ||
      `Request failed (${response.status})`;
    const code =
      (parsed && !parsed.success && parsed.error?.code) ||
      `HTTP_${response.status}`;
    throw new ApiError(message, response.status, code);
  }

  if (!parsed) {
    throw new ApiError(
      'Invalid response (not JSON)',
      response.status,
      'INVALID_RESPONSE'
    );
  }

  if (!parsed.success) {
    throw new ApiError(
      parsed.error?.message ?? 'Request failed',
      response.status,
      parsed.error?.code
    );
  }

  return parsed.data;
}

/* ─── Raw functions (exported) ─────────────────────────────── */

export function apiGet<T>(path: string, options: GetOptions = {}): Promise<T> {
  return request<T>('GET', path, options);
}

export function apiPost<T, B = unknown>(
  path: string,
  options: BodyOptions<B> = {}
): Promise<T> {
  return request<T>('POST', path, options);
}

export function apiPatch<T, B = unknown>(
  path: string,
  options: BodyOptions<B> = {}
): Promise<T> {
  return request<T>('PATCH', path, options);
}

export function apiPut<T, B = unknown>(
  path: string,
  options: BodyOptions<B> = {}
): Promise<T> {
  return request<T>('PUT', path, options);
}

export function apiDelete<T>(
  path: string,
  options: BodyOptions = {}
): Promise<T> {
  return request<T>('DELETE', path, options);
}

/* ─── useApi() hook — auto-inject token ────────────────────── */

export interface UseApiClient {
  get: <T>(path: string, options?: Omit<GetOptions, 'token'>) => Promise<T>;
  post: <T, B = unknown>(
    path: string,
    body?: B,
    options?: Omit<BodyOptions<B>, 'token' | 'body'>
  ) => Promise<T>;
  patch: <T, B = unknown>(
    path: string,
    body?: B,
    options?: Omit<BodyOptions<B>, 'token' | 'body'>
  ) => Promise<T>;
  put: <T, B = unknown>(
    path: string,
    body?: B,
    options?: Omit<BodyOptions<B>, 'token' | 'body'>
  ) => Promise<T>;
  delete: <T>(
    path: string,
    options?: Omit<BodyOptions, 'token'>
  ) => Promise<T>;
  /** Expose raw token untuk case khusus (mis upload direct ke Supabase) */
  token: string | null;
}

export function useApi(): UseApiClient {
  const { token } = useAuth();

  const get = useCallback<UseApiClient['get']>(
    (path, options = {}) => apiGet(path, { ...options, token }),
    [token]
  );

  const post = useCallback<UseApiClient['post']>(
    (path, body, options = {}) =>
      apiPost(path, { ...options, token, body }),
    [token]
  );

  const patch = useCallback<UseApiClient['patch']>(
    (path, body, options = {}) =>
      apiPatch(path, { ...options, token, body }),
    [token]
  );

  const put = useCallback<UseApiClient['put']>(
    (path, body, options = {}) =>
      apiPut(path, { ...options, token, body }),
    [token]
  );

  const del = useCallback<UseApiClient['delete']>(
    (path, options = {}) => apiDelete(path, { ...options, token }),
    [token]
  );

  return useMemo(
    () => ({ get, post, patch, put, delete: del, token: token ?? null }),
    [get, post, patch, put, del, token]
  );
}
