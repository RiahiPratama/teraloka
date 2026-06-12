'use client';

/**
 * TeraLoka — Admin Financial Dashboard
 * Sub-Phase 8-E Sesi 5 Polish (18 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * CHANGES Sesi 5 Polish:
 *   - SourceCard component extended dengan onClick + hover state
 *   - Tab PT card "Ads (Iklan)" → wired navigate ke /admin/ads
 *   - Tab PT cards Bakos + BAPASIAR → tetap static (page belum ada)
 *   - Tab Yayasan cards → semua static (admin page belum ada, defer Phase 2)
 *   - Cursor pointer + hover effect HANYA untuk clickable cards
 *
 * Pattern Compliance:
 *   - Pattern AAZ: Static card kalau gak ada destination (honest)
 *   - Pattern T  : Interactive feedback hanya saat real navigation exist
 *
 * Architecture: 3-Tab structure ALL LIVE
 *   - Overview: Combined view + comparison chart
 *   - PT TeraLoka: Honest Phase 1 + 1 card interactive (Ads → /admin/ads)
 *   - Yayasan TeraLoka: Honest Phase 1 + all static (admin page defer)
 *
 * Data Layer:
 *   - GET /money/revenue/by-entity?period=30d
 *   - GET /money/revenue/timeseries?period=7d
 *   - GET /money/admin/events?limit=10
 *   - GET /money/admin/events?event_type=donation.fee_remitted
 *   - POST /admin/ads/revenue (LEGACY KEEP)
 * ────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PtTrialBalanceSection from '@/components/admin/financial/PtTrialBalanceSection';
import PtIncomeStatementSection from '@/components/admin/financial/PtIncomeStatementSection';
import PtBalanceSheetSection from '@/components/admin/financial/PtBalanceSheetSection';
import PtCashFlowSection from '@/components/admin/financial/PtCashFlowSection';
import YayasanActivitySection from '@/components/admin/financial/YayasanActivitySection';
import YayasanCashFlowSection from '@/components/admin/financial/YayasanCashFlowSection';
import YayasanBalanceSheetSection from '@/components/admin/financial/YayasanBalanceSheetSection';
import YayasanFeeOutstandingCard from '@/components/admin/financial/YayasanFeeOutstandingCard';
import FinancialHealthBanner from '@/components/admin/financial/FinancialHealthBanner';
import EarmarkTrackerCard from '@/components/admin/financial/EarmarkTrackerCard';
import OpeningBalanceBuilder from '@/components/admin/financial/OpeningBalanceBuilder';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import BankAccountsTabPanel from '@/components/admin/financial/bank-accounts/BankAccountsTabPanel'; // SESI 5F (19 Mei 2026)
import { Wallet, LayoutDashboard, Building2, HeartHandshake, Landmark, Megaphone, Home, Ship, TrendingUp, Receipt, Inbox, Lightbulb, Banknote, BarChart3, Activity, Scale, GraduationCap, HandCoins, PartyPopper, CheckCircle2, XCircle, Download, Loader2, type LucideIcon } from 'lucide-react';
import { exportAccountantPackage } from '@/lib/financial/exportAccountantPackage';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

const formatRp   = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const formatTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

type Tab = 'overview' | 'pt' | 'yayasan' | 'opening-balance' | 'bank-accounts';  // SESI 5F (19 Mei 2026)

// ─── Type definitions (mirror backend types.ts) ────────────────

interface RevenueByEntityData {
  period:         { from: string; to: string };
  combined_total: number;
  pt_digital:     { total: number; sources: { ads: number; bakos: number; commission: number } };
  yayasan:        { total: number; sources: { badonasi_fee: number; grant: number; csr: number } };
  meta:           { event_count: number; by_event_type: Record<string, number> };
}

interface TimeseriesPoint {
  date:         string;
  total:        number;
  pt_digital:   number;
  yayasan:      number;
  badonasi_fee: number;
  ads:          number;
}

interface FinancialEvent {
  id:               string;
  event_type:       string;
  source_domain:    string;
  source_entity_id: string;
  amount:           number;
  fee_amount:       number;
  metadata:         Record<string, any>;
  recorded_at:      string;
}

// ─── Event type display helper ─────────────────────────────────

const EVENT_TYPE_CONFIG: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  'donation.verified':     { icon: CheckCircle2, label: 'Donasi Terverifikasi',  color: '#059669' },
  'donation.rejected':     { icon: XCircle,      label: 'Donasi Ditolak',         color: '#7F1D1D' },
  'donation.fee_remitted': { icon: Banknote,     label: 'Fee Disetor (Yayasan)',  color: '#E8963A' },
  'ad.payment_recorded':   { icon: Megaphone,    label: 'Pembayaran Iklan (Ads)', color: '#1B6B4A' },
};

// Kategori beban PT (akun 6xxx) + sumber kas (1110/1111/1120)
const EXPENSE_CATEGORIES: { code: string; label: string; icon: string }[] = [
  { code: '6101', label: 'Server & Infrastruktur', icon: '🖥️' },
  { code: '6102', label: 'Gaji & Honor Tim',        icon: '👥' },
  { code: '6103', label: 'Marketing & Promosi',     icon: '📣' },
  { code: '6104', label: 'Operasional Lapangan',    icon: '🚐' },
  { code: '6105', label: 'Administrasi & Umum',     icon: '🗂️' },
  { code: '6106', label: 'Legal & Notaris',         icon: '⚖️' },
  { code: '6107', label: 'Bank & Transfer',         icon: '🏦' },
  { code: '6199', label: 'Lain-lain',               icon: '📦' },
];
const CASH_SOURCES: { code: string; label: string }[] = [
  { code: '1110', label: 'Rekening Amar Radjab (BNI)' },
  { code: '1111', label: 'Rekening Risnawati Yunus' },
  { code: '1120', label: 'Kas Kecil (Petty Cash)' },
];

type PeriodKey = '7d' | '30d' | '90d' | 'ytd' | 'all' | 'custom';
const PERIOD_PRESETS: { key: PeriodKey; label: string }[] = [
  { key: '7d',  label: '7 Hari'    },
  { key: '30d', label: '30 Hari'   },
  { key: '90d', label: '90 Hari'   },
  { key: 'ytd', label: 'Tahun Ini' },
  { key: 'all', label: 'Semua'     },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AdminFinancialPage() {
  const { token } = useAuth();
  const [exporting, setExporting] = useState(false);

  async function handleExportPackage() {
    if (!token || exporting) return;
    setExporting(true);
    try {
      await exportAccountantPackage({ token, period, appliedFrom, appliedTo, periodLabel });
    } catch (e: any) {
      showToast(`Gagal export: ${e?.message ?? 'error'}`);
    } finally {
      setExporting(false);
    }
  }
  const { t }     = useAdminTheme();
  const router    = useRouter();

  // Tab state
  const [tab, setTab] = useState<Tab>('overview');

  // Data layer (Money Domain)
  const [byEntity,       setByEntity]       = useState<RevenueByEntityData | null>(null);
  const [timeseries,     setTimeseries]     = useState<TimeseriesPoint[]>([]);
  const [events,         setEvents]         = useState<FinancialEvent[]>([]);
  const [remittances,    setRemittances]    = useState<any[]>([]);
  const [activityFeed,   setActivityFeed]   = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);

  // Catat Pengeluaran form
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ expense_account_code: '6101', source_account_code: '1110', amount: '', description: '' });
  // Catat Prive form (pengeluaran modal owner)
  const [showPriveForm, setShowPriveForm] = useState(false);
  const [priveForm,     setPriveForm]     = useState({ source_account_code: '1110', amount: '', description: '' });
  const [submitting,    setSubmitting]    = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Filter periode (fleksibel — tidak dikunci 30 hari)
  const [period,      setPeriod]      = useState<PeriodKey>('30d');
  const [chartGroup,  setChartGroup]  = useState<'day' | 'month'>('day');
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo,   setAppliedTo]   = useState('');
  const [showCustom,  setShowCustom]  = useState(false);
  const _now = new Date();
  const [selMonth, setSelMonth] = useState<number>(_now.getMonth() + 1); // 1-12, 0 = semua bulan
  const [selYear,  setSelYear]  = useState<number>(_now.getFullYear());

  // Apply pilihan Bulan/Tahun → reuse jalur custom (appliedFrom/To)
  function applyMonthYear(month: number, year: number) {
    const from = month === 0 ? `${year}-01-01` : `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDay = month === 0 ? 31 : new Date(year, month, 0).getDate();
    const to = month === 0 ? `${year}-12-31` : `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    setAppliedFrom(from); setAppliedTo(to); setPeriod('custom'); setShowCustom(false);
  }

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const h = { Authorization: `Bearer ${token}` };

  // Default pinter grafik: range panjang → Bulan, pendek → Hari (bisa di-override toggle)
  useEffect(() => {
    const smart: 'day' | 'month' = (() => {
      if (period === 'all' || period === 'ytd' || period === '90d') return 'month';
      if (period === 'custom' && appliedFrom && appliedTo) {
        const days = (new Date(appliedTo).getTime() - new Date(appliedFrom).getTime()) / 86400000;
        return days >= 60 ? 'month' : 'day';
      }
      return 'day';
    })();
    setChartGroup(smart);
  }, [period, appliedFrom, appliedTo]);

  // ─── Data fetching ────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    const periodQuery =
      period === 'custom' && appliedFrom && appliedTo
        ? `from=${encodeURIComponent(new Date(appliedFrom).toISOString())}&to=${encodeURIComponent(new Date(appliedTo + 'T23:59:59').toISOString())}`
        : `period=${period}`;
    const tsBase  = (period === 'all' && chartGroup === 'day') ? 'period=90d' : periodQuery;
    const tsQuery = `${tsBase}&group_by=${chartGroup}`;

    Promise.all([
      fetch(`${API}/money/revenue/by-entity?${periodQuery}`,                            { headers: h }).then(r => r.json()),
      fetch(`${API}/money/revenue/timeseries?${tsQuery}`,                               { headers: h }).then(r => r.json()),
      fetch(`${API}/money/admin/events?limit=10`,                                        { headers: h }).then(r => r.json()),
      fetch(`${API}/money/revenue/badonasi-remittances?${periodQuery}&limit=10`,         { headers: h }).then(r => r.json()),
      fetch(`${API}/money/revenue/activity-feed?${periodQuery}&limit=20`,                 { headers: h }).then(r => r.json()),
    ])
      .then(([be, ts, ev, yEv, af]) => {
        if (af?.success) setActivityFeed(af.data ?? []);
        if (be?.success)  setByEntity(be.data);
        if (ts?.success)  setTimeseries(ts.data?.data ?? []);
        if (ev?.success)  setEvents(ev.data ?? []);
        if (yEv?.success) setRemittances(yEv.data ?? []);
      })
      .catch(err => console.error('[financial fetch fail]', err))
      .finally(() => setLoading(false));
  }, [token, period, appliedFrom, appliedTo, chartGroup]);

  // ─── Catat Pengeluaran handler (posting ledger) ───────────────

  const handleAddExpense = async () => {
    if (submitting) return;
    if (!form.amount || !form.description) {
      showToast('Lengkapi nominal & deskripsi', 'err');
      return;
    }
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/money/expense`, {
        method:  'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          expense_account_code: form.expense_account_code,
          source_account_code:  form.source_account_code,
          amount:               Number(form.amount),
          description:          form.description,
          category_label:       EXPENSE_CATEGORIES.find(c => c.code === form.expense_account_code)?.label ?? null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast('✅ Pengeluaran tercatat ke ledger. Refresh untuk lihat di Neraca Saldo.');
      setShowForm(false);
      setForm({ expense_account_code: '6101', source_account_code: '1110', amount: '', description: '' });
    } catch (err: any) {
      showToast(err.message || 'Gagal simpan', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Catat Prive handler (pengambilan pribadi owner → ekuitas) ──
  const handleAddPrive = async () => {
    if (submitting) return;
    if (!priveForm.amount || !priveForm.description) {
      showToast('Lengkapi nominal & deskripsi', 'err');
      return;
    }
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/money/prive`, {
        method:  'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          source_account_code: priveForm.source_account_code,
          amount:              Number(priveForm.amount),
          description:         priveForm.description,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast('✅ Prive tercatat ke ledger (ekuitas). Refresh untuk lihat di Neraca Saldo.');
      setShowPriveForm(false);
      setPriveForm({ source_account_code: '1110', amount: '', description: '' });
    } catch (err: any) {
      showToast(err.message || 'Gagal simpan', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Derived data ─────────────────────────────────────────────

  const combinedTotal = byEntity?.combined_total       ?? 0;
  const ptTotal       = byEntity?.pt_digital?.total    ?? 0;
  const yayasanTotal  = byEntity?.yayasan?.total       ?? 0;
  const eventCount    = byEntity?.meta?.event_count    ?? 0;

  const periodLabel =
    period === 'custom' && appliedFrom && appliedTo
      ? `${appliedFrom} – ${appliedTo}`
      : (PERIOD_PRESETS.find((p) => p.key === period)?.label ?? period);

  const fmtChartDate = (d: string): string => {
    if (/^\d{4}-\d{2}$/.test(d)) {                       // "2026-05" → bulan
      const [y, m] = d.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    }
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const chartDataCombined = timeseries.map(p => ({
    date:    fmtChartDate(p.date),
    total:   p.total,
    pt:      p.pt_digital,
    yayasan: p.yayasan,
  }));

  const chartDataYayasan = timeseries.map(p => ({
    date:         fmtChartDate(p.date),
    badonasi_fee: p.badonasi_fee,
    total:        p.yayasan,
  }));

  const chartDataPt = timeseries.map(p => ({
    date: fmtChartDate(p.date),
    pt:   p.pt_digital,
  }));

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", color: t.textPrimary }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          padding: '12px 20px', borderRadius: 10,
          background: toast.type === 'ok' ? '#065F46' : '#7F1D1D',
          color: '#fff', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Wallet size={22} /> Financial Dashboard</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textMuted }}>
            Ringkasan keuangan TeraLoka — terpisah per legal entity (PT vs Yayasan)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleExportPackage}
            disabled={exporting}
            title="Download semua laporan PT + Yayasan jadi 1 file Excel (untuk akuntan/grant)"
            style={{
              padding: '8px 18px', background: 'transparent',
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 10, cursor: exporting ? 'wait' : 'pointer',
              fontSize: 13, fontWeight: 700, color: t.textPrimary,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting
              ? <><Loader2 size={15} className="animate-spin" /> Menyiapkan…</>
              : <><Download size={15} /> Export Paket Akuntan</>}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '8px 18px', background: '#B45309', border: 'none',
              borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
            }}
          >
            + Catat Pengeluaran
          </button>
          <button
            onClick={() => setShowPriveForm(!showPriveForm)}
            style={{
              padding: '8px 18px', background: '#7C3AED', border: 'none',
              borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
            }}
          >
            + Catat Prive
          </button>
        </div>
      </div>

      {/* Filter Periode (fleksibel) */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[11px] font-bold text-text-subtle uppercase tracking-wide mr-1">Periode</span>
        {PERIOD_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => { setPeriod(p.key); setShowCustom(false); }}
            className={
              'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ' +
              (period === p.key ? 'bg-ads text-white' : 'bg-surface-muted text-text-muted hover:text-text')
            }
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={
            'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ' +
            (period === 'custom' ? 'bg-ads text-white' : 'bg-surface-muted text-text-muted hover:text-text')
          }
        >
          Custom
        </button>

        {/* Dropdown Bulan + Tahun — pilih langsung */}
        <div className="flex items-center gap-1.5 ml-1">
          <select
            value={selMonth}
            onChange={(e) => { const m = Number(e.target.value); setSelMonth(m); applyMonthYear(m, selYear); }}
            className="px-2 py-1.5 rounded-lg text-[12px] bg-surface-muted border border-border text-text outline-none cursor-pointer"
            title="Pilih bulan"
          >
            <option value={0}>Semua Bulan</option>
            {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((nm, i) => (
              <option key={i} value={i + 1}>{nm}</option>
            ))}
          </select>
          <select
            value={selYear}
            onChange={(e) => { const y = Number(e.target.value); setSelYear(y); applyMonthYear(selMonth, y); }}
            className="px-2 py-1.5 rounded-lg text-[12px] bg-surface-muted border border-border text-text outline-none cursor-pointer"
            title="Pilih tahun"
          >
            {Array.from({ length: 6 }, (_, i) => _now.getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Toggle granularitas grafik */}
        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
          <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wide mr-0.5">Grafik</span>
          {(['day', 'month'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setChartGroup(g)}
              className={
                'px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ' +
                (chartGroup === g ? 'bg-ads text-white' : 'bg-surface-muted text-text-muted hover:text-text')
              }
            >
              {g === 'day' ? 'Hari' : 'Bulan'}
            </button>
          ))}
        </div>
        {showCustom && (
          <div className="flex flex-wrap items-center gap-2 ml-1">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-[12px] bg-surface-muted border border-border text-text outline-none" />
            <span className="text-text-subtle text-[12px]">–</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="px-2 py-1.5 rounded-lg text-[12px] bg-surface-muted border border-border text-text outline-none" />
            <button
              onClick={() => { if (customFrom && customTo) { setAppliedFrom(customFrom); setAppliedTo(customTo); setPeriod('custom'); } }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-[#B45309] text-white hover:bg-[#92400E] transition-colors"
            >
              Terapkan
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigator */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: `1px solid ${t.cardBorder}`,
      }}>
        {[
          { key: 'overview'      as Tab, label: 'Overview',         Icon: LayoutDashboard },
          { key: 'pt'            as Tab, label: 'PT TeraLoka',       Icon: Building2       },
          { key: 'yayasan'       as Tab, label: 'Yayasan TeraLoka',  Icon: HeartHandshake  },
          { key: 'opening-balance' as Tab, label: 'Saldo Awal',       Icon: Landmark        },
          { key: 'bank-accounts' as Tab, label: 'Bank Accounts',     Icon: Landmark        },  // SESI 5F (19 Mei 2026)
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 18px', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${tab === key ? '#1B6B4A' : 'transparent'}`,
              color: tab === key ? t.codeText : t.textMuted,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: t.textMuted }}>
          Memuat data keuangan...
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <OverviewTab
              t={t}
              period={period}
              appliedFrom={appliedFrom}
              appliedTo={appliedTo}
              combinedTotal={combinedTotal}
              ptTotal={ptTotal}
              yayasanTotal={yayasanTotal}
              eventCount={eventCount}
              chartData={chartDataCombined}
              activityFeed={activityFeed}
              periodLabel={periodLabel}
            />
          )}

          {tab === 'pt' && (
            <PTTab
              t={t}
              router={router}
              total={ptTotal}
              sources={byEntity?.pt_digital?.sources}
              chartData={chartDataPt}
              events={events}
              period={period}
              appliedFrom={appliedFrom}
              appliedTo={appliedTo}
              periodLabel={periodLabel}
            />
          )}

          {tab === 'opening-balance' && <OpeningBalanceBuilder />}

          {tab === 'yayasan' && (
            <YayasanTab
              t={t}
              router={router}
              total={yayasanTotal}
              sources={byEntity?.yayasan?.sources}
              chartData={chartDataYayasan}
              remittances={remittances}
              period={period}
              appliedFrom={appliedFrom}
              appliedTo={appliedTo}
              periodLabel={periodLabel}
            />
          )}

          {/* SESI 5F (19 Mei 2026) — Bank Accounts management */}
          {tab === 'bank-accounts' && <BankAccountsTabPanel />}
        </>
      )}

      {/* Catat Pengeluaran Form (Sidebar, Global) */}
      {showForm && (
        <ExpenseEntryForm
          form={form}
          setForm={setForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleAddExpense}
          submitting={submitting}
        />
      )}

      {/* Catat Prive Form (Sidebar, Global) */}
      {showPriveForm && (
        <PriveEntryForm
          form={priveForm}
          setForm={setPriveForm}
          onClose={() => setShowPriveForm(false)}
          onSubmit={handleAddPrive}
          submitting={submitting}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ═══════════════════════════════════════════════════════════════

function OverviewTab({
  t, period, appliedFrom, appliedTo, combinedTotal, ptTotal, yayasanTotal, eventCount, chartData, activityFeed, periodLabel,
}: any) {
  const isEmpty = combinedTotal === 0 && eventCount === 0;

  return (
    <>
      {/* Health Alerts banner (otak: /money/revenue/health) */}
      <FinancialHealthBanner period={period} appliedFrom={appliedFrom} appliedTo={appliedTo} />

      {/* Earmark Tracker — dana bisnis di rekening owner (otak: /earmark) */}
      <EarmarkTrackerCard />

      {/* 3 Summary Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
        gap: 12, marginBottom: 20,
      }}>
        {/* Combined Total */}
        <div style={{
          background: 'linear-gradient(135deg, #1B6B4A, #0F4A34)',
          border: '1px solid #1B6B4A', borderRadius: 14, padding: '20px 22px',
        }}>
          <p style={{
            margin: '0 0 6px', fontSize: 11,
            color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Wallet size={16} /> Combined Revenue ({periodLabel})</span>
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: '#fff' }}>
            {formatRp(combinedTotal)}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            Total dari {eventCount} transaksi · PT + Yayasan
          </p>
        </div>

        {/* PT TeraLoka */}
        <div style={{
          background: t.card, border: `1px solid ${t.cardBorder}`,
          borderRadius: 14, padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: t.textMuted, fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={16} /> PT TeraLoka</span>
            </p>
            <BarChart3 size={15} />
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#1B6B4A' }}>
            {formatRp(ptTotal)}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: t.textDim }}>
            {combinedTotal > 0 ? `${Math.round((ptTotal / combinedTotal) * 100)}% dari combined` : 'Commercial revenue'}
          </p>
        </div>

        {/* Yayasan TeraLoka */}
        <div style={{
          background: t.card, border: `1px solid ${t.cardBorder}`,
          borderRadius: 14, padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: t.textMuted, fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><HeartHandshake size={16} /> Yayasan TeraLoka</span>
            </p>
            <BarChart3 size={15} />
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#E8963A' }}>
            {formatRp(yayasanTotal)}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: t.textDim }}>
            {combinedTotal > 0 ? `${Math.round((yayasanTotal / combinedTotal) * 100)}% dari combined` : 'Social impact'}
          </p>
        </div>
      </div>

      {/* Comparison Chart */}
      <div style={{
        background: t.card, border: `1px solid ${t.cardBorder}`,
        borderRadius: 14, padding: '18px 22px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={16} /> Tren Pendapatan</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
              Perbandingan PT vs Yayasan · {periodLabel}
            </p>
          </div>
          <span style={{
            fontSize: 10, padding: '4px 10px', borderRadius: 6,
            background: 'rgba(27,107,74,0.12)', color: '#1B6B4A',
            fontWeight: 700, textTransform: 'uppercase',
          }}>
            Real Data
          </span>
        </div>

        {isEmpty ? (
          <div style={{
            height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <p style={{ color: t.textDim, fontSize: 13 }}>Belum ada transaksi dalam 7 hari terakhir</p>
            <p style={{ color: t.textMuted, fontSize: 11 }}>
              Chart akan otomatis terisi saat ada donasi terverifikasi atau fee disetor
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: t.textMuted }}
                axisLine={false} tickLine={false} width={50}
                tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              />
              <Tooltip
                contentStyle={{
                  background: t.card, border: `1px solid ${t.cardBorder}`,
                  borderRadius: 8, fontSize: 11, color: t.textPrimary,
                }}
                formatter={(v: any) => formatRp(v)}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total"   stroke={t.codeText} strokeWidth={2.5} dot={false} name="Combined" />
              <Line type="monotone" dataKey="pt"      stroke="#1B6B4A"    strokeWidth={2}   dot={false} name="PT TeraLoka" />
              <Line type="monotone" dataKey="yayasan" stroke="#E8963A"    strokeWidth={2}   dot={false} name="Yayasan" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gateway Threshold Alert */}
      <div style={{
        marginBottom: 20, padding: '12px 16px', borderRadius: 10,
        background: combinedTotal >= 10000000 ? 'rgba(27,107,74,0.15)' : 'rgba(251,191,36,0.08)',
        border: `1px solid ${combinedTotal >= 10000000 ? 'rgba(27,107,74,0.3)' : 'rgba(251,191,36,0.2)'}`,
      }}>
        {combinedTotal >= 10000000 ? (
          <p style={{ margin: 0, fontSize: 13, color: t.codeText, fontWeight: 600 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PartyPopper size={15} /> Revenue 30 hari sudah</span> &gt; Rp 10jt — saatnya aktifkan payment gateway!
          </p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#FCD34D', fontWeight: 600 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><BarChart3 size={14} /> Progress ke milestone</span> Rp 10jt: {formatRp(combinedTotal)} / Rp 10.000.000 ({Math.round((combinedTotal / 10000000) * 100)}%)
            </p>
            <div style={{
              height: 6, background: t.cardInner, borderRadius: 3,
              flex: 1, minWidth: 120, maxWidth: 200,
            }}>
              <div style={{
                width: `${Math.min((combinedTotal / 10000000) * 100, 100)}%`,
                height: '100%', background: '#FCD34D',
                borderRadius: 3, transition: 'width 0.5s',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Live Activity Feed */}
      <div style={{
        background: t.card, border: `1px solid ${t.cardBorder}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${t.cardBorder}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={16} color="#EF4444" /> Live Activity Feed</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
              Penerimaan PT + Yayasan · fee & iklan masuk (bukan donasi pass-through)
            </p>
          </div>
          <span style={{ fontSize: 12, color: t.textMuted }}>
            {activityFeed.length} terbaru
          </span>
        </div>

        {activityFeed.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>
            Belum ada penerimaan pada periode ini. Feed terisi saat ada pembayaran iklan (PT) atau fee disetor (Yayasan).
          </div>
        ) : activityFeed.map((it: any, i: number) => {
          const isLast = i === activityFeed.length - 1;
          const isPt = it.entity === 'pt_digital';
          const color = isPt ? '#1B6B4A' : '#E8963A';
          const FeedIcon = isPt ? Megaphone : Banknote;
          const dt = new Date(it.date);
          const tgl = dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });
          const jam = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const sub = it.meta?.donation_count ? `${it.meta.donation_count} donasi` : null;
          return (
            <div key={it.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
              borderBottom: !isLast ? `1px solid ${t.cardBorder}` : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: `${color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}><FeedIcon size={18} color={color} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: 13, fontWeight: 600, color: t.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{it.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
                  <span style={{ color, fontWeight: 600 }}>{it.source}</span>
                  {' · '}{tgl} {jam}{sub ? ` · ${sub}` : ''}
                </p>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color, flexShrink: 0 }}>
                {formatRp(it.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2 — PT TERALOKA
// Honest Phase 1: semua Rp 0 + 1 card interactive (Ads → /admin/ads)
// ═══════════════════════════════════════════════════════════════

function PTTab({ t, router, total, sources, chartData, events, period, appliedFrom, appliedTo, periodLabel }: any) {
  const ads        = sources?.ads        ?? 0;
  const bakos      = sources?.bakos      ?? 0;
  const commission = sources?.commission ?? 0;

  return (
    <>
      {/* Header Total Card */}
      <div className="bg-gradient-to-br from-[#1B6B4A] to-[#0F4A34] border border-[#1B6B4A] rounded-xl px-[22px] py-5 mb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <Building2 className="w-[22px] h-[22px] text-white" strokeWidth={2} />
          <div>
            <p className="text-[13px] font-bold text-white">PT TeraLoka Digital Maluku</p>
            <p className="text-[11px] text-white/70 mt-0.5">Commercial revenue · Ads, Bakos, Komisi BAPASIAR</p>
          </div>
        </div>
        <p className="text-[11px] font-semibold text-white/70 uppercase mt-3 mb-1">Total Revenue ({periodLabel})</p>
        <p className="text-[32px] font-extrabold text-white leading-none">{formatRp(total)}</p>
      </div>

      {/* 3 Sub-Source Cards (Tailwind) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Ads — CLICKABLE -> /admin/ads */}
        <button
          type="button"
          onClick={() => router.push('/admin/ads')}
          className="group bg-surface border border-border rounded-xl p-4 text-left transition-all hover:border-ads/40 hover:bg-ads/4 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <Megaphone className="w-[18px] h-[18px] text-ads" strokeWidth={2} />
            <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#059669]/15 text-[#059669]">Live</span>
          </div>
          <p className="text-[11px] font-bold text-text-muted">Ads (Iklan)</p>
          <p className="text-[18px] font-extrabold text-text tabular-nums mt-0.5">{formatRp(ads)}</p>
          <p className="text-[9px] text-text-subtle mt-1">Auto-track saat ad.paid emit live</p>
          <p className="text-[10px] font-bold text-ads mt-2 group-hover:underline">Lihat dashboard Ads →</p>
        </button>
        {/* Bakos */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Home className="w-[18px] h-[18px] text-[#0891B2]" strokeWidth={2} />
            <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#0891B2]/12 text-[#0891B2]">Coming Phase 2</span>
          </div>
          <p className="text-[11px] font-bold text-text-muted">Bakos (Klasified)</p>
          <p className="text-[18px] font-extrabold text-text tabular-nums mt-0.5">{formatRp(bakos)}</p>
          <p className="text-[9px] text-text-subtle mt-1">Auto-track saat Bakos emit live</p>
        </div>
        {/* BAPASIAR */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Ship className="w-[18px] h-[18px] text-[#7C3AED]" strokeWidth={2} />
            <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#7C3AED]/12 text-[#7C3AED]">Coming Phase 2</span>
          </div>
          <p className="text-[11px] font-bold text-text-muted">Komisi BAPASIAR</p>
          <p className="text-[18px] font-extrabold text-text tabular-nums mt-0.5">{formatRp(commission)}</p>
          <p className="text-[9px] text-text-subtle mt-1">Auto-track saat BAPASIAR emit live</p>
        </div>
      </div>

      {/* Neraca Saldo (Trial Balance) — laporan akuntansi dari ledger */}
      <PtTrialBalanceSection />

      {/* Laporan Laba/Rugi (accrual, ikut periode) */}
      <PtIncomeStatementSection
        period={period}
        appliedFrom={appliedFrom}
        appliedTo={appliedTo}
        periodLabel={periodLabel}
      />

      {/* Neraca (Balance Sheet) — snapshot, Aset = Kewajiban + Ekuitas */}
      <PtBalanceSheetSection />

      {/* Laporan Arus Kas (direct, ikut periode) */}
      <PtCashFlowSection
        period={period}
        appliedFrom={appliedFrom}
        appliedTo={appliedTo}
        periodLabel={periodLabel}
      />

      {/* Mini Tren Chart (PT only) — empty */}
      <div className="bg-surface border border-border rounded-xl px-[22px] py-[18px] mb-5">
        <div className="mb-3">
          <p className="text-[14px] font-bold text-text flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-text-muted" /> Tren Pendapatan PT</p>
          <p className="text-[11px] text-text-muted mt-0.5">Commercial revenue · Ads, Bakos, BAPASIAR</p>
        </div>
        {(!chartData || !chartData.some((d: any) => d.pt > 0)) ? (
          <div className="h-[180px] flex flex-col items-center justify-center gap-1.5">
            <p className="text-[13px] text-text-subtle">Belum ada transaksi komersial pada periode ini</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} width={50}
                tickFormatter={(v: any) => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              />
              <Tooltip
                contentStyle={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 8, fontSize: 11, color: t.textPrimary }}
                formatter={(v: any) => formatRp(v)}
              />
              <Line type="monotone" dataKey="pt" stroke="#1B6B4A" strokeWidth={2.5} dot={false} name="PT TeraLoka" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Transactions PT — empty */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-[18px] py-3.5 border-b border-border">
          <p className="text-[14px] font-bold text-text flex items-center gap-1.5"><Receipt className="w-4 h-4 text-text-muted" /> Transaksi Komersial Terbaru</p>
          <p className="text-[11px] text-text-muted mt-0.5">Filter: Ads, Bakos, Komisi BAPASIAR</p>
        </div>
        {(() => {
          const ptEvents = (events ?? []).filter((ev: any) => ['ads', 'bakos', 'bapasiar'].includes(ev.source_domain));
          if (ptEvents.length === 0) return (
            <div className="px-5 py-10 text-center">
              <Inbox className="w-8 h-8 mx-auto mb-2 text-text-subtle" />
              <p className="text-[13px] font-semibold text-text mb-1">Belum ada transaksi komersial terbaru</p>
            </div>
          );
          return ptEvents.map((ev: any, i: number) => {
            const cfg = EVENT_TYPE_CONFIG[ev.event_type] || { icon: Banknote, label: ev.event_type, color: '#9CA3AF' };
            return <EventRow key={ev.id} ev={ev} cfg={cfg} isLast={i === ptEvents.length - 1} t={t} />;
          });
        })()}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3 — YAYASAN TERALOKA
// Honest Phase 1: semua static (admin BADONASI page defer)
// ═══════════════════════════════════════════════════════════════

function YayasanTab({ t, router, total, sources, chartData, remittances, period, appliedFrom, appliedTo, periodLabel }: any) {
  const badonasiFee = sources?.badonasi_fee ?? 0;
  const grant       = sources?.grant        ?? 0;
  const csr         = sources?.csr          ?? 0;

  const chartIsEmpty = chartData.every((p: any) => p.total === 0);

  return (
    <>
      {/* Disclaimer Banner */}
      <div style={{
        padding: '14px 18px',
        background: 'linear-gradient(90deg, rgba(232,150,58,0.08), rgba(232,150,58,0.02))',
        border: `1px solid rgba(232,150,58,0.25)`,
        borderRadius: 12, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Scale size={18} color="#E8963A" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#E8963A' }}>
            Pemisahan Legal Entity
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
          Fee operasional Badonasi disetor ke <strong style={{ color: t.textPrimary }}>Yayasan TeraLoka Berdaya</strong>,
          BUKAN PT TeraLoka Digital Maluku. Catatan pra-formasi: Yayasan & PT belum berbadan hukum — dana saat ini dikelola sementara di rekening owner dan di-earmark per entitas. NPWP, rekening, dan laporan pajak terpisah menyusul setelah formasi (Q4 2026/Q1 2027).
          Donasi yang lewat ke Penggalang TIDAK dihitung sebagai revenue Yayasan.
        </p>
      </div>

      {/* Header Total Card */}
      <div style={{
        background: 'linear-gradient(135deg, #E8963A, #C26C1A)',
        border: '1px solid #E8963A', borderRadius: 14, padding: '20px 22px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <HeartHandshake size={22} color="#fff" />
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#fff', fontWeight: 700 }}>
              Yayasan TeraLoka Berdaya
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
              Social impact revenue · Badonasi fee, Grant, CSR Program
            </p>
          </div>
        </div>
        <p style={{
          margin: '12px 0 4px', fontSize: 11, fontWeight: 600,
          color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase',
        }}>
          Total Revenue ({periodLabel})
        </p>
        <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#fff' }}>
          {formatRp(total)}
        </p>
      </div>

      {/* 3 Sub-Source Cards (all static Phase 1) */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12, marginBottom: 20,
      }}>
        <SourceCard
          t={t}
          icon={<HeartHandshake size={20} color="#E8963A" />}
          label="Badonasi Fee (Setor)"
          value={badonasiFee}
          color="#E8963A"
          note="Fee yang sudah DISETOR partner · cash basis (diakui saat uang masuk)"
          active
          onClick={() => router.push('/admin/funding/cashflow')}
          actionHint="Lihat detail cashflow →"
        />
        <SourceCard
          t={t}
          icon={<GraduationCap size={20} color="#7C3AED" />}
          label="Grant"
          value={grant}
          color="#7C3AED"
          badge="Coming Phase 2"
          note="Manual entry (Hivos, Open Society, dll) — Mission #6"
        />
        <SourceCard
          t={t}
          icon={<HandCoins size={20} color="#0891B2" />}
          label="CSR Program"
          value={csr}
          color="#0891B2"
          badge="Coming Phase 2"
          note="Manual entry (perusahaan sponsor) — Mission #6"
        />
      </div>

      {/* Fee Belum Disetor — ringkas, link ke panel BADONASI */}
      <YayasanFeeOutstandingCard />

      {/* Laporan Aktivitas Yayasan (ISAK 35, accrual) */}
      <YayasanActivitySection
        period={period}
        appliedFrom={appliedFrom}
        appliedTo={appliedTo}
        periodLabel={periodLabel}
      />

      {/* Laporan Arus Kas Yayasan (cash basis, fee_remittances) */}
      <YayasanCashFlowSection
        period={period}
        appliedFrom={appliedFrom}
        appliedTo={appliedTo}
        periodLabel={periodLabel}
      />

      {/* Laporan Posisi Keuangan Yayasan (ISAK 35, accrual) */}
      <YayasanBalanceSheetSection />

      {/* Mini Tren Chart Yayasan */}
      <div style={{
        background: t.card, border: `1px solid ${t.cardBorder}`,
        borderRadius: 14, padding: '18px 22px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><TrendingUp size={16} /> Tren Pendapatan Yayasan</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
              7 hari terakhir · Fee setor (Yayasan revenue)
            </p>
          </div>
          <span style={{
            fontSize: 10, padding: '4px 10px', borderRadius: 6,
            background: 'rgba(232,150,58,0.12)', color: '#E8963A',
            fontWeight: 700, textTransform: 'uppercase',
          }}>
            Real Data
          </span>
        </div>

        {chartIsEmpty ? (
          <div style={{
            height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 6,
          }}>
            <p style={{ color: t.textDim, fontSize: 13 }}>Belum ada fee setor 7 hari terakhir</p>
            <p style={{ color: t.textMuted, fontSize: 11, textAlign: 'center', maxWidth: 360 }}>
              Chart otomatis terisi saat admin verify fee_remittance dari partner Penggalang
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: t.textMuted }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: t.textMuted }}
                axisLine={false} tickLine={false} width={50}
                tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              />
              <Tooltip
                contentStyle={{
                  background: t.card, border: `1px solid ${t.cardBorder}`,
                  borderRadius: 8, fontSize: 11, color: t.textPrimary,
                }}
                formatter={(v: any) => formatRp(v)}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="badonasi_fee" stroke="#E8963A"    strokeWidth={2.5} dot={false} name="Badonasi Fee" />
              <Line type="monotone" dataKey="total"        stroke={t.codeText} strokeWidth={2}   dot={false} name="Total Yayasan" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Fee Remittance Transactions */}
      <div style={{
        background: t.card, border: `1px solid ${t.cardBorder}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${t.cardBorder}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Banknote size={16} /> Transaksi Fee Disetor</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
              Setoran fee dari partner · <span style={{ color: '#E8963A' }}>aliran uang nyata</span> (by remitted_at)
            </p>
          </div>
          <span style={{ fontSize: 12, color: t.textMuted }}>
            {remittances.length} setoran
          </span>
        </div>

        {remittances.length === 0 ? (
          <div style={{
            padding: '40px 20px', textAlign: 'center',
            color: t.textMuted, fontSize: 13,
          }}>
            <Inbox size={30} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Belum ada setoran fee pada periode ini</p>
            <p style={{ margin: 0, fontSize: 11, color: t.textDim, maxWidth: 420, marginInline: 'auto', lineHeight: 1.5 }}>
              Setoran muncul saat partner Penggalang menyetor fee operasional ke rekening Yayasan
            </p>
          </div>
        ) : remittances.map((r: any, i: number) => {
          const isLast = i === remittances.length - 1;
          const d = new Date(r.remitted_at);
          const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 18px',
              borderBottom: !isLast ? `1px solid ${t.cardBorder}` : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: 'rgba(232,150,58,0.13)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
              }}><Banknote size={18} color="#E8963A" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: 13, fontWeight: 600, color: t.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{r.partner_name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
                  {tgl} · {r.donation_count} donasi{r.reference_code ? ` · ${r.reference_code}` : ''}
                </p>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#E8963A', flexShrink: 0 }}>
                {formatRp(r.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═══════════════════════════════════════════════════════════════

/**
 * SourceCard — Display data per source dengan optional click behavior.
 *
 * Props:
 *   - onClick: Optional. Saat ada → card clickable + cursor pointer + hover state
 *   - actionHint: Optional. Display hint text di bottom (only saat clickable)
 *   - badge: Kalau ada "Coming Phase 2", card otomatis disabled (opacity 0.65)
 *   - active: Kalau true, border highlight + "Active" pill (only saat NO badge)
 *
 * Sesi 5 Polish:
 *   - Cursor pointer + hover effect HANYA aktif kalau onClick provided AND no badge
 *   - Click bisa navigate ke URL lain (cross-page) atau trigger handler lain
 */
function SourceCard({
  t, icon, label, value, color, badge, note, active, onClick, actionHint,
}: any) {
  const disabled    = Boolean(badge);
  const isClickable = Boolean(onClick) && !disabled;

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={() => isClickable && setIsHovered(true)}
      onMouseLeave={() => isClickable && setIsHovered(false)}
      title={isClickable && actionHint ? actionHint : undefined}
      style={{
        background:   t.card,
        border:       `1px solid ${
          isClickable && isHovered ? `${color}88` :
          active                   ? `${color}55` :
                                     t.cardBorder
        }`,
        borderRadius: 12,
        padding:      '14px 16px',
        opacity:      disabled ? 0.65 : 1,
        cursor:       isClickable ? 'pointer' : 'default',
        transform:    isClickable && isHovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow:    isClickable && isHovered ? `0 4px 12px ${color}22` : 'none',
        transition:   'all 0.2s ease',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 8,
      }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        {badge && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '3px 7px',
            borderRadius: 4, background: 'rgba(251,191,36,0.15)',
            color: '#FCD34D', textTransform: 'uppercase',
          }}>
            {badge}
          </span>
        )}
        {active && !badge && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '3px 7px',
            borderRadius: 4, background: `${color}22`,
            color: color, textTransform: 'uppercase',
          }}>
            Active
          </span>
        )}
      </div>
      <p style={{ margin: '0 0 4px', fontSize: 11, color: t.textMuted, fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color }}>
        {formatRp(value)}
      </p>
      {note && (
        <p style={{
          margin: '6px 0 0', fontSize: 10, color: t.textDim,
          fontStyle: disabled ? 'italic' : 'normal', lineHeight: 1.4,
        }}>
          {note}
        </p>
      )}
      {/* Action hint (only show kalau clickable + hover) */}
      {isClickable && actionHint && (
        <p style={{
          margin: '8px 0 0',
          fontSize: 10,
          fontWeight: 600,
          color: isHovered ? color : t.textDim,
          transition: 'color 0.2s',
        }}>
          {actionHint}
        </p>
      )}
    </div>
  );
}

function EventRow({ ev, cfg, isLast, t }: any) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 18px',
      borderBottom: !isLast ? `1px solid ${t.cardBorder}` : 'none',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${cfg.color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <cfg.icon size={18} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 600, color: t.textPrimary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {cfg.label}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
          <span style={{ color: cfg.color, fontWeight: 600 }}>
            {ev.source_domain.toUpperCase()}
          </span>
          {' · '}
          {formatDate(ev.recorded_at)} {formatTime(ev.recorded_at)}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {ev.event_type === 'donation.fee_remitted' ? (
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#E8963A' }}>
            {formatRp(ev.fee_amount)}
          </p>
        ) : ev.event_type === 'donation.verified' ? (
          <>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.textPrimary }}>
              {formatRp(ev.amount)}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: t.textMuted }}>
              Fee: {formatRp(ev.fee_amount)}
            </p>
          </>
        ) : ev.event_type === 'ad.payment_recorded' ? (
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1B6B4A' }}>
            {formatRp(ev.amount)}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.textDim }}>—</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MANUAL ENTRY FORM (Sidebar Sticky)
// ═══════════════════════════════════════════════════════════════

function ExpenseEntryForm({ form, setForm, onClose, onSubmit, submitting }: any) {
  return (
    <div className="fixed top-20 right-6 w-[360px] bg-surface border border-border rounded-xl p-[18px] z-[100] shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px] font-bold text-text">+ Catat Pengeluaran PT</p>
        <button onClick={onClose} className="text-text-muted hover:text-text text-[18px] leading-none">×</button>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-text-muted mb-1">Kategori Beban *</label>
        <select
          value={form.expense_account_code}
          onChange={(e) => setForm((p: any) => ({ ...p, expense_account_code: e.target.value }))}
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-[13px] outline-none"
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label} ({c.code})</option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-text-muted mb-1">Bayar Dari *</label>
        <select
          value={form.source_account_code}
          onChange={(e) => setForm((p: any) => ({ ...p, source_account_code: e.target.value }))}
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-[13px] outline-none"
        >
          {CASH_SOURCES.map((s) => (
            <option key={s.code} value={s.code}>{s.label} ({s.code})</option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-text-muted mb-1">Nominal (Rp) *</label>
        <input
          type="number"
          value={form.amount}
          onChange={(e) => setForm((p: any) => ({ ...p, amount: e.target.value }))}
          placeholder="150000"
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-[13px] outline-none"
        />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-semibold text-text-muted mb-1">Deskripsi *</label>
        <input
          value={form.description}
          onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))}
          placeholder="Bayar VPS Dalang bulan Juni"
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-[13px] outline-none"
        />
      </div>

      <div className="bg-surface-muted/60 rounded-lg px-3 py-2.5 mb-4 flex gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          Posting ke ledger: <span className="font-bold text-text">Db Beban / Cr Kas</span>.
          Langsung muncul di Neraca Saldo (refresh).
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={onSubmit} disabled={submitting} className="flex-1 py-2.5 bg-[#B45309] hover:bg-[#92400E] rounded-lg text-[13px] font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? 'Menyimpan…' : 'Simpan Pengeluaran'}
        </button>
        <button onClick={onClose} className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-[13px] text-text-muted hover:text-text transition-colors">
          Batal
        </button>
      </div>
    </div>
  );
}

function PriveEntryForm({ form, setForm, onClose, onSubmit, submitting }: any) {
  return (
    <div className="fixed top-20 right-6 w-[360px] bg-surface border border-border rounded-xl p-[18px] z-[100] shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[14px] font-bold text-text">+ Catat Prive PT</p>
        <button onClick={onClose} className="text-text-muted hover:text-text text-[18px] leading-none">×</button>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-text-muted mb-1">Tarik Dari *</label>
        <select
          value={form.source_account_code}
          onChange={(e) => setForm((p: any) => ({ ...p, source_account_code: e.target.value }))}
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-[13px] outline-none"
        >
          {CASH_SOURCES.map((s) => (
            <option key={s.code} value={s.code}>{s.label} ({s.code})</option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-text-muted mb-1">Nominal (Rp) *</label>
        <input
          type="number"
          value={form.amount}
          onChange={(e) => setForm((p: any) => ({ ...p, amount: e.target.value }))}
          placeholder="500000"
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-[13px] outline-none"
        />
      </div>

      <div className="mb-4">
        <label className="block text-[11px] font-semibold text-text-muted mb-1">Deskripsi *</label>
        <input
          value={form.description}
          onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))}
          placeholder="Pengambilan pribadi owner"
          className="w-full px-3 py-2 bg-surface-muted border border-border rounded-lg text-text text-[13px] outline-none"
        />
      </div>

      <div className="bg-surface-muted/60 rounded-lg px-3 py-2.5 mb-4 flex gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          Posting ke ledger: <span className="font-bold text-text">Db Prive (3501) / Cr Kas</span>.
          Mengurangi ekuitas owner — <span className="font-bold text-text">bukan beban</span>, tidak masuk Laba/Rugi.
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={onSubmit} disabled={submitting} className="flex-1 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg text-[13px] font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? 'Menyimpan…' : 'Simpan Prive'}
        </button>
        <button onClick={onClose} className="px-4 py-2.5 bg-transparent border border-border rounded-lg text-[13px] text-text-muted hover:text-text transition-colors">
          Batal
        </button>
      </div>
    </div>
  );
}

