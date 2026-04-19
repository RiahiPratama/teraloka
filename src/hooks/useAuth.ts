'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { posthog, isPostHogReady } from '@/lib/posthog';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';

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
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
        // Re-identify on page reload saat user masih authenticated
        // (PostHog bisa lose identity across browser restart)
        if (data.data) {
          identifyUserInPostHog(data.data);
        }
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }

  async function requestOtp(phone: string) {
    const res = await fetch(`${API}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    return { success: data.success, message: data.data?.message ?? data.error?.message ?? 'Terjadi kesalahan' };
  }

  async function verifyOtp(phone: string, otp: string) {
    const res = await fetch(`${API}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });
    const data = await res.json();

    if (data.success && data.data?.token) {
      localStorage.setItem(TOKEN_KEY, data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);

      // Identify user di PostHog setelah login sukses.
      // Link semua events browser sebelumnya (anonymous) ke user.id ini.
      // Critical: kalau user baru register → juga identify (first touch tracking)
      identifyUserInPostHog(data.data.user);
    }

    return {
      success: data.success,
      message: data.data?.message ?? data.error?.message ?? 'Terjadi kesalahan',
      is_new: data.data?.is_new,
    };
  }

  async function updateProfile(name: string) {
    if (!token) return false;
    const res = await fetch(`${API}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.success) {
      setUser(data.data);
      // Re-identify dengan updated name
      if (data.data) {
        identifyUserInPostHog(data.data);
      }
    }
    return data.success;
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
