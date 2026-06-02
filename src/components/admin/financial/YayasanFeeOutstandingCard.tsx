'use client';

/**
 * TeraLoka — YayasanFeeOutstandingCard (Fee Belum Disetor — ringkas)
 * Sesi Financial Polish (2 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Kartu warning ringkas: surface fee yang belum disetor partner + link
 * ke panel chase lengkap di BADONASI (/admin/funding/cashflow).
 * BUKAN duplikat — cuma jembatan. Sumber: /funding/admin/fees/summary
 * (sama dgn panel BADONASI → angka konsisten).
 * Tampil hanya kalau ada fee outstanding; kalau lunas → state hijau.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Clock, Users, ArrowRight, CheckCircle2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface FeeSummary {
  total_expected: number; total_remitted: number; total_pending: number;
  remitted_count: number; pending_count: number; partner_count: number;
  oldest_pending_days: number;
}
const formatRp = (n: number) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

export default function YayasanFeeOutstandingCard() {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData]       = useState<FeeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/funding/admin/fees/summary`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success && json.data) setData(json.data);
      else setData(null);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) return null;

  const pending = data.total_pending || 0;
  const goPanel = () => router.push('/admin/funding/cashflow');

  // Semua lunas → state hijau ringkas
  if (pending <= 0) {
    return (
      <div className="bg-surface border border-border rounded-xl px-[18px] py-3.5 mb-5 flex items-center gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-status-healthy shrink-0" />
        <p className="text-[13px] text-text font-semibold">Semua fee partner sudah disetor</p>
        <span className="text-[11px] text-text-muted">· tidak ada piutang fee outstanding</span>
      </div>
    );
  }

  const aging = data.oldest_pending_days || 0;
  const urgent = aging > 30;

  return (
    <div
      onClick={goPanel}
      role="button"
      tabIndex={0}
      className="rounded-xl px-[18px] py-4 mb-5 cursor-pointer transition-colors border bg-status-critical/8 border-status-critical/30 hover:bg-status-critical/12"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-status-critical/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-status-critical" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-text flex items-center gap-1.5">
              Fee Belum Disetor
              <span className="text-[15px] font-extrabold text-status-critical tabular-nums">{formatRp(pending)}</span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {data.partner_count} partner berutang</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> terlama {aging} hari
                {urgent && <span className="ml-1 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-status-critical/20 text-status-critical">urgent</span>}
              </span>
              <span className="text-text-subtle">· {data.pending_count} donasi belum di-settle</span>
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-status-critical shrink-0">
          Lihat per partner <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
}
