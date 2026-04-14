'use client';

import { useState, useEffect, createContext, useContext } from 'react';

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
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
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
    if (data.success) setUser(data.data);
    return data.success;
  }

  function logout() {
    if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return { user, token, isLoading, requestOtp, verifyOtp, updateProfile, logout };
}
