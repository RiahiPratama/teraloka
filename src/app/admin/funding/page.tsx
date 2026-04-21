'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  HandHeart, ArrowLeft, CheckCircle2, Clock,
  XCircle, Settings, Calculator, ChevronRight,
  AlertCircle, Loader2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

type Stats = {
  pending: number;
  verifiedToday: number;
  rejectedToday: number;
};

export default function AdminFundingLanding() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats>({ pending: 0, verifiedToday: 0, rejectedToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) loadStats();
  }, [token]);

  async function loadStats() {
    try {
      const res = await fetch(`${API}/funding/admin/donations?status=pending_review`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data?.stats) {
        setStats(json.data.stats);
      }
    } catch {}
    setLoading(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user || (user.role !== 'super_admin' && user.role !== 'admin_funding')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm bg-white rounded-2xl border border-gray-100 p-6 text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-900 mb-1">Akses Ditolak</p>
          <p className="text-xs text-gray-500 mb-4">Hanya super admin atau admin funding yang bisa akses halaman ini.</p>
          <Link href="/admin" className="text-xs font-bold text-[#EC4899]">← Kembali ke Admin</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-2 hover:text-gray-700">
            <ArrowLeft size={14} /> Admin Panel
          </Link>
          <div className="flex items-center gap-2">
            <HandHeart size={20} className="text-[#EC4899]" strokeWidth={2.2} />
            <h1 className="text-lg font-extrabold text-gray-900">Admin BADONASI</h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">Kelola donasi, verifikasi, dan pengaturan BADONASI.</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">

        {/* Stats quick view */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-amber-100 bg-amber-50/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={12} className="text-amber-600" />
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pending</p>
            </div>
            <p className="text-xl font-extrabold text-amber-800">
              {loading ? '—' : stats.pending}
            </p>
            <p className="text-[10px] text-amber-600 mt-0.5">donasi menunggu</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 size={12} className="text-emerald-600" />
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Verified</p>
            </div>
            <p className="text-xl font-extrabold text-emerald-800">
              {loading ? '—' : stats.verifiedToday}
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5">hari ini</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <XCircle size={12} className="text-gray-500" />
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Rejected</p>
            </div>
            <p className="text-xl font-extrabold text-gray-700">
              {loading ? '—' : stats.rejectedToday}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">hari ini</p>
          </div>
        </div>

        {/* Navigation cards */}
        <div className="space-y-3">

          {/* Donations */}
          <Link
            href="/admin/funding/donations"
            className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-pink-200 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center shadow-sm">
                <HandHeart size={20} className="text-white" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-900">Verifikasi Donasi</p>
                  {stats.pending > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      {stats.pending} baru
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Cek bukti transfer donor, approve atau reject donasi masuk.
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-gray-400 self-center" />
            </div>
          </Link>

          {/* Settings */}
          <Link
            href="/admin/funding/settings"
            className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#003526] to-[#1B6B4A] flex items-center justify-center shadow-sm">
                <Settings size={20} className="text-white" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 mb-1">Pengaturan BADONASI</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Atur harga acuan zakat (beras, emas) untuk kalkulator publik.
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Calculator size={11} className="text-gray-400" />
                  <p className="text-[11px] text-gray-400">Harga beras & emas</p>
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-gray-400 self-center" />
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}
