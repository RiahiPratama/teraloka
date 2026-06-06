'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { posthog, isPostHogReady } from '@/lib/posthog';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const TOKEN_KEY = 'tl_token';
const REFRESH_KEY = 'tl_refresh';   // ← BARU: refresh token (rotating, device-bound)
const DEVICE_KEY = 'tl_device';     // ← BARU: device id stabil per-browser
const REQUEST_TIMEOUT_MS = 20_000;

// ─── device id: generate sekali per browser, simpan di localStorage ──
function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ||
        Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

// ─── Helper: fetch dengan timeout + safe JSON parse + error normalization ───
async function safeFetchJson(
  url: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; data: any; errorMessage?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return { ok: false, data: null, errorMessage: 'Response server tidak valid. Coba lagi.' };
    }

    return { ok: res.ok, data };
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return { ok: false, data: null, errorMessage: 'Permintaan timeout. Cek koneksi internet, coba lagi.' };
    }
    if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      return { ok: false, data: null, errorMessage: 'Tidak bisa connect ke server. Cek koneksi internet.' };
    }
    return { ok: false, data: null, errorMessage: 'Terjadi kesalahan koneksi. Coba lagi.' };
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
  verifyOtp: (
    phone: string,
    otp: string,
  ) => Promise<{ success: boolean; message: string; is_new?: boolean; has_pin?: boolean }>;
  setPin: (pin: string) => Promise<{ success: boolean; message: string }>;
  verifyPin: (pin: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (name: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    return {
      user: null,
      token: null,
      isLoading: true,
      requestOtp: async () => ({ success: false, message: 'Not initialized' }),
      verifyOtp: async () => ({ success: false, message: 'Not initialized', is_new: false, has_pin: false }),
      setPin: async () => ({ success: false, message: 'Not initialized' }),
      verifyPin: async () => ({ success: false, message: 'Not initialized' }),
      updateProfile: async () => false,
      logout: () => {},
    };
  return ctx;
}

function identifyUserInPostHog(user: AuthUser): void {
  if (!isPostHogReady()) return;
  try {
    posthog.identify(user.id, {
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
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Init: coba token tersimpan → kalau invalid/expired, coba SILENT REFRESH
  // (device trusted) sebelum nyerah. Ini yang bikin returning user gak perlu OTP.
  async function init() {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (saved) {
      setToken(saved);
      const ok = await fetchMe(saved);
      if (ok) {
        setIsLoading(false);
        return;
      }
    }
    const refreshed = await trySilentRefresh();
    if (!refreshed) clearSession();
    setIsLoading(false);
  }

  async function fetchMe(t: string): Promise<boolean> {
    const result = await safeFetchJson(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (result.ok && result.data?.data) {
      setUser(result.data.data);
      identifyUserInPostHog(result.data.data);
      return true;
    }
    return false;
  }

  // Silent refresh: pakai refresh_token + device_id → access token baru, TANPA OTP.
  async function trySilentRefresh(): Promise<boolean> {
    const refresh = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
    const device = typeof window !== 'undefined' ? localStorage.getItem(DEVICE_KEY) : null;
    if (!refresh || !device) return false;

    const result = await safeFetchJson(`${API}/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: device, refresh_token: refresh }),
    });

    if (result.data?.success && result.data?.data?.token) {
      const newToken = result.data.data.token as string;
      const newRefresh = result.data.data.refresh_token as string | undefined;
      localStorage.setItem(TOKEN_KEY, newToken);
      if (newRefresh) localStorage.setItem(REFRESH_KEY, newRefresh);
      setToken(newToken);
      return await fetchMe(newToken);
    }
    return false;
  }

  async function requestOtp(phone: string) {
    const result = await safeFetchJson(`${API}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    if (result.errorMessage) return { success: false, message: result.errorMessage };

    return {
      success: result.data?.success === true,
      message: result.data?.data?.message ?? result.data?.error?.message ?? 'Terjadi kesalahan',
    };
  }

  async function verifyOtp(phone: string, otp: string) {
    const device_id = getDeviceId();
    const result = await safeFetchJson(`${API}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, device_id }),
    });

    if (result.errorMessage) {
      return { success: false, message: result.errorMessage, is_new: undefined, has_pin: undefined };
    }

    const data = result.data;

    if (data?.success && data?.data?.token) {
      localStorage.setItem(TOKEN_KEY, data.data.token);
      if (data.data.refresh_token) localStorage.setItem(REFRESH_KEY, data.data.refresh_token);
      setToken(data.data.token);
      setUser(data.data.user);
      identifyUserInPostHog(data.data.user);
    }

    return {
      success: data?.success === true,
      message: data?.data?.message ?? data?.error?.message ?? 'Terjadi kesalahan',
      is_new: data?.data?.is_new,
      has_pin: data?.data?.has_pin,
    };
  }

  async function setPin(pin: string) {
    if (!token) return { success: false, message: 'Belum login.' };
    const result = await safeFetchJson(`${API}/auth/pin/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pin }),
    });
    if (result.errorMessage) return { success: false, message: result.errorMessage };
    return {
      success: result.data?.success === true,
      message: result.data?.data?.message ?? result.data?.error?.message ?? 'Gagal menyimpan PIN.',
    };
  }

  async function verifyPin(pin: string) {
    if (!token) return { success: false, message: 'Belum login.' };
    const result = await safeFetchJson(`${API}/auth/pin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pin }),
    });
    if (result.errorMessage) return { success: false, message: result.errorMessage };
    return {
      success: result.data?.success === true,
      message: result.data?.error?.message ?? 'PIN terverifikasi.',
    };
  }

  async function updateProfile(name: string) {
    if (!token) return false;

    const result = await safeFetchJson(`${API}/auth/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });

    if (result.errorMessage || !result.data?.success) return false;

    setUser(result.data.data);
    if (result.data.data) identifyUserInPostHog(result.data.data);
    return true;
  }

  function clearSession() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      // DEVICE_KEY sengaja DIPERTAHANKAN — identitas device stabil lintas login.
    }
    setToken(null);
    setUser(null);
  }

  function logout() {
    clearSession();
    resetPostHog();
  }

  return { user, token, isLoading, requestOtp, verifyOtp, setPin, verifyPin, updateProfile, logout };
}
