'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { posthog, isPostHogReady } from '@/lib/posthog';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';
const REQUEST_TIMEOUT_MS = 20_000; // 20 detik — accommodate Fonnte WA delay

// ─── Helper: fetch dengan timeout + safe JSON parse + error normalization ───
//
// Mengatasi 3 masalah real di mobile network:
//   1. Browser fetch tanpa timeout → request hang 60-120s → button "Mengirim..." stuck
//   2. Response bukan JSON valid (HTML error page, plain text) → JSON.parse throw
//   3. Network error generic ('Failed to fetch') → user binggung, gak tau harus apa
//
// Filosofi: Frontend (Wajah) harus graceful handle network instability,
//           kasih user clear feedback, dan biarkan retry kerja normal.
async function safeFetchJson(
  url: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; data: any; errorMessage?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    // Defensive JSON parse — kalau response bukan JSON valid, jangan crash
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return {
        ok: false,
        data: null,
        errorMessage: 'Response server tidak valid. Coba lagi.',
      };
    }

    return { ok: res.ok, data };
  } catch (err: any) {
    // AbortError (timeout) — paling umum di mobile network
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return {
        ok: false,
        data: null,
        errorMessage: 'Permintaan timeout. Cek koneksi internet, coba lagi.',
      };
    }
    // Network failure — biasanya offline atau DNS issue
    if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      return {
        ok: false,
        data: null,
        errorMessage: 'Tidak bisa connect ke server. Cek koneksi internet.',
      };
    }
    // Generic fallback
    return {
      ok: false,
      data: null,
      errorMessage: 'Terjadi kesalahan koneksi. Coba lagi.',
    };
  }
}

export interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  avatar_url?: string | null;
  phone_verified?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  requestOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; message: string; is_new?: boolean }>;
  updateProfile: (name: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) return { user: null, token: null, isLoading: true, requestOtp: async () => ({ success: false, message: "Not initialized" }), verifyOtp: async () => ({ success: false, message: "Not initialized", is_new: false }), updateProfile: async () => false, logout: () => {} };
  return ctx;
}

/**
 * PostHog identify helper — mask phone for privacy, include role.
 * Safe wrapper: no-op kalau PostHog ga ready.
 */
function identifyUserInPostHog(user: AuthUser): void {
  if (!isPostHogReady()) return;
  try {
    posthog.identify(user.id, {
      // Phone dimasking untuk privacy (hanya first 5 + last 3 digits)
      phone_masked: user.phone ? `${user.phone.slice(0, 5)}***${user.phone.slice(-3)}` : null,
      role: user.role,
      name: user.name,
      has_avatar: Boolean(user.avatar_url),
      phone_verified: user.phone_verified ?? false,
    });
  } catch (err) {
    console.error('[PostHog] identify failed:', err);
  }
}

/**
 * PostHog reset — call on logout.
 * Clear identity sehingga next anonymous session tidak terkait ke user lama.
 */
function resetPostHog(): void {
  if (!isPostHogReady()) return;
  try {
    posthog.reset();
  } catch (err) {
    console.error('[PostHog] reset failed:', err);
  }
}

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (saved) {
      setToken(saved);
      fetchMe(saved);
    } else {
      setIsLoading(false);
    }
  }, []);

  async function fetchMe(t: string) {
    const result = await safeFetchJson(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });

    if (result.ok && result.data?.data) {
      setUser(result.data.data);
      // Re-identify on page reload saat user masih authenticated
      // (PostHog bisa lose identity across browser restart)
      identifyUserInPostHog(result.data.data);
    } else {
      // Auth failed atau network error — clear session
      logout();
    }
    setIsLoading(false);
  }

  async function requestOtp(phone: string) {
    const result = await safeFetchJson(`${API}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    // Network error (timeout, offline, parse fail)
    if (result.errorMessage) {
      return { success: false, message: result.errorMessage };
    }

    // Backend response — sukses atau validation error
    return {
      success: result.data?.success === true,
      message: result.data?.data?.message
        ?? result.data?.error?.message
        ?? 'Terjadi kesalahan',
    };
  }

  async function verifyOtp(phone: string, otp: string) {
    const result = await safeFetchJson(`${API}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });

    // Network error
    if (result.errorMessage) {
      return { success: false, message: result.errorMessage, is_new: undefined };
    }

    const data = result.data;

    // Sukses — save token + identify
    if (data?.success && data?.data?.token) {
      localStorage.setItem(TOKEN_KEY, data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);

      // Identify user di PostHog setelah login sukses.
      // Link semua events browser sebelumnya (anonymous) ke user.id ini.
      // Critical: kalau user baru register → juga identify (first touch tracking)
      identifyUserInPostHog(data.data.user);
    }

    return {
      success: data?.success === true,
      message: data?.data?.message ?? data?.error?.message ?? 'Terjadi kesalahan',
      is_new: data?.data?.is_new,
    };
  }

  async function updateProfile(name: string) {
    if (!token) return false;

    const result = await safeFetchJson(`${API}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });

    // Network error atau response invalid
    if (result.errorMessage || !result.data?.success) {
      return false;
    }

    setUser(result.data.data);
    // Re-identify dengan updated name
    if (result.data.data) {
      identifyUserInPostHog(result.data.data);
    }
    return true;
  }

  function logout() {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    // Reset PostHog identity — anonymous session next
    resetPostHog();
  }

  return { user, token, isLoading, requestOtp, verifyOtp, updateProfile, logout };
}
