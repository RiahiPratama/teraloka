'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { posthog, isPostHogReady } from '@/lib/posthog';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const TOKEN_KEY = 'tl_token';
const REFRESH_KEY = 'tl_refresh';
const DEVICE_KEY = 'tl_device';
const LOCKED_KEY = 'tl_locked';        // '1' = sesi dikunci, masuk lagi butuh PIN
const LASTUSER_KEY = 'tl_last_user';   // { phone, name, has_pin } untuk layar PIN-login
const REQUEST_TIMEOUT_MS = 20_000;

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

async function safeFetchJson(
  url: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; data: any; errorMessage?: string }> {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
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

export interface LockedSession {
  phone: string;
  name: string | null;
}

interface LastUser {
  phone: string;
  name: string | null;
  has_pin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  lockedSession: LockedSession | null;
  requestOtp: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (
    phone: string,
    otp: string,
  ) => Promise<{ success: boolean; message: string; is_new?: boolean; has_pin?: boolean }>;
  pinLogin: (pin: string) => Promise<{ success: boolean; message: string; fallbackOtp?: boolean }>;
  setPin: (pin: string) => Promise<{ success: boolean; message: string }>;
  verifyPin: (pin: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (name: string) => Promise<boolean>;
  logout: () => void;       // KUNCI: simpan device trust, masuk lagi pakai PIN
  logoutFull: () => void;   // KELUAR PENUH: buang device trust, masuk lagi pakai OTP
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx)
    return {
      user: null,
      token: null,
      isLoading: true,
      lockedSession: null,
      requestOtp: async () => ({ success: false, message: 'Not initialized' }),
      verifyOtp: async () => ({ success: false, message: 'Not initialized', is_new: false, has_pin: false }),
      pinLogin: async () => ({ success: false, message: 'Not initialized', fallbackOtp: false }),
      setPin: async () => ({ success: false, message: 'Not initialized' }),
      verifyPin: async () => ({ success: false, message: 'Not initialized' }),
      updateProfile: async () => false,
      logout: () => {},
      logoutFull: () => {},
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

// Baca metadata user terakhir (untuk layar PIN-login). has_pin = sumber kebenaran
// apakah PIN-pad boleh ditampilkan saat sesi dikunci (O3).
function readLastUser(): LastUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LASTUSER_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.phone) return null;
    return { phone: p.phone, name: p.name ?? null, has_pin: p.has_pin === true };
  } catch {
    return null;
  }
}

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lockedSession, setLockedSession] = useState<LockedSession | null>(null);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // Tidak ada token valid. Cek apakah sesi DIKUNCI (perlu PIN) vs boleh silent refresh.
    const locked = typeof window !== 'undefined' && localStorage.getItem(LOCKED_KEY) === '1';
    const hasDevice =
      typeof window !== 'undefined' &&
      !!localStorage.getItem(REFRESH_KEY) &&
      !!localStorage.getItem(DEVICE_KEY);

    if (locked && hasDevice) {
      // Sesi dikunci (user sengaja Keluar). JANGAN silent refresh apa pun.
      // O3: tampilkan layar PIN HANYA kalau user terbukti punya PIN.
      // Kalau tidak punya PIN -> lockedSession null -> login page tampil OTP.
      const lu = readLastUser();
      if (lu?.has_pin) {
        setLockedSession({ phone: lu.phone, name: lu.name });
      }
      setIsLoading(false);
      return;
    }

    // Tidak dikunci -> coba silent refresh (returning user, tidak logout).
    const refreshed = await trySilentRefresh();
    if (!refreshed) {
      setToken(null);
      setUser(null);
    }
    setIsLoading(false);
  }

  async function fetchMe(t: string): Promise<boolean> {
    const result = await safeFetchJson(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
    if (result.ok && result.data?.data) {
      setUser(result.data.data);
      identifyUserInPostHog(result.data.data);
      return true;
    }
    return false;
  }

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

  // Simpan metadata user terakhir. has_pin di-merge: kalau pemanggil tidak kirim
  // has_pin, pertahankan nilai existing (mis. updateProfile tidak ubah status PIN).
  function persistLastUser(u: { phone: string; name: string | null; has_pin?: boolean }) {
    try {
      const prev = readLastUser();
      const payload: LastUser = {
        phone: u.phone,
        name: u.name ?? null,
        has_pin: typeof u.has_pin === 'boolean' ? u.has_pin : (prev?.has_pin ?? false),
      };
      localStorage.setItem(LASTUSER_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
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
      localStorage.removeItem(LOCKED_KEY);
      // O3: simpan status PIN dari backend supaya gating PIN-login akurat.
      persistLastUser({
        phone: data.data.user.phone,
        name: data.data.user.name,
        has_pin: !!data.data.has_pin,
      });
      setToken(data.data.token);
      setUser(data.data.user);
      setLockedSession(null);
      identifyUserInPostHog(data.data.user);
    }

    return {
      success: data?.success === true,
      message: data?.data?.message ?? data?.error?.message ?? 'Terjadi kesalahan',
      is_new: data?.data?.is_new,
      has_pin: data?.data?.has_pin,
    };
  }

  async function pinLogin(pin: string) {
    const device = typeof window !== 'undefined' ? localStorage.getItem(DEVICE_KEY) : null;
    const refresh = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
    if (!device || !refresh) {
      return { success: false, message: 'Sesi tidak ada. Login dengan OTP.', fallbackOtp: true };
    }

    const result = await safeFetchJson(`${API}/auth/pin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: device, refresh_token: refresh, pin }),
    });

    if (result.errorMessage) return { success: false, message: result.errorMessage };

    const data = result.data;
    if (data?.success && data?.data?.token) {
      localStorage.setItem(TOKEN_KEY, data.data.token);
      if (data.data.refresh_token) localStorage.setItem(REFRESH_KEY, data.data.refresh_token);
      localStorage.removeItem(LOCKED_KEY);
      // pinLogin sukses => user PASTI punya PIN.
      persistLastUser({ phone: data.data.user.phone, name: data.data.user.name, has_pin: true });
      setToken(data.data.token);
      setUser(data.data.user);
      setLockedSession(null);
      identifyUserInPostHog(data.data.user);
      return { success: true, message: 'ok' };
    }

    const code = data?.error?.code;
    const fallbackOtp = ['DEVICE_NOT_TRUSTED', 'PIN_LOGIN_EXPIRED', 'PIN_LOCKED', 'PIN_NOT_SET', 'REFRESH_INVALID'].includes(code);
    if (fallbackOtp) {
      // device tidak valid / expired / lupa -> jatuh ke OTP. Bersihkan jejak kunci.
      localStorage.removeItem(LOCKED_KEY);
      localStorage.removeItem(REFRESH_KEY);
      setLockedSession(null);
    }
    return { success: false, message: data?.error?.message ?? 'PIN salah.', fallbackOtp };
  }

  async function setPin(pin: string) {
    if (!token) return { success: false, message: 'Belum login.' };
    const result = await safeFetchJson(`${API}/auth/pin/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pin }),
    });
    if (result.errorMessage) return { success: false, message: result.errorMessage };
    const ok = result.data?.success === true;
    // O3: PIN baru ter-set => tandai has_pin true supaya PIN-login muncul saat Keluar.
    if (ok && user) {
      persistLastUser({ phone: user.phone, name: user.name, has_pin: true });
    }
    return {
      success: ok,
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
    if (result.data.data) {
      identifyUserInPostHog(result.data.data);
      // has_pin tidak dikirim -> di-merge (pertahankan status PIN existing).
      persistLastUser({ phone: result.data.data.phone, name: result.data.data.name });
    }
    return true;
  }

  // KUNCI (logout biasa): buang access token, set flag terkunci.
  // Refresh token + device + last_user DIPERTAHANKAN -> masuk lagi cukup PIN.
  function logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(LOCKED_KEY, '1');
    }
    // O2: recompute lockedSession langsung (tanpa perlu reload halaman).
    // O3: HANYA tampilkan PIN-login kalau user punya PIN; kalau tidak, login page tampil OTP.
    const lu = readLastUser();
    if (lu?.has_pin) {
      setLockedSession({ phone: lu.phone, name: lu.name });
    } else {
      setLockedSession(null);
    }
    setToken(null);
    setUser(null);
  }

  // KELUAR PENUH: buang semua jejak sesi -> masuk lagi WAJIB OTP.
  function logoutFull() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(LOCKED_KEY);
      localStorage.removeItem(LASTUSER_KEY);
      // DEVICE_KEY dipertahankan (identitas device stabil).
    }
    setToken(null);
    setUser(null);
    setLockedSession(null);
    resetPostHog();
  }

  return {
    user,
    token,
    isLoading,
    lockedSession,
    requestOtp,
    verifyOtp,
    pinLogin,
    setPin,
    verifyPin,
    updateProfile,
    logout,
    logoutFull,
  };
}
