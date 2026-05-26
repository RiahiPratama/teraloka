'use client';

import { useEffect, useState, useContext } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

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
  campaign_title: string;
  partner_name: string;
  created_at: string;
}

interface Props {
  category: DetailCategory;
  onClose: () => void;
}

const CATEGORY_META: Record<DetailCategory, { title: string; color: string; emoji: string; description: string; backendCategory: string }> = {
  beneficiary:      { title: 'Dana Beneficiary',          color: '#0891B2', emoji: '🎯', description: 'Alokasi dana untuk penerima manfaat (dari 2101 Utang Dana Beneficiary)', backendCategory: 'beneficiary' },
  fee_teraloka:     { title: 'Fee TeraLoka',              color: '#BE185D', emoji: '🏦', description: 'Penerimaan fee platform (dari 4201 Penerimaan Fee Platform)', backendCategory: 'fee_teraloka' },
  tip:              { title: 'Tip Penggalang',            color: '#8B5CF6', emoji: '🎁', description: 'Pendapatan Partner dari tip donor opt-in (4101)', backendCategory: 'tip' },
  kode_unik:        { title: 'Kode Unik',                 color: '#F59E0B', emoji: '🔢', description: 'Kode unik 3-digit cross-check verifikasi (4102)', backendCategory: 'kode_unik' },
  hak_beneficiary:  { title: 'Hak Beneficiary di Partner', color: '#F59E0B', emoji: '⌛', description: 'Utang Dana Beneficiary belum settled per Penggalang & Campaign (Money Ledger 2101 - disbursements)', backendCategory: '' },
  under_audit:      { title: 'Hak Beneficiary Proses Audit', color: '#8B5CF6', emoji: '🔍', description: 'Donasi under_audit · belum jadi journal entry, menunggu resolusi mismatch', backendCategory: '' },
};

function formatRupiah(n: number): string {
  if (!n && n !== 0) return 'Rp 0';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CashflowDetailPanel({ category, onClose }: Props) {
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

  const meta = CATEGORY_META[category];

  useEffect(() => {
    setExpandedPenggalangId(null);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    
    const tk = typeof window !== 'undefined' ? localStorage.getItem('tl_token') : null;
    if (!tk) {
      setError('Belum login');
      setLoading(false);
      return;
    }

    try {
      if (category === 'hak_beneficiary') {
        // ⭐ Fetch 2-level structure: penggalangs → campaigns
        const res = await fetch(`${API_URL}/funding/admin/cashflow/sisa-partner-breakdown`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal load');
        setPenggalangs(json.data.penggalangs ?? []);
        setTotalUtang(json.data.total_utang_beneficiary ?? 0);
        setTotalDisbursed(json.data.total_disbursed ?? 0);
        setTotalSisa(json.data.total_sisa ?? 0);
      } else if (category === 'under_audit') {
        // ⭐ Fetch donations status=under_audit
        const res = await fetch(`${API_URL}/funding/admin/donations?status=under_audit&limit=200`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal load');
        setUnderAuditDonations(json.data ?? []);
      } else {
        // Fetch detail rows per simple category
        const res = await fetch(
          `${API_URL}/funding/admin/cashflow/breakdown-detail?category=${meta.backendCategory}&limit=500`,
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
            {meta.emoji} {meta.title}
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
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && category !== 'hak_beneficiary' && category !== 'under_audit' && (
        <DetailTable rows={detailRows} totalAmount={totalAmount} totalCount={totalCount} color={meta.color} t={t} />
      )}

      {!loading && !error && category === 'hak_beneficiary' && (
        <HakBeneficiary2Level 
          penggalangs={penggalangs}
          totalUtang={totalUtang}
          totalDisbursed={totalDisbursed}
          totalSisa={totalSisa}
          expandedId={expandedPenggalangId}
          onToggleExpand={(id) => setExpandedPenggalangId(prev => prev === id ? null : id)}
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
  const totalBeneficiary = donations.reduce((sum, d) => sum + d.amount, 0);
  const totalTransfer = donations.reduce((sum, d) => sum + d.total_transfer, 0);
  
  return (
    <div>
      {/* Summary */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: 8, marginBottom: 14,
      }}>
        <SummaryStat label="Donasi Tertahan" value={`${donations.length} donasi`} color={color} t={t} />
        <SummaryStat label="Hak Beneficiary" value={formatRupiah(totalBeneficiary)} color={color} t={t} highlight />
        <SummaryStat label="Total Transfer Donor" value={formatRupiah(totalTransfer)} color="#6366F1" t={t} />
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
