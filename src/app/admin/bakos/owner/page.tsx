'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Command Center — Tab Owner (LIFECYCLE + TAGIH via WAHA)
// PATH: src/app/admin/bakos/owner/page.tsx
// 🛡️ Tombol Tagih = server kirim WA via WAHA (POST). BUKAN buka WhatsApp manual.
// 🛡️ Grace 0 — disiplin. State dari BE (computeLifecycle). Admin kelola langganan, bukan kos.
// PENANDA: L9-FE-OWNER-TAGIH-WAHA
// GET /bakos/admin/owners · POST /bakos/admin/owners/:id/tagih
// ════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { Users, UserCheck, CreditCard, Search, Send, AlertTriangle, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const OWNERS_URL = `${API_URL}/bakos/admin/owners`;

type LifecycleState = 'free' | 'aktif' | 'mau_habis' | 'kadaluwarsa';
interface OwnerRow {
  owner_id: string; owner_name: string | null; owner_phone: string | null;
  tier: string; subscription_status: string | null; paid_until: string | null;
  lifecycle_state: LifecycleState; days_left: number | null;
  kos_count: number; kos_active_count: number; total_paid: number;
}
interface OwnersData { owners: OwnerRow[]; count: number; perlu_ditagih: number; }

function rp(n: number | null | undefined) { return n ? 'Rp ' + n.toLocaleString('id-ID') : 'Rp 0'; }
function rpShort(n: number) {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'jt';
  if (n >= 1_000) return 'Rp ' + Math.round(n / 1_000) + 'rb';
  return 'Rp ' + n;
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}
const TIER_COLOR: Record<string, string> = { free: '#9CA3AF', basic: '#0891B2', pro: '#6366F1', bisnis: '#1B6B4A' };
const STATE_META: Record<LifecycleState, { label: string; color: string }> = {
  aktif:       { label: 'Aktif', color: '#10B981' },
  mau_habis:   { label: 'Mau habis', color: '#F59E0B' },
  kadaluwarsa: { label: 'Kadaluwarsa', color: '#EF4444' },
  free:        { label: 'Belum langganan', color: '#9CA3AF' },
};
function daysText(state: LifecycleState, d: number | null): string {
  if (state === 'free' || d === null) return '—';
  if (state === 'kadaluwarsa') return d < 0 ? `lewat ${Math.abs(d)} hari` : 'habis hari ini';
  return `${d} hari lagi`;
}
function needTagih(s: LifecycleState) { return s === 'mau_habis' || s === 'kadaluwarsa'; }

export default function BakosOwnerTab() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();
  const [data, setData] = useState<OwnersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [onlyTagih, setOnlyTagih] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };
  const tk = () => token || (typeof window !== 'undefined' ? localStorage.getItem('tl_token') || '' : '');

  const fetchOwners = useCallback(async () => {
    if (!tk()) return;
    setLoading(true);
    try {
      const res = await fetch(OWNERS_URL, { headers: { Authorization: `Bearer ${tk()}` } });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch { /* gagal — tampil kosong */ }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchOwners(); }, [fetchOwners]);

  // ── Tagih: server kirim WA via WAHA (nol buka WhatsApp) ──
  const tagihNow = async (o: OwnerRow) => {
    setSending(o.owner_id);
    try {
      const res = await fetch(`${API_URL}/bakos/admin/owners/${o.owner_id}/tagih`, {
        method: 'POST', headers: { Authorization: `Bearer ${tk()}` },
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Pengingat terkirim ke ${o.owner_name || 'owner'} via WhatsApp`);
        setSent(s => new Set(s).add(o.owner_id));
      } else {
        const m = typeof json.error === 'string' ? json.error : json.error?.message;
        showToast(m || 'Gagal kirim WA', false);
      }
    } catch { showToast('Gagal terhubung ke server', false); }
    finally { setSending(null); }
  };

  const owners = data?.owners ?? [];
  const subscribed = owners.filter(o => o.tier && o.tier !== 'free').length;
  const totalPaid = owners.reduce((s, o) => s + o.total_paid, 0);
  const perluDitagih = data?.perlu_ditagih ?? 0;

  const filtered = owners.filter(o => {
    if (onlyTagih && !needTagih(o.lifecycle_state)) return false;
    if (!q) return true;
    const hay = `${o.owner_name ?? ''} ${o.owner_phone ?? ''} ${o.owner_id}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1500, background: toast.ok ? '#10B981' : '#EF4444', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary }}>Owner Kos</h1>
        <p style={{ fontSize: 13, color: t.textDim, marginTop: 3 }}>Pelanggan SaaS BAKOS — status langganan, kapan berakhir, tagih perpanjang (WA otomatis via sistem). Admin kelola langganan, bukan kos-nya.</p>
      </div>

      {/* Ringkasan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <Stat t={t} icon={<Users size={18} />} accent="#6366F1" label="Total Owner" value={String(data?.count ?? 0)} sub="punya kos di-claim" />
        <Stat t={t} icon={<UserCheck size={18} />} accent="#1B6B4A" label="Berlangganan" value={String(subscribed)} sub="tier berbayar" />
        <Stat t={t} icon={<AlertTriangle size={18} />} accent={perluDitagih > 0 ? '#F59E0B' : '#9CA3AF'} label="Perlu Ditagih" value={String(perluDitagih)}
          sub={perluDitagih > 0 ? 'mau habis / kadaluwarsa' : 'semua lancar'} />
        <Stat t={t} icon={<CreditCard size={18} />} accent="#10B981" label="Total Bayar (ter-owner)" value={rpShort(totalPaid)} sub="dari ledger" />
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setOnlyTagih(v => !v)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: onlyTagih ? '#F59E0B' : t.navHover, color: onlyTagih ? '#fff' : t.textDim, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={13} /> Perlu ditagih {perluDitagih > 0 ? `(${perluDitagih})` : ''}
        </button>
        <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 180, maxWidth: 360 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / nomor owner..."
            style={{ flex: 1, padding: '6px 12px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, fontSize: 12, color: t.textPrimary, background: t.mainBg, outline: 'none' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 10px', color: t.textMuted }}><Search size={14} /></span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textMuted, fontSize: 14 }}>Memuat owner…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{onlyTagih ? '✅' : '👤'}</div>
          <p style={{ fontWeight: 600, color: t.textPrimary }}>{onlyTagih ? 'Tidak ada yang perlu ditagih' : owners.length === 0 ? 'Belum ada owner' : 'Tidak ada yang cocok'}</p>
          <p style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{owners.length === 0 ? 'Owner muncul setelah kos di-claim.' : 'Coba filter / kata kunci lain.'}</p>
        </div>
      ) : (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, overflow: 'hidden', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 150px 120px 130px 120px', minWidth: 880, padding: '12px 16px', background: t.navHover, borderBottom: `1px solid ${t.sidebarBorder}`, fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div>Owner</div><div>Tier</div><div>Status / Berakhir</div><div>Kos (aktif)</div><div style={{ textAlign: 'right' }}>Total Bayar</div><div style={{ textAlign: 'right' }}>Aksi</div>
          </div>
          {filtered.map((o) => {
            const col = TIER_COLOR[o.tier] ?? '#9CA3AF';
            const sm = STATE_META[o.lifecycle_state];
            const isSending = sending === o.owner_id;
            const wasSent = sent.has(o.owner_id);
            const urgent = needTagih(o.lifecycle_state);
            const btnColor = o.lifecycle_state === 'kadaluwarsa' ? '#EF4444' : o.lifecycle_state === 'mau_habis' ? '#F59E0B' : '#0891B2';
            return (
              <div key={o.owner_id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 150px 120px 130px 120px', minWidth: 880, padding: '12px 16px', borderBottom: `1px solid ${t.sidebarBorder}`, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.owner_name || <span style={{ color: t.textMuted, fontFamily: 'ui-monospace, monospace' }}>{o.owner_id.slice(0, 8)}…</span>}
                  </p>
                  <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{o.owner_phone || '—'}</p>
                </div>
                <div><span style={{ fontSize: 10, fontWeight: 700, color: col, background: col + '1A', padding: '3px 8px', borderRadius: 5, textTransform: 'uppercase' }}>{o.tier}</span></div>
                <div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: sm.color }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: sm.color }} />{sm.label}
                  </span>
                  <p style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>{o.lifecycle_state !== 'free' ? `${fmtDate(o.paid_until)} · ${daysText(o.lifecycle_state, o.days_left)}` : '—'}</p>
                </div>
                <div style={{ fontSize: 13, color: t.textPrimary }}>{o.kos_count} <span style={{ color: t.textMuted, fontSize: 11 }}>({o.kos_active_count})</span></div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: o.total_paid > 0 ? '#1B6B4A' : t.textMuted }}>{rp(o.total_paid)}</div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => tagihNow(o)} disabled={isSending || !o.owner_phone}
                    title={!o.owner_phone ? 'Owner tidak punya nomor' : 'Kirim WA via sistem'}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      cursor: isSending || !o.owner_phone ? 'not-allowed' : 'pointer', opacity: !o.owner_phone ? 0.4 : 1,
                      border: urgent ? 'none' : `1px solid ${t.sidebarBorder}`,
                      background: wasSent ? '#10B981' : urgent ? btnColor : 'transparent',
                      color: wasSent ? '#fff' : urgent ? '#fff' : btnColor,
                    }}>
                    {isSending ? 'Mengirim…' : wasSent ? <><Check size={12} /> Terkirim</> : <><Send size={12} /> {urgent ? 'Tagih' : 'Ingatkan'}</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ t, icon, accent, label, value, sub }: { t: any; icon: React.ReactNode; accent: string; label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 12, padding: 16 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: accent + '18', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{icon}</div>
      <p style={{ fontSize: 11, color: t.textDim, fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: accent, fontWeight: 600, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}
