'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Command Center — Tab Owner (dimensi OWNER + LIFECYCLE)
// PATH: src/app/admin/bakos/owner/page.tsx
// CRM pelanggan SaaS: status langganan + kapan berakhir + tagih (WA state-aware).
// 🛡️ Grace 0 — disiplin. State dari BE (computeLifecycle) = sumber kebenaran.
// 🛡️ total_paid = uang REAL ledger 4303. Admin TIDAK kelola kos/penyewa owner.
// PENANDA: L9-FE-OWNER-LIFECYCLE
// GET /bakos/admin/owners
// ════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { Users, UserCheck, Building2, CreditCard, Search, Phone, AlertTriangle } from 'lucide-react';

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
function waPhone(p: string | null): string | null {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '');
  return d.startsWith('0') ? '62' + d.slice(1) : d;
}
const TIER_COLOR: Record<string, string> = { free: '#9CA3AF', basic: '#0891B2', pro: '#6366F1', bisnis: '#1B6B4A' };

// ── Lifecycle presentation (state dari BE, FE cuma nampilin) ──
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

// WA tagih — nada sesuai state (mau_habis ramah, kadaluwarsa tegas)
function tagihUrl(o: OwnerRow): string | null {
  const wa = waPhone(o.owner_phone);
  if (!wa) return null;
  const nama = o.owner_name || 'Bapak/Ibu';
  const tgl = fmtDate(o.paid_until);
  const msg = o.lifecycle_state === 'kadaluwarsa'
    ? `Halo ${nama},\nLangganan BAKOS kos Anda sudah *berakhir* (${tgl}). Segera perpanjang agar kontak kos kembali aktif & tampil untuk calon penyewa. Balas pesan ini untuk info pembayaran. Terima kasih 🙏`
    : `Halo ${nama},\nLangganan BAKOS kos Anda akan *berakhir ${tgl}* (${o.days_left} hari lagi). Mohon perpanjang agar kontak kos tetap terbuka untuk calon penyewa. Balas pesan ini untuk info pembayaran. Terima kasih 🙏`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
}

export default function BakosOwnerTab() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();
  const [data, setData] = useState<OwnersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [onlyTagih, setOnlyTagih] = useState(false);

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

  const owners = data?.owners ?? [];
  const subscribed = owners.filter(o => o.tier && o.tier !== 'free').length;
  const activeKos = owners.reduce((s, o) => s + o.kos_active_count, 0);
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
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary }}>Owner Kos</h1>
        <p style={{ fontSize: 13, color: t.textDim, marginTop: 3 }}>Pelanggan SaaS BAKOS — status langganan, kapan berakhir, tagih perpanjang. Admin kelola hubungan langganan, bukan kos-nya.</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 150px 120px 130px 110px', minWidth: 860, padding: '12px 16px', background: t.navHover, borderBottom: `1px solid ${t.sidebarBorder}`, fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div>Owner</div><div>Tier</div><div>Status / Berakhir</div><div>Kos (aktif)</div><div style={{ textAlign: 'right' }}>Total Bayar</div><div style={{ textAlign: 'right' }}>Aksi</div>
          </div>
          {filtered.map((o) => {
            const col = TIER_COLOR[o.tier] ?? '#9CA3AF';
            const sm = STATE_META[o.lifecycle_state];
            const wa = waPhone(o.owner_phone);
            const turl = tagihUrl(o);
            return (
              <div key={o.owner_id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 150px 120px 130px 110px', minWidth: 860, padding: '12px 16px', borderBottom: `1px solid ${t.sidebarBorder}`, alignItems: 'center' }}>
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
                  {needTagih(o.lifecycle_state) && turl ? (
                    <a href={turl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: o.lifecycle_state === 'kadaluwarsa' ? '#EF4444' : '#F59E0B', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                      <Phone size={12} /> Tagih
                    </a>
                  ) : wa ? (
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, background: 'transparent', color: '#10B981', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                      <Phone size={12} /> WA
                    </a>
                  ) : <span style={{ fontSize: 11, color: t.textMuted }}>—</span>}
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
