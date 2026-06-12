'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Command Center — Tab Owner (dimensi OWNER)
// PATH: src/app/admin/bakos/owner/page.tsx
// Daftar owner kos: nama + kontak WA + tier langganan + jumlah kos + total bayar (ledger).
// 🛡️ total_paid = uang REAL dari ledger 4303 (bukan MRR proyeksi).
// 🛡️ Owner format-lama (owner_id=listing_id) tak ke-resolve → tampil UUID. Dummy, aman.
// PENANDA: L9-FE-OWNER-TAB
// GET /bakos/admin/owners
// ════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { Users, UserCheck, Building2, CreditCard, Search, Phone } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const OWNERS_URL = `${API_URL}/bakos/admin/owners`;

interface OwnerRow {
  owner_id: string; owner_name: string | null; owner_phone: string | null;
  tier: string; subscription_status: string | null; paid_until: string | null;
  kos_count: number; kos_active_count: number; total_paid: number;
}
interface OwnersData { owners: OwnerRow[]; count: number; }

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

export default function BakosOwnerTab() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();
  const [data, setData] = useState<OwnersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

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

  const filtered = owners.filter(o => {
    if (!q) return true;
    const hay = `${o.owner_name ?? ''} ${o.owner_phone ?? ''} ${o.owner_id}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary }}>Owner Kos</h1>
        <p style={{ fontSize: 13, color: t.textDim, marginTop: 3 }}>Siapa owner-nya, kontak, tier langganan, jumlah kos, total bayar (dari pembukuan 4303).</p>
      </div>

      {/* Ringkasan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <Stat t={t} icon={<Users size={18} />} accent="#6366F1" label="Total Owner" value={String(data?.count ?? 0)} sub="punya kos di-claim" />
        <Stat t={t} icon={<UserCheck size={18} />} accent="#1B6B4A" label="Berlangganan" value={String(subscribed)} sub="tier berbayar" />
        <Stat t={t} icon={<Building2 size={18} />} accent="#0891B2" label="Kos Aktif Dikelola" value={String(activeKos)} sub="kontak terbuka" />
        <Stat t={t} icon={<CreditCard size={18} />} accent="#10B981" label="Total Bayar (ter-owner)" value={rpShort(totalPaid)} sub="dari ledger" />
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, maxWidth: 360 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / nomor owner..."
          style={{ flex: 1, padding: '6px 12px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, fontSize: 12, color: t.textPrimary, background: t.mainBg, outline: 'none' }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 10px', color: t.textMuted }}><Search size={14} /></span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textMuted, fontSize: 14 }}>Memuat owner…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
          <p style={{ fontWeight: 600, color: t.textPrimary }}>{owners.length === 0 ? 'Belum ada owner' : 'Tidak ada yang cocok'}</p>
          <p style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{owners.length === 0 ? 'Owner muncul setelah kos di-claim.' : 'Coba kata kunci lain.'}</p>
        </div>
      ) : (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, overflow: 'hidden', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 130px 130px 120px', minWidth: 760, padding: '12px 16px', background: t.navHover, borderBottom: `1px solid ${t.sidebarBorder}`, fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <div>Owner</div><div>Tier</div><div>Kos (aktif)</div><div style={{ textAlign: 'right' }}>Total Bayar</div><div>Berlaku s/d</div>
          </div>
          {filtered.map((o) => {
            const wa = waPhone(o.owner_phone);
            const col = TIER_COLOR[o.tier] ?? '#9CA3AF';
            return (
              <div key={o.owner_id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 130px 130px 120px', minWidth: 760, padding: '12px 16px', borderBottom: `1px solid ${t.sidebarBorder}`, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.owner_name || <span style={{ color: t.textMuted, fontFamily: 'ui-monospace, monospace' }}>{o.owner_id.slice(0, 8)}…</span>}
                  </p>
                  <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {o.owner_phone || '—'}
                    {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" style={{ color: '#10B981', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}><Phone size={10} /> WA</a>}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: col, background: col + '1A', padding: '3px 8px', borderRadius: 5, textTransform: 'uppercase' }}>{o.tier}</span>
                </div>
                <div style={{ fontSize: 13, color: t.textPrimary }}>{o.kos_count} <span style={{ color: t.textMuted, fontSize: 11 }}>({o.kos_active_count} aktif)</span></div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: o.total_paid > 0 ? '#1B6B4A' : t.textMuted }}>{rp(o.total_paid)}</div>
                <div style={{ fontSize: 12, color: t.textDim }}>{fmtDate(o.paid_until)}</div>
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
