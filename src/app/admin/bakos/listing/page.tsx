'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Command Center — Tab Listing (B4 v2): moderasi + bulk + prioritas
// PATH: src/app/admin/bakos/listing/page.tsx
// v2 (solo founder): thumbnail foto · umur · badge prioritas (aktif-belum-verified)
//   · bulk verify (checkbox borongan) · drawer detail (preserved).
// GET /admin/listings?type=kos · GET /admin/listings/:id · PATCH verify|status
// ════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback, useContext, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { ShieldCheck, ShieldX, Search, MapPin, Phone, User, BedDouble, History, ExternalLink, AlertTriangle, CheckCheck } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface KosRow {
  id: string; display_id: string | null; title: string; slug: string; type: string; status: string;
  price: number | null; price_period: string | null; address: string | null;
  listing_tier: string | null; created_at: string; cover_image_url: string | null;
  is_verified: boolean; kos_type: string | null; listing_fee_status: string | null;
}
interface KosDetail extends KosRow {
  description: string | null; photos: string[] | null;
  facilities: Record<string, any> | null;
  latitude: number | null; longitude: number | null; nearby_landmarks: string[] | null;
  phone: string | null; accommodation_type: string | null; electricity_type: string | null;
  kos_rules: string | null; is_negotiable: boolean; rating_avg: number; rating_count: number;
  owner: { id: string; name: string | null; phone: string | null; role: string | null } | null;
  rooms: Array<{ id: string; room_type: string; price: number; total_rooms: number; available_rooms: number; size_m2: number | null }>;
  claims: Array<{ id: string; status: string; claimant_name: string | null; claimant_phone: string | null; evidence: any; submitted_at: string | null }>;
}

const STATUS_FILTER = [
  { value: '', label: 'Semua' }, { value: 'active', label: 'Aktif' },
  { value: 'draft', label: 'Draft' }, { value: 'inactive', label: 'Nonaktif' },
  { value: 'suspended', label: 'Suspended' },
];
const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  active: { color: '#10B981', label: 'Aktif' }, draft: { color: '#9CA3AF', label: 'Draft' },
  inactive: { color: '#9CA3AF', label: 'Nonaktif' }, suspended: { color: '#EF4444', label: 'Suspended' },
  expired: { color: '#F59E0B', label: 'Expired' }, rejected: { color: '#EF4444', label: 'Ditolak' },
  pending: { color: '#F59E0B', label: 'Menunggu' }, claimed: { color: '#10B981', label: 'Disetujui' },
  unclaimed: { color: '#9CA3AF', label: 'Belum diklaim' },
};
function rp(n: number | null | undefined) { return n ? 'Rp ' + n.toLocaleString('id-ID') : '—'; }
function ageStr(iso: string | null) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'hari ini'; if (d === 1) return 'kemarin'; if (d < 30) return `${d} hari lalu`;
  return `${Math.floor(d / 30)} bln lalu`;
}
function facList(f: Record<string, any> | null | undefined): string[] {
  if (!f) return [];
  if (Array.isArray(f)) return f.map(String);
  return Object.entries(f).filter(([, v]) => v === true || (typeof v === 'string' && v)).map(([k]) => k.replace(/_/g, ' '));
}

function BakosListingTab() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const spVerif = sp.get('verif') ?? '';
  const [rows, setRows] = useState<KosRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // 🔗 init filter dari URL — deep-link ?status=&verif=&q= kebaca saat mount.
  const [statusFilter, setStatusFilter] = useState(sp.get('status') ?? '');
  const [verifFilter, setVerifFilter] = useState<'' | 'verified' | 'unverified' | 'risk'>(
    (['verified', 'unverified', 'risk'].includes(spVerif) ? spVerif : '') as '' | 'verified' | 'unverified' | 'risk');
  const [search, setSearch] = useState(sp.get('q') ?? '');
  const [searchInput, setSearchInput] = useState(sp.get('q') ?? '');
  const [openId, setOpenId] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };
  const tk = () => token || (typeof window !== 'undefined' ? localStorage.getItem('tl_token') || '' : '');

  const fetchRows = useCallback(async () => {
    if (!tk()) return;
    setLoading(true); setSel(new Set());
    try {
      const params = new URLSearchParams({ type: 'kos', limit: '100' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('q', search);
      const res = await fetch(`${API_URL}/admin/listings?${params}`, { headers: { Authorization: `Bearer ${tk()}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Gagal memuat');
      let list: KosRow[] = data.data.data ?? [];
      if (verifFilter === 'verified') list = list.filter(r => r.is_verified);
      if (verifFilter === 'unverified') list = list.filter(r => !r.is_verified);
      if (verifFilter === 'risk') list = list.filter(r => r.listing_fee_status === 'active' && !r.is_verified);
      setRows(list);
      setTotal(data.data.total ?? list.length);
    } catch (err: any) { showToast(err.message || 'Gagal memuat listing', false); }
    finally { setLoading(false); }
  }, [token, statusFilter, verifFilter, search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // 🔗 sync state → URL (deep-link konsisten dgn /admin/listings). Ikut pola BakosCari.
  useEffect(() => {
    const p = new URLSearchParams();
    if (statusFilter)  p.set('status', statusFilter);
    if (verifFilter)   p.set('verif', verifFilter);
    if (search.trim()) p.set('q', search.trim());
    const qs = p.toString();
    router.replace(`/admin/bakos/listing${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [statusFilter, verifFilter, search, router]);

  // 🛡️ Prioritas: kos AKTIF (tayang+dikelola) tapi BELUM diverifikasi = bahaya
  const riskCount = rows.filter(r => r.listing_fee_status === 'active' && !r.is_verified).length;

  const toggleSel = (id: string) => setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allVisibleUnverified = rows.filter(r => !r.is_verified).map(r => r.id);
  const selectAllUnverified = () => setSel(new Set(allVisibleUnverified));

  const bulkVerify = async () => {
    const ids = Array.from(sel);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(ids.map(id =>
        fetch(`${API_URL}/admin/listings/${id}/verify`, {
          method: 'PATCH', headers: { Authorization: `Bearer ${tk()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_verified: true }),
        }).then(r => r.json())
      ));
      const okN = results.filter(r => r.status === 'fulfilled' && (r.value as any)?.success).length;
      showToast(`${okN}/${ids.length} kos terverifikasi`, okN === ids.length);
      fetchRows();
    } catch { showToast('Bulk verify gagal', false); }
    finally { setBulkBusy(false); }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, color: t.textPrimary }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1500, background: toast.ok ? '#10B981' : '#EF4444', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary }}>Listing Kos</h1>
        <p style={{ fontSize: 13, color: t.textDim, marginTop: 3 }}>{total} kos · klik baris untuk detail · centang untuk verifikasi borongan</p>
      </div>

      {/* 🛡️ Strip prioritas: aktif tapi belum verified */}
      {riskCount > 0 && verifFilter !== 'risk' && (
        <div onClick={() => setVerifFilter('risk')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginBottom: 14, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
          <AlertTriangle size={18} color="#EF4444" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>{riskCount} kos sudah tayang & dikelola tapi BELUM diverifikasi</p>
            <p style={{ fontSize: 11, color: t.textDim }}>Kontak udah kebuka ke publik padahal belum dicek — prioritaskan. Klik untuk filter.</p>
          </div>
          <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 700 }}>Lihat →</span>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        {STATUS_FILTER.map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: statusFilter === s.value ? '#F59E0B' : t.navHover, color: statusFilter === s.value ? '#fff' : t.textDim }}>{s.label}</button>
        ))}
        <div style={{ width: 1, height: 24, background: t.sidebarBorder }} />
        {([['', 'Semua verif'], ['unverified', 'Belum'], ['verified', 'Verified'], ['risk', '⚠️ Perlu Perhatian']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setVerifFilter(v as any)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: verifFilter === v ? (v === 'risk' ? '#EF4444' : '#0891B2') : t.navHover, color: verifFilter === v ? '#fff' : t.textDim }}>{l}</button>
        ))}
        <div style={{ flex: 1, display: 'flex', gap: 6, minWidth: 180 }}>
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)} placeholder="Cari nama / kode kos..."
            style={{ flex: 1, padding: '6px 12px', borderRadius: 8, border: `1px solid ${t.sidebarBorder}`, fontSize: 12, color: t.textPrimary, background: t.mainBg, outline: 'none' }} />
          <button onClick={() => setSearch(searchInput)} style={{ padding: '6px 12px', borderRadius: 8, background: '#F59E0B', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Search size={13} /> Cari</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textMuted, fontSize: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #F59E0B', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Memuat listing kos…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p style={{ fontWeight: 600, color: t.textPrimary }}>Tidak ada kos</p>
        </div>
      ) : (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '36px 120px 1fr 110px 120px 110px', padding: '12px 16px', background: t.navHover, borderBottom: `1px solid ${t.sidebarBorder}`, fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: 'uppercase', letterSpacing: '0.5px', alignItems: 'center' }}>
            <div>
              <input type="checkbox" checked={sel.size > 0 && allVisibleUnverified.every(id => sel.has(id)) && allVisibleUnverified.length > 0}
                onChange={(e) => e.target.checked ? selectAllUnverified() : setSel(new Set())} style={{ cursor: 'pointer' }} title="Pilih semua yang belum verified" />
            </div>
            <div>Kode</div><div>Kos</div><div>Harga</div><div>Verifikasi</div><div>Status</div>
          </div>
          {rows.map((row) => {
            const st = STATUS_STYLE[row.status] ?? { color: '#9CA3AF', label: row.status };
            const managed = row.listing_fee_status === 'active';
            const risk = managed && !row.is_verified;
            const checked = sel.has(row.id);
            return (
              <div key={row.id} onClick={() => setOpenId(row.id)} style={{ display: 'grid', gridTemplateColumns: '36px 120px 1fr 110px 120px 110px', padding: '12px 16px', borderBottom: `1px solid ${t.sidebarBorder}`, alignItems: 'center', cursor: 'pointer', background: checked ? 'rgba(8,145,178,0.08)' : risk ? 'rgba(239,68,68,0.05)' : 'transparent' }}
                onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = t.navHover; }} onMouseLeave={(e) => { e.currentTarget.style.background = checked ? 'rgba(8,145,178,0.08)' : risk ? 'rgba(239,68,68,0.05)' : 'transparent'; }}>
                <div onClick={(e) => { e.stopPropagation(); toggleSel(row.id); }}>
                  <input type="checkbox" checked={checked} readOnly style={{ cursor: 'pointer' }} />
                </div>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, fontWeight: 700, color: row.display_id ? '#F59E0B' : t.textMuted }}>{row.display_id || '—'}</div>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {row.cover_image_url
                    ? <img src={row.cover_image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: '#1f2937' }} />
                    : <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1f2937', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏠</div>}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.title}
                      {managed && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: 4 }}>DIKELOLA</span>}
                      {risk && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.12)', padding: '2px 6px', borderRadius: 4 }}>⚠ CEK</span>}
                    </p>
                    <p style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{row.kos_type || '—'} · {row.address?.slice(0, 26) || '—'} · {ageStr(row.created_at)}</p>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: t.textDim }}>{rp(row.price)}</div>
                <div>
                  {row.is_verified
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#10B981' }}><ShieldCheck size={13} /> Verified</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: t.textMuted }}><ShieldX size={13} /> Belum</span>}
                </div>
                <div><span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: `${st.color}1A`, padding: '3px 8px', borderRadius: 20 }}>{st.label}</span></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk action bar */}
      {sel.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1200, background: '#0B1220', border: '1px solid #1f2937', borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
          <span style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 600 }}>{sel.size} kos dipilih</span>
          <button onClick={() => setSel(new Set())} style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>Batal</button>
          <button onClick={bulkVerify} disabled={bulkBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: '#0891B2', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: bulkBusy ? 0.6 : 1 }}>
            <CheckCheck size={15} /> {bulkBusy ? 'Memproses…' : `Verifikasi ${sel.size}`}
          </button>
        </div>
      )}

      {openId && (
        <DetailDrawer t={t} listingId={openId} tk={tk()}
          onClose={() => setOpenId(null)}
          onChanged={(msg) => { showToast(msg); fetchRows(); }} />
      )}
    </div>
  );
}

// useSearchParams() butuh Suspense boundary (Next.js) — ikut pola admin/listings.
export default function BakosListingTabPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px 0', textAlign: 'center', color: '#94A3B8' }}>Memuat…</div>}>
      <BakosListingTab />
    </Suspense>
  );
}

// ── Drawer admin (portal, slide kanan) ──
function DetailDrawer({ t, listingId, tk, onClose, onChanged }: {
  t: any; listingId: string; tk: string; onClose: () => void; onChanged: (msg: string) => void;
}) {
  const [d, setD] = useState<KosDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { const p = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = p; }; }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/listings/${listingId}`, { headers: { Authorization: `Bearer ${tk}` } });
      const data = await res.json();
      if (data.success) setD(data.data);
    } catch { /* */ } finally { setLoading(false); }
  }, [listingId, tk]);
  useEffect(() => { load(); }, [load]);

  const act = async (path: string, body: any, msg: string) => {
    setBusy(path);
    try {
      const res = await fetch(`${API_URL}/admin/listings/${listingId}/${path}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      onChanged(msg);
      load();
    } catch (e: any) { onChanged(e.message || 'Gagal'); }
    finally { setBusy(null); }
  };

  if (!mounted) return null;
  const facs = facList(d?.facilities);
  const waOwner = d?.owner?.phone ? String(d.owner.phone).replace(/\D/g, '') : null;

  const sec: React.CSSProperties = { padding: '16px 22px', borderBottom: '1px solid #1f2937' };
  const h: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 };

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1400, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', height: '100%', background: '#0B1220', color: '#E5E7EB', overflowY: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,0.4)', fontFamily: "'Outfit', system-ui" }}>
        {loading || !d ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748B' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #F59E0B', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Memuat detail…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, position: 'sticky', top: 0, background: '#0B1220', zIndex: 2 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{d.title}</h2>
                  {d.is_verified
                    ? <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: 999 }}>VERIFIED</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', background: 'rgba(148,163,184,0.12)', padding: '2px 8px', borderRadius: 999 }}>BELUM VERIF</span>}
                </div>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  {d.display_id || ''} · {d.kos_type || '—'} · {d.listing_tier || '—'} · {rp(d.price)}{d.price_period ? `/${d.price_period}` : ''}
                  <a href={`/bakos/${d.slug}`} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: '#0891B2', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>publik <ExternalLink size={11} /></a>
                </p>
              </div>
              <button onClick={onClose} aria-label="Tutup" style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Foto galeri */}
            {d.photos && d.photos.length > 0 && (
              <div style={{ ...sec }}>
                <p style={h}>Foto ({d.photos.length})</p>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {d.photos.map((src, i) => (
                    <img key={i} src={src} alt={`foto ${i + 1}`} style={{ height: 110, width: 150, objectFit: 'cover', borderRadius: 10, flexShrink: 0, background: '#1f2937' }} />
                  ))}
                </div>
              </div>
            )}

            {/* Alamat + koordinat */}
            <div style={sec}>
              <p style={h}><MapPin size={14} /> Lokasi (lengkap)</p>
              <p style={{ fontSize: 13, color: '#E5E7EB', lineHeight: 1.5 }}>{d.address || '—'}</p>
              {(d.latitude && d.longitude) ? (
                <a href={`https://www.google.com/maps?q=${d.latitude},${d.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0891B2', fontWeight: 600, textDecoration: 'none', marginTop: 4, display: 'inline-block' }}>
                  {d.latitude}, {d.longitude} · buka peta →
                </a>
              ) : <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Koordinat belum diisi</p>}
              {d.nearby_landmarks && d.nearby_landmarks.length > 0 && (
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Dekat: {d.nearby_landmarks.join(', ')}</p>
              )}
            </div>

            {/* Owner */}
            <div style={sec}>
              <p style={h}><User size={14} /> Pemilik</p>
              {d.owner ? (
                <div style={{ fontSize: 13, color: '#E5E7EB' }}>
                  <p>{d.owner.name || '—'} <span style={{ color: '#64748B', fontSize: 11 }}>({d.owner.role})</span></p>
                  {d.owner.phone && (
                    <p style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={12} color="#64748B" /> {d.owner.phone}
                      {waOwner && <a href={`https://wa.me/${waOwner}`} target="_blank" rel="noreferrer" style={{ color: '#10B981', fontWeight: 700, textDecoration: 'none' }}>WhatsApp →</a>}
                    </p>
                  )}
                  <p style={{ fontSize: 10, color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>🛡️ Data internal — jangan disebar.</p>
                </div>
              ) : <p style={{ fontSize: 12, color: '#64748B' }}>Belum ada pemilik (kos titipan/seed)</p>}
            </div>

            {/* Fasilitas */}
            {facs.length > 0 && (
              <div style={sec}>
                <p style={h}>Fasilitas</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {facs.map((f, i) => (
                    <span key={i} style={{ fontSize: 12, color: '#CBD5E1', background: '#1f2937', padding: '4px 10px', borderRadius: 8, textTransform: 'capitalize' }}>{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Kamar */}
            {d.rooms && d.rooms.length > 0 && (
              <div style={sec}>
                <p style={h}><BedDouble size={14} /> Tipe Kamar ({d.rooms.length})</p>
                {d.rooms.map((r) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #1f2937' }}>
                    <span style={{ color: '#E5E7EB' }}>{r.room_type} {r.size_m2 ? `· ${r.size_m2}m²` : ''}</span>
                    <span style={{ color: '#94A3B8' }}>{rp(r.price)} · {r.available_rooms}/{r.total_rooms} kosong</span>
                  </div>
                ))}
              </div>
            )}

            {/* Riwayat klaim */}
            <div style={sec}>
              <p style={h}><History size={14} /> Riwayat Klaim ({d.claims?.length || 0})</p>
              {d.claims && d.claims.length > 0 ? d.claims.map((cl) => {
                const cst = STATUS_STYLE[cl.status] ?? { color: '#9CA3AF', label: cl.status };
                return (
                  <div key={cl.id} style={{ fontSize: 12, padding: '8px 0', borderBottom: '1px solid #1f2937' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#E5E7EB', fontWeight: 600 }}>{cl.claimant_name || '—'} <span style={{ color: '#64748B', fontWeight: 400 }}>{cl.claimant_phone || ''}</span></span>
                      <span style={{ color: cst.color, fontWeight: 700 }}>{cst.label}</span>
                    </div>
                    {cl.evidence?.note && <p style={{ color: '#94A3B8', marginTop: 2 }}>"{cl.evidence.note}"</p>}
                  </div>
                );
              }) : <p style={{ fontSize: 12, color: '#64748B' }}>Belum ada klaim untuk kos ini</p>}
            </div>

            {/* Footer aksi */}
            <div style={{ padding: '16px 22px', position: 'sticky', bottom: 0, background: '#0B1220', borderTop: '1px solid #1f2937', display: 'flex', gap: 10 }}>
              <button onClick={() => act('verify', { is_verified: !d.is_verified }, `"${d.title}" → ${!d.is_verified ? 'terverifikasi' : 'verifikasi dibatalkan'}`)} disabled={!!busy}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: d.is_verified ? 'rgba(8,145,178,0.15)' : '#0891B2', color: d.is_verified ? '#0891B2' : '#fff', opacity: busy ? 0.6 : 1 }}>
                {busy === 'verify' ? '…' : d.is_verified ? 'Batalkan Verifikasi' : 'Verifikasi Kos'}
              </button>
              {d.status === 'active' ? (
                <button onClick={() => act('status', { status: 'suspended' }, `"${d.title}" → Suspended`)} disabled={!!busy}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #EF4444', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: 'transparent', color: '#EF4444', opacity: busy ? 0.6 : 1 }}>
                  {busy === 'status' ? '…' : 'Suspend'}
                </button>
              ) : (
                <button onClick={() => act('status', { status: 'active' }, `"${d.title}" → Aktif`)} disabled={!!busy}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: '#10B981', color: '#fff', opacity: busy ? 0.6 : 1 }}>
                  {busy === 'status' ? '…' : 'Tayangkan'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>, document.body);
}
