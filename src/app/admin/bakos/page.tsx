'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Command Center — Dashboard Overview (SUPER SMART)
// PATH: src/app/admin/bakos/page.tsx
// Gaya: AdminThemeContext (t tokens, dark) + FokusHariIni + stat cards clickable.
// Konsumsi: GET /bakos/admin/dashboard (funnel klaim + inventory — REAL)
//           GET /bakos/admin/claims?status=pending (antrian klaim — REAL)
// 🛡️ Filosofi BALAJU: revenue/occupancy null → "Coming soon", NOL angka palsu.
// 🛡️ POLICY A: approve klaim = transfer owner SAJA, kontak tetap terkunci.
// ════════════════════════════════════════════════════════════════
import { useEffect, useState, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import {
  Home, RefreshCw, Clock, CheckCircle2, XCircle, Building2, KeyRound,
  Inbox, ArrowRight, Brain, Rocket, Sparkles, CreditCard, BedDouble,
  Activity, Coffee,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  return `${Math.floor(hrs / 24)}h lalu`;
}
function normalizePhone(p: string | null | undefined) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  return d.startsWith('0') ? '62' + d.slice(1) : d;
}

interface Dashboard {
  claims: { pending: number; claimed: number; rejected: number; total: number };
  inventory: { total_kos: number; claimable: number; managed: number; unmanaged: number };
  revenue: null;
  occupancy: null;
  generated_at: string;
}
interface ClaimRow {
  claim_id: string; listing_id: string; listing_title: string | null;
  listing_display_id: string | null; claimant_id: string;
  claimant_name: string | null; claimant_phone: string | null;
  status: string; evidence: Record<string, any> | null; submitted_at: string | null;
}

const EMPTY: Dashboard = {
  claims: { pending: 0, claimed: 0, rejected: 0, total: 0 },
  inventory: { total_kos: 0, claimable: 0, managed: 0, unmanaged: 0 },
  revenue: null, occupancy: null, generated_at: '',
};

export default function BakosCommandCenter() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();
  const [data, setData] = useState<Dashboard>(EMPTY);
  const [pendingClaims, setPendingClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<ClaimRow | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [rev, setRev] = useState<{ total: number; count: number } | null>(null);
  const [mrr, setMrr] = useState<{ mrr: number; active_count: number } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3200); };

  const fetchAll = useCallback(async () => {
    const tk = token || localStorage.getItem('tl_token');
    if (!tk) return;
    const headers = { Authorization: `Bearer ${tk}` };
    setRefreshing(true);
    try {
      const [dash, claims, pay, mrrRes] = await Promise.all([
        fetch(`${API_URL}/bakos/admin/dashboard`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/bakos/admin/claims?status=pending&limit=8`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/bakos/admin/subscription/payments?limit=1`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/bakos/admin/mrr`, { headers }).then(r => r.json()).catch(() => null),
      ]);
      if (dash?.success) setData(dash.data);
      if (claims?.success) setPendingClaims(claims.data.data ?? claims.data ?? []);
      if (pay?.success) setRev({ total: pay.data.total ?? 0, count: pay.data.count ?? 0 });
      if (mrrRes?.success) setMrr({ mrr: mrrRes.data.mrr ?? 0, active_count: mrrRes.data.active_count ?? 0 });
      setLastUpdated(new Date());
    } catch (e) { console.error('[BAKOS dashboard]', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { const i = setInterval(fetchAll, 60_000); return () => clearInterval(i); }, [fetchAll]);

  const c = data.claims, inv = data.inventory;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1300,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>{toast.ok ? '✓' : '✗'} {toast.msg}</div>
      )}

      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#D97706', letterSpacing: '0.1em', marginBottom: 4 }}>BAKOS</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #F59E0B, #B45309)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245,158,11,0.25)',
            }}><Home size={22} strokeWidth={2.2} /></div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary }}>Command Center</h1>
          </div>
          <button onClick={fetchAll} disabled={refreshing} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
            border: `1px solid ${t.sidebarBorder}`, background: t.mainBg, color: t.textPrimary,
            fontSize: 12, fontWeight: 600, cursor: refreshing ? 'wait' : 'pointer', opacity: refreshing ? 0.6 : 1,
          }}>
            <RefreshCw size={14} strokeWidth={2.5} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 13, color: t.textDim, flexWrap: 'wrap' }}>
          <span><strong style={{ color: t.textPrimary }}>{inv.total_kos}</strong> kos</span>
          <span style={{ color: t.textMuted }}>·</span>
          <span><strong style={{ color: inv.managed > 0 ? '#10B981' : t.textPrimary }}>{inv.managed}</strong> dikelola</span>
          <span style={{ color: t.textMuted }}>·</span>
          <span><strong style={{ color: c.pending > 0 ? '#F59E0B' : t.textPrimary }}>{c.pending}</strong> klaim menunggu</span>
          {lastUpdated && (
            <span style={{ color: t.textMuted, marginLeft: 'auto', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Activity size={10} className="pulse-dot" />
              Updated {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* FOKUS HARI INI */}
      <FokusHariIni t={t} claims={c} claimable={inv.claimable} />

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Stat t={t} icon={<Clock size={18} strokeWidth={2.2} />} label="Klaim Menunggu" value={c.pending}
          accent="#F59E0B" highlight={c.pending > 0} action="Tinjau →" />
        <Stat t={t} icon={<CheckCircle2 size={18} strokeWidth={2.2} />} label="Klaim Disetujui" value={c.claimed} accent="#10B981" />
        <Stat t={t} icon={<KeyRound size={18} strokeWidth={2.2} />} label="Belum Dikelola" value={inv.claimable}
          accent="#6366F1" sublabel="pool seed" />
        <Stat t={t} icon={<Building2 size={18} strokeWidth={2.2} />} label="Total Kos" value={inv.total_kos} accent="#0891B2" />
        <Stat t={t} icon={<CheckCircle2 size={18} strokeWidth={2.2} />} label="Kos Dikelola" value={inv.managed}
          accent="#10B981" sublabel="kontak aktif" />
      </div>

      {/* ANTRIAN KLAIM */}
      <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Inbox size={16} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Antrian Klaim</h2>
              <p style={{ fontSize: 11, color: t.textDim }}>Pengajuan kepemilikan menunggu verifikasi</p>
            </div>
          </div>
          <span style={{ fontSize: 11, color: t.textDim }}>{c.pending} menunggu</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: t.textMuted, fontSize: 13 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', border: '3px solid #F59E0B', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            Memuat…
          </div>
        ) : pendingClaims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', color: '#10B981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <CheckCircle2 size={28} strokeWidth={2.2} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#10B981', marginBottom: 2 }}>Semua klaim clear!</p>
            <p style={{ fontSize: 12, color: t.textDim, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Tidak ada antrian. Selamat ngopi <Coffee size={14} strokeWidth={2.2} color="#92400E" />
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingClaims.map((cl) => (
              <div key={cl.claim_id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12,
                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cl.listing_title || '—'} <span style={{ color: t.textMuted, fontWeight: 500 }}>· {cl.listing_display_id || ''}</span>
                  </p>
                  <p style={{ fontSize: 11, color: t.textDim }}>
                    {cl.claimant_name || '—'} · {cl.claimant_phone || '—'} · {timeAgo(cl.submitted_at)}
                  </p>
                </div>
                <button onClick={() => setSelected(cl)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8,
                  background: '#F59E0B', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                }}>Tinjau <ArrowRight size={12} strokeWidth={2.5} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* COMING SOON (jujur, nol angka palsu) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <RevenuePanel t={t} rev={rev} mrr={mrr} />
        <ComingSoon t={t} icon={<BedDouble size={18} />} title="Okupansi & PMS"
          note="Menunggu PMS lease/rooms aktif (B5). Tingkat hunian per kos belum tersedia." />
      </div>

      {selected && (token || true) && (
        <ClaimReviewModal claim={selected}
          token={token || (typeof window !== 'undefined' ? localStorage.getItem('tl_token') || '' : '')}
          onClose={() => setSelected(null)}
          onReviewed={(m) => { showToast(m); setSelected(null); fetchAll(); }}
          onError={(m) => showToast(m, false)} />
      )}

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        :global(.spin) { animation: spin 0.8s linear infinite; }
        @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        :global(.pulse-dot) { animation: pulse-dot 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ── FokusHariIni ──
function FokusHariIni({ t, claims, claimable }: { t: any; claims: Dashboard['claims']; claimable: number }) {
  const items: Array<{ rank: number; title: string; impact: string; why: string; cta: string; accent: string; est: string }> = [];
  if (claims.pending > 0) items.push({
    rank: items.length + 1, title: `Tinjau ${claims.pending} klaim kepemilikan menunggu`,
    impact: 'Owner menunggu', why: 'Verifikasi cepat = owner cepat subscribe = revenue', cta: 'Tinjau',
    accent: '#F59E0B', est: `~${claims.pending * 3} menit`,
  });
  if (claimable > 0) items.push({
    rank: items.length + 1, title: `${claimable} kos seed belum diklaim`,
    impact: 'Pool cold-start', why: 'Dorong pemilik klaim → konversi ke langganan', cta: 'Lihat',
    accent: '#6366F1', est: 'pasif',
  });

  if (items.length === 0) {
    return (
      <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={24} strokeWidth={2.2} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#10B981', marginBottom: 2 }}>🎯 Tidak ada fokus prioritas</p>
            <p style={{ fontSize: 12, color: t.textDim }}>Semua actionable clear. Waktunya kerja strategis.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #B45309)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
          <Brain size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: t.textPrimary, marginBottom: 2 }}>FOKUS HARI INI</h2>
          <p style={{ fontSize: 11, color: t.textDim }}>Top {items.length} priority · impact × urgency × ease</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, background: t.mainBg, border: `1px solid ${item.accent}30` }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.accent}18`, color: item.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{item.rank}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>{item.title}</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: t.textDim, flexWrap: 'wrap' }}>
                <span style={{ color: item.accent, fontWeight: 600 }}>{item.impact}</span><span>{item.why}</span>
              </div>
            </div>
            <span style={{ fontSize: 10, color: t.textMuted }}>{item.est}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ──
function Stat({ t, icon, label, value, sublabel, accent, highlight, action }: {
  t: any; icon: React.ReactNode; label: string; value: number; sublabel?: string; accent: string; highlight?: boolean; action?: string;
}) {
  return (
    <div style={{ background: t.mainBg, border: `1px solid ${highlight ? accent + '55' : t.sidebarBorder}`, borderRadius: 12, padding: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        {action && value > 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, color: accent, padding: '2px 6px', borderRadius: 4, background: `${accent}10`, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{action}</span>
        )}
      </div>
      <p style={{ fontSize: 11, color: t.textDim, fontWeight: 500, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary }}>{value}</p>
      {sublabel && <p style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 2 }}>{sublabel}</p>}
    </div>
  );
}

// ── Rupiah full (bukan singkat — konteks finansial) ──
function rpFull(n: number): string { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); }

// ── Revenue Langganan (REAL — dari ledger 4303 + MRR proyeksi) ──
function RevenuePanel({ t, rev, mrr }: { t: any; rev: { total: number; count: number } | null; mrr: { mrr: number; active_count: number } | null }) {
  return (
    <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(27,107,74,0.15)', color: '#1B6B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CreditCard size={18} /></div>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>Revenue Langganan (4303)</h3>
          <p style={{ fontSize: 11, color: t.textDim }}>Uang REAL tercatat di pembukuan</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/admin/bakos/langganan" style={{ flex: 1, textDecoration: 'none' }}>
          <div style={{ background: t.navHover, borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ fontSize: 11, color: t.textDim, marginBottom: 4 }}>Tercatat (ledger)</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#1B6B4A' }}>{rev ? rpFull(rev.total) : '…'}</p>
            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{rev ? `${rev.count} pembayaran` : 'memuat…'}</p>
          </div>
        </Link>
        <Link href="/admin/bakos/langganan" style={{ flex: 1, textDecoration: 'none' }}>
          <div style={{ background: t.navHover, borderRadius: 12, padding: '12px 14px' }}>
            <p style={{ fontSize: 11, color: t.textDim, marginBottom: 4 }}>MRR (proyeksi)</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#0891B2' }}>{mrr ? rpFull(mrr.mrr) : '…'}</p>
            <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{mrr ? `${mrr.active_count} pelanggan aktif` : 'memuat…'}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ── Coming soon (jujur) ──
function ComingSoon({ t, icon, title, note }: { t: any; icon: React.ReactNode; title: string; note: string }) {
  return (
    <div style={{ background: t.mainBg, border: `1px dashed ${t.sidebarBorder}`, borderRadius: 16, padding: 18, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: t.navHover, color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{title}</h3>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: t.textMuted, background: t.navHover, padding: '2px 8px', borderRadius: 999 }}>
            <Sparkles size={11} /> Coming soon
          </span>
        </div>
        <p style={{ fontSize: 12, color: t.textDim, marginTop: 4 }}>{note}</p>
      </div>
    </div>
  );
}

// ── Review modal (portal + inline style — match B3-c) ──
function ClaimReviewModal({ claim, token, onClose, onReviewed, onError }: {
  claim: ClaimRow; token: string; onClose: () => void; onReviewed: (m: string) => void; onError: (m: string) => void;
}) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { const p = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = p; }; }, []);

  const waPhone = normalizePhone(claim.claimant_phone);
  const review = async (decision: 'approve' | 'reject') => {
    setLoading(decision);
    try {
      const res = await fetch(`${API_URL}/bakos/admin/claims/${claim.claim_id}/review`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) onReviewed(decision === 'approve' ? `Klaim disetujui. Kepemilikan dipindahkan ke ${claim.claimant_name || 'pengaju'}.` : 'Klaim ditolak.');
      else { const m = typeof data.error === 'string' ? data.error : data.error?.message; onError(m ?? 'Gagal memproses klaim.'); }
    } catch { onError('Gagal terhubung ke server.'); }
    finally { setLoading(null); }
  };
  if (!mounted) return null;

  const ov: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1400, fontFamily: "'Outfit', system-ui" };
  const card: React.CSSProperties = { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' };
  const rowS: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid #F1F5F9', fontSize: 13 };
  const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 18px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', lineHeight: 1.2 };

  return createPortal(
    <div style={ov} onClick={() => { if (!loading) onClose(); }} role="dialog" aria-modal="true">
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>Tinjau Klaim</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>{claim.listing_title}</p>
          </div>
          <button onClick={() => { if (!loading) onClose(); }} aria-label="Tutup" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ padding: '14px 22px' }}>
          <div style={rowS}><span style={{ color: '#64748B' }}>Kode kos</span><strong>{claim.listing_display_id || '—'}</strong></div>
          <div style={rowS}><span style={{ color: '#64748B' }}>Pengaju</span><strong>{claim.claimant_name || '—'}</strong></div>
          <div style={rowS}>
            <span style={{ color: '#64748B' }}>No. HP</span>
            <span>{claim.claimant_phone || '—'}
              {waPhone && <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: '#059669', fontWeight: 700, textDecoration: 'none' }}>WhatsApp →</a>}
            </span>
          </div>
          {claim.evidence && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginTop: 12 }}>
              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#475569' }}>Bukti / catatan</p>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{claim.evidence.note || claim.evidence.catatan || '(tidak ada catatan)'}</p>
            </div>
          )}
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '9px 12px', marginTop: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>🛡️ Setuju = kepemilikan pindah ke pengaju. <strong>Kontak tetap terkunci</strong> sampai pemilik berlangganan.</p>
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Catatan (opsional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cth: KTP & sertifikat cocok. / Alasan tolak..." disabled={!!loading}
              style={{ width: '100%', minHeight: 64, padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, color: '#0F172A', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          {confirm === null ? (
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setConfirm('reject')} disabled={!!loading} style={{ ...btn, flex: 1, background: '#fff', color: '#DC2626', border: '1.5px solid #DC2626' }}>Tolak</button>
              <button onClick={() => setConfirm('approve')} disabled={!!loading} style={{ ...btn, flex: 1, background: 'linear-gradient(135deg, #1B6B4A 0%, #0891B2 100%)', color: '#fff' }}>Setujui</button>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div style={{ background: confirm === 'approve' ? '#FFFBEB' : '#FEF2F2', border: `1px solid ${confirm === 'approve' ? '#FDE68A' : '#FECACA'}`, borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: confirm === 'approve' ? '#92400E' : '#991B1B' }}>
                  {confirm === 'approve'
                    ? `Yakin? Kepemilikan "${claim.listing_title}" pindah PERMANEN ke ${claim.claimant_name || 'pengaju'}.`
                    : 'Yakin tolak klaim ini?'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirm(null)} disabled={!!loading} style={{ ...btn, flex: 1, background: '#F1F5F9', color: '#475569' }}>Batal</button>
                <button onClick={() => review(confirm)} disabled={!!loading} style={{ ...btn, flex: 1, color: '#fff', opacity: loading ? 0.6 : 1, background: confirm === 'approve' ? 'linear-gradient(135deg, #1B6B4A 0%, #0891B2 100%)' : '#DC2626' }}>
                  {loading ? 'Memproses…' : confirm === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>, document.body);
}
