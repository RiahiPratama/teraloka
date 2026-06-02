'use client';

/**
 * TeraLoka — FinancialHealthBanner (Health Alerts — WAJAH)
 * Sesi Financial Polish (2 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Banner status kesehatan keuangan. OTAK di backend (/money/revenue/health):
 * backend yang nentuin status + daftar alert. Komponen ini MURNI nampilin —
 * nol logika bisnis. Healthy=hijau, warning=kuning, critical=merah.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertTriangle, AlertOctagon, ArrowRight } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface Alert { level: 'critical' | 'warning'; code: string; message: string; action_url?: string; }
interface Health { status: 'healthy' | 'warning' | 'critical'; alerts: Alert[]; checked_at: string; }

interface Props { period: string; appliedFrom: string; appliedTo: string; }

const STYLE = {
  healthy:  { wrap: 'bg-status-healthy/8 border-status-healthy/30',   icon: 'text-status-healthy',  Icon: ShieldCheck },
  warning:  { wrap: 'bg-ads/8 border-ads/30',                          icon: 'text-ads',             Icon: AlertTriangle },
  critical: { wrap: 'bg-status-critical/8 border-status-critical/30',  icon: 'text-status-critical', Icon: AlertOctagon },
} as const;

export default function FinancialHealthBanner({ period, appliedFrom, appliedTo }: Props) {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData]       = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const q = period === 'custom' && appliedFrom && appliedTo
      ? `from=${encodeURIComponent(new Date(appliedFrom).toISOString())}&to=${encodeURIComponent(new Date(appliedTo + 'T23:59:59').toISOString())}`
      : `period=${period}`;
    try {
      const res = await fetch(`${API}/money/revenue/health?${q}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success && json.data) setData(json.data);
      else setData(null);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [token, period, appliedFrom, appliedTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) return null;

  const st = STYLE[data.status];
  const Icon = st.Icon;
  const checked = new Date(data.checked_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn('rounded-xl border px-[18px] py-3.5 mb-5', st.wrap)}>
      <div className="flex items-start gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', st.wrap)}>
          <Icon className={cn('w-4 h-4', st.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          {data.status === 'healthy' ? (
            <p className="text-[13px] font-bold text-text">
              Keuangan sehat <span className="font-normal text-text-muted">· semua neraca seimbang, tidak ada fee jatuh tempo atau defisit</span>
            </p>
          ) : (
            <>
              <p className={cn('text-[13px] font-bold', st.icon)}>
                {data.status === 'critical' ? 'Perlu perhatian segera' : 'Perlu dicek'}
                <span className="font-normal text-text-muted"> · {data.alerts.length} hal terdeteksi</span>
              </p>
              <ul className="mt-1.5 space-y-1">
                {data.alerts.map((a) => (
                  <li key={a.code} className="text-[12px] text-text flex items-center gap-2">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', a.level === 'critical' ? 'bg-status-critical' : 'bg-ads')} />
                    <span className="min-w-0">{a.message}</span>
                    {a.action_url && (
                      <button
                        onClick={() => router.push(a.action_url!)}
                        className={cn('inline-flex items-center gap-0.5 text-[11px] font-bold shrink-0 hover:underline', st.icon)}
                      >
                        Tindak <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-[10px] text-text-subtle mt-1">Dicek otomatis · {checked}</p>
        </div>
      </div>
    </div>
  );
}
