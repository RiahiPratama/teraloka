'use client';

import { useEffect, useState, useContext } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

// ════════════════════════════════════════════════════════════════
// CashflowDetailModal — Drill-down breakdown Aliran Uang
// ════════════════════════════════════════════════════════════════
//
// Sesi 12 Phase Final (25 Mei 2026)
//
// Categories: beneficiary | fee_teraloka | tip | kode_unik | sisa_partner
// Features: 
//   - Table detail dari Money Ledger
//   - CSV download
//   - Pagination
//   - Filter date range
// ════════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api/v1';

export type DetailCategory = 'beneficiary' | 'fee_teraloka' | 'tip' | 'kode_unik' | 'sisa_partner';

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

interface PartnerSaldo {
  partner_id: string;
  partner_name: string;
  kas_partner: number;
  utang_beneficiary: number;
  utang_penelaahan: number;
  utang_fee_badonasi: number;
  utang_refund: number;
  pendapatan_tip: number;
  pendapatan_kode_unik: number;
  sisa_di_rekening: number;
}

interface CampaignSisa {
  campaign_id: string;
  campaign_title: string;
  partner_name: string;
  utang_beneficiary: number;
  disbursed_total: number;
  sisa_belum_disalurkan: number;
}

interface Props {
  category: DetailCategory;
  onClose: () => void;
}

const CATEGORY_META: Record<DetailCategory, { title: string; color: string; emoji: string; description: string }> = {
  beneficiary:   { title: 'Dana Beneficiary',   color: '#10B981', emoji: '🎯', description: 'Alokasi dana untuk penerima manfaat (dari Utang Dana Beneficiary 2101)' },
  fee_teraloka:  { title: 'Fee TeraLoka',       color: '#BE185D', emoji: '🏦', description: 'Penerimaan fee platform (dari Penerimaan Fee Platform 4201)' },
  tip:           { title: 'Tip Penggalang',     color: '#8B5CF6', emoji: '🎁', description: 'Pendapatan Partner dari tip donor opt-in (4101)' },
  kode_unik:     { title: 'Kode Unik',          color: '#F59E0B', emoji: '🔢', description: 'Kode unik 3-digit cross-check verifikasi (4102)' },
  sisa_partner:  { title: 'Sisa di Partner',    color: '#F59E0B', emoji: '⏳', description: 'Saldo per Partner via Money Ledger (drill-down per campaign)' },
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

export default function CashflowDetailModal({ category, onClose }: Props) {
  const { t } = useContext(AdminThemeContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  const [partnerSaldos, setPartnerSaldos] = useState<PartnerSaldo[]>([]);
  const [campaignSisas, setCampaignSisas] = useState<CampaignSisa[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const meta = CATEGORY_META[category];

  useEffect(() => {
    fetchData();
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
      if (category === 'sisa_partner') {
        // Fetch per-partner saldo
        const res = await fetch(`${API_URL}/funding/admin/cashflow/sisa-partner-breakdown`, {
          headers: { Authorization: `Bearer ${tk}` },
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal load');
        setPartnerSaldos(json.data.partners ?? []);
      } else {
        // Fetch detail rows per category
        const res = await fetch(
          `${API_URL}/funding/admin/cashflow/breakdown-detail?category=${category}&limit=500`,
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

  async function fetchCampaignDrilldown(partnerId: string) {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    
    setSelectedPartnerId(partnerId);
    setLoading(true);
    
    try {
      const res = await fetch(
        `${API_URL}/funding/admin/cashflow/campaign-sisa-breakdown?partner_id=${partnerId}`,
        { headers: { Authorization: `Bearer ${tk}` } }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal load');
      setCampaignSisas(json.data ?? []);
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    let csv = '\uFEFF';
    let filename = '';
    
    if (category === 'sisa_partner' && selectedPartnerId === null) {
      filename = `sisa-partner-breakdown-${new Date().toISOString().slice(0, 10)}.csv`;
      csv += 'Partner,Kas Partner,Utang Beneficiary,Utang Penelaahan,Utang Fee BADONASI,Utang Refund,Pendapatan Tip,Pendapatan Kode Unik,Sisa di Rekening\n';
      partnerSaldos.forEach(p => {
        csv += [
          `"${p.partner_name}"`,
          p.kas_partner,
          p.utang_beneficiary,
          p.utang_penelaahan,
          p.utang_fee_badonasi,
          p.utang_refund,
          p.pendapatan_tip,
          p.pendapatan_kode_unik,
          p.sisa_di_rekening,
        ].join(',') + '\n';
      });
    } else if (category === 'sisa_partner' && selectedPartnerId !== null) {
      filename = `campaign-sisa-${selectedPartnerId.slice(0,8)}-${new Date().toISOString().slice(0, 10)}.csv`;
      csv += 'Kampanye,Partner,Utang Beneficiary,Sudah Disalurkan,Sisa Belum Disalurkan\n';
      campaignSisas.forEach(c => {
        csv += [
          `"${c.campaign_title}"`,
          `"${c.partner_name}"`,
          c.utang_beneficiary,
          c.disbursed_total,
          c.sisa_belum_disalurkan,
        ].join(',') + '\n';
      });
    } else {
      filename = `${category}-detail-${new Date().toISOString().slice(0, 10)}.csv`;
      csv += 'Tanggal,Entry Number,ID Donasi,Kode Unik,Donor,Kampanye,Partner,Nominal,Skenario\n';
      detailRows.forEach(r => {
        csv += [
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
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: t.mainBg,
          border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16,
          width: '100%', maxWidth: 1200,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${t.sidebarBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: `${meta.color}10`,
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {meta.emoji} {meta.title}
            </p>
            <p style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
              {meta.description}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={downloadCSV}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: meta.color, color: '#fff',
                fontSize: 12, fontWeight: 700,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Download size={14} /> Download CSV
            </button>
            <button
              onClick={onClose}
              style={{
                padding: 8, borderRadius: 8,
                background: t.navHover, color: t.textPrimary,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 }}>
              <Loader2 size={20} className="animate-spin" style={{ color: meta.color }} />
              <span style={{ color: t.textDim, fontSize: 13 }}>Loading data dari Money Ledger...</span>
            </div>
          )}

          {error && (
            <div style={{ padding: 16, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, color: '#DC2626', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && category !== 'sisa_partner' && (
            <DetailTable rows={detailRows} totalAmount={totalAmount} totalCount={totalCount} color={meta.color} t={t} />
          )}

          {!loading && !error && category === 'sisa_partner' && selectedPartnerId === null && (
            <PartnerSaldoTable 
              partners={partnerSaldos} 
              color={meta.color} 
              t={t} 
              onDrilldown={fetchCampaignDrilldown}
            />
          )}

          {!loading && !error && category === 'sisa_partner' && selectedPartnerId !== null && (
            <CampaignDrilldownTable 
              campaigns={campaignSisas} 
              partnerId={selectedPartnerId}
              color={meta.color} 
              t={t}
              onBack={() => { setSelectedPartnerId(null); setCampaignSisas([]); }}
            />
          )}
        </div>
      </div>
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
        padding: '8px 12px', background: `${color}10`, borderRadius: 8,
      }}>
        <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 600 }}>
          {totalCount} transaksi
        </span>
        <span style={{ fontSize: 14, color, fontWeight: 800 }}>
          Total: {formatRupiah(totalAmount)}
        </span>
      </div>
      
      <div style={{ overflow: 'auto', maxHeight: '60vh', border: `1px solid ${t.sidebarBorder}`, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ background: t.navHover, position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
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
                <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: t.textDim }}>
                  Belum ada data
                </td>
              </tr>
            )}
            {rows.map(r => (
              <tr key={r.entry_id} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                <td style={td(t)}>{formatDate(r.transaction_date)}</td>
                <td style={{ ...td(t), fontFamily: 'monospace', fontSize: 11 }}>
                  <div>{r.display_id ?? '-'}</div>
                  <div style={{ color: t.textDim, fontSize: 10 }}>#{r.donation_code}</div>
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

function PartnerSaldoTable({ partners, color, t, onDrilldown }: { 
  partners: PartnerSaldo[]; color: string; t: any; onDrilldown: (id: string) => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 11, color: t.textDim, marginBottom: 10 }}>
        💡 Klik baris partner untuk drill-down per kampanye
      </p>
      <div style={{ overflow: 'auto', maxHeight: '60vh', border: `1px solid ${t.sidebarBorder}`, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ background: t.navHover, position: 'sticky', top: 0 }}>
            <tr>
              <th style={th(t)}>Partner</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Kas</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Utang Beneficiary</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Utang Fee</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Tip</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Kode Unik</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Sisa Total</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: t.textDim }}>Belum ada data</td></tr>
            )}
            {partners.map(p => (
              <tr 
                key={p.partner_id} 
                onClick={() => onDrilldown(p.partner_id)}
                style={{ borderTop: `1px solid ${t.sidebarBorder}`, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = t.navHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ ...td(t), fontWeight: 700 }}>{p.partner_name}</td>
                <td style={{ ...td(t), textAlign: 'right' }}>{formatRupiah(p.kas_partner)}</td>
                <td style={{ ...td(t), textAlign: 'right', color: '#10B981' }}>{formatRupiah(p.utang_beneficiary)}</td>
                <td style={{ ...td(t), textAlign: 'right', color: '#BE185D' }}>{formatRupiah(p.utang_fee_badonasi)}</td>
                <td style={{ ...td(t), textAlign: 'right', color: '#8B5CF6' }}>{formatRupiah(p.pendapatan_tip)}</td>
                <td style={{ ...td(t), textAlign: 'right', color: '#F59E0B' }}>{formatRupiah(p.pendapatan_kode_unik)}</td>
                <td style={{ ...td(t), textAlign: 'right', fontWeight: 800, color }}>{formatRupiah(p.sisa_di_rekening)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CampaignDrilldownTable({ campaigns, partnerId, color, t, onBack }: { 
  campaigns: CampaignSisa[]; partnerId: string; color: string; t: any; onBack: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        style={{
          marginBottom: 12,
          padding: '6px 12px', borderRadius: 6,
          background: t.navHover, color: t.textPrimary,
          fontSize: 12, fontWeight: 600,
          border: 'none', cursor: 'pointer',
        }}
      >
        ← Kembali ke daftar Partner
      </button>
      <div style={{ overflow: 'auto', maxHeight: '60vh', border: `1px solid ${t.sidebarBorder}`, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ background: t.navHover, position: 'sticky', top: 0 }}>
            <tr>
              <th style={th(t)}>Kampanye</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Utang Beneficiary</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Sudah Disalurkan</th>
              <th style={{ ...th(t), textAlign: 'right' }}>Sisa Belum Disalurkan</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: t.textDim }}>Belum ada data</td></tr>
            )}
            {campaigns.map(c => (
              <tr key={c.campaign_id} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                <td style={{ ...td(t), maxWidth: 400 }}>
                  <div style={{ fontWeight: 700 }}>{c.campaign_title}</div>
                  <div style={{ fontSize: 10, color: t.textDim }}>{c.partner_name}</div>
                </td>
                <td style={{ ...td(t), textAlign: 'right', color: '#10B981' }}>{formatRupiah(c.utang_beneficiary)}</td>
                <td style={{ ...td(t), textAlign: 'right' }}>{formatRupiah(c.disbursed_total)}</td>
                <td style={{ ...td(t), textAlign: 'right', fontWeight: 800, color }}>{formatRupiah(c.sisa_belum_disalurkan)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function th(t: any): React.CSSProperties {
  return {
    padding: '10px 12px', textAlign: 'left',
    fontSize: 10, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
  };
}

function td(t: any): React.CSSProperties {
  return {
    padding: '10px 12px',
    color: t.textPrimary,
    fontSize: 12,
  };
}
