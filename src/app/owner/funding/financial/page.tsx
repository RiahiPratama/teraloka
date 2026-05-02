'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Helpers ────────────────────────────────────────────────────
function rp(n: number) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function getMonthRange(offset = 0) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const from = new Date(year, month, 1).toISOString().slice(0, 10);
  const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

function exportCSV(rows: any[], filename: string) {
  const headers = ['Tanggal', 'Kampanye', 'Donor', 'Kode', 'Nominal', 'Fee Op', 'Fee Penggalang', 'Kode Unik', 'Total Transfer', 'Status', 'Diterima'];
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      fmt(r.created_at),
      `"${r.campaign_title ?? ''}"`,
      r.is_anonymous ? 'Anonim' : `"${r.donor_name}"`,
      r.donation_code,
      r.amount,
      r.operational_fee,
      r.penggalang_fee ?? 0,
      parseInt(r.donation_code, 10) || 0,
      r.total_transfer,
      r.verification_status,
      r.amount_received ?? '',
    ].join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Summary {
  total_accrual: number;           // Total masuk rekening (donasi+fee+kode)
  total_collected: number;         // Nominal donasi saja
  total_operational_fee: number;   // Fee TeraLoka (kewajiban setor)
  total_fee_remitted: number;      // Sudah disetor ke TeraLoka
  total_fee_pending: number;       // Belum disetor
  last_remitted_at: string | null;
  total_under_audit: number;
  total_disbursed: number;
  total_disbursed_pending: number;
  saldo: number;
  total_fee_penggalang: number;
  total_kode_unik: number;
  penggalang_revenue: number;
  total_donors: number;
  pending_count: number;
  verified_count: number;
  under_audit_count: number;
  rejected_count: number;
  platform_phase: string;
}

interface Donation {
  id: string;
  donation_code: string;
  campaign_id: string;
  campaign_title?: string;
  donor_name: string;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  penggalang_fee?: number;
  total_transfer: number;
  verification_status: string;
  amount_received?: number | null;
  discrepancy_amount?: number | null;
  created_at: string;
}

interface Campaign { id: string; title: string; }

interface MonthlyRevenue {
  month: string;            // "2026-05"
  label: string;            // "Mei 2026"
  fee_penggalang: number;
  kode_unik: number;
  total: number;
  donation_count: number;
}

interface MonthlyTracking {
  months: MonthlyRevenue[];
  total_revenue_period: number;
  best_month: MonthlyRevenue | null;
  growth_pct: number;
}

const PERIOD_PRESETS = [
  { label: 'Bulan Ini', key: 'this_month' },
  { label: 'Bulan Lalu', key: 'last_month' },
  { label: '3 Bulan', key: '3months' },
  { label: 'Semua Waktu', key: 'all' },
  { label: 'Custom', key: 'custom' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  verified:    { label: '✅ Verified',     color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  under_audit: { label: '⏳ Under Audit',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  pending:     { label: '⏸️ Pending',      color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  rejected:    { label: '🚫 Ditolak',      color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

// ── Main page ─────────────────────────────────────────────────

function FinancialContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const periodKey  = searchParams.get('period') ?? 'this_month';
  const campaignId = searchParams.get('campaign') ?? '';
  const customFrom = searchParams.get('from') ?? '';
  const customTo   = searchParams.get('to') ?? '';
  const showRejected = searchParams.get('show_rejected') === '1';

  const [summary, setSummary]   = useState<Summary | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [monthly, setMonthly] = useState<MonthlyTracking | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [donLoading, setDonLoading] = useState(true);

  function updateUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v) params.delete(k); else params.set(k, v);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  // Compute actual date range from period key
  const dateRange = useCallback(() => {
    if (periodKey === 'all') return { from: '', to: '' };
    if (periodKey === 'custom') return { from: customFrom, to: customTo };
    if (periodKey === 'last_month') return getMonthRange(-1);
    if (periodKey === '3months') {
      const to = getMonthRange(0).to;
      const from = getMonthRange(-2).from;
      return { from, to };
    }
    return getMonthRange(0); // this_month
  }, [periodKey, customFrom, customTo]);

  // Fetch summary — SELALU all-time (cumulative ledger), bukan per periode
  // Period filter hanya untuk tabel transaksi
  const fetchSummary = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    // Intentionally NO date filter — financial summary adalah running ledger
    if (campaignId) params.set('campaign_id', campaignId);
    try {
      const res = await fetch(`${API}/funding/my/financial-summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch {}
    setLoading(false);
  }, [token, campaignId]);

  // Fetch donations list
  const fetchDonations = useCallback(async () => {
    if (!token) return;
    setDonLoading(true);
    const { from, to } = dateRange();
    const params = new URLSearchParams({ limit: '200', status: 'all' });
    if (from) params.set('from', from);
    if (to)   params.set('to', to);
    if (campaignId) params.set('campaign_id', campaignId);
    try {
      const res = await fetch(`${API}/funding/my/donations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setDonations(json.data ?? []);
    } catch {}
    setDonLoading(false);
  }, [token, dateRange, campaignId]);

  // Fetch monthly tracking penggalang revenue (12 bulan rolling)
  const fetchMonthly = useCallback(async () => {
    if (!token) return;
    setMonthlyLoading(true);
    try {
      const res = await fetch(`${API}/funding/my/penggalang-revenue/monthly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setMonthly(json.data);
    } catch {}
    setMonthlyLoading(false);
  }, [token]);

  // Fetch campaign list for filter
  const fetchCampaigns = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/funding/my/campaigns?limit=100&status=all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setCampaigns(json.data?.map((c: any) => ({ id: c.id, title: c.title })) ?? []);
    } catch {}
  }, [token]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchDonations(); }, [fetchDonations]);
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);
  useEffect(() => { fetchMonthly(); }, [fetchMonthly]);

  // Filter donations for display
  const displayDonations = donations.filter(d => {
    if (d.verification_status === 'rejected' && !showRejected) return false;
    if (d.verification_status === 'pending') return false; // pending = belum masuk rekening
    return true;
  });

  const totalTransaksi = displayDonations.length;
  const { from, to } = dateRange();
  const periodLabel = PERIOD_PRESETS.find(p => p.key === periodKey)?.label ?? 'Custom';

  function handleExport() {
    const filename = `laporan_keuangan_${from || 'semua'}_${to || 'semua'}.csv`;
    exportCSV(displayDonations, filename);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAF9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #003526, #005738)', padding: '24px 20px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Link href="/owner" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
            ← Portal Mitra
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
            📊 Laporan Keuangan
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            Ringkasan pendapatan dan transaksi dari semua kampanye kamu
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>



        {/* Summary Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#6B7280', fontSize: 13 }}>Memuat ringkasan...</div>
        ) : summary && (
          <>
            {/* ── Akuntansi Layout ── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,53,38,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Ringkasan Kumulatif (Semua Waktu)
                </p>
                <span style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>
                  Tabel di bawah: {periodLabel}
                </span>
              </div>

              {/* 1. Accrual — Total Masuk Rekening */}
              <div style={{ background: 'rgba(0,53,38,0.04)', border: '1px solid rgba(0,53,38,0.12)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#003526', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  📥 Accrual — Total Uang Masuk Rekening
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <FinRow label={`Nominal Donasi (${summary.verified_count} verified)`} value={rp(summary.total_collected)} color="#065F46" />
                  <FinRow label="Fee Operasional (TeraLoka)" value={rp(summary.total_operational_fee)} color="#374151" />
                  <FinRow label="Kode Unik Verifikasi" value={rp(summary.total_kode_unik)} color="#374151" />
                  {summary.total_fee_penggalang > 0 && (
                    <FinRow label="Fee Penggalang (opt-in)" value={rp(summary.total_fee_penggalang)} color="#374151" />
                  )}
                  <div style={{ borderTop: '1px solid rgba(0,53,38,0.1)', paddingTop: 8, marginTop: 2 }}>
                    <FinRow label="TOTAL ACCRUAL" value={rp(summary.total_accrual || (summary.total_collected + summary.total_operational_fee + summary.total_kode_unik + summary.total_fee_penggalang))} color="#003526" bold />
                  </div>
                </div>
              </div>

              {/* Under Audit badge */}
              {summary.total_under_audit > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>⏳ Under Audit — {summary.under_audit_count} donasi</p>
                    <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Dana sudah masuk rekening, menunggu resolusi mismatch</p>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#92400E' }}>{rp(summary.total_under_audit)}</p>
                </div>
              )}

              {/* 2. Saldo Breakdown */}
              <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💰 Saldo di Rekening (Dana Penerima)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FinRow label="Nominal Donasi Terkumpul" value={rp(summary.total_collected)} color="#065F46" />
                  <FinRow label="Sudah Disalurkan ke Penerima" value={`−${rp(summary.total_disbursed)}`} color="#EF4444" />
                  {summary.total_disbursed_pending > 0 && (
                    <FinRow label="Pencairan Diajukan (pending approval)" value={`−${rp(summary.total_disbursed_pending)}`} color="#F59E0B" dim />
                  )}
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 8, marginTop: 2 }}>
                    <FinRow label="SALDO AKTUAL" value={rp(Math.max(0, summary.saldo))} color="#003526" bold />
                  </div>
                </div>
                {summary.total_disbursed_pending > 0 && (
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8, fontStyle: 'italic' }}>
                    * Saldo = Terkumpul − Disalurkan − Pencairan Pending
                  </p>
                )}
              </div>

              {/* 3. Fee TeraLoka (kewajiban) — dengan breakdown remitted vs pending */}
              {summary.total_operational_fee > 0 && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    🏦 Fee TeraLoka — Kewajiban Setor
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <FinRow label="Total Fee Terkumpul dari Donor" value={rp(summary.total_operational_fee)} color="#78350F" />
                    {(summary.total_fee_remitted ?? 0) > 0 && (
                      <FinRow
                        label={'Sudah Disetor ke TeraLoka'}
                        value={`−${rp(summary.total_fee_remitted ?? 0)}`}
                        color="#10B981"
                      />
                    )}
                    <div style={{ borderTop: '1px solid #FDE68A', paddingTop: 8, marginTop: 2 }}>
                      <FinRow
                        label="Yang Perlu Disetor"
                        value={rp(summary.total_fee_pending ?? summary.total_operational_fee)}
                        color="#92400E"
                        bold
                      />
                    </div>
                  </div>
                  {summary.last_remitted_at && (
                    <p style={{ fontSize: 10, color: '#B45309', marginTop: 8 }}>
                      Terakhir disetor: {new Date(summary.last_remitted_at!).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  {(summary.total_fee_pending ?? 0) > 0 && (
                    <>
                      <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(146,64,14,0.08)', borderRadius: 8 }}>
                        <p style={{ fontSize: 10, color: '#92400E', fontWeight: 600 }}>
                          ⚠️ Setor ke rekening TeraLoka sesuai jadwal settlement bulanan
                        </p>
                      </div>

                      {/* ⭐ CTA Setor Fee — discoverability point utama (Phase 3) */}
                      <Link
                        href="/owner/funding/financial/fee-remittance"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 10,
                          padding: '12px 14px',
                          background: 'linear-gradient(135deg, #92400E, #B45309)',
                          borderRadius: 10,
                          textDecoration: 'none',
                          boxShadow: '0 2px 8px rgba(146,64,14,0.25)',
                        }}
                      >
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                            💸 Setor Fee Sekarang
                          </p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>
                            Submit bukti transfer fee ke TeraLoka
                          </p>
                        </div>
                        <span style={{ fontSize: 18, color: '#fff', fontWeight: 700 }}>→</span>
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* 4. Pendapatan Penggalang */}
              {(summary.total_fee_penggalang > 0 || summary.total_kode_unik > 0) && (
                <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#BE185D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    🎁 Pendapatan Pribadi Penggalang
                  </p>
                  {summary.total_fee_penggalang > 0 && (
                    <FinRow label="Fee Operasional Penggalang (opt-in donor)" value={rp(summary.total_fee_penggalang)} color="#374151" />
                  )}
                  <FinRow label="Kode Unik (kompensasi verifikasi)" value={rp(summary.total_kode_unik)} color="#374151" />
                  <div style={{ borderTop: '1px solid #FECDD3', paddingTop: 8, marginTop: 6 }}>
                    <FinRow label="TOTAL PENDAPATAN PRIBADI" value={rp(summary.penggalang_revenue)} color="#BE185D" bold />
                  </div>
                </div>
              )}
            </div>

            {/* Rejected toggle */}
            {summary.rejected_count > 0 && (
              <div style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444' }}>🚫 {summary.rejected_count} donasi ditolak</span>
                  <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 8 }}>Tidak masuk hitungan</span>
                </div>
                <button
                  onClick={() => updateUrl({ show_rejected: showRejected ? null : '1' })}
                  style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', background: 'transparent', border: '1px solid #FECACA', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}
                >
                  {showRejected ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Transaction Table */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,53,38,0.06)' }}>
          {/* Table header + filter controls */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                Riwayat Transaksi
                <span style={{ fontSize: 12, fontWeight: 400, color: '#6B7280', marginLeft: 8 }}>
                  {totalTransaksi} donasi
                </span>
              </p>
              <button
                onClick={handleExport}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 10,
                  border: '1.5px solid #003526', background: '#003526', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ⬇ Export CSV
              </button>
            </div>

            {/* ⭐ Period + Campaign filter — di dalam table card */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {PERIOD_PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => updateUrl({ period: p.key, from: null, to: null })}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${periodKey === p.key ? '#003526' : '#E5E7EB'}`,
                    background: periodKey === p.key ? '#003526' : '#fff',
                    color: periodKey === p.key ? '#fff' : '#374151',
                    cursor: 'pointer',
                  }}
                >{p.label}</button>
              ))}
            </div>

            {periodKey === 'custom' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="date" value={customFrom}
                  onChange={e => updateUrl({ from: e.target.value })}
                  placeholder="Dari"
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <input type="date" value={customTo}
                  onChange={e => updateUrl({ to: e.target.value })}
                  placeholder="Sampai"
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
              </div>
            )}

            {campaigns.length > 0 && (
              <select
                value={campaignId}
                onChange={e => updateUrl({ campaign: e.target.value || null })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, background: '#fff', color: '#111' }}
              >
                <option value="">Semua Kampanye</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </div>

          {donLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>Memuat transaksi...</div>
          ) : displayDonations.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Tidak ada transaksi</p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>Coba ubah filter periode atau kampanye</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Tanggal', 'Kampanye', 'Donor / Kode', 'Nominal', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#6B7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayDonations.map((d, i) => {
                    const sm = STATUS_META[d.verification_status] ?? STATUS_META.pending;
                    const kodeNum = parseInt(d.donation_code, 10) || 0;
                    return (
                      <tr key={d.id} style={{ borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}>
                        <td style={{ padding: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {fmt(d.created_at)}
                        </td>
                        <td style={{ padding: '12px', maxWidth: 180 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.campaign_title ?? d.campaign_id.slice(0, 8) + '...'}
                          </p>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <p style={{ fontWeight: 600, color: '#374151' }}>
                            {d.is_anonymous ? '🎭 Anonim' : d.donor_name}
                          </p>
                          <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                            Kode #{d.donation_code}
                          </p>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <p style={{ fontWeight: 800, color: '#003526', fontSize: 13 }}>
                            {rp(d.amount)}
                          </p>
                          {(kodeNum > 0 || (d.penggalang_fee ?? 0) > 0) && (
                            <p style={{ fontSize: 10, color: '#EC4899', marginTop: 1 }}>
                              {kodeNum > 0 && `+${rp(kodeNum)} kode`}
                              {(d.penggalang_fee ?? 0) > 0 && ` +${rp(d.penggalang_fee!)} fee`}
                            </p>
                          )}
                          {d.discrepancy_amount !== null && d.discrepancy_amount !== undefined && d.discrepancy_amount !== 0 && (
                            <p style={{ fontSize: 10, color: d.discrepancy_amount < 0 ? '#EF4444' : '#F59E0B', marginTop: 1 }}>
                              {d.discrepancy_amount > 0 ? '↑' : '↓'} selisih {rp(Math.abs(d.discrepancy_amount))}
                            </p>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            display: 'inline-block',
                            background: sm.bg, color: sm.color,
                            fontSize: 10, fontWeight: 700,
                            padding: '3px 8px', borderRadius: 999,
                            whiteSpace: 'nowrap',
                          }}>
                            {sm.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Monthly Tracking — Pendapatan Penggalang per Bulan */}
        <MonthlyRevenueSection monthly={monthly} loading={monthlyLoading} />

        {/* Note */}
        <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
          Laporan ini mencerminkan donasi yang sudah masuk rekening kamu (verified + under audit).<br />
          Donasi pending belum diverifikasi tidak ditampilkan.
        </p>
      </div>
    </div>
  );
}

// Sub-components

// ─── Monthly Revenue Section ───────────────────────────────────
// Pendapatan Penggalang tracking per bulan (12 bulan rolling)
// Backend (Otak) compute, frontend display only.
function MonthlyRevenueSection({ monthly, loading }: { monthly: MonthlyTracking | null; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginTop: 16, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
        Memuat tracking pendapatan...
      </div>
    );
  }

  if (!monthly || monthly.total_revenue_period === 0) {
    return null; // skip section kalau belum ada revenue
  }

  // Find max value for bar normalization
  const maxTotal = Math.max(...monthly.months.map(m => m.total));

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 16, marginTop: 16, boxShadow: '0 1px 4px rgba(0,53,38,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#BE185D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            📈 Pendapatan Penggalang per Bulan
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF' }}>
            12 bulan terakhir · Fee penggalang + kode unik
          </p>
        </div>
        {monthly.growth_pct !== 0 && (
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: monthly.growth_pct > 0 ? '#047857' : '#DC2626',
            background: monthly.growth_pct > 0 ? '#D1FAE5' : '#FEE2E2',
            padding: '4px 10px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
          }}>
            {monthly.growth_pct > 0 ? '↗' : '↘'} {Math.abs(monthly.growth_pct)}% vs bulan lalu
          </div>
        )}
      </div>

      {/* Summary stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 10, padding: 10 }}>
          <p style={{ fontSize: 10, color: '#9F1239', fontWeight: 600, marginBottom: 2 }}>TOTAL 12 BULAN</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#BE185D', fontFamily: 'monospace' }}>
            {rp(monthly.total_revenue_period)}
          </p>
        </div>
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 10 }}>
          <p style={{ fontSize: 10, color: '#15803D', fontWeight: 600, marginBottom: 2 }}>BULAN TERBAIK</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
            {monthly.best_month?.label ?? '—'}
          </p>
          <p style={{ fontSize: 11, color: '#16A34A', fontFamily: 'monospace', fontWeight: 600 }}>
            {monthly.best_month ? rp(monthly.best_month.total) : ''}
          </p>
        </div>
      </div>

      {/* Bar list per bulan */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {monthly.months.slice().reverse().map((m, idx) => {
          const isCurrentMonth = idx === 0;
          const widthPct = maxTotal > 0 ? (m.total / maxTotal) * 100 : 0;
          return (
            <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 11,
                color: isCurrentMonth ? '#BE185D' : '#6B7280',
                fontWeight: isCurrentMonth ? 700 : 500,
                minWidth: 80,
                textAlign: 'right',
              }}>
                {m.label}
              </span>
              <div style={{ flex: 1, height: 22, background: '#F3F4F6', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                {m.total > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 0, bottom: 0, left: 0,
                    width: `${Math.max(widthPct, 8)}%`,
                    background: isCurrentMonth
                      ? 'linear-gradient(90deg, #BE185D, #EC4899)'
                      : 'linear-gradient(90deg, #FB7185, #FDA4AF)',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 8,
                  }}>
                    <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {rp(m.total)}
                    </span>
                  </div>
                )}
                {m.total === 0 && (
                  <span style={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>
                    Belum ada pendapatan
                  </span>
                )}
              </div>
              <span style={{ fontSize: 10, color: '#9CA3AF', minWidth: 40, textAlign: 'right' }}>
                {m.donation_count > 0 ? `${m.donation_count}×` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footnote */}
      <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 12, fontStyle: 'italic', textAlign: 'center' }}>
        Tracking ini menggabungkan fee penggalang (opt-in donor) + kode unik verifikasi
      </p>
    </div>
  );
}

function FinRow({ label, value, color, bold, dim }: { label: string; value: string; color: string; bold?: boolean; dim?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: bold ? 13 : 12, color: dim ? '#9CA3AF' : '#6B7280', fontWeight: bold ? 700 : 400, fontStyle: dim ? 'italic' : 'normal' }}>
        {label}
      </span>
      <span style={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 800 : 600, color, fontFamily: 'monospace' }}>
        {value}
      </span>
    </div>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B7280', fontSize: 14 }}>Memuat laporan...</p>
    </div>
  );
}

export default function OwnerFinancialPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FinancialContent />
    </Suspense>
  );
}
