'use client';

/**
 * TeraLoka — DisbursementAgingPanel (Aliran Uang)
 * Sesi Audit BADONASI (2 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Fakta transparansi: dana belum disalurkan ke beneficiary + umur
 * mengendap. Ringkas (bucket pills) + expand (list campaign). Backend=OTAK
 * (/funding/admin/cashflow/disbursement-aging); panel ini WAJAH.
 * TIDAK kasih opini "harus cairkan" — cuma fakta (sisa, umur, rate, deadline).
 */

import { useEffect, useState, useCallback, useContext } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { Hourglass, ChevronDown, ChevronUp, Clock, CalendarX } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

type BucketKey = 'segar' | 'perhatian' | 'lama' | 'kritis';
interface AgingCampaign {
  campaign_id: string;
  campaign_title: string;
  partner_name: string;
  sisa: number;
  age_days: number;
  last_donation_at: string | null;
  collection_rate: number;
  deadline_passed: boolean;
  bucket: BucketKey;
}
interface AgingData {
  buckets: Record<BucketKey, { count: number; amount: number }>;
  total_sisa: number;
  total_count: number;
  oldest_days: number;
  campaigns: AgingCampaign[];
}

const BUCKET_META: Record<BucketKey, { label: string; color: string; range: string }> = {
  segar:     { label: 'Segar',     color: '#10B981', range: '< 7 hari' },
  perhatian: { label: 'Perhatian', color: '#F59E0B', range: '7-30 hari' },
  lama:      { label: 'Lama',      color: '#EA580C', range: '30-60 hari' },
  kritis:    { label: 'Kritis',    color: '#DC2626', range: '> 60 hari' },
};

function rupiah(n: number): string { return 'Rp ' + (n ?? 0).toLocaleString('id-ID'); }

export default function DisbursementAgingPanel() {
  const { t } = useContext(AdminThemeContext);
  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchAging = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/cashflow/disbursement-aging`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (res.ok && json.success) setData(json.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAging(); }, [fetchAging]);

  if (loading && !data) {
    return (
      <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: t.textDim }}>Memuat data dana belum disalurkan...</p>
      </div>
    );
  }
  if (!data || data.total_count === 0) {
    return (
      <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Hourglass size={16} color={t.textDim} />
        <span style={{ fontSize: 12, color: t.textDim }}>Tidak ada dana mengendap — semua dana sudah tersalurkan.</span>
      </div>
    );
  }

  const hasOld = data.buckets.lama.count > 0 || data.buckets.kritis.count > 0;
  const accent = data.buckets.kritis.count > 0 ? '#DC2626' : data.buckets.lama.count > 0 ? '#EA580C' : '#F59E0B';

  return (
    <div style={{ background: t.mainBg, border: `1px solid ${hasOld ? accent + '40' : t.sidebarBorder}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Hourglass size={17} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary, marginBottom: 1 }}>
              Dana Belum Disalurkan
            </p>
            <p style={{ fontSize: 11, color: t.textDim }}>
              {rupiah(data.total_sisa)} · {data.total_count} kampanye · tertua {data.oldest_days} hari
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {(Object.keys(BUCKET_META) as BucketKey[]).map(k => {
            const b = data.buckets[k];
            if (b.count === 0) return null;
            const m = BUCKET_META[k];
            return (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: m.color, background: m.color + '14', padding: '4px 10px', borderRadius: 999 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: m.color }} />
                {m.label} {b.count}
              </span>
            );
          })}
          {expanded ? <ChevronUp size={16} color={t.textDim} /> : <ChevronDown size={16} color={t.textDim} />}
        </div>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.campaigns.map(c => {
            const m = BUCKET_META[c.bucket];
            return (
              <div key={c.campaign_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: t.navHover + '40', border: `1px solid ${t.sidebarBorder}`, borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ minWidth: 200, flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>
                    {c.campaign_title}
                  </p>
                  <p style={{ fontSize: 11, color: t.textDim }}>{c.partner_name} · terkumpul {c.collection_rate}%</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: m.color, background: m.color + '14', padding: '3px 9px', borderRadius: 999 }}>
                    <Clock size={12} /> {c.age_days} hari
                  </span>
                  {c.deadline_passed && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#B45309', background: '#F59E0B14', padding: '3px 9px', borderRadius: 999 }}>
                      <CalendarX size={12} /> deadline lewat
                    </span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 800, color: t.textPrimary, minWidth: 110, textAlign: 'right' }}>
                    {rupiah(c.sisa)}
                  </span>
                </div>
              </div>
            );
          })}
          <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
            Umur dihitung sejak donasi terverifikasi terakhir. Angka = dana yang sudah diterima namun belum disalurkan ke beneficiary.
          </p>
        </div>
      )}
    </div>
  );
}
