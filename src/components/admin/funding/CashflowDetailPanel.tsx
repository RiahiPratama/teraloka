'use client';

import { useEffect, useState, useContext } from 'react';
import { 
  Download, X, Loader2, 
  // ⭐ Sesi 13 Mission 2D: Icons untuk Tip/Beneficiary tabs + actions
  Gift, Trophy, Calendar, Building2, User, Send, 
  CheckCircle2, XCircle, AlertCircle, AlertTriangle, Bell, 
  Hourglass, Wallet, Crown, Medal, Award,
  // ⭐ CATEGORY_META icons (replace emoji)
  Target, Landmark, Hash, Clock4, CalendarRange,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ════════════════════════════════════════════════════════════════
// CashflowDetailPanel — INLINE expansion panel
// ════════════════════════════════════════════════════════════════
//
// Sesi 12 Phase Final REVISED (26 Mei 2026)
//
// Inline panel (BUKAN modal). Klik card di Aliran Uang → 
// panel expand di bawah cards. Style follow existing 
// "Sisa di Partner breakdown" pattern.
//
// Categories: beneficiary | fee_teraloka | tip | kode_unik | hak_beneficiary
//   - 4 simple categories show detail rows + CSV
//   - hak_beneficiary: per-partner breakdown + drill-down per campaign
// ════════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api/v1';

export type DetailCategory = 'beneficiary' | 'fee_teraloka' | 'tip' | 'kode_unik' | 'hak_beneficiary' | 'under_audit';

interface DetailRow {
  entry_id: string;
  entry_number: string;
  donation_id: string;
  donation_code: string;
  display_id: string | null;
  donor_name: string;
  campaign_id: string;
  campaign_title: string;
  partner_id: string;
  partner_name: string;
  amount: number;
  transaction_date: string;
  scenario: string;
}

interface CampaignSisa {
  campaign_id: string;
  campaign_display_id?: string;  // ⭐ Sesi 13: BDN-CMP-2026-XXXXX
  campaign_title: string;
  partner_id: string;
  partner_name: string;
  utang_beneficiary: number;
  disbursed_total: number;
  sisa_belum_disalurkan: number;
}

// ⭐ Sesi 12 REVISED: 2-level (Penggalang → Campaign+Partner)
interface PenggalangSaldo {
  creator_id: string;
  penggalang_name: string;
  total_utang_beneficiary: number;
  total_disbursed: number;
  total_sisa: number;
  campaign_count: number;
  campaigns: CampaignSisa[];
}

interface UnderAuditDonation {
  id: string;
  donation_code: string;
  display_id: string | null;
  donor_name: string;
  amount: number;
  total_transfer: number;
  amount_received?: number | null; // [CASHFLOW-ALUR-FIX] yang BENAR diterima (under_audit ≠ instruksi)
  campaign_title: string;
  partner_name: string;
  created_at: string;
}

interface Props {
  category: DetailCategory;
  onClose: () => void;
  // ⭐ Periode dari parent (cashflow page). breakdown-detail di-filter
  // by periode ini. null/undefined = semua waktu.
  dateFrom?: string | null;
  dateTo?: string | null;
  // ⭐ Label periode aktif (mis. "Bulan Ini") untuk badge di header panel.
  periodLabel?: string;
}

const CATEGORY_META: Record<DetailCategory, { title: string; color: string; Icon: LucideIcon; description: string; backendCategory: string }> = {
  beneficiary:      { title: 'Dana Beneficiary',          color: '#0891B2', Icon: Target,     description: 'Alokasi dana untuk penerima manfaat (dari 2101 Utang Dana Beneficiary)', backendCategory: 'beneficiary' },
  fee_teraloka:     { title: 'Fee TeraLoka',              color: '#BE185D', Icon: Landmark,   description: 'Penerimaan fee platform (dari 4201 Penerimaan Fee Platform)', backendCategory: 'fee_teraloka' },
  tip:              { title: 'Tip Penggalang',            color: '#8B5CF6', Icon: Gift,       description: 'Pendapatan Partner dari tip donor opt-in (4101)', backendCategory: 'tip' },
  kode_unik:        { title: 'Kode Unik',                 color: '#F59E0B', Icon: Hash,       description: 'Kode unik 3-digit cross-check verifikasi (4102)', backendCategory: 'kode_unik' },
  hak_beneficiary:  { title: 'Hak Beneficiary di Partner', color: '#F59E0B', Icon: Hourglass,  description: 'Utang Dana Beneficiary belum settled per Penggalang & Campaign (Money Ledger 2101 - disbursements)', backendCategory: '' },
  under_audit:      { title: 'Hak Beneficiary Proses Audit', color: '#8B5CF6', Icon: Clock4, description: 'Donasi under_audit · belum jadi journal entry, menunggu resolusi mismatch', backendCategory: '' },
};

function formatRupiah(n: number): string {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  // ⭐ transaction_date = tipe DATE. Pakai UTC biar '2026-04-30' tampil
  // "30 Apr" persis (timezone lain bisa geser ke tanggal sebelum/sesudah).
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// ⭐ Sesi 13 Mission 2: Fee TeraLoka 3-tab types
type FeeTeralokaTab = 'donations' | 'partners' | 'remittances';

interface FeeTeralokaPartner {
  partner_name: string;
  total_fee_expected: number;
  total_fee_remitted: number;
  total_fee_pending: number;
  donation_count: number;
  donation_count_remitted: number;
  donation_count_pending: number;
  aging_0_7: number;
  aging_8_14: number;
  aging_15_30: number;
  aging_over_30: number;
  oldest_pending_date: string | null;
  last_remitted_at: string | null;       // ⭐ Sesi 13 Mission 2 fix
  remittance_batch_count: number;
  is_berutang: boolean;
  // ⭐ Sesi 13 Mission 2F: archived campaign anomaly flag
  has_archived_campaign: boolean;
  archived_campaign_count: number;
  // ⭐ Sesi 13 Mission 2F: under_audit tracking
  fee_under_audit: number;
  donation_count_under_audit: number;
}

interface FeeRemittanceBatch {
  id: string;
  partner_name: string;
  amount: number;
  donation_count: number;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reference_code: string | null;
  notes: string | null;
}

// ⭐ Sesi 13 Mission 2D: Tip Penggalang types (kode_unik = bonus partner)
type TipPenggalangTab = 'donations' | 'partners' | 'periods';

interface TipPenggalangPartner {
  partner_name: string;
  total_tip_optin: number;
  total_kode_unik: number;
  total_partner_earnings: number;
  donation_count_with_tip: number;
  donation_count_total: number;
  tip_rate_percent: number;
  avg_earnings_per_donation: number;
  largest_earnings: number;
  latest_earnings_at: string | null;
}

interface MonthlyPeriodRow {
  period: string;
  period_label: string;
  tip_optin: number;
  kode_unik: number;
  total: number;
  count: number;
}

// ⭐ Sesi 13 Mission 2E: Beneficiary types
type BeneficiaryTab = 'penggalangs' | 'partners' | 'periods';

interface BeneficiaryPartner {
  partner_name: string;
  total_utang: number;
  total_disbursed: number;
  sisa_belum_disalurkan: number;
  campaign_count: number;
  donation_count: number;
  disbursement_count: number;
  oldest_unsettled_at: string | null;
  rate_disbursed_percent: number;
}

interface BeneficiaryPeriodRow {
  period: string;
  period_label: string;
  utang_in: number;
  disbursed_out: number;
  net: number;
  donation_count: number;
  disbursement_count: number;
}

export default function CashflowDetailPanel({ category, onClose, dateFrom, dateTo, periodLabel }: Props) {
  const { t } = useContext(AdminThemeContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // ⭐ 2-level hak_beneficiary
  const [penggalangs, setPenggalangs] = useState<PenggalangSaldo[]>([]);
  const [totalUtang, setTotalUtang] = useState(0);
  const [totalDisbursed, setTotalDisbursed] = useState(0);
  const [totalSisa, setTotalSisa] = useState(0);
  
  // Drill-down state (klik penggalang → expand campaigns)
  const [expandedPenggalangId, setExpandedPenggalangId] = useState<string | null>(null);
  
  // ⭐ Under audit donations
  const [underAuditDonations, setUnderAuditDonations] = useState<UnderAuditDonation[]>([]);

  // ⭐ Sesi 13 Mission 2: Fee TeraLoka 3-tab state
  const [feeTeralokaTab, setFeeTeralokaTab] = useState<FeeTeralokaTab>('donations');
  const [feePartnerAggregate, setFeePartnerAggregate] = useState<FeeTeralokaPartner[]>([]);
  const [feeRemittanceBatches, setFeeRemittanceBatches] = useState<FeeRemittanceBatch[]>([]);

  // ⭐ Sesi 13 Mission 2B Phase 1: Reminder modal state
  const [reminderModalPartner, setReminderModalPartner] = useState<string | null>(null);

  // ⭐ Sesi 13 Mission 2D: Tip Penggalang 3-tab state
  const [tipTab, setTipTab] = useState<TipPenggalangTab>('donations');
  const [tipPartners, setTipPartners] = useState<TipPenggalangPartner[]>([]);
  const [tipPeriods, setTipPeriods] = useState<MonthlyPeriodRow[]>([]);
  const [tipShowAllDonations, setTipShowAllDonations] = useState(false);  // Q2=C: default filter tip>0

  // ⭐ Sesi 13 Mission 2E: Beneficiary 3-tab state
  const [benTab, setBenTab] = useState<BeneficiaryTab>('penggalangs');
  const [benPartners, setBenPartners] = useState<BeneficiaryPartner[]>([]);
  const [benPeriods, setBenPeriods] = useState<BeneficiaryPeriodRow[]>([]);
  // ⭐ Dana Beneficiary (category 'beneficiary') multi-tab
  const [danaTab, setDanaTab] = useState<'transaksi' | 'partners' | 'periods'>('transaksi');

  const meta = CATEGORY_META[category];

  useEffect(() => {
    setExpandedPenggalangId(null);
    setFeeTeralokaTab('donations');
    setTipTab('donations');
    setBenTab('penggalangs');
    setDanaTab('transaksi');
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, dateFrom, dateTo]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    
    const tk = typeof window !== 'undefined' ? localStorage.getItem('tl_token') : null;
    if (!tk) {
      setError('Belum login');
      setLoading(false);
      return;
    }

    // ⭐ Periode → query string untuk endpoint breakdown-detail (yang
    // support from/to di backend). Kosong = semua waktu.
    const dateParams = new URLSearchParams();
    if (dateFrom) dateParams.set('from', dateFrom);
    if (dateTo) dateParams.set('to', dateTo);
    const dateQs = dateParams.toString() ? `&${dateParams.toString()}` : '';

    try {
      if (category === 'under_audit') {
        // ⭐ Fetch donations status=under_audit
        const res = await fetch(`${API_URL}/funding/admin/donations?status=under_audit&limit=200`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal load');
        setUnderAuditDonations(json.data ?? []);
      } else if (category === 'fee_teraloka') {
        // ⭐ Sesi 13 Mission 2: Fetch 3 endpoints parallel untuk 3-tab view
        const [detailRes, partnerRes, remittanceRes] = await Promise.all([
          fetch(`${API_URL}/funding/admin/cashflow/breakdown-detail?category=fee_teraloka&limit=500${dateQs}`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
          fetch(`${API_URL}/funding/admin/cashflow/fee-teraloka/by-partner`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
          fetch(`${API_URL}/funding/admin/cashflow/fee-teraloka/by-remittance`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
        ]);

        const [detailJson, partnerJson, remittanceJson] = await Promise.all([
          detailRes.json(),
          partnerRes.json(),
          remittanceRes.json(),
        ]);

        if (!detailRes.ok || !detailJson.success) throw new Error(detailJson?.error?.message ?? 'Gagal load detail');
        if (!partnerRes.ok || !partnerJson.success) throw new Error(partnerJson?.error?.message ?? 'Gagal load partner');
        if (!remittanceRes.ok || !remittanceJson.success) throw new Error(remittanceJson?.error?.message ?? 'Gagal load remittance');

        setDetailRows(detailJson.data.rows ?? []);
        setTotalAmount(detailJson.data.total_amount ?? 0);
        setTotalCount(detailJson.data.total_count ?? 0);
        setFeePartnerAggregate(partnerJson.data.partners ?? []);
        setFeeRemittanceBatches(remittanceJson.data.batches ?? []);
      } else if (category === 'tip') {
        // ⭐ Sesi 13 Mission 2D: Fetch 3 endpoints parallel
        const [detailRes, partnerRes, periodRes] = await Promise.all([
          fetch(`${API_URL}/funding/admin/cashflow/breakdown-detail?category=tip&limit=500${dateQs}`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
          fetch(`${API_URL}/funding/admin/cashflow/tip-penggalang/by-partner`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
          fetch(`${API_URL}/funding/admin/cashflow/tip-penggalang/by-period`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
        ]);

        const [detailJson, partnerJson, periodJson] = await Promise.all([
          detailRes.json(), partnerRes.json(), periodRes.json(),
        ]);

        if (!detailRes.ok || !detailJson.success) throw new Error(detailJson?.error?.message ?? 'Gagal load detail');
        if (!partnerRes.ok || !partnerJson.success) throw new Error(partnerJson?.error?.message ?? 'Gagal load partner');
        if (!periodRes.ok || !periodJson.success) throw new Error(periodJson?.error?.message ?? 'Gagal load period');

        setDetailRows(detailJson.data.rows ?? []);
        setTotalAmount(detailJson.data.total_amount ?? 0);
        setTotalCount(detailJson.data.total_count ?? 0);
        setTipPartners(partnerJson.data.partners ?? []);
        setTipPeriods(periodJson.data.periods ?? []);
      } else if (category === 'hak_beneficiary') {
        // ⭐ Sesi 13 Mission 2E: Fetch 3 endpoints parallel (extend existing)
        // Existing endpoint: sisa-partner-breakdown (2-level Penggalang→Campaign)
        // NEW: beneficiary/by-partner + beneficiary/by-period
        const [penggalangRes, partnerRes, periodRes] = await Promise.all([
          fetch(`${API_URL}/funding/admin/cashflow/sisa-partner-breakdown`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
          fetch(`${API_URL}/funding/admin/cashflow/beneficiary/by-partner`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
          fetch(`${API_URL}/funding/admin/cashflow/beneficiary/by-period`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
        ]);

        const [penggalangJson, partnerJson, periodJson] = await Promise.all([
          penggalangRes.json(), partnerRes.json(), periodRes.json(),
        ]);

        if (!penggalangRes.ok || !penggalangJson.success) throw new Error(penggalangJson?.error?.message ?? 'Gagal load penggalang');
        if (!partnerRes.ok || !partnerJson.success) throw new Error(partnerJson?.error?.message ?? 'Gagal load partner');
        if (!periodRes.ok || !periodJson.success) throw new Error(periodJson?.error?.message ?? 'Gagal load period');

        setPenggalangs(penggalangJson.data.penggalangs ?? []);
        setTotalUtang(penggalangJson.data.total_utang_beneficiary ?? 0);
        setTotalDisbursed(penggalangJson.data.total_disbursed ?? 0);
        setTotalSisa(penggalangJson.data.total_sisa ?? 0);
        setBenPartners(partnerJson.data.partners ?? []);
        setBenPeriods(periodJson.data.periods ?? []);
      } else if (category === 'beneficiary') {
        // ⭐ Dana Beneficiary multi-tab: detail (ikut periode) + by-partner + by-period.
        // Reuse endpoint yang sama dengan hak_beneficiary (beneficiary/by-partner & by-period).
        const [detailRes, partnerRes, periodRes] = await Promise.all([
          fetch(`${API_URL}/funding/admin/cashflow/breakdown-detail?category=beneficiary&limit=500${dateQs}`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
          fetch(`${API_URL}/funding/admin/cashflow/beneficiary/by-partner`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
          fetch(`${API_URL}/funding/admin/cashflow/beneficiary/by-period`, {
            headers: { Authorization: `Bearer ${tk}` },
          }),
        ]);

        const [detailJson, partnerJson, periodJson] = await Promise.all([
          detailRes.json(), partnerRes.json(), periodRes.json(),
        ]);

        if (!detailRes.ok || !detailJson.success) throw new Error(detailJson?.error?.message ?? 'Gagal load detail');
        if (!partnerRes.ok || !partnerJson.success) throw new Error(partnerJson?.error?.message ?? 'Gagal load partner');
        if (!periodRes.ok || !periodJson.success) throw new Error(periodJson?.error?.message ?? 'Gagal load periode');

        setDetailRows(detailJson.data.rows ?? []);
        setTotalAmount(detailJson.data.total_amount ?? 0);
        setTotalCount(detailJson.data.total_count ?? 0);
        setBenPartners(partnerJson.data.partners ?? []);
        setBenPeriods(periodJson.data.periods ?? []);
      } else {
        // Fetch detail rows per simple category (kode_unik)
        const res = await fetch(
          `${API_URL}/funding/admin/cashflow/breakdown-detail?category=${meta.backendCategory}&limit=500${dateQs}`,
          { headers: { Authorization: `Bearer ${tk}` } }
        );
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal load');
        setDetailRows(json.data.rows ?? []);
        setTotalAmount(json.data.total_amount ?? 0);
        setTotalCount(json.data.total_count ?? 0);
      }
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    let csv = '\uFEFF';
    let filename = '';
    
    if (category === 'hak_beneficiary') {
      filename = `hak-beneficiary-2level-${new Date().toISOString().slice(0, 10)}.csv`;
      csv += 'No,Penggalang,Campaign ID,Campaign,Partner,Utang Beneficiary,Sudah Disalurkan,Sisa Belum Disalurkan\n';
      let rowNum = 1;
      penggalangs.forEach(p => {
        p.campaigns.forEach(c => {
          csv += [
            rowNum++,
            `"${p.penggalang_name}"`,
            c.campaign_display_id ?? '',
            `"${c.campaign_title}"`,
            `"${c.partner_name}"`,
            c.utang_beneficiary,
            c.disbursed_total,
            c.sisa_belum_disalurkan,
          ].join(',') + '\n';
        });
      });
    } else if (category === 'under_audit') {
      filename = `under-audit-donations-${new Date().toISOString().slice(0, 10)}.csv`;
      csv += 'No,Tanggal,ID Donasi,Kode Unik,Donor,Campaign,Partner,Amount (Beneficiary),Total Transfer\n';
      underAuditDonations.forEach((d, i) => {
        csv += [
          i + 1,
          formatDate(d.created_at),
          d.display_id ?? '',
          d.donation_code,
          `"${d.donor_name}"`,
          `"${d.campaign_title}"`,
          `"${d.partner_name}"`,
          d.amount,
          d.total_transfer,
        ].join(',') + '\n';
      });
    } else if (category === 'fee_teraloka' && feeTeralokaTab === 'partners') {
      filename = `fee-teraloka-per-partner-${new Date().toISOString().slice(0, 10)}.csv`;
      csv += 'No,Partner,Total Fee,Sudah Setor,Setor Terakhir,Jumlah Batch,Belum Setor,Aging 0-7,Aging 8-14,Aging 15-30,Aging >30,Tanggal Terlama Belum Setor,Status\n';
      feePartnerAggregate.forEach((p, i) => {
        csv += [
          i + 1,
          `"${p.partner_name}"`,
          p.total_fee_expected,
          p.total_fee_remitted,
          p.last_remitted_at ? formatDate(p.last_remitted_at) : '-',
          p.remittance_batch_count,
          p.total_fee_pending,
          p.aging_0_7,
          p.aging_8_14,
          p.aging_15_30,
          p.aging_over_30,
          p.oldest_pending_date ? formatDate(p.oldest_pending_date) : '-',
          p.is_berutang ? 'Berutang' : 'Lunas',
        ].join(',') + '\n';
      });
    } else if (category === 'fee_teraloka' && feeTeralokaTab === 'remittances') {
      filename = `fee-teraloka-remittance-history-${new Date().toISOString().slice(0, 10)}.csv`;
      csv += 'No,Tanggal Submit,Tanggal Verified,Partner,Jumlah Donasi,Total Fee,Status,Reference Code,Catatan\n';
      feeRemittanceBatches.forEach((b, i) => {
        csv += [
          i + 1,
          b.submitted_at ? formatDate(b.submitted_at) : '-',
          b.reviewed_at ? formatDate(b.reviewed_at) : '-',
          `"${b.partner_name}"`,
          b.donation_count,
          b.amount,
          b.status,
          b.reference_code ?? '',
          `"${(b.notes ?? '').replace(/"/g, '""')}"`,
        ].join(',') + '\n';
      });
    } else {
      filename = `${category}-detail-${new Date().toISOString().slice(0, 10)}.csv`;
      csv += 'No,Tanggal,Entry Number,ID Donasi,Kode Unik,Donor,Kampanye,Partner,Nominal,Skenario\n';
      detailRows.forEach((r, i) => {
        csv += [
          i + 1,
          formatDate(r.transaction_date),
          r.entry_number,
          r.display_id ?? '',
          r.donation_code,
          `"${r.donor_name}"`,
          `"${r.campaign_title}"`,
          `"${r.partner_name}"`,
          r.amount,
          r.scenario,
        ].join(',') + '\n';
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${t.sidebarBorder}`,
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: 12, padding: 16, marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ 
            fontSize: 11, fontWeight: 700, color: meta.color, 
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2,
          }}>
            <meta.Icon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {meta.title}
          </p>
          <p style={{ fontSize: 12, color: t.textDim }}>
            {meta.description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={downloadCSV}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: meta.color, color: '#fff',
              fontSize: 11, fontWeight: 700,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '4px 10px', borderRadius: 6,
              background: t.navHover, color: t.textPrimary,
              border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <X size={12} /> Tutup
          </button>
        </div>
      </div>

      {/* Body */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 }}>
          <Loader2 size={16} className="animate-spin" style={{ color: meta.color }} />
          <span style={{ color: t.textDim, fontSize: 12 }}>Loading dari Money Ledger...</span>
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, color: '#DC2626', fontSize: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AlertCircle size={14} /> {error}</span>
        </div>
      )}

      {!loading && !error && category !== 'hak_beneficiary' && category !== 'under_audit' && category !== 'fee_teraloka' && category !== 'tip' && category !== 'beneficiary' && (
        <DetailTable rows={detailRows} totalAmount={totalAmount} totalCount={totalCount} color={meta.color} t={t} />
      )}

      {!loading && !error && category === 'beneficiary' && (
        <DanaBeneficiaryTabbedView
          detailRows={detailRows}
          totalAmount={totalAmount}
          totalCount={totalCount}
          partners={benPartners}
          periods={benPeriods}
          activeTab={danaTab}
          onChangeTab={setDanaTab}
          periodLabel={periodLabel}
          color={meta.color}
          t={t}
        />
      )}

      {!loading && !error && category === 'fee_teraloka' && (
        <FeeTeralokaTabbedView
          detailRows={detailRows}
          totalAmount={totalAmount}
          totalCount={totalCount}
          partnerAggregate={feePartnerAggregate}
          remittanceBatches={feeRemittanceBatches}
          activeTab={feeTeralokaTab}
          onChangeTab={setFeeTeralokaTab}
          onSendReminder={(partnerName) => setReminderModalPartner(partnerName)}
          color={meta.color}
          t={t}
        />
      )}

      {/* ⭐ Sesi 13 Mission 2B Phase 1: Reminder Modal */}
      {reminderModalPartner && (
        <FeeReminderModal
          partnerName={reminderModalPartner}
          onClose={() => setReminderModalPartner(null)}
          onSuccess={() => {
            setReminderModalPartner(null);
            // Optionally refresh partner data after send
            // fetchData();
          }}
          t={t}
        />
      )}

      {!loading && !error && category === 'hak_beneficiary' && (
        <BeneficiaryTabbedView
          penggalangs={penggalangs}
          totalUtang={totalUtang}
          totalDisbursed={totalDisbursed}
          totalSisa={totalSisa}
          partners={benPartners}
          periods={benPeriods}
          activeTab={benTab}
          onChangeTab={setBenTab}
          expandedId={expandedPenggalangId}
          onToggleExpand={(id) => setExpandedPenggalangId(prev => prev === id ? null : id)}
          color={meta.color}
          t={t}
        />
      )}

      {!loading && !error && category === 'tip' && (
        <TipPenggalangTabbedView
          detailRows={detailRows}
          totalAmount={totalAmount}
          totalCount={totalCount}
          partners={tipPartners}
          periods={tipPeriods}
          activeTab={tipTab}
          onChangeTab={setTipTab}
          showAllDonations={tipShowAllDonations}
          onToggleShowAll={setTipShowAllDonations}
          color={meta.color}
          t={t}
        />
      )}

      {!loading && !error && category === 'under_audit' && (
        <UnderAuditView 
          donations={underAuditDonations}
          color={meta.color} 
          t={t}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function DetailTable({ rows, totalAmount, totalCount, color, t }: { 
  rows: DetailRow[]; totalAmount: number; totalCount: number; color: string; t: any;
}) {
  return (
    <div>
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', marginBottom: 12, 
        padding: '8px 12px', background: `${color}10`, borderRadius: 6,
      }}>
        <span style={{ fontSize: 11, color: t.textPrimary, fontWeight: 600 }}>
          {totalCount} transaksi
        </span>
        <span style={{ fontSize: 13, color, fontWeight: 800 }}>
          Total: {formatRupiah(totalAmount)}
        </span>
      </div>
      
      <div style={{ overflow: 'auto', maxHeight: 500, border: `1px solid ${t.sidebarBorder}`, borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead style={{ background: t.navHover, position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={th(t)}>#</th>
              <th style={th(t)}>Tanggal</th>
              <th style={th(t)}>ID Donasi</th>
              <th style={th(t)}>Donor</th>
              <th style={th(t)}>Kampanye</th>
              <th style={th(t)}>Partner</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Nominal</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: t.textDim }}>
                  Belum ada data
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.entry_id} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                <td style={{ ...td(t), color: t.textDim, width: 36 }}>{i + 1}</td>
                <td style={td(t)}>{formatDate(r.transaction_date)}</td>
                <td style={{ ...td(t), fontFamily: 'monospace', fontSize: 10 }}>
                  <div>{r.display_id ?? '-'}</div>
                  <div style={{ color: t.textDim, fontSize: 9 }}>#{r.donation_code}</div>
                </td>
                <td style={td(t)}>{r.donor_name}</td>
                <td style={{ ...td(t), maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.campaign_title}
                </td>
                <td style={td(t)}>{r.partner_name}</td>
                <td style={{ ...td(t), textAlign: 'right', fontWeight: 700, color }}>
                  {formatRupiah(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ⭐ Sesi 13 Mission 2: Fee TeraLoka 3-tab view
function FeeTeralokaTabbedView({
  detailRows, totalAmount, totalCount,
  partnerAggregate, remittanceBatches,
  activeTab, onChangeTab,
  onSendReminder,
  color, t,
}: {
  detailRows: DetailRow[];
  totalAmount: number;
  totalCount: number;
  partnerAggregate: FeeTeralokaPartner[];
  remittanceBatches: FeeRemittanceBatch[];
  activeTab: FeeTeralokaTab;
  onChangeTab: (tab: FeeTeralokaTab) => void;
  onSendReminder: (partnerName: string) => void;
  color: string;
  t: any;
}) {
  // ⭐ Sesi 13 Mission 2F: Anomaly Detection
  const formatRupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  
  const totalExpected = partnerAggregate.reduce((s, p) => s + p.total_fee_expected, 0);
  const totalRemitted = partnerAggregate.reduce((s, p) => s + p.total_fee_remitted, 0);
  const totalPending = partnerAggregate.reduce((s, p) => s + p.total_fee_pending, 0);
  const totalUnderAudit = partnerAggregate.reduce((s, p) => s + p.fee_under_audit, 0);
  const totalDonationsUnderAudit = partnerAggregate.reduce((s, p) => s + p.donation_count_under_audit, 0);
  
  const archivedPartners = partnerAggregate.filter(p => p.has_archived_campaign);
  const totalArchivedCampaigns = archivedPartners.reduce((s, p) => s + p.archived_campaign_count, 0);
  
  const partnersWithUnderAudit = partnerAggregate.filter(p => p.fee_under_audit > 0);
  
  const hasAnyAnomaly = totalPending > 0 || archivedPartners.length > 0 || totalUnderAudit > 0;
  
  return (
    <div>
      {/* ⭐ Mission 2F: Smart Anomaly Banner */}
      {hasAnyAnomaly && (
        <div style={{ 
          marginBottom: 12,
          padding: 12,
          background: totalPending > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${totalPending > 0 ? 'rgba(220,38,38,0.35)' : 'rgba(245,158,11,0.35)'}`,
          borderRadius: 6,
        }}>
          <div style={{ 
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <AlertTriangle 
              size={16} 
              style={{ 
                color: totalPending > 0 ? '#DC2626' : '#F59E0B',
                flexShrink: 0, marginTop: 1,
              }} 
            />
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: 11, fontWeight: 800, 
                color: totalPending > 0 ? '#DC2626' : '#F59E0B',
                marginBottom: 4,
              }}>
                ANOMALI TERDETEKSI
              </div>
              
              {/* Audit summary */}
              <div style={{ fontSize: 11, color: t.textPrimary, lineHeight: 1.6 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>Total Expected: <strong>{formatRupiah(totalExpected)}</strong></span>
                  <span>Sudah Setor: <strong style={{ color: '#10B981' }}>{formatRupiah(totalRemitted)}</strong></span>
                  <span>Belum Setor: <strong style={{ color: totalPending > 0 ? '#DC2626' : '#10B981' }}>{formatRupiah(totalPending)}</strong></span>
                  {totalUnderAudit > 0 && (
                    <span>Tahan Audit: <strong style={{ color: '#8B5CF6' }}>{formatRupiah(totalUnderAudit)}</strong></span>
                  )}
                </div>
              </div>
              
              {/* Anomaly details */}
              <ul style={{ 
                margin: '6px 0 0 0', padding: '0 0 0 16px', 
                fontSize: 10, color: t.textDim, lineHeight: 1.7,
              }}>
                {totalPending > 0 && (
                  <li>
                    <strong>{partnerAggregate.filter(p => p.is_berutang).length} partner</strong> belum setor fee 
                    senilai <strong style={{ color: '#DC2626' }}>{formatRupiah(totalPending)}</strong> · 
                    <button 
                      onClick={() => onChangeTab('partners')}
                      style={{ 
                        marginLeft: 4, background: 'transparent', border: 'none', 
                        color: '#DC2626', cursor: 'pointer', textDecoration: 'underline',
                        padding: 0, fontSize: 10, fontWeight: 700,
                      }}
                    >
                      Lihat Per Partner →
                    </button>
                  </li>
                )}
                {totalUnderAudit > 0 && (
                  <li>
                    <strong>{totalDonationsUnderAudit} donasi</strong> dalam status 'Tahan Audit' di 
                    <strong> {partnersWithUnderAudit.length} partner</strong> · 
                    fee <strong style={{ color: '#8B5CF6' }}>{formatRupiah(totalUnderAudit)}</strong> 
                    <span style={{ marginLeft: 4, fontStyle: 'italic' }}>
                      (belum confirmed, mungkin di-verify atau di-reject)
                    </span>
                  </li>
                )}
                {archivedPartners.length > 0 && (
                  <li>
                    <strong>{totalArchivedCampaigns} campaign</strong> dalam state aneh (active TAPI archived) 
                    di <strong>{archivedPartners.length} partner</strong> · 
                    <span style={{ marginLeft: 4, fontStyle: 'italic' }}>
                      Donasi tetap ke-track, tapi UI Owner mungkin gak tampilkan campaign-nya
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab toggle */}
      <div style={{ 
        display: 'flex', gap: 4, marginBottom: 12,
        borderBottom: `1px solid ${t.sidebarBorder}`,
        paddingBottom: 0,
      }}>
        <TabButton 
          label="Per Donasi" 
          count={totalCount} 
          active={activeTab === 'donations'} 
          onClick={() => onChangeTab('donations')} 
          color={color} t={t}
        />
        <TabButton 
          label="Per Partner" 
          count={partnerAggregate.length} 
          active={activeTab === 'partners'} 
          onClick={() => onChangeTab('partners')} 
          color={color} t={t}
        />
        <TabButton 
          label="Per Periode (Remittance)" 
          count={remittanceBatches.length} 
          active={activeTab === 'remittances'} 
          onClick={() => onChangeTab('remittances')} 
          color={color} t={t}
        />
      </div>

      {/* Content per tab */}
      {activeTab === 'donations' && (
        <DetailTable rows={detailRows} totalAmount={totalAmount} totalCount={totalCount} color={color} t={t} />
      )}
      {activeTab === 'partners' && (
        <FeeTeralokaPerPartner partners={partnerAggregate} color={color} t={t} onSendReminder={onSendReminder} />
      )}
      {activeTab === 'remittances' && (
        <FeeTeralokaPerRemittance batches={remittanceBatches} color={color} t={t} />
      )}
    </div>
  );
}

function TabButton({ 
  label, count, active, onClick, color, t,
}: { 
  label: React.ReactNode; count: number; active: boolean; onClick: () => void; color: string; t: any;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        background: 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${color}` : `2px solid transparent`,
        color: active ? color : t.textDim,
        fontSize: 11,
        fontWeight: active ? 800 : 600,
        cursor: 'pointer',
        marginBottom: -1,
        whiteSpace: 'nowrap',
      }}
    >
      {label} <span style={{ opacity: 0.7, fontSize: 10 }}>({count})</span>
    </button>
  );
}

function FeeTeralokaPerPartner({ 
  partners, color, t, onSendReminder,
}: { 
  partners: FeeTeralokaPartner[]; color: string; t: any;
  onSendReminder: (partnerName: string) => void;
}) {
  const totalExpected = partners.reduce((s, p) => s + p.total_fee_expected, 0);
  const totalRemitted = partners.reduce((s, p) => s + p.total_fee_remitted, 0);
  const totalPending = partners.reduce((s, p) => s + p.total_fee_pending, 0);
  const berutangCount = partners.filter(p => p.is_berutang).length;

  return (
    <div>
      {/* Summary */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: 8, marginBottom: 14,
      }}>
        <SummaryStat label="Total Fee" value={formatRupiah(totalExpected)} color={color} t={t} />
        <SummaryStat label="Sudah Setor" value={formatRupiah(totalRemitted)} color="#10B981" t={t} />
        <SummaryStat label="Belum Setor" value={formatRupiah(totalPending)} color="#F59E0B" t={t} highlight />
        <SummaryStat label="Partner Berutang" value={`${berutangCount} partner`} color="#DC2626" t={t} />
      </div>

      <div style={{ overflow: 'auto', maxHeight: 500, border: `1px solid ${t.sidebarBorder}`, borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead style={{ background: t.navHover, position: 'sticky', top: 0 }}>
            <tr>
              <th style={th(t)}>#</th>
              <th style={th(t)}>Partner</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Total Fee</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Sudah Setor</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Belum Setor</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Aging (Belum Setor)</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Terlama</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Status</th>
              <th style={{ ...th(t), textAlign: 'center', minWidth: 110 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 20, textAlign: 'center', color: t.textDim }}>Tidak ada data</td></tr>
            )}
            {partners.map((p, i) => {
              const oldestDays = daysAgo(p.oldest_pending_date);
              const oldestSeverity = oldestDays === null ? null 
                : oldestDays > 30 ? '#DC2626' 
                : oldestDays > 14 ? '#EA580C' 
                : oldestDays > 7 ? '#D97706' 
                : '#10B981';
              return (
                <tr key={p.partner_name} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                  <td style={{ ...td(t), color: t.textDim, width: 36 }}>{i + 1}</td>
                  <td style={{ ...td(t), fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{p.partner_name}</span>
                      {/* ⭐ Mission 2F: Archived campaign badge */}
                      {p.has_archived_campaign && (
                        <span 
                          title={`${p.archived_campaign_count} campaign dalam state aneh (active TAPI archived). Donasi tetap ke-track.`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '1px 5px', borderRadius: 3,
                            fontSize: 8, fontWeight: 800,
                            background: 'rgba(245,158,11,0.15)', color: '#F59E0B',
                            border: '1px solid rgba(245,158,11,0.3)',
                          }}
                        >
                          <AlertTriangle size={8} /> {p.archived_campaign_count} ARCHIVED
                        </span>
                      )}
                      {/* ⭐ Mission 2F: Under Audit badge */}
                      {p.fee_under_audit > 0 && (
                        <span 
                          title={`${p.donation_count_under_audit} donasi dalam status 'Tahan Audit' senilai Rp ${Math.round(p.fee_under_audit).toLocaleString('id-ID')}. Belum confirmed.`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '1px 5px', borderRadius: 3,
                            fontSize: 8, fontWeight: 800,
                            background: 'rgba(139,92,246,0.15)', color: '#8B5CF6',
                            border: '1px solid rgba(139,92,246,0.3)',
                          }}
                        >
                          <Hourglass size={8} /> Rp {Math.round(p.fee_under_audit).toLocaleString('id-ID')} TAHAN AUDIT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 9, color: t.textDim, marginTop: 1 }}>
                      {p.donation_count} donasi ({p.donation_count_remitted} setor, {p.donation_count_pending} pending
                      {p.donation_count_under_audit > 0 && `, ${p.donation_count_under_audit} audit`})
                    </div>
                  </td>
                  <td style={{ ...td(t), textAlign: 'right' }}>{formatRupiah(p.total_fee_expected)}</td>
                  <td style={{ ...td(t), textAlign: 'right' }}>
                    <div style={{ color: '#10B981', fontWeight: 700 }}>
                      {formatRupiah(p.total_fee_remitted)}
                    </div>
                    {/* ⭐ Sesi 13 Mission 2 fix: info tanggal setor + batch count */}
                    {p.last_remitted_at ? (
                      <div style={{ fontSize: 9, color: t.textDim, marginTop: 2, fontWeight: 500 }}>
                        Terakhir: {formatDate(p.last_remitted_at)}
                        {p.remittance_batch_count > 0 && (
                          <span style={{ marginLeft: 4, opacity: 0.7 }}>
                            ({p.remittance_batch_count} batch)
                          </span>
                        )}
                      </div>
                    ) : p.total_fee_remitted > 0 ? (
                      // Path B: sudah setor tapi tidak lewat batch remittance
                      // (data legacy/seed, atau direct admin action)
                      <div 
                        title="Setor tercatat di donasi tapi tidak ada batch remittance terkait (data legacy)"
                        style={{ fontSize: 9, color: t.textDim, marginTop: 2, fontStyle: 'italic' }}
                      >
                        Tanpa batch (legacy)
                      </div>
                    ) : (
                      // Genuine: partner ini memang belum pernah setor (total_fee_remitted = 0)
                      <div style={{ fontSize: 9, color: t.textDim, marginTop: 2, fontStyle: 'italic' }}>
                        Belum ada setoran
                      </div>
                    )}
                  </td>
                  <td style={{ ...td(t), textAlign: 'right', fontWeight: 700, color: p.total_fee_pending > 0 ? '#F59E0B' : t.textDim }}>
                    {formatRupiah(p.total_fee_pending)}
                  </td>
                  <td style={{ ...td(t), textAlign: 'center', fontSize: 10 }}>
                    {p.total_fee_pending > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                        {p.aging_0_7 > 0 && <span style={{ color: '#10B981' }}>0-7h: {formatRupiah(p.aging_0_7)}</span>}
                        {p.aging_8_14 > 0 && <span style={{ color: '#D97706' }}>8-14h: {formatRupiah(p.aging_8_14)}</span>}
                        {p.aging_15_30 > 0 && <span style={{ color: '#EA580C' }}>15-30h: {formatRupiah(p.aging_15_30)}</span>}
                        {p.aging_over_30 > 0 && <span style={{ color: '#DC2626', fontWeight: 700 }}>&gt;30h: {formatRupiah(p.aging_over_30)}</span>}
                      </div>
                    ) : (
                      <span style={{ color: t.textDim }}>—</span>
                    )}
                  </td>
                  <td style={{ ...td(t), textAlign: 'center', fontSize: 10, color: oldestSeverity ?? t.textDim }}>
                    {oldestDays === null ? '—' : `${oldestDays} hari`}
                  </td>
                  <td style={{ ...td(t), textAlign: 'center' }}>
                    {p.is_berutang ? (
                      <span style={{ 
                        padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                        background: 'rgba(220,38,38,0.15)', color: '#DC2626',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <AlertCircle size={10} /> BERUTANG
                      </span>
                    ) : (
                      <span style={{ 
                        padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                        background: 'rgba(16,185,129,0.15)', color: '#10B981',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <CheckCircle2 size={10} /> LUNAS
                      </span>
                    )}
                  </td>
                  {/* ⭐ Sesi 13 Mission 2B Phase 1: Kirim Reminder action */}
                  <td style={{ ...td(t), textAlign: 'center' }}>
                    {p.is_berutang ? (
                      <button
                        onClick={() => onSendReminder(p.partner_name)}
                        style={{
                          padding: '4px 8px',
                          fontSize: 10, fontWeight: 700,
                          background: 'rgba(220,38,38,0.12)',
                          color: '#DC2626',
                          border: '1px solid rgba(220,38,38,0.35)',
                          borderRadius: 4,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 150ms',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.25)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; }}
                      >
                        <Send size={11} /> Kirim Reminder
                      </button>
                    ) : (
                      <span style={{ fontSize: 9, color: t.textDim, fontStyle: 'italic' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeeTeralokaPerRemittance({ 
  batches, color, t,
}: { 
  batches: FeeRemittanceBatch[]; color: string; t: any;
}) {
  const verifiedAmount = batches.filter(b => b.status === 'verified').reduce((s, b) => s + b.amount, 0);
  const pendingAmount = batches.filter(b => b.status === 'pending').reduce((s, b) => s + b.amount, 0);
  const rejectedCount = batches.filter(b => b.status === 'rejected').length;

  return (
    <div>
      {/* Summary */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: 8, marginBottom: 14,
      }}>
        <SummaryStat label="Total Verified" value={formatRupiah(verifiedAmount)} color="#10B981" t={t} highlight />
        <SummaryStat label="Pending Review" value={formatRupiah(pendingAmount)} color="#F59E0B" t={t} />
        <SummaryStat label="Total Batch" value={`${batches.length} remittance`} color={color} t={t} />
        {rejectedCount > 0 && (
          <SummaryStat label="Rejected" value={`${rejectedCount} batch`} color="#DC2626" t={t} />
        )}
      </div>

      <div style={{ overflow: 'auto', maxHeight: 500, border: `1px solid ${t.sidebarBorder}`, borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead style={{ background: t.navHover, position: 'sticky', top: 0 }}>
            <tr>
              <th style={th(t)}>#</th>
              <th style={th(t)}>Tgl Submit</th>
              <th style={th(t)}>Tgl Verified</th>
              <th style={th(t)}>Partner</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Donasi</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Total Fee</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Status</th>
              <th style={th(t)}>Reference</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: t.textDim }}>Belum ada remittance batch</td></tr>
            )}
            {batches.map((b, i) => {
              const statusColor = b.status === 'verified' ? '#10B981'
                                : b.status === 'pending' ? '#F59E0B'
                                : '#DC2626';
              const statusLabel = b.status === 'verified' ? 'Verified'
                                : b.status === 'pending' ? 'Pending'
                                : 'Rejected';
              const StatusIcon = b.status === 'verified' ? CheckCircle2
                                : b.status === 'pending' ? Hourglass
                                : XCircle;
              return (
                <tr key={b.id} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                  <td style={{ ...td(t), color: t.textDim, width: 36 }}>{i + 1}</td>
                  <td style={td(t)}>{b.submitted_at ? formatDate(b.submitted_at) : '-'}</td>
                  <td style={td(t)}>{b.reviewed_at ? formatDate(b.reviewed_at) : '-'}</td>
                  <td style={{ ...td(t), fontWeight: 700 }}>{b.partner_name}</td>
                  <td style={{ ...td(t), textAlign: 'right' }}>{b.donation_count}</td>
                  <td style={{ ...td(t), textAlign: 'right', fontWeight: 700, color }}>{formatRupiah(b.amount)}</td>
                  <td style={{ ...td(t), textAlign: 'center' }}>
                    <span style={{ 
                      padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                      background: `${statusColor}20`, color: statusColor,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <StatusIcon size={10} /> {statusLabel}
                    </span>
                  </td>
                  <td style={{ ...td(t), fontSize: 10, fontFamily: 'monospace', color: t.textMuted }}>
                    {b.reference_code ?? '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HakBeneficiary2Level({ 
  penggalangs, totalUtang, totalDisbursed, totalSisa, expandedId, onToggleExpand, color, t,
}: { 
  penggalangs: PenggalangSaldo[]; 
  totalUtang: number; totalDisbursed: number; totalSisa: number;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  color: string; t: any;
}) {
  return (
    <div>
      {/* Summary stats */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: 8, marginBottom: 14,
      }}>
        <SummaryStat label="Total Utang Beneficiary" value={formatRupiah(totalUtang)} color="#10B981" t={t} />
        <SummaryStat label="Sudah Disalurkan" value={formatRupiah(totalDisbursed)} color="#0891B2" t={t} />
        <SummaryStat label="Belum Disalurkan" value={formatRupiah(totalSisa)} color={color} t={t} highlight />
      </div>

      <p style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        Per Penggalang ({penggalangs.length}) · Klik baris untuk drill-down campaign+partner
      </p>

      {/* Per Penggalang table with expandable rows */}
      <div style={{ border: `1px solid ${t.sidebarBorder}`, borderRadius: 6, overflow: 'hidden' }}>
        {penggalangs.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: t.textDim, fontSize: 12 }}>
            Tidak ada data
          </div>
        )}
        {penggalangs.map((p, i) => {
          const isExpanded = expandedId === p.creator_id;
          return (
            <div key={p.creator_id} style={{ borderTop: i > 0 ? `1px solid ${t.sidebarBorder}` : 'none' }}>
              {/* Level 1: Penggalang summary row */}
              <div
                onClick={() => onToggleExpand(p.creator_id)}
                style={{
                  padding: '10px 12px',
                  background: isExpanded ? `${color}10` : 'transparent',
                  cursor: 'pointer',
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr 130px 130px 130px',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                }}
                onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = t.navHover; }}
                onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ color: t.textDim, fontSize: 11 }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 700, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: t.textMuted }}>{isExpanded ? '▼' : '▶'}</span>
                    {p.penggalang_name}
                  </div>
                  <div style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>
                    {p.campaign_count} campaign · {p.creator_id.slice(0, 8)}...
                  </div>
                </div>
                <div style={{ textAlign: 'right', color: '#10B981', fontWeight: 600 }}>
                  {formatRupiah(p.total_utang_beneficiary)}
                </div>
                <div style={{ textAlign: 'right', color: '#0891B2', fontWeight: 600 }}>
                  {formatRupiah(p.total_disbursed)}
                </div>
                <div style={{ textAlign: 'right', color, fontWeight: 800 }}>
                  {formatRupiah(p.total_sisa)}
                </div>
              </div>
              
              {/* Level 2: Campaign+Partner detail (expand) */}
              {isExpanded && (
                <div style={{ background: t.navHover, padding: '8px 12px 12px 48px' }}>
                  <div style={{ 
                    fontSize: 9, fontWeight: 700, color: t.textMuted, 
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    marginBottom: 6,
                  }}>
                    Detail Campaign ({p.campaigns.length})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}` }}>
                        <th style={{ ...th(t), paddingLeft: 0 }}>#</th>
                        <th style={th(t)}>Campaign</th>
                        <th style={th(t)}>Partner (atas nama)</th>
                        <th style={{ ...th(t), textAlign: 'right' }}>Utang</th>
                        <th style={{ ...th(t), textAlign: 'right' }}>Disalurkan</th>
                        <th style={{ ...th(t), textAlign: 'right' }}>Sisa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.campaigns.map((c, ci) => (
                        <tr key={c.campaign_id} style={{ borderBottom: ci < p.campaigns.length - 1 ? `1px solid ${t.sidebarBorder}` : 'none' }}>
                          <td style={{ ...td(t), color: t.textDim, paddingLeft: 0, width: 30 }}>{ci + 1}</td>
                          <td style={{ ...td(t), maxWidth: 280 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.campaign_title}
                            </div>
                            {c.campaign_display_id && (
                              <div style={{ 
                                fontSize: 9, color: t.textMuted, marginTop: 1,
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                fontWeight: 700,
                              }}>
                                {c.campaign_display_id}
                              </div>
                            )}
                          </td>
                          <td style={{ ...td(t), color: '#EC4899' }}>{c.partner_name}</td>
                          <td style={{ ...td(t), textAlign: 'right', color: '#10B981' }}>{formatRupiah(c.utang_beneficiary)}</td>
                          <td style={{ ...td(t), textAlign: 'right', color: '#0891B2' }}>{formatRupiah(c.disbursed_total)}</td>
                          <td style={{ ...td(t), textAlign: 'right', fontWeight: 700, color }}>{formatRupiah(c.sisa_belum_disalurkan)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UnderAuditView({ 
  donations, color, t,
}: { 
  donations: UnderAuditDonation[]; color: string; t: any;
}) {
  // [CASHFLOW-ALUR-FIX] catat apa adanya: yang DITERIMA (amount_received), bukan yang diinstruksikan.
  // under_audit belum jadi journal → JANGAN commit split beneficiary; tampil "masuk X, menunggu resolusi".
  const totalTransfer = donations.reduce((sum, d) => sum + (Number(d.total_transfer) || 0), 0); // diinstruksikan
  const totalReceived = donations.reduce((sum, d) => sum + (Number(d.amount_received) || Number(d.total_transfer) || 0), 0); // diterima
  const shortfall = Math.max(0, totalTransfer - totalReceived);

  return (
    <div>
      {/* Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 8, marginBottom: 14,
      }}>
        <SummaryStat label="Donasi Tertahan" value={`${donations.length} donasi`} color={color} t={t} />
        <SummaryStat label="Diterima (masuk)" value={formatRupiah(totalReceived)} color="#6366F1" t={t} highlight />
        <SummaryStat label="Hak Beneficiary" value="Menunggu resolusi" color={color} t={t} />
      </div>

      {/* [CASHFLOW-ALUR-FIX] catatan: diinstruksikan vs diterima + status split */}
      <div style={{
        padding: '8px 12px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 6, marginBottom: 10, fontSize: 11, color: t.textPrimary, lineHeight: 1.5,
      }}>
        Masuk <strong>{formatRupiah(totalReceived)}</strong> (diinstruksikan {formatRupiah(totalTransfer)}
        {shortfall > 0 ? <>, kurang <strong style={{ color: '#DC2626' }}>{formatRupiah(shortfall)}</strong> — menunggu top-up</> : null}).
        {' '}Split hak beneficiary <strong>belum di-commit</strong> (under_audit belum jadi journal) — menunggu resolusi.
      </div>

      <div style={{
        padding: '8px 12px',
        background: `${color}10`,
        border: `1px solid ${color}30`,
        borderRadius: 6,
        marginBottom: 10,
        fontSize: 11,
        color: t.textPrimary,
      }}>
        💡 Donasi ini <strong>belum jadi journal entry</strong> di Money Ledger. Menunggu admin resolve mismatch (refund / topup / partial). 
        Lihat detail di <a href="/admin/funding/donations?status=under_audit" style={{ color, fontWeight: 700, textDecoration: 'underline' }}>
          Verifikasi Donasi →
        </a>
      </div>

      <div style={{ overflow: 'auto', maxHeight: 500, border: `1px solid ${t.sidebarBorder}`, borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead style={{ background: t.navHover, position: 'sticky', top: 0 }}>
            <tr>
              <th style={th(t)}>#</th>
              <th style={th(t)}>Tanggal</th>
              <th style={th(t)}>ID Donasi</th>
              <th style={th(t)}>Donor</th>
              <th style={th(t)}>Campaign</th>
              <th style={th(t)}>Partner</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Beneficiary</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Total Transfer</th>
            </tr>
          </thead>
          <tbody>
            {donations.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: t.textDim }}>Tidak ada donasi under_audit</td></tr>
            )}
            {donations.map((d, i) => (
              <tr key={d.id} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                <td style={{ ...td(t), color: t.textDim, width: 36 }}>{i + 1}</td>
                <td style={td(t)}>{formatDate(d.created_at)}</td>
                <td style={{ ...td(t), fontFamily: 'monospace', fontSize: 10 }}>
                  <div>{d.display_id ?? '-'}</div>
                  <div style={{ color: t.textDim, fontSize: 9 }}>#{d.donation_code}</div>
                </td>
                <td style={td(t)}>{d.donor_name}</td>
                <td style={{ ...td(t), maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.campaign_title}
                </td>
                <td style={{ ...td(t), color: '#EC4899' }}>{d.partner_name}</td>
                <td style={{ ...td(t), textAlign: 'right', color: '#10B981', fontWeight: 700 }}>{formatRupiah(d.amount)}</td>
                <td style={{ ...td(t), textAlign: 'right', color: '#6366F1' }}>{formatRupiah(d.total_transfer)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryStat({ 
  label, value, color, t, highlight,
}: { 
  label: string; value: string; color: string; t: any; highlight?: boolean;
}) {
  return (
    <div style={{
      padding: '8px 12px',
      background: highlight ? `${color}20` : t.navHover,
      borderRadius: 6,
      border: highlight ? `1px solid ${color}50` : `1px solid ${t.sidebarBorder}`,
    }}>
      <p style={{ 
        fontSize: 9, fontWeight: 700, color: t.textMuted, 
        textTransform: 'uppercase', letterSpacing: '0.04em',
        marginBottom: 2,
      }}>
        {label}
      </p>
      <p style={{ fontSize: 14, fontWeight: 800, color }}>
        {value}
      </p>
    </div>
  );
}

function th(t: any): React.CSSProperties {
  return {
    padding: '8px 10px', textAlign: 'left',
    fontSize: 9, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  };
}

function td(t: any): React.CSSProperties {
  return {
    padding: '8px 10px',
    color: t.textPrimary,
    fontSize: 11,
  };
}

// ════════════════════════════════════════════════════════════════
// Sesi 13 Mission 2B Phase 1 — Fee Reminder Modal
// ════════════════════════════════════════════════════════════════

interface ReminderPreview {
  partner_name: string;
  amount_due: number;
  donation_count: number;
  oldest_pending_at: string | null;
  recipient_phone: string | null;
  message_preview: string;
  anti_spam_blocked: boolean;
  anti_spam_reason?: string;
  anti_spam_next_allowed_at?: string;
}

function FeeReminderModal({
  partnerName, onClose, onSuccess, t,
}: {
  partnerName: string;
  onClose: () => void;
  onSuccess: () => void;
  t: any;
}) {
  const [preview, setPreview] = useState<ReminderPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; recipient?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      setLoading(true);
      setError(null);
      const tk = typeof window !== 'undefined' ? localStorage.getItem('tl_token') : null;
      if (!tk) {
        setError('Belum login');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `${API_URL}/funding/admin/cashflow/fee-teraloka/reminder-preview/${encodeURIComponent(partnerName)}`,
          { headers: { Authorization: `Bearer ${tk}` } }
        );
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal load preview');
        if (!cancelled) setPreview(json.data);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPreview();
    return () => { cancelled = true; };
  }, [partnerName]);

  async function handleSend() {
    setSending(true);
    setError(null);
    const tk = typeof window !== 'undefined' ? localStorage.getItem('tl_token') : null;
    if (!tk) {
      setError('Belum login');
      setSending(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/funding/admin/cashflow/fee-teraloka/send-reminder`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${tk}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partner_name: partnerName }),
      });
      const json = await res.json();
      
      if (json.blocked) {
        setResult({ success: false, message: json.blocked_reason ?? 'Reminder blocked' });
      } else if (!res.ok || !json.success) {
        setResult({ success: false, message: json?.error?.message ?? 'Gagal kirim reminder' });
      } else {
        setResult({ 
          success: true, 
          message: 'Reminder berhasil dikirim',
          recipient: json.data.recipient_phone,
        });
        setTimeout(() => onSuccess(), 1800);
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message ?? String(err) });
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: t.cardBg, borderRadius: 8, maxWidth: 520, width: '100%',
        maxHeight: '90vh', overflow: 'auto',
        border: `1px solid ${t.sidebarBorder}`,
      }}>
        {/* Header */}
        <div style={{ 
          padding: '14px 18px', 
          borderBottom: `1px solid ${t.sidebarBorder}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={14} /> Kirim Reminder WhatsApp
            </div>
            <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
              {partnerName}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: t.textMuted, fontSize: 18, padding: 4,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 18 }}>
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: t.textDim }}>
              Memuat preview reminder...
            </div>
          )}

          {error && !loading && (
            <div style={{ 
              padding: 12, background: 'rgba(220,38,38,0.1)', 
              border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, 
              color: '#DC2626', fontSize: 12,
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AlertCircle size={14} /> {error}</span>
            </div>
          )}

          {preview && !loading && !result && (
            <>
              {/* Anti-spam warning */}
              {preview.anti_spam_blocked && (
                <div style={{
                  padding: 12, marginBottom: 12,
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  borderRadius: 6, fontSize: 11, color: '#D97706',
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div><strong>Anti-spam aktif:</strong> {preview.anti_spam_reason}</div>
                </div>
              )}

              {/* Recipient info */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Nomor Tujuan
                </div>
                {preview.recipient_phone ? (
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, fontFamily: 'monospace' }}>
                    {preview.recipient_phone}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#DC2626', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={12} /> Nomor penggalang tidak ditemukan
                  </div>
                )}
              </div>

              {/* Snapshot data */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                marginBottom: 12,
              }}>
                <div style={{ padding: 8, background: t.navHover, borderRadius: 4 }}>
                  <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 2 }}>Fee Pending</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#F59E0B' }}>
                    Rp {Math.round(preview.amount_due).toLocaleString('id-ID')}
                  </div>
                </div>
                <div style={{ padding: 8, background: t.navHover, borderRadius: 4 }}>
                  <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 2 }}>Donasi</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: t.textPrimary }}>
                    {preview.donation_count}
                  </div>
                </div>
                <div style={{ padding: 8, background: t.navHover, borderRadius: 4 }}>
                  <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 2 }}>Terlama</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textPrimary }}>
                    {preview.oldest_pending_at ? formatDate(preview.oldest_pending_at) : '—'}
                  </div>
                </div>
              </div>

              {/* Message preview */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Preview Pesan
                </div>
                <pre style={{
                  padding: 12, background: t.navHover, borderRadius: 6,
                  fontSize: 11, color: t.textPrimary,
                  whiteSpace: 'pre-wrap', wordWrap: 'break-word',
                  fontFamily: 'inherit', maxHeight: 250, overflow: 'auto',
                  margin: 0, lineHeight: 1.5,
                }}>
                  {preview.message_preview}
                </pre>
              </div>
            </>
          )}

          {/* Result feedback */}
          {result && (
            <div style={{
              padding: 14, borderRadius: 6,
              background: result.success ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.12)',
              border: `1px solid ${result.success ? 'rgba(16,185,129,0.35)' : 'rgba(220,38,38,0.35)'}`,
              color: result.success ? '#10B981' : '#DC2626',
              fontSize: 12, fontWeight: 600,
              textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {result.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              <span>{result.message}</span>
              {result.recipient && (
                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.85, fontFamily: 'monospace' }}>
                  → {result.recipient}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {preview && !loading && !result && (
          <div style={{ 
            padding: '12px 18px', borderTop: `1px solid ${t.sidebarBorder}`,
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            <button
              onClick={onClose}
              disabled={sending}
              style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 600,
                background: 'transparent', color: t.textDim,
                border: `1px solid ${t.sidebarBorder}`, borderRadius: 4,
                cursor: sending ? 'not-allowed' : 'pointer',
              }}
            >
              Batal
            </button>
            <button
              onClick={handleSend}
              disabled={sending || preview.anti_spam_blocked || !preview.recipient_phone}
              style={{
                padding: '8px 16px', fontSize: 12, fontWeight: 800,
                background: (sending || preview.anti_spam_blocked || !preview.recipient_phone) 
                  ? t.navHover 
                  : '#10B981',
                color: (sending || preview.anti_spam_blocked || !preview.recipient_phone) 
                  ? t.textMuted 
                  : '#fff',
                border: 'none', borderRadius: 4,
                cursor: (sending || preview.anti_spam_blocked || !preview.recipient_phone) 
                  ? 'not-allowed' 
                  : 'pointer',
              }}
            >
              {sending ? (
                <>Mengirim...</>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Send size={12} /> Kirim Sekarang
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Sesi 13 Mission 2D — Tip Penggalang Tabbed View
// ════════════════════════════════════════════════════════════════

function TipPenggalangTabbedView({
  detailRows, totalAmount, totalCount,
  partners, periods,
  activeTab, onChangeTab,
  showAllDonations, onToggleShowAll,
  color, t,
}: {
  detailRows: DetailRow[];
  totalAmount: number;
  totalCount: number;
  partners: TipPenggalangPartner[];
  periods: MonthlyPeriodRow[];
  activeTab: TipPenggalangTab;
  onChangeTab: (tab: TipPenggalangTab) => void;
  showAllDonations: boolean;
  onToggleShowAll: (v: boolean) => void;
  color: string;
  t: any;
}) {
  return (
    <div style={{ padding: 16 }}>
      {/* Tab navigation */}
      <div style={{ 
        display: 'flex', gap: 4, marginBottom: 16,
        borderBottom: `1px solid ${t.sidebarBorder}`,
        paddingBottom: 0,
      }}>
        <TabButton 
          label={<><Gift size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Per Donasi</>}
          count={detailRows.length}
          active={activeTab === 'donations'} 
          onClick={() => onChangeTab('donations')} 
          color={color} t={t} 
        />
        <TabButton 
          label={<><Trophy size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Per Penggalang</>}
          count={partners.length}
          active={activeTab === 'partners'} 
          onClick={() => onChangeTab('partners')} 
          color={color} t={t} 
        />
        <TabButton 
          label={<><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Per Periode</>}
          count={periods.filter(p => p.total > 0).length}
          active={activeTab === 'periods'} 
          onClick={() => onChangeTab('periods')} 
          color={color} t={t} 
        />
      </div>

      {activeTab === 'donations' && (
        <TipPerDonasi 
          rows={detailRows} 
          totalAmount={totalAmount} 
          totalCount={totalCount}
          showAll={showAllDonations}
          onToggleShowAll={onToggleShowAll}
          color={color} 
          t={t} 
        />
      )}
      {activeTab === 'partners' && (
        <TipPerPartner partners={partners} color={color} t={t} />
      )}
      {activeTab === 'periods' && (
        <TipPerPeriode periods={periods} color={color} t={t} />
      )}
    </div>
  );
}

function TipPerDonasi({ 
  rows, totalAmount, totalCount, showAll, onToggleShowAll, color, t 
}: {
  rows: DetailRow[]; totalAmount: number; totalCount: number;
  showAll: boolean; onToggleShowAll: (v: boolean) => void;
  color: string; t: any;
}) {
  // Filter sesuai toggle (Q2=C: default tip>0, toggle "tampil semua")
  const filteredRows = showAll ? rows : rows.filter(r => Number(r.amount) > 0);

  return (
    <div>
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, padding: '8px 0',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Gift size={14} /> Detail Tip Opt-in per Donasi
          </div>
          <div style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>
            {filteredRows.length} dari {rows.length} donasi {!showAll && '(filter: tip > 0)'}
            <span style={{ marginLeft: 6, opacity: 0.7, fontStyle: 'italic' }}>
              · Detail kode unik per donasi → lihat CSV drilldown campaign
            </span>
          </div>
        </div>
        <label style={{ 
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontSize: 10, color: t.textMuted,
        }}>
          <input 
            type="checkbox" 
            checked={showAll} 
            onChange={(e) => onToggleShowAll(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Tampilkan donasi tanpa tip
        </label>
      </div>
      
      <DetailTable rows={filteredRows} totalAmount={totalAmount} totalCount={totalCount} color={color} t={t} />
    </div>
  );
}

function TipPerPartner({ 
  partners, color, t 
}: { 
  partners: TipPenggalangPartner[]; color: string; t: any;
}) {
  const formatRupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const totalTipOptin = partners.reduce((s, p) => s + p.total_tip_optin, 0);
  const totalKodeUnik = partners.reduce((s, p) => s + p.total_kode_unik, 0);
  const totalEarnings = partners.reduce((s, p) => s + p.total_partner_earnings, 0);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Trophy size={14} /> Ranking Pendapatan Partner
        </div>
        <div style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>
          {partners.length} penggalang · Total: <strong style={{ color }}>{formatRupiah(totalEarnings)}</strong>
          <span style={{ marginLeft: 8, opacity: 0.7 }}>
            (Tip {formatRupiah(totalTipOptin)} + Kode Unik {formatRupiah(totalKodeUnik)})
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${t.sidebarBorder}`, borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead style={{ background: t.navHover + '60', position: 'sticky', top: 0 }}>
            <tr>
              <th style={{ ...th(t), width: 30, textAlign: 'center' }}>#</th>
              <th style={th(t)}>Penggalang</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Tip Opt-in</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Kode Unik</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Total</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Donasi w/Tip</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Rate</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Rata-rata</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Tertinggi</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: t.textDim }}>Belum ada pendapatan Partner</td></tr>
            )}
            {partners.map((p, i) => (
              <tr key={p.partner_name} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                <td style={{ ...td(t), textAlign: 'center', fontWeight: 700, color: i < 3 ? '#F59E0B' : t.textDim }}>
                  {i === 0 && <Crown size={16} style={{ color: '#FFD700' }} />}
                  {i === 1 && <Medal size={16} style={{ color: '#C0C0C0' }} />}
                  {i === 2 && <Award size={16} style={{ color: '#CD7F32' }} />}
                  {i > 2 && (i + 1)}
                </td>
                <td style={{ ...td(t), fontWeight: 700 }}>{p.partner_name}</td>
                <td style={{ ...td(t), textAlign: 'right', color: '#8B5CF6' }}>
                  {formatRupiah(p.total_tip_optin)}
                </td>
                <td style={{ ...td(t), textAlign: 'right', color: '#F59E0B' }}>
                  {formatRupiah(p.total_kode_unik)}
                </td>
                <td style={{ ...td(t), textAlign: 'right', fontWeight: 800, color }}>
                  {formatRupiah(p.total_partner_earnings)}
                </td>
                <td style={{ ...td(t), textAlign: 'center' }}>
                  {p.donation_count_with_tip} / {p.donation_count_total}
                </td>
                <td style={{ ...td(t), textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                    background: p.tip_rate_percent >= 50 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color: p.tip_rate_percent >= 50 ? '#10B981' : '#F59E0B',
                  }}>
                    {p.tip_rate_percent.toFixed(1)}%
                  </span>
                </td>
                <td style={{ ...td(t), textAlign: 'right', color: t.textDim }}>
                  {formatRupiah(p.avg_earnings_per_donation)}
                </td>
                <td style={{ ...td(t), textAlign: 'right', color: t.textDim }}>
                  {formatRupiah(p.largest_earnings)}
                </td>
                <td style={{ ...td(t), textAlign: 'center', fontSize: 10, color: t.textDim }}>
                  {p.latest_earnings_at ? new Date(p.latest_earnings_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TipPerPeriode({ 
  periods, color, t 
}: { 
  periods: MonthlyPeriodRow[]; color: string; t: any;
}) {
  const formatRupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const totalTipOptin = periods.reduce((s, p) => s + p.tip_optin, 0);
  const totalKodeUnik = periods.reduce((s, p) => s + p.kode_unik, 0);
  const totalEarnings = periods.reduce((s, p) => s + p.total, 0);
  const maxTotal = Math.max(...periods.map(p => p.total), 1);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} /> Pendapatan Partner per Periode — 12 Bulan Terakhir
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 10, color: t.textDim, marginTop: 4 }}>
          <span>Tip Opt-in: <strong style={{ color: '#8B5CF6' }}>{formatRupiah(totalTipOptin)}</strong></span>
          <span>Kode Unik: <strong style={{ color: '#F59E0B' }}>{formatRupiah(totalKodeUnik)}</strong></span>
          <span>Total: <strong style={{ color }}>{formatRupiah(totalEarnings)}</strong></span>
        </div>
      </div>

      {/* Stacked Bar Chart Recharts */}
      <div style={{ 
        background: t.navHover + '30', 
        border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 6, padding: 12, marginBottom: 16,
        height: 300,
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={periods} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.sidebarBorder} opacity={0.4} />
            <XAxis 
              dataKey="period_label" 
              tick={{ fontSize: 10, fill: t.textDim }}
              stroke={t.sidebarBorder}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: t.textDim }}
              stroke={t.sidebarBorder}
              tickFormatter={(v) => 'Rp ' + (v / 1000).toFixed(0) + 'K'}
            />
            <Tooltip 
              contentStyle={{ 
                background: t.cardBg, 
                border: `1px solid ${t.sidebarBorder}`,
                fontSize: 11, borderRadius: 4,
              }}
              formatter={(value: any, name: any): [string, string] => {
                const label = name === 'tip_optin' ? 'Tip Opt-in' : 'Kode Unik';
                return [formatRupiah(value), label];
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: 11, color: t.textDim }}
              formatter={(v: any) => v === 'tip_optin' ? 'Tip Opt-in' : 'Kode Unik'}
            />
            {/* Stacked bars */}
            <Bar dataKey="tip_optin" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="kode_unik" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table breakdown */}
      <div style={{ overflowX: 'auto', border: `1px solid ${t.sidebarBorder}`, borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: t.navHover + '60' }}>
            <tr>
              <th style={th(t)}>Periode</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Tip Opt-in</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Kode Unik</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Total</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Donasi</th>
              <th style={{ ...th(t), textAlign: 'right' }}>% dari Total</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => {
              const pct = totalEarnings > 0 ? (p.total / totalEarnings) * 100 : 0;
              const barWidth = maxTotal > 0 ? (p.total / maxTotal) * 100 : 0;
              return (
                <tr key={p.period} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                  <td style={{ ...td(t), fontWeight: 700 }}>{p.period_label}</td>
                  <td style={{ ...td(t), textAlign: 'right', color: p.tip_optin > 0 ? '#8B5CF6' : t.textDim }}>
                    {p.tip_optin > 0 ? formatRupiah(p.tip_optin) : '—'}
                  </td>
                  <td style={{ ...td(t), textAlign: 'right', color: p.kode_unik > 0 ? '#F59E0B' : t.textDim }}>
                    {p.kode_unik > 0 ? formatRupiah(p.kode_unik) : '—'}
                  </td>
                  <td style={{ ...td(t), textAlign: 'right', fontWeight: 800, color: p.total > 0 ? color : t.textDim }}>
                    {p.total > 0 ? formatRupiah(p.total) : '—'}
                  </td>
                  <td style={{ ...td(t), textAlign: 'center', color: t.textDim }}>
                    {p.count > 0 ? p.count : '—'}
                  </td>
                  <td style={{ ...td(t), textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <div style={{ 
                        width: 60, height: 8, background: t.sidebarBorder, borderRadius: 2,
                        overflow: 'hidden', flexShrink: 0,
                      }}>
                        <div style={{ 
                          width: `${barWidth}%`, height: '100%', background: color,
                          transition: 'width 200ms',
                        }} />
                      </div>
                      <span style={{ minWidth: 36, color: t.textDim, fontSize: 10 }}>{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Sesi 13 Mission 2E — Beneficiary Tabbed View (3-tab)
// ════════════════════════════════════════════════════════════════

function BeneficiaryTabbedView({
  penggalangs, totalUtang, totalDisbursed, totalSisa,
  partners, periods,
  activeTab, onChangeTab,
  expandedId, onToggleExpand,
  color, t,
}: {
  penggalangs: PenggalangSaldo[];
  totalUtang: number;
  totalDisbursed: number;
  totalSisa: number;
  partners: BeneficiaryPartner[];
  periods: BeneficiaryPeriodRow[];
  activeTab: BeneficiaryTab;
  onChangeTab: (tab: BeneficiaryTab) => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  color: string;
  t: any;
}) {
  return (
    <div style={{ padding: 16 }}>
      {/* Tab navigation */}
      <div style={{ 
        display: 'flex', gap: 4, marginBottom: 16,
        borderBottom: `1px solid ${t.sidebarBorder}`,
      }}>
        <TabButton 
          label={<><User size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Per Penggalang</>}
          count={penggalangs.length}
          active={activeTab === 'penggalangs'} 
          onClick={() => onChangeTab('penggalangs')} 
          color={color} t={t} 
        />
        <TabButton 
          label={<><Building2 size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Per Partner</>}
          count={partners.length}
          active={activeTab === 'partners'} 
          onClick={() => onChangeTab('partners')} 
          color={color} t={t} 
        />
        <TabButton 
          label={<><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Per Periode</>}
          count={periods.filter(p => p.utang_in > 0 || p.disbursed_out > 0).length}
          active={activeTab === 'periods'} 
          onClick={() => onChangeTab('periods')} 
          color={color} t={t} 
        />
      </div>

      {activeTab === 'penggalangs' && (
        <HakBeneficiary2Level 
          penggalangs={penggalangs}
          totalUtang={totalUtang}
          totalDisbursed={totalDisbursed}
          totalSisa={totalSisa}
          expandedId={expandedId}
          onToggleExpand={onToggleExpand}
          color={color} 
          t={t}
        />
      )}
      {activeTab === 'partners' && (
        <BeneficiaryPerPartner partners={partners} color={color} t={t} />
      )}
      {activeTab === 'periods' && (
        <BeneficiaryPerPeriode periods={periods} color={color} t={t} />
      )}
    </div>
  );
}

function BeneficiaryPerPartner({ 
  partners, color, t 
}: { 
  partners: BeneficiaryPartner[]; color: string; t: any;
}) {
  const formatRupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const totalSisa = partners.reduce((s, p) => s + p.sisa_belum_disalurkan, 0);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Building2 size={14} /> Hak Beneficiary per Partner
        </div>
        <div style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>
          {partners.length} partner · Total sisa: <strong style={{ color: totalSisa > 0 ? '#DC2626' : '#10B981' }}>{formatRupiah(totalSisa)}</strong>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${t.sidebarBorder}`, borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead style={{ background: t.navHover + '60' }}>
            <tr>
              <th style={th(t)}>Partner</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Campaign</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Total Utang</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Disbursed</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Sisa</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Rate</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Terlama</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: t.textDim }}>Tidak ada data</td></tr>
            )}
            {partners.map((p) => {
              const oldestDays = p.oldest_unsettled_at 
                ? Math.floor((Date.now() - new Date(p.oldest_unsettled_at).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const hasSisa = p.sisa_belum_disalurkan > 0;
              return (
                <tr key={p.partner_name} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                  <td style={{ ...td(t), fontWeight: 700 }}>{p.partner_name}</td>
                  <td style={{ ...td(t), textAlign: 'center' }}>{p.campaign_count}</td>
                  <td style={{ ...td(t), textAlign: 'right' }}>{formatRupiah(p.total_utang)}</td>
                  <td style={{ ...td(t), textAlign: 'right', color: '#10B981' }}>
                    {formatRupiah(p.total_disbursed)}
                  </td>
                  <td style={{ ...td(t), textAlign: 'right', fontWeight: 800, color: hasSisa ? '#DC2626' : '#10B981' }}>
                    {formatRupiah(p.sisa_belum_disalurkan)}
                  </td>
                  <td style={{ ...td(t), textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                      background: p.rate_disbursed_percent >= 80 ? 'rgba(16,185,129,0.15)' :
                                  p.rate_disbursed_percent >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(220,38,38,0.15)',
                      color: p.rate_disbursed_percent >= 80 ? '#10B981' :
                             p.rate_disbursed_percent >= 50 ? '#F59E0B' : '#DC2626',
                    }}>
                      {p.rate_disbursed_percent.toFixed(1)}%
                    </span>
                  </td>
                  <td style={{ ...td(t), textAlign: 'center', fontSize: 10, color: t.textDim }}>
                    {oldestDays === null ? '—' : `${oldestDays} hari`}
                  </td>
                  <td style={{ ...td(t), textAlign: 'center' }}>
                    {hasSisa ? (
                      <span style={{ 
                        padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                        background: 'rgba(220,38,38,0.15)', color: '#DC2626',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <AlertTriangle size={10} /> ADA SISA
                      </span>
                    ) : (
                      <span style={{ 
                        padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                        background: 'rgba(16,185,129,0.15)', color: '#10B981',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <CheckCircle2 size={10} /> LUNAS
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BeneficiaryPerPeriode({ 
  periods, color, t 
}: { 
  periods: BeneficiaryPeriodRow[]; color: string; t: any;
}) {
  const formatRupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const totalIn = periods.reduce((s, p) => s + p.utang_in, 0);
  const totalOut = periods.reduce((s, p) => s + p.disbursed_out, 0);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} /> Beneficiary per Periode — 12 Bulan Terakhir
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 10, color: t.textDim, marginTop: 4 }}>
          <span>Utang masuk: <strong style={{ color: '#3B82F6' }}>{formatRupiah(totalIn)}</strong></span>
          <span>Disalurkan: <strong style={{ color: '#10B981' }}>{formatRupiah(totalOut)}</strong></span>
          <span>Net: <strong style={{ color: totalIn - totalOut > 0 ? '#DC2626' : '#10B981' }}>{formatRupiah(totalIn - totalOut)}</strong></span>
        </div>
      </div>

      {/* Bar Chart Recharts — comparative IN vs OUT */}
      <div style={{ 
        background: t.navHover + '30', 
        border: `1px solid ${t.sidebarBorder}`,
        borderRadius: 6, padding: 12, marginBottom: 16,
        height: 300,
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={periods} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.sidebarBorder} opacity={0.4} />
            <XAxis 
              dataKey="period_label" 
              tick={{ fontSize: 10, fill: t.textDim }}
              stroke={t.sidebarBorder}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: t.textDim }}
              stroke={t.sidebarBorder}
              tickFormatter={(v) => 'Rp ' + (v / 1000).toFixed(0) + 'K'}
            />
            <Tooltip 
              contentStyle={{ 
                background: t.cardBg, 
                border: `1px solid ${t.sidebarBorder}`,
                fontSize: 11, borderRadius: 4,
              }}
              formatter={(value: any, name: any): [string, string] => {
                const label = name === 'utang_in' ? 'Utang Masuk' : 'Disalurkan';
                return [formatRupiah(value), label];
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: 11, color: t.textDim }}
              formatter={(v: any) => v === 'utang_in' ? 'Utang Masuk' : 'Disalurkan'}
            />
            <Bar dataKey="utang_in" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="disbursed_out" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', border: `1px solid ${t.sidebarBorder}`, borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: t.navHover + '60' }}>
            <tr>
              <th style={th(t)}>Periode</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Utang Masuk</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Disalurkan</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Net</th>
              <th style={{ ...th(t), textAlign: 'center' }}>Donasi/Disburse</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.period} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                <td style={{ ...td(t), fontWeight: 700 }}>{p.period_label}</td>
                <td style={{ ...td(t), textAlign: 'right', color: p.utang_in > 0 ? '#3B82F6' : t.textDim }}>
                  {p.utang_in > 0 ? formatRupiah(p.utang_in) : '—'}
                </td>
                <td style={{ ...td(t), textAlign: 'right', color: p.disbursed_out > 0 ? '#10B981' : t.textDim }}>
                  {p.disbursed_out > 0 ? formatRupiah(p.disbursed_out) : '—'}
                </td>
                <td style={{ ...td(t), textAlign: 'right', fontWeight: 700, color: p.net > 0 ? '#DC2626' : p.net < 0 ? '#10B981' : t.textDim }}>
                  {p.net !== 0 ? formatRupiah(p.net) : '—'}
                </td>
                <td style={{ ...td(t), textAlign: 'center', fontSize: 10, color: t.textDim }}>
                  {p.donation_count}/{p.disbursement_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ⭐ Dana Beneficiary — SMART Tabbed View (Transaksi | Per Partner | Per Periode)
// Mirror pola FeeTeralokaTabbedView. Reuse DetailTable + data beneficiary/by-*.
// ════════════════════════════════════════════════════════════════
function DanaBeneficiaryTabbedView({
  detailRows, totalAmount, totalCount, partners, periods,
  activeTab, onChangeTab, periodLabel, color, t,
}: {
  detailRows: DetailRow[];
  totalAmount: number;
  totalCount: number;
  partners: BeneficiaryPartner[];
  periods: BeneficiaryPeriodRow[];
  activeTab: 'transaksi' | 'partners' | 'periods';
  onChangeTab: (tab: 'transaksi' | 'partners' | 'periods') => void;
  periodLabel?: string;
  color: string;
  t: any;
}) {
  const fmt = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

  const totalUtang = partners.reduce((s, p) => s + (p.total_utang || 0), 0);
  const totalDisbursed = partners.reduce((s, p) => s + (p.total_disbursed || 0), 0);
  const totalSisa = partners.reduce((s, p) => s + (p.sisa_belum_disalurkan || 0), 0);
  const maxNet = Math.max(1, ...periods.map(p => Math.abs(p.utang_in || 0)));

  const TABS: { key: 'transaksi' | 'partners' | 'periods'; label: string }[] = [
    { key: 'transaksi', label: `Transaksi (${totalCount})` },
    { key: 'partners',  label: `Per Partner (${partners.length})` },
    { key: 'periods',   label: 'Per Periode' },
  ];

  return (
    <div>
      {/* Tab pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChangeTab(tab.key)}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', transition: 'all .15s',
                border: `1px solid ${active ? color : t.sidebarBorder}`,
                background: active ? color : 'transparent',
                color: active ? '#fff' : t.textMuted,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: Transaksi (ikut periode) */}
      {activeTab === 'transaksi' && (
        <div>
          {periodLabel && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12,
              padding: '5px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
              background: `${color}1A`, color, border: `1px solid ${color}40`,
            }}>
              <CalendarRange size={13} /> Periode: {periodLabel}
            </div>
          )}
          <DetailTable rows={detailRows} totalAmount={totalAmount} totalCount={totalCount} color={color} t={t} />
        </div>
      )}

      {/* TAB: Per Partner (all-time aggregate) */}
      {activeTab === 'partners' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Dana Masuk', val: totalUtang, c: color },
              { label: 'Sudah Disalurkan', val: totalDisbursed, c: t.success ?? '#10B981' },
              { label: 'Belum Disalurkan', val: totalSisa, c: '#F59E0B' },
            ].map((s, i) => (
              <div key={i} style={{ flex: '1 1 160px', background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: t.textDim, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 17, fontWeight: 800, color: s.c }}>{fmt(s.val)}</p>
              </div>
            ))}
          </div>
          {partners.length === 0 ? (
            <p style={{ fontSize: 13, color: t.textMuted, textAlign: 'center', padding: 24 }}>Belum ada data partner.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}`, color: t.textDim, textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>PARTNER</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>DANA MASUK</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>DISALURKAN</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>SISA</th>
                    <th style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${t.sidebarBorder}`, color: t.textPrimary }}>
                      <td style={{ padding: '9px 10px', fontWeight: 600 }}>{p.partner_name}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{fmt(p.total_utang)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: t.success ?? '#10B981' }}>{fmt(p.total_disbursed)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: p.sisa_belum_disalurkan > 0 ? '#F59E0B' : t.textMuted }}>{fmt(p.sisa_belum_disalurkan)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700 }}>{(p.rate_disbursed_percent ?? 0).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Per Periode (12 bulan) */}
      {activeTab === 'periods' && (
        <div>
          <p style={{ fontSize: 11.5, color: t.textDim, marginBottom: 12 }}>Dana masuk vs disalurkan, 12 bulan terakhir.</p>
          {periods.length === 0 ? (
            <p style={{ fontSize: 13, color: t.textMuted, textAlign: 'center', padding: 24 }}>Belum ada data periode.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {periods.map((p, i) => (
                <div key={i} style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>{p.period_label}</span>
                    <span style={{ fontSize: 11.5, color: t.textMuted }}>
                      Masuk <b style={{ color }}>{fmt(p.utang_in)}</b> · Salur <b style={{ color: t.success ?? '#10B981' }}>{fmt(p.disbursed_out)}</b>
                    </span>
                  </div>
                  <div style={{ height: 6, background: t.sidebarBorder, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (Math.abs(p.utang_in) / maxNet) * 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
