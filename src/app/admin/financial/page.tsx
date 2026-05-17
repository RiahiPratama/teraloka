'use client';

/**
 * TeraLoka — Admin Financial Dashboard
 * Sub-Phase 8-E Sesi 2 (18 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * Architecture: 3-Tab structure (Overview + PT + Yayasan)
 *   - Overview: Combined view + comparison chart (LIVE Sesi 2)
 *   - PT TeraLoka: Sub-sources Ads/Bakos/BAPASIAR (Placeholder, LIVE Sesi 3)
 *   - Yayasan TeraLoka: Sub-sources Donasi Fee/Grant/CSR (Placeholder, LIVE Sesi 3)
 *
 * Data Layer:
 *   - GET /money/revenue/by-entity?period=30d  → dual-entity aggregate
 *   - GET /money/revenue/timeseries?period=7d  → chart data (Math.random KILLED)
 *   - GET /money/admin/events?limit=10         → recent activity feed
 *   - POST /admin/ads/revenue (LEGACY KEEP)    → manual entry for Mitra/Komisi
 *
 * Pattern Compliance:
 *   - Pattern AAY: Dual-entity derive di backend, frontend consume aggregate
 *   - Pattern AAZ: Honest empty state, NO fake data
 *   - Pattern T:   Kill mock data (Math.random + hardcoded FUNNEL_DATA)
 *   - Pattern AAP: DEFER refactor inline styles → Tailwind v4 (Sub-Phase 8-F)
 *
 * Backend Dependencies:
 *   - Money Domain Phase 1 LIVE (commit c94a287)
 *   - 2 NEW endpoints from Sub-Phase 8-E Sesi 1 (by-entity + timeseries)
 * ────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const formatRp   = (n: number) => `Rp ${(n || 0).toLocaleString('id-ID')}`;
const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const formatTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

type Tab = 'overview' | 'pt' | 'yayasan';

// ─── Type definitions (mirror backend types.ts) ────────────────

interface RevenueByEntityData {
  period:         { from: string; to: string };
  combined_total: number;
  pt_digital:     { total: number; sources: { ads: number; bakos: number; commission: number } };
  yayasan:        { total: number; sources: { badonasi_fee: number; grant: number; csr: number } };
  meta:           { event_count: number; by_event_type: Record<string, number> };
}

interface TimeseriesPoint {
  date:         string; // YYYY-MM-DD
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
  metadata:         Record<string, unknown>;
  recorded_at:      string;
}

// ─── Event type display helper ─────────────────────────────────

const EVENT_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  'donation.verified':     { icon: '✅', label: 'Donasi Terverifikasi', color: '#059669' },
  'donation.rejected':     { icon: '❌', label: 'Donasi Ditolak',       color: '#7F1D1D' },
  'donation.fee_remitted': { icon: '💰', label: 'Fee Disetor (Yayasan)', color: '#E8963A' },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  ads:        { label: 'Ads (Iklan)',       icon: '📢', color: '#1B6B4A' },
  mitra:      { label: 'Bakos (Klasified)', icon: '🏠', color: '#0891B2' },
  commission: { label: 'Komisi BAPASIAR',   icon: '🚢', color: '#7C3AED' },
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AdminFinancialPage() {
  const { token } = useAuth();
  const { t }     = useAdminTheme();

  // Tab state
  const [tab, setTab] = useState<Tab>('overview');

  // Data layer (Money Domain)
  const [byEntity,   setByEntity]   = useState<RevenueByEntityData | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [events,     setEvents]     = useState<FinancialEvent[]>([]);
  const [loading,    setLoading]    = useState(true);

  // Manual entry form (KEEP legacy)
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ type: 'ads', amount: '', description: '' });
  const [toast,    setToast]    = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const h = { Authorization: `Bearer ${token}` };

  // ─── Data fetching ────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    Promise.all([
      fetch(`${API}/money/revenue/by-entity?period=30d`, { headers: h }).then(r => r.json()),
      fetch(`${API}/money/revenue/timeseries?period=7d`,  { headers: h }).then(r => r.json()),
      fetch(`${API}/money/admin/events?limit=10`,         { headers: h }).then(r => r.json()),
    ])
      .then(([be, ts, ev]) => {
        if (be?.success) setByEntity(be.data);
        if (ts?.success) setTimeseries(ts.data?.data ?? []);
        if (ev?.success) setEvents(ev.data ?? []);
      })
      .catch(err => console.error('[financial fetch fail]', err))
      .finally(() => setLoading(false));
  }, [token]);

  // ─── Manual entry handler (LEGACY KEEP) ───────────────────────

  const handleAddRevenue = async () => {
    if (!form.amount || !form.description) {
      showToast('Lengkapi semua field', 'err');
      return;
    }
    try {
      const res  = await fetch(`${API}/admin/ads/revenue`, {
        method:  'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast('✅ Revenue tercatat (akan muncul di tab PT TeraLoka)');
      setShowForm(false);
      setForm({ type: 'ads', amount: '', description: '' });
    } catch (err: any) {
      showToast(err.message || 'Gagal simpan', 'err');
    }
  };

  // ─── Derived data ─────────────────────────────────────────────

  const combinedTotal = byEntity?.combined_total       ?? 0;
  const ptTotal       = byEntity?.pt_digital?.total    ?? 0;
  const yayasanTotal  = byEntity?.yayasan?.total       ?? 0;
  const eventCount    = byEntity?.meta?.event_count    ?? 0;

  const chartData = timeseries.map(p => ({
    date:    new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    total:   p.total,
    pt:      p.pt_digital,
    yayasan: p.yayasan,
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
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>💰 Financial Dashboard</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: t.textMuted }}>
            Ringkasan keuangan TeraLoka — terpisah per legal entity (PT vs Yayasan)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 18px', background: '#1B6B4A', border: 'none',
            borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
          }}
        >
          + Catat Revenue
        </button>
      </div>

      {/* Tab Navigator */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        borderBottom: `1px solid ${t.cardBorder}`,
      }}>
        {[
          { key: 'overview' as Tab, label: '📊 Overview',           live: true  },
          { key: 'pt'       as Tab, label: '🏢 PT TeraLoka',         live: false },
          { key: 'yayasan'  as Tab, label: '🤝 Yayasan TeraLoka',    live: false },
        ].map(({ key, label, live }) => (
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
            {label}
            {!live && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px',
                borderRadius: 4, background: 'rgba(251,191,36,0.15)',
                color: '#FCD34D', textTransform: 'uppercase',
              }}>
                Sesi 3
              </span>
            )}
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
              combinedTotal={combinedTotal}
              ptTotal={ptTotal}
              yayasanTotal={yayasanTotal}
              eventCount={eventCount}
              chartData={chartData}
              events={events}
            />
          )}

          {tab === 'pt' && (
            <PlaceholderTab
              t={t}
              icon="🏢"
              title="PT TeraLoka Digital Maluku"
              subtitle="Commercial revenue: Ads, Bakos (Klasified), Komisi BAPASIAR"
              quickTotal={ptTotal}
              sources={[
                { icon: '📢', label: 'Ads (Iklan)',       value: byEntity?.pt_digital?.sources?.ads        ?? 0, color: '#1B6B4A' },
                { icon: '🏠', label: 'Bakos (Klasified)', value: byEntity?.pt_digital?.sources?.bakos      ?? 0, color: '#0891B2' },
                { icon: '🚢', label: 'Komisi BAPASIAR',   value: byEntity?.pt_digital?.sources?.commission ?? 0, color: '#7C3AED' },
              ]}
              note="Sumber pendapatan komersial untuk PT TeraLoka Digital Maluku. Phase 1 semua Rp 0 — Ads emit Money Domain Phase 2."
            />
          )}

          {tab === 'yayasan' && (
            <PlaceholderTab
              t={t}
              icon="🤝"
              title="Yayasan TeraLoka Berdaya"
              subtitle="Social impact revenue: Badonasi fee, Grant, CSR Program"
              quickTotal={yayasanTotal}
              isYayasan={true}
              sources={[
                { icon: '❤️', label: 'Badonasi Fee (Setor)', value: byEntity?.yayasan?.sources?.badonasi_fee ?? 0, color: '#E8963A' },
                { icon: '🎓', label: 'Grant',                 value: byEntity?.yayasan?.sources?.grant        ?? 0, color: '#7C3AED', disabled: true },
                { icon: '🤲', label: 'CSR Program',           value: byEntity?.yayasan?.sources?.csr          ?? 0, color: '#0891B2', disabled: true },
              ]}
              note="Fee operasional Badonasi → Yayasan TeraLoka Berdaya. BUKAN revenue PT TeraLoka Digital Maluku (pemisahan legal entity)."
            />
          )}
        </>
      )}

      {/* Manual Entry Form (Sidebar, Global) */}
      {showForm && (
        <ManualEntryForm
          t={t}
          form={form}
          setForm={setForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleAddRevenue}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW (LIVE Sesi 2)
// ═══════════════════════════════════════════════════════════════

function OverviewTab({
  t, combinedTotal, ptTotal, yayasanTotal, eventCount, chartData, events,
}: any) {
  const isEmpty = combinedTotal === 0 && eventCount === 0;

  return (
    <>
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
            💰 Combined Revenue (30 Hari)
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
              🏢 PT TeraLoka
            </p>
            <span style={{ fontSize: 16 }}>📊</span>
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
              🤝 Yayasan TeraLoka
            </p>
            <span style={{ fontSize: 16 }}>📊</span>
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#E8963A' }}>
            {formatRp(yayasanTotal)}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: t.textDim }}>
            {combinedTotal > 0 ? `${Math.round((yayasanTotal / combinedTotal) * 100)}% dari combined` : 'Social impact'}
          </p>
        </div>
      </div>

      {/* Comparison Chart (PT vs Yayasan) */}
      <div style={{
        background: t.card, border: `1px solid ${t.cardBorder}`,
        borderRadius: 14, padding: '18px 22px', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>📈 Tren Pendapatan</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
              Perbandingan PT vs Yayasan · 7 hari terakhir
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

      {/* Gateway Threshold Alert (KEEP existing logic) */}
      <div style={{
        marginBottom: 20, padding: '12px 16px', borderRadius: 10,
        background: combinedTotal >= 10000000 ? 'rgba(27,107,74,0.15)' : 'rgba(251,191,36,0.08)',
        border: `1px solid ${combinedTotal >= 10000000 ? 'rgba(27,107,74,0.3)' : 'rgba(251,191,36,0.2)'}`,
      }}>
        {combinedTotal >= 10000000 ? (
          <p style={{ margin: 0, fontSize: 13, color: t.codeText, fontWeight: 600 }}>
            🎉 Revenue 30 hari sudah &gt; Rp 10jt — saatnya aktifkan payment gateway!
          </p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#FCD34D', fontWeight: 600 }}>
              📊 Progress ke milestone Rp 10jt: {formatRp(combinedTotal)} / Rp 10.000.000 ({Math.round((combinedTotal / 10000000) * 100)}%)
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

      {/* Live Activity Feed (Money Domain Events) */}
      <div style={{
        background: t.card, border: `1px solid ${t.cardBorder}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${t.cardBorder}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>🔴 Live Activity Feed</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: t.textMuted }}>
              Transaksi terbaru dari Money Domain (real-time event log)
            </p>
          </div>
          <span style={{ fontSize: 12, color: t.textMuted }}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        </div>

        {events.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>
            Belum ada transaksi. Activity feed akan otomatis terisi saat ada donasi terverifikasi.
          </div>
        ) : events.map((ev: FinancialEvent, i: number) => {
          const cfg = EVENT_TYPE_CONFIG[ev.event_type] || {
            icon: '💰', label: ev.event_type, color: '#9CA3AF',
          };
          const isLast = i === events.length - 1;
          return (
            <div
              key={ev.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 18px',
                borderBottom: !isLast ? `1px solid ${t.cardBorder}` : 'none',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${cfg.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                {cfg.icon}
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
                ) : (
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.textDim }}>
                    —
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2 & 3 — PLACEHOLDER (Sesi 3)
// ═══════════════════════════════════════════════════════════════

function PlaceholderTab({
  t, icon, title, subtitle, quickTotal, sources, note, isYayasan = false,
}: any) {
  return (
    <>
      {/* Yayasan Disclaimer Banner */}
      {isYayasan && (
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(90deg, rgba(232,150,58,0.08), rgba(232,150,58,0.02))',
          border: `1px solid rgba(232,150,58,0.25)`,
          borderRadius: 12, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>⚖️</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#E8963A' }}>
              Pemisahan Legal Entity
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>
            Fee operasional Badonasi disetor ke <strong>Yayasan TeraLoka Berdaya</strong>,
            BUKAN PT TeraLoka Digital Maluku. Yayasan dan PT punya NPWP, rekening, dan laporan terpisah.
          </p>
        </div>
      )}

      {/* Tab Header */}
      <div style={{
        background: t.card, border: `1px solid ${t.cardBorder}`,
        borderRadius: 14, padding: '20px 22px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h2>
        </div>
        <p style={{ margin: '0 0 14px 0', fontSize: 12, color: t.textMuted }}>
          {subtitle}
        </p>
        <div style={{
          padding: '10px 14px', background: t.deepBg, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>
            Total Revenue (30 hari)
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: isYayasan ? '#E8963A' : '#1B6B4A' }}>
            {formatRp(quickTotal)}
          </span>
        </div>
      </div>

      {/* Sub-source Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12, marginBottom: 16,
      }}>
        {sources.map((s: any, i: number) => (
          <div
            key={i}
            style={{
              background: t.card,
              border: `1px solid ${t.cardBorder}`,
              borderRadius: 12, padding: '14px 16px',
              opacity: s.disabled ? 0.55 : 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              {s.disabled && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 6px',
                  borderRadius: 4, background: 'rgba(251,191,36,0.15)',
                  color: '#FCD34D', textTransform: 'uppercase',
                }}>
                  Coming Phase 2
                </span>
              )}
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: t.textMuted, fontWeight: 600 }}>
              {s.label}
            </p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: s.color }}>
              {formatRp(s.value)}
            </p>
            {s.disabled && (
              <p style={{ margin: '4px 0 0', fontSize: 10, color: t.textDim, fontStyle: 'italic' }}>
                Manual entry — Mission #6
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Sesi 3 Note */}
      <div style={{
        padding: '20px 22px', textAlign: 'center',
        background: t.card, border: `1px dashed ${t.cardBorder}`,
        borderRadius: 14,
      }}>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>
          📋 Halaman lengkap akan dibangun di Sesi 3
        </p>
        <p style={{ margin: 0, fontSize: 11, color: t.textMuted, maxWidth: 480, marginInline: 'auto', lineHeight: 1.5 }}>
          {note}
        </p>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MANUAL ENTRY FORM (Sidebar Sticky)
// ═══════════════════════════════════════════════════════════════

function ManualEntryForm({ t, form, setForm, onClose, onSubmit }: any) {
  return (
    <div style={{
      position: 'fixed', top: 80, right: 24, width: 340,
      background: t.card, border: `1px solid ${t.cardBorder}`,
      borderRadius: 14, padding: 18, zIndex: 100,
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
          + Catat Revenue Manual
        </p>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: t.textMuted,
            cursor: 'pointer', fontSize: 18,
          }}
        >×</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Sumber Revenue (PT TeraLoka)
        </label>
        <select
          value={form.type}
          onChange={e => setForm((p: any) => ({ ...p, type: e.target.value }))}
          style={{
            width: '100%', padding: '8px 12px',
            background: t.inputBg, border: `1px solid ${t.inputBorder}`,
            borderRadius: 8, color: t.textPrimary, fontSize: 13,
            outline: 'none', boxSizing: 'border-box' as const,
          }}
        >
          {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Nominal (Rp) *
        </label>
        <input
          type="number"
          value={form.amount}
          onChange={e => setForm((p: any) => ({ ...p, amount: e.target.value }))}
          placeholder="150000"
          style={{
            width: '100%', padding: '8px 12px',
            background: t.inputBg, border: `1px solid ${t.inputBorder}`,
            borderRadius: 8, color: t.textPrimary, fontSize: 13,
            outline: 'none', boxSizing: 'border-box' as const,
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Deskripsi *
        </label>
        <input
          value={form.description}
          onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))}
          placeholder='Iklan "Toko Rempah" paket Starter'
          style={{
            width: '100%', padding: '8px 12px',
            background: t.inputBg, border: `1px solid ${t.inputBorder}`,
            borderRadius: 8, color: t.textPrimary, fontSize: 13,
            outline: 'none', boxSizing: 'border-box' as const,
          }}
        />
      </div>

      <div style={{
        background: t.deepBg, borderRadius: 8,
        padding: '10px 12px', marginBottom: 16,
      }}>
        <p style={{ margin: 0, fontSize: 11, color: t.textMuted, lineHeight: 1.5 }}>
          💡 Manual entry untuk Mitra/Komisi (sources yang belum auto-emit ke Money Domain).
          Donasi BADONASI auto-tracked, tidak perlu manual.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onSubmit}
          style={{
            flex: 1, padding: 9, background: '#1B6B4A', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
          }}
        >
          Simpan
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '9px 16px', background: 'transparent',
            border: `1px solid ${t.inputBorder}`,
            borderRadius: 8, cursor: 'pointer', fontSize: 13, color: t.textMuted,
          }}
        >
          Batal
        </button>
      </div>
    </div>
  );
}
