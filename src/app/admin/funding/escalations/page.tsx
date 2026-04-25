'use client';

/**
 * /admin/funding/escalations — Auto-Escalation Admin Page (FIX-G-B3)
 * 
 * Filosofi: Donasi pending > 3 hari + penggalang offline = auto-escalate
 * to admin. Admin verify atau reject dari sini.
 * 
 * Workflow:
 *   1. Admin click "Scan Escalations" — backend cari kandidat
 *   2. Result: list of donations yang baru di-escalate
 *   3. Admin take-over: verify atau reject dari list
 *   4. Refresh list
 * 
 * Architecture: Backend (Otak) compute, frontend (Wajah) display + action.
 */

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft, Search, Loader2, AlertTriangle, RefreshCw, CheckCircle2,
  XCircle, Clock, Users, Wallet, Eye, ChevronRight,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

type StatusFilter = 'unresolved' | 'resolved' | 'all';

interface EscalatedDonation {
  id: string;
  donation_code: string;
  campaign_id: string;
  donor_name: string;
  donor_phone: string | null;
  is_anonymous: boolean;
  amount: number;
  total_transfer: number;
  verification_status: string;
  escalated_to_admin_at: string;
  escalation_reason: string;
  created_at: string;
  campaigns?: {
    id: string;
    title: string;
    slug: string;
    creator_id: string;
  };
}

interface ScanResult {
  scanned: number;
  escalated: number;
  candidates: Array<{
    donation_id: string;
    donation_code: string;
    campaign_id: string;
    campaign_title: string;
    donor_name: string;
    amount: number;
    days_pending: number;
    creator_offline_since: string | null;
  }>;
}

export default function AdminEscalationsPage() {
  const { user, token, isLoading: authLoading } = useAuth();

  const [donations, setDonations] = useState<EscalatedDonation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('unresolved');

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanPreview, setShowScanPreview] = useState(false);
  const [dryRun, setDryRun] = useState(true);

  const fetchEscalated = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const sp = new URLSearchParams({
        status: statusFilter,
        limit: '50',
      });
      const res = await fetch(`${API}/funding/admin/escalations?${sp.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setDonations(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchEscalated();
  }, [fetchEscalated]);

  async function handleScan() {
    if (!token) return;
    setScanning(true);
    try {
      const res = await fetch(`${API}/funding/admin/escalations/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          days_since_created: 3,
          dry_run: dryRun,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setScanResult(json.data);
        setShowScanPreview(true);
        // Refresh list if not dry-run
        if (!dryRun) {
          await fetchEscalated();
        }
      }
    } catch {
      // silent fail
    } finally {
      setScanning(false);
    }
  }

  // ── Auth guard ──
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-bold">Login dibutuhkan</h2>
          <Link href="/login" className="mt-3 inline-block rounded-xl bg-[#003526] px-5 py-2.5 text-sm font-bold text-white">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#003526] to-[#1B6B4A] text-white">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <Link
            href="/admin/funding"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4"
          >
            <ArrowLeft size={16} /> Admin BADONASI
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-amber-300" />
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Auto-Escalation
            </p>
          </div>
          <h1 className="text-2xl font-extrabold">Donasi Tertunda</h1>
          <p className="text-white/70 text-sm mt-1 leading-relaxed">
            Donasi pending {'>'} 3 hari dari penggalang yang sedang offline. Admin take-over verifikasi.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 -mt-4">
        {/* Scan Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-1">
                <RefreshCw size={13} className="text-[#003526]" />
                Scan Auto-Escalation
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Cari donasi pending {'>'} 3 hari dari penggalang offline. Mark sebagai escalated supaya admin handle.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={e => setDryRun(e.target.checked)}
                className="w-4 h-4 accent-[#003526]"
              />
              <span className="text-xs text-gray-700 font-medium">
                Dry-run (preview tanpa update)
              </span>
            </label>
          </div>

          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full rounded-xl bg-[#003526] py-3 text-sm font-bold text-white hover:bg-[#1B6B4A] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {scanning ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Sedang scan...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Run Scan {dryRun ? '(Dry-Run)' : '(Real)'}
              </>
            )}
          </button>

          {/* Scan result */}
          {showScanPreview && scanResult && (
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-extrabold text-blue-900">
                  📊 Hasil Scan
                </p>
                <button
                  onClick={() => setShowScanPreview(false)}
                  className="text-xs text-blue-700 hover:underline"
                >
                  Tutup
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-lg bg-white border border-blue-200 p-3 text-center">
                  <p className="text-xs text-blue-700">Total Pending</p>
                  <p className="text-2xl font-extrabold text-blue-900">{scanResult.scanned}</p>
                </div>
                <div className="rounded-lg bg-white border border-amber-200 p-3 text-center">
                  <p className="text-xs text-amber-700">
                    {dryRun ? 'Akan di-escalate' : 'Di-escalate'}
                  </p>
                  <p className="text-2xl font-extrabold text-amber-700">
                    {dryRun ? scanResult.candidates.length : scanResult.escalated}
                  </p>
                </div>
              </div>

              {scanResult.candidates.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {scanResult.candidates.slice(0, 10).map(c => (
                    <div key={c.donation_id} className="rounded-lg bg-white border border-gray-200 p-3 text-xs">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-bold text-gray-900 truncate flex-1">{c.campaign_title}</p>
                        <span className="font-extrabold text-[#BE185D] shrink-0">
                          Rp {c.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-gray-600">
                        {c.donor_name} · Kode {c.donation_code} · {c.days_pending} hari pending
                      </p>
                    </div>
                  ))}
                  {scanResult.candidates.length > 10 && (
                    <p className="text-[10px] text-gray-500 text-center">
                      Dan {scanResult.candidates.length - 10} donasi lainnya...
                    </p>
                  )}
                </div>
              )}

              {!dryRun && scanResult.escalated > 0 && (
                <p className="text-[11px] text-amber-700 mt-2 font-medium">
                  ✓ Donasi di atas sudah di-escalate. Refresh list untuk lihat di tabel bawah.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 grid grid-cols-3 gap-1 mb-4">
          {(['unresolved', 'resolved', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                statusFilter === s
                  ? 'bg-[#003526] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'unresolved' ? 'Belum Selesai' : s === 'resolved' ? 'Sudah Selesai' : 'Semua'}
            </button>
          ))}
        </div>

        {/* Escalated list */}
        <div className="space-y-2">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
              <Loader2 size={24} className="animate-spin text-[#003526] mx-auto" />
            </div>
          ) : donations.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <CheckCircle2 size={36} className="text-emerald-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700 mb-1">
                Tidak ada donasi tertunda
              </p>
              <p className="text-xs text-gray-500">
                {statusFilter === 'unresolved'
                  ? 'Semua donasi sudah handled. Klik scan untuk cek lagi.'
                  : 'Tidak ada hasil dengan filter ini.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-2">
                Menampilkan {donations.length} dari {total} donasi
              </p>
              {donations.map(d => (
                <EscalatedDonationCard key={d.id} donation={d} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EscalatedDonationCard
// ═══════════════════════════════════════════════════════════════

function EscalatedDonationCard({ donation }: { donation: EscalatedDonation }) {
  const statusMeta = (() => {
    switch (donation.verification_status) {
      case 'verified':
        return { label: 'Verified', color: '#047857', bg: 'bg-emerald-100', Icon: CheckCircle2 };
      case 'rejected':
        return { label: 'Rejected', color: '#DC2626', bg: 'bg-red-100', Icon: XCircle };
      default:
        return { label: 'Pending', color: '#B45309', bg: 'bg-amber-100', Icon: Clock };
    }
  })();
  const StatusIcon = statusMeta.Icon;

  const escalatedAt = new Date(donation.escalated_to_admin_at);
  const daysSinceEscalated = Math.floor(
    (Date.now() - escalatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">
            {donation.campaigns?.title || 'Campaign'}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Donor: {donation.is_anonymous ? 'Hamba Allah' : donation.donor_name} · Kode {donation.donation_code}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.bg}`}
          style={{ color: statusMeta.color }}
        >
          <StatusIcon size={9} />
          {statusMeta.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Donasi</p>
          <p className="text-sm font-extrabold text-[#BE185D]">
            Rp {Number(donation.amount).toLocaleString('id-ID')}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Total Transfer</p>
          <p className="text-sm font-bold text-gray-700">
            Rp {Number(donation.total_transfer).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 mb-2">
        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">
          Alasan Escalation
        </p>
        <p className="text-[11px] text-amber-900 leading-relaxed">
          {donation.escalation_reason || '—'}
        </p>
        <p className="text-[10px] text-amber-700 mt-1">
          Di-escalate {daysSinceEscalated === 0 ? 'hari ini' : `${daysSinceEscalated} hari lalu`}
        </p>
      </div>

      <Link
        href={`/admin/funding/donations/${donation.id}`}
        className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-[#003526] py-2 text-xs font-bold text-white hover:bg-[#1B6B4A] transition-colors"
      >
        <Eye size={12} />
        Take-Over Verifikasi
        <ChevronRight size={12} />
      </Link>
    </div>
  );
}
