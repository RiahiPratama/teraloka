'use client';

/**
 * TeraLoka — EarmarkTrackerCard (Dana Bisnis di Rekening Owner)
 * Sesi Financial Polish (2 Jun 2026) · WAJAH
 * ────────────────────────────────────────────────────────────────
 * Disiplin pra-formasi: dana PT + Yayasan fisik kecampur di rekening
 * owner. Card ini ingetin "ini punya bisnis, JANGAN kepake pribadi".
 * OTAK di /money/revenue/earmark (hitung di backend). Komponen = nampilin.
 * Dana Yayasan ditandai SAKRAL (misi sosial dari fee donasi).
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Lock, Building2, HeartHandshake } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface Earmark {
  pt_cash: number; yayasan_cash: number; total_earmarked: number;
  pt_accounts: { code: string; name: string; balance: number }[];
  yayasan_accounts: { code: string; name: string; balance: number }[];
}
const formatRp = (n: number) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

export default function EarmarkTrackerCard() {
  const { token } = useAuth();
  const [data, setData]       = useState<Earmark | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/money/revenue/earmark`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success && json.data) setData(json.data);
      else setData(null);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) return null;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden mb-5">
      <div className="px-[18px] py-3 border-b border-border flex items-center gap-2">
        <Lock className="w-4 h-4 text-ads shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-text">Dana Bisnis di Rekening Owner</p>
          <p className="text-[11px] text-text-muted mt-0.5">Pra-formasi · ter-track di ledger · jangan kepake untuk pribadi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* PT */}
        <div className="px-[18px] py-3.5 md:border-r border-border border-b md:border-b-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 text-status-healthy" />
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Earmark PT (operasional)</span>
          </div>
          <p className="text-[18px] font-extrabold text-text tabular-nums">{formatRp(data.pt_cash)}</p>
          <div className="mt-1.5 space-y-0.5">
            {data.pt_accounts.map((a) => (
              <p key={a.code} className="text-[10px] text-text-subtle flex justify-between gap-2">
                <span className="truncate">{a.code} {a.name.replace(/ — Earmarked PT$/, '')}</span>
                <span className="tabular-nums shrink-0">{formatRp(a.balance)}</span>
              </p>
            ))}
          </div>
        </div>

        {/* Yayasan — SAKRAL */}
        <div className="px-[18px] py-3.5">
          <div className="flex items-center gap-1.5 mb-1">
            <HeartHandshake className="w-3.5 h-3.5 text-ads" />
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Earmark Yayasan (misi sosial)</span>
          </div>
          <p className="text-[18px] font-extrabold text-ads tabular-nums">{formatRp(data.yayasan_cash)}</p>
          <p className="text-[10px] text-ads/80 mt-1.5 leading-relaxed">
            Dana fee donasi untuk misi Yayasan. Paling sakral — jangan kepake untuk operasional PT apalagi pribadi.
          </p>
        </div>
      </div>

      <div className="px-[18px] py-3 border-t border-border bg-surface-muted/40 flex items-center justify-between gap-3">
        <span className="text-[12px] font-bold text-text">Total harus ada di rekening</span>
        <span className="text-[16px] font-extrabold text-text tabular-nums">{formatRp(data.total_earmarked)}</span>
      </div>
    </div>
  );
}
