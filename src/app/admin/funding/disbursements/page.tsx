'use client';

import { useEffect, useState, useCallback, useContext } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { normalizeWaNumber, maskPhone } from '@/utils/format';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import CommandCenterTabs from '@/components/admin/funding/CommandCenterTabs';
import AdminAuthGuard from '@/components/admin/funding/AdminAuthGuard';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ── Icons ──────────────────────────────────────────────────────
const Icons = {
  Check:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Flag:     () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Eye:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Link:     () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Send:     () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Wallet:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>,
  Clock:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  AlertTri: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ── Types ──────────────────────────────────────────────────────
type DisbursementStatus = 'pending' | 'verified' | 'flagged' | 'rejected';

interface Campaign {
  id: string;
  title: string;
  slug: string;
  partner_name: string;
  beneficiary_name: string;
}

interface Disbursement {
  id: string;
  campaign_id: string;
  stage_number: number;
  amount: number;
  disbursed_to: string;
  disbursed_at: string;
  method: string;
  evidence_urls: string[];
  handover_photo_url: string | null;
  disbursement_notes: string | null;
  admin_review_notes: string | null;
  beneficiary_phone: string | null;
  beneficiary_ktp_url: string | null;
  status: DisbursementStatus;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  campaigns: Campaign | null;
}

type ModalType = 'detail' | 'verify' | 'reject' | 'flag';

// ── Helpers ────────────────────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  // Long format (full precision) — for financial verification context.
  return 'Rp ' + (n ?? 0).toLocaleString('id-ID');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const STATUS_CONFIG: Record<DisbursementStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Menunggu Verifikasi', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  verified: { label: 'Tersalurkan',         color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  flagged:  { label: 'Sedang Direview',     color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  rejected: { label: 'Tidak Diteruskan',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
};

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'pending',  label: 'Pending'  },
  { key: 'verified', label: 'Verified' },
  { key: 'flagged',  label: 'Flagged'  },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all',      label: 'Semua'    },
];

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════

export default function AdminDisbursementsPage() {
  const { t } = useContext(AdminThemeContext);
  const { token } = useAuth();

  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  // ── URL-synced state ──
  const activeStatus = searchParams.get('status') ?? 'pending';
  const page         = Number(searchParams.get('page')) || 1;
  const activeSort   = searchParams.get('sort') ?? 'newest';
  const urlSearch    = searchParams.get('q') ?? '';
  const activeSmartView = searchParams.get('sv') ?? '';

  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [subNavKey, setSubNavKey] = useState(0);

  function updateUrl(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '') params.delete(k);
      else params.set(k, String(v));
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  const [stats, setStats] = useState({
    pending: 0, verified_total: 0, flagged: 0,
  });

  const [modal, setModal] = useState<{ type: ModalType; item: Disbursement } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null); // [L3] URL gambar yg lagi dizoom
  const [drawerAction, setDrawerAction] = useState<'verify' | 'flag' | 'reject' | null>(null); // [L4] panel aksi di drawer
  // [L5] Konteks kampanye (fetch existing admin: disbursements?campaign_id + trial-balance). Non-fatal.
  const [ctx, setCtx] = useState<{
    loading: boolean; saldo: number | null; totalDisbursed: number;
    stages: { id: string; stage_number: number; amount: number; status: string }[];
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionNotes, setActionNotes]   = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const LIMIT = 20;

  // ── Fetch list ─────────────────────────────────────────────
  const fetchDisbursements = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        sort: activeSort,
      });
      if (activeStatus && activeStatus !== 'all') params.set('status', activeStatus);
      if (urlSearch) params.set('search', urlSearch);
      const res = await fetch(`${API_URL}/funding/admin/disbursements?${params}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (json.success) {
        setDisbursements(json.data ?? []);
        setTotal(json.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [activeStatus, page, activeSort, urlSearch]);

  // ── Fetch stats ────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    const headers = { Authorization: `Bearer ${tk}` };
    try {
      const [pendingRes, verifiedRes, flaggedRes] = await Promise.all([
        fetch(`${API_URL}/funding/admin/disbursements?status=pending&limit=1`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/disbursements?status=verified&limit=100`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/disbursements?status=flagged&limit=1`, { headers }).then(r => r.json()).catch(() => null),
      ]);
      const verifiedTotal = (verifiedRes?.data ?? []).reduce(
        (sum: number, d: Disbursement) => sum + Number(d.amount || 0), 0
      );
      setStats({
        pending:        pendingRes?.meta?.total ?? 0,
        verified_total: verifiedTotal,
        flagged:        flaggedRes?.meta?.total ?? 0,
      });
    } catch {}
  }, []);

  useEffect(() => { fetchDisbursements(); }, [fetchDisbursements]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setSearchInput(urlSearch); }, [urlSearch]);

  // [L2] Drawer/modal terbuka → Esc tutup + body-scroll lock (pola DonationVerifyDrawer).
  // [L3] Lightbox prioritas: Esc tutup lightbox dulu, baru drawer.
  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightbox) { setLightbox(null); return; }       // lightbox dulu
      if (drawerAction) { setDrawerAction(null); return; } // panel aksi → balik ke drawer
      setModal(null);                                      // baru tutup drawer
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modal, lightbox, drawerAction]);

  // [L5] Drawer buka → fetch konteks kampanye (saldo + riwayat). 2 endpoint admin existing, NON-FATAL.
  useEffect(() => {
    if (!modal || modal.type !== 'detail') { setCtx(null); return; }
    const campaignId = modal.item.campaign_id;
    if (!campaignId) { setCtx(null); return; }
    let cancelled = false;
    setCtx({ loading: true, saldo: null, totalDisbursed: 0, stages: [] });
    (async () => {
      const tk = localStorage.getItem('tl_token');
      const hdr = { Authorization: `Bearer ${tk}` };
      const [disbRes, tbRes] = await Promise.all([
        fetch(`${API_URL}/funding/admin/disbursements?campaign_id=${campaignId}&limit=100`, { headers: hdr }).then(r => r.json()).catch(() => null),
        fetch(`${API_URL}/funding/admin/campaigns/${campaignId}/trial-balance`, { headers: hdr }).then(r => r.json()).catch(() => null),
      ]);
      if (cancelled) return;
      const stages = (disbRes?.success && Array.isArray(disbRes.data))
        ? disbRes.data.map((d: any) => ({ id: d.id, stage_number: d.stage_number, amount: Number(d.amount) || 0, status: d.status }))
            .sort((a: any, b: any) => a.stage_number - b.stage_number)
        : [];
      const totalDisbursed = stages.filter((s: any) => s.status === 'verified').reduce((a: number, s: any) => a + s.amount, 0);
      const saldo = (tbRes?.success && typeof tbRes.data?.principal_2101_net === 'number') ? tbRes.data.principal_2101_net : null;
      setCtx({ loading: false, saldo, totalDisbursed, stages });
    })();
    return () => { cancelled = true; };
  }, [modal]);

  // Debounce search → URL update
  useEffect(() => {
    if (searchInput === urlSearch) return;
    const timer = setTimeout(() => {
      updateUrl({ q: searchInput || null, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // ── Toast helper ───────────────────────────────────────────
  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Actions ────────────────────────────────────────────────
  async function handleVerify() {
    if (!modal) return;
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/disbursements/${modal.item.id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: actionNotes.trim() || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(true, `Pencairan Tahap ${modal.item.stage_number} berhasil diverifikasi.`);
        setModal(null);
        setActionNotes('');
        setSubNavKey(k => k + 1);
        await Promise.all([fetchDisbursements(), fetchStats()]);
      } else {
        showToast(false, json.error?.message ?? 'Gagal memverifikasi pencairan.');
      }
    } catch {
      showToast(false, 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!modal) return;
    if (actionReason.trim().length < 10) {
      showToast(false, 'Alasan penolakan minimal 10 karakter.');
      return;
    }
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/disbursements/${modal.item.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: actionReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(true, `Pencairan Tahap ${modal.item.stage_number} ditolak.`);
        setModal(null);
        setActionReason('');
        setSubNavKey(k => k + 1);
        await Promise.all([fetchDisbursements(), fetchStats()]);
      } else {
        showToast(false, json.error?.message ?? 'Gagal menolak pencairan.');
      }
    } catch {
      showToast(false, 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFlag() {
    if (!modal) return;
    if (actionReason.trim().length < 10) {
      showToast(false, 'Alasan flag minimal 10 karakter.');
      return;
    }
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/disbursements/${modal.item.id}/flag`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: actionReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(true, `Pencairan Tahap ${modal.item.stage_number} di-flag untuk review.`);
        setModal(null);
        setActionReason('');
        setSubNavKey(k => k + 1);
        await Promise.all([fetchDisbursements(), fetchStats()]);
      } else {
        showToast(false, json.error?.message ?? 'Gagal flag pencairan.');
      }
    } catch {
      showToast(false, 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  // [L4] Semua tombol tabel → buka DRAWER (type 'detail'). Kalau tombol aksi (verify/flag/reject),
  // langsung buka panel aksi-nya di drawer (drawerAction). Detail → cuma drawer, no panel.
  function openModal(type: ModalType, item: Disbursement) {
    setActionReason('');
    setActionNotes('');
    setModal({ type: 'detail', item });
    setDrawerAction(type === 'detail' ? null : type);
  }

  const totalPages = Math.ceil(total / LIMIT);

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <AdminAuthGuard>
      <div style={{ padding: '24px 32px', maxWidth: 1280, color: t.textPrimary }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#EC4899', letterSpacing: '0.1em', marginBottom: 4 }}>
            BADONASI
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
            Pencairan Dana
          </h1>
          <p style={{ fontSize: 14, color: t.textDim }}>
            Verifikasi pencairan dana dari mitra penggalang ke penerima manfaat.
          </p>
        </div>

        <CommandCenterTabs active="disbursements" refreshKey={subNavKey} />

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard t={t} icon={<Icons.Clock />} label="Menunggu Verifikasi"
            value={stats.pending.toString()} accent="#F59E0B" highlight={stats.pending > 0} />
          <StatCard t={t} icon={<Icons.Wallet />} label="Total Tersalurkan"
            value={formatRupiah(stats.verified_total)} accent="#10B981" />
          <StatCard t={t} icon={<Icons.AlertTri />} label="Perlu Review"
            value={stats.flagged.toString()} accent="#F97316" highlight={stats.flagged > 0} />
        </div>

        {/* ⭐ Search + Sort */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.textDim, fontSize: 14 }}>🔍</span>
            <input
              type="text"
              placeholder="Cari penerima, kampanye..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px 9px 36px',
                borderRadius: 10, border: `1px solid ${t.sidebarBorder}`,
                background: t.mainBg, color: t.textPrimary, fontSize: 13,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <select
            value={activeSort}
            onChange={e => updateUrl({ sort: e.target.value, page: 1 })}
            style={{
              padding: '9px 32px 9px 12px', borderRadius: 10,
              border: `1px solid ${t.sidebarBorder}`,
              background: t.mainBg, color: t.textPrimary,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="amount_high">Nominal Tertinggi</option>
            <option value="amount_low">Nominal Terendah</option>
          </select>
        </div>

        {/* ⭐ Smart Views */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { key: 'pending_lama',   label: '⏰ Pending >48 Jam',  color: '#EF4444' },
            { key: 'jumlah_besar',   label: '💰 Jumlah Besar >1jt', color: '#F59E0B' },
            { key: 'flagged',        label: '🚩 Sedang Direview',   color: '#F97316' },
          ].map(sv => {
            const active = activeSmartView === sv.key;
            return (
              <button
                key={sv.key}
                onClick={() => updateUrl({
                  sv: active ? null : sv.key,
                  status: sv.key === 'flagged' ? 'flagged' : 'all',
                  page: 1,
                })}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${active ? sv.color : t.sidebarBorder}`,
                  background: active ? `${sv.color}15` : 'transparent',
                  color: active ? sv.color : t.textDim,
                  cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                {sv.label}
              </button>
            );
          })}
          {(activeSmartView || urlSearch) && (
            <button
              onClick={() => updateUrl({ sv: null, q: null, status: 'pending', page: 1 })}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${t.sidebarBorder}`,
                background: 'transparent', color: t.textDim, cursor: 'pointer',
              }}
            >
              ✕ Reset
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${t.sidebarBorder}` }}>
          {STATUS_TABS.map(tab => {
            const active = activeStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => updateUrl({ status: tab.key, page: 1, sv: null })}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 'none',
                  background: 'none', cursor: 'pointer',
                  color: active ? '#EC4899' : t.textDim,
                  borderBottom: active ? '2px solid #EC4899' : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 150ms',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div style={{
          background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16, overflow: 'hidden', marginBottom: 24,
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: t.textDim, fontSize: 14 }}>
              Memuat data pencairan...
            </div>
          ) : disbursements.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: t.textDim, fontSize: 14 }}>
              Tidak ada pencairan dengan status ini.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.sidebarBorder}` }}>
                    {['Tahap', 'Kampanye', 'Nominal', 'Penerima', 'Tanggal', 'Metode', 'Status', 'Aksi'].map(h => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: t.textDim, letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}>
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {disbursements.map((d, i) => {
                    const cfg = STATUS_CONFIG[d.status];
                    return (
                      <tr key={d.id} style={{
                        borderBottom: i < disbursements.length - 1 ? `1px solid ${t.sidebarBorder}` : 'none',
                        transition: 'background 150ms',
                      }}>
                        {/* Tahap */}
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#EC4899', fontSize: 15 }}>
                          #{d.stage_number}
                        </td>

                        {/* Kampanye */}
                        <td style={{ padding: '14px 16px', maxWidth: 200 }}>
                          <div style={{ fontWeight: 600, color: t.textPrimary, fontSize: 13, marginBottom: 2 }}>
                            {d.campaigns?.title ?? '—'}
                          </div>
                          <div style={{ fontSize: 11, color: t.textDim }}>
                            {d.campaigns?.partner_name ?? ''}
                          </div>
                        </td>

                        {/* Nominal */}
                        <td style={{ padding: '14px 16px', fontWeight: 800, color: t.textPrimary, fontSize: 15 }}>
                          {formatRupiah(Number(d.amount))}
                        </td>

                        {/* Penerima */}
                        <td style={{ padding: '14px 16px', color: t.textPrimary, maxWidth: 160 }}>
                          <div style={{ fontWeight: 500 }}>{d.disbursed_to}</div>
                          {d.evidence_urls?.[0] && (
                            <a
                              href={d.evidence_urls[0]}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 11, color: '#0891B2', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}
                            >
                              <Icons.Link /> Bukti Transfer
                            </a>
                          )}
                        </td>

                        {/* Tanggal */}
                        <td style={{ padding: '14px 16px', color: t.textDim, whiteSpace: 'nowrap', fontSize: 12 }}>
                          {formatDate(d.disbursed_at)}
                        </td>

                        {/* Metode */}
                        <td style={{ padding: '14px 16px', color: t.textDim, fontSize: 12, textTransform: 'capitalize' }}>
                          {d.method}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            background: cfg.bg, color: cfg.color,
                            fontSize: 11, fontWeight: 700, padding: '4px 10px',
                            borderRadius: 999, whiteSpace: 'nowrap',
                          }}>
                            {cfg.label}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <ActionBtn label="Detail" color="#6366F1" onClick={() => openModal('detail', d)}>
                              <Icons.Eye />
                            </ActionBtn>
                            {d.status === 'pending' && (
                              <>
                                <ActionBtn label="Verify" color="#10B981" onClick={() => openModal('verify', d)}>
                                  <Icons.Check />
                                </ActionBtn>
                                <ActionBtn label="Flag" color="#F97316" onClick={() => openModal('flag', d)}>
                                  <Icons.Flag />
                                </ActionBtn>
                                <ActionBtn label="Tolak" color="#EF4444" onClick={() => openModal('reject', d)}>
                                  <Icons.X />
                                </ActionBtn>
                              </>
                            )}
                            {d.status === 'flagged' && (
                              <>
                                <ActionBtn label="Verify" color="#10B981" onClick={() => openModal('verify', d)}>
                                  <Icons.Check />
                                </ActionBtn>
                                <ActionBtn label="Tolak" color="#EF4444" onClick={() => openModal('reject', d)}>
                                  <Icons.X />
                                </ActionBtn>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <PaginationBtn disabled={page <= 1} onClick={() => updateUrl({ page: page - 1 })}>← Prev</PaginationBtn>
            <span style={{ padding: '8px 16px', fontSize: 13, color: t.textDim }}>
              {page} / {totalPages}
            </span>
            <PaginationBtn disabled={page >= totalPages} onClick={() => updateUrl({ page: page + 1 })}>Next →</PaginationBtn>
          </div>
        )}

      </div>

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.ok ? '#10B981' : '#EF4444',
          color: '#fff', borderRadius: 12, padding: '12px 20px',
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          maxWidth: 360,
        }}>
          {toast.ok ? '✅ ' : '❌ '}{toast.msg}
        </div>
      )}

      {/* ── Detail DRAWER (right-slide, pola DonationVerifyDrawer) — L2 ── */}
      {modal?.type === 'detail' && (
        <div
          onClick={() => setModal(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
            display: 'flex', justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(560px, 100vw)', height: '100%', background: '#0F172A',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.45)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              animation: 'tlDisbDrawerIn 200ms ease-out',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0,
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Verifikasi Pencairan
                </p>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', marginTop: 2 }}>
                  Pencairan Tahap #{modal.item.stage_number}
                </h2>
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {modal.item.campaigns?.title ?? '—'}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                aria-label="Tutup" title="Tutup (Esc)"
                style={{
                  flexShrink: 0, width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icons.X />
              </button>
            </div>

            {/* Scroll area — sections */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Status banner */}
              <div style={{
                background: STATUS_CONFIG[modal.item.status].bg,
                border: `1px solid ${STATUS_CONFIG[modal.item.status].color}40`,
                borderRadius: 12, padding: 14,
              }}>
                <span style={{
                  background: STATUS_CONFIG[modal.item.status].bg,
                  color: STATUS_CONFIG[modal.item.status].color,
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                }}>
                  {STATUS_CONFIG[modal.item.status].label}
                </span>
                {modal.item.verified_at && (
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>
                    Diverifikasi {formatDate(modal.item.verified_at)}
                  </p>
                )}
                {modal.item.admin_review_notes && (
                  <p style={{ fontSize: 12, color: '#CBD5E1', marginTop: 8, lineHeight: 1.5 }}>
                    <strong style={{ color: '#94A3B8' }}>Catatan admin:</strong> {modal.item.admin_review_notes}
                  </p>
                )}
              </div>

              {/* Detail Pencairan */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <DetailRow label="Nominal" value={formatRupiah(Number(modal.item.amount))} bold />
                <DetailRow label="Penerima" value={modal.item.disbursed_to} />
                <DetailRow label="Tanggal Cair" value={formatDate(modal.item.disbursed_at)} />
                <DetailRow label="Metode" value={modal.item.method} />
                {modal.item.campaigns?.partner_name && (
                  <DetailRow label="Mitra" value={modal.item.campaigns.partner_name} />
                )}
              </div>

              {/* [L5] Konteks Kampanye — saldo + riwayat pencairan (non-fatal) */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Konteks Kampanye
                </p>
                {!ctx || ctx.loading ? (
                  <p style={{ fontSize: 12, color: '#64748B' }}>Memuat konteks…</p>
                ) : (ctx.saldo === null && ctx.stages.length === 0) ? (
                  <p style={{ fontSize: 12, color: '#64748B' }}>Konteks kampanye tidak tersedia.</p>
                ) : (() => {
                  const amt = Number(modal.item.amount) || 0;
                  // [SALDO-WARN-FIX] Warning "melebihi saldo" cuma relevan PRE-verify (gate admin approve
                  // over-saldo). Verified = udah cair (saldo principal_2101_net SUDAH dikurangi pencairan ini
                  // → amt>saldo selalu true → nyesatin). Rejected = gak jadi cair. Gate ke status actionable.
                  const isActionable = modal.item.status === 'pending' || modal.item.status === 'flagged';
                  const over = isActionable && ctx.saldo !== null && amt > ctx.saldo;
                  const verifiedCount = ctx.stages.filter(s => s.status === 'verified').length;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {ctx.saldo !== null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 12, color: '#94A3B8' }}>Saldo siap cair kampanye</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: over ? '#F87171' : '#34D399' }}>
                            {formatRupiah(ctx.saldo)}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 12, color: '#94A3B8' }}>Total sudah disalurkan</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
                          {formatRupiah(ctx.totalDisbursed)} <span style={{ color: '#64748B', fontWeight: 400 }}>· {verifiedCount} pencairan</span>
                        </span>
                      </div>

                      {over && (
                        <div style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 10, padding: '8px 12px',
                        }}>
                          <p style={{ fontSize: 12, color: '#F87171', fontWeight: 700 }}>
                            ⚠ Nominal pencairan ini ({formatRupiah(amt)}) melebihi saldo siap cair ({formatRupiah(ctx.saldo as number)}).
                          </p>
                        </div>
                      )}

                      {ctx.stages.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                          {ctx.stages.map(s => {
                            const isThis = s.id === modal.item.id;
                            const sc = STATUS_CONFIG[s.status as DisbursementStatus] ?? { color: '#94A3B8', label: s.status };
                            return (
                              <div key={s.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                fontSize: 12, padding: '6px 10px', borderRadius: 8,
                                background: isThis ? 'rgba(99,102,241,0.12)' : 'transparent',
                                border: isThis ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                              }}>
                                <span style={{ color: isThis ? '#A5B4FC' : '#CBD5E1', fontWeight: isThis ? 700 : 500 }}>
                                  Tahap #{s.stage_number}{isThis ? ' (INI)' : ''} — {formatRupiah(s.amount)}
                                </span>
                                <span style={{ color: sc.color, fontWeight: 700, fontSize: 11 }}>{sc.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Identitas Penerima */}
              {modal.item.beneficiary_phone && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Identitas Penerima</p>
                  {/* [L6-REV] No. HP (MASKED display) + tombol Hubungi compact inline (niru "Kirim Reminder") */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 2 }}>NO. HP PENERIMA</p>
                      <p style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
                        {maskPhone(modal.item.beneficiary_phone)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const phone = modal.item.beneficiary_phone;
                        if (!phone) return;
                        const msg = `Halo, ini admin TeraLoka. Kami sedang memverifikasi penyaluran dana ${formatRupiah(Number(modal.item.amount))} untuk kampanye "${modal.item.campaigns?.title ?? '—'}". Mohon konfirmasi Anda sudah menerima dana ini. Terima kasih 🙏`;
                        window.open(`https://wa.me/${normalizeWaNumber(phone)}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      title="Hubungi penerima via WhatsApp"
                      style={{
                        flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '7px 12px', borderRadius: 8, whiteSpace: 'nowrap',
                        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                        border: 'none', color: '#fff', fontSize: 12, fontWeight: 700,
                        boxShadow: '0 2px 8px rgba(18,140,126,0.35)', transition: 'all 150ms',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.08)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                    >
                      <Icons.Send /> Hubungi
                    </button>
                  </div>
                </div>
              )}

              {/* Catatan Mitra — SELALU tampil; kosong → fallback (admin tau ada catatan / enggak) */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Catatan Mitra</p>
                {modal.item.disbursement_notes ? (
                  <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.6, fontStyle: 'italic' }}>&quot;{modal.item.disbursement_notes}&quot;</p>
                ) : (
                  <p style={{ fontSize: 12, color: '#64748B' }}>Tidak ada catatan dari mitra.</p>
                )}
              </div>

              {/* Bukti Transfer — thumbnail grid + lightbox (L3) */}
              {modal.item.evidence_urls && modal.item.evidence_urls.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                  <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 8 }}>
                    BUKTI TRANSFER ({modal.item.evidence_urls.length})
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {modal.item.evidence_urls.map((url, i) => (
                      <ImgThumb key={i} url={url} alt={`Bukti ${i + 1}`} onOpen={setLightbox} />
                    ))}
                  </div>
                </div>
              )}

              {/* Foto Serah Terima — thumbnail + lightbox (L3) */}
              {modal.item.handover_photo_url && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                  <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 8 }}>FOTO SERAH TERIMA</p>
                  <div style={{ width: 120 }}>
                    <ImgThumb url={modal.item.handover_photo_url} alt="Serah-terima" onOpen={setLightbox} />
                  </div>
                </div>
              )}

              {/* [L5] Konteks saldo + riwayat pencairan nyusul */}
            </div>

            {/* [L4] Action bar sticky — cuma status pending/flagged (verified/rejected = no aksi) */}
            {(modal.item.status === 'pending' || modal.item.status === 'flagged') && (
              <div style={{
                flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.1)',
                padding: '14px 20px', display: 'flex', gap: 10, background: '#0F172A',
              }}>
                <button
                  onClick={() => setDrawerAction('reject')}
                  style={{
                    flex: 1, padding: '11px', borderRadius: 12, cursor: 'pointer',
                    background: 'transparent', border: '1px solid rgba(239,68,68,0.4)',
                    color: '#F87171', fontSize: 13, fontWeight: 700,
                  }}
                >
                  ✕ Tolak
                </button>
                {modal.item.status === 'pending' && (
                  <button
                    onClick={() => setDrawerAction('flag')}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 12, cursor: 'pointer',
                      background: 'transparent', border: '1px solid rgba(249,115,22,0.4)',
                      color: '#F97316', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    ⚑ Flag
                  </button>
                )}
                <button
                  onClick={() => setDrawerAction('verify')}
                  style={{
                    flex: 1.4, padding: '11px', borderRadius: 12, cursor: 'pointer',
                    background: '#10B981', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  }}
                >
                  ✓ Verifikasi
                </button>
              </div>
            )}
          </div>
          <style>{`@keyframes tlDisbDrawerIn { from { transform: translateX(28px); opacity: 0.4 } to { transform: translateX(0); opacity: 1 } }`}</style>
        </div>
      )}

      {/* ── Lightbox (L3) — gambar besar, Esc/klik-luar tutup. z di atas drawer. ── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Preview bukti"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: 8 }}
          />
          <button
            onClick={() => setLightbox(null)}
            aria-label="Tutup" title="Tutup (Esc)"
            style={{
              position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 10,
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icons.X />
          </button>
        </div>
      )}

      {/* [L4] Panel aksi DI ATAS drawer — verify(2-step)/flag/reject. Gated drawerAction. Batal → balik ke drawer. */}
      {modal && drawerAction && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1050, padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) { setDrawerAction(null); } }}
        >
          <div style={{
            background: '#1E293B', borderRadius: 20, padding: 32,
            width: '100%', maxWidth: 480,
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>

            {/* [L4] VERIFY — konfirmasi 2-step (warning ledger + transparansi) */}
            {drawerAction === 'verify' && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>
                  Konfirmasi Verifikasi
                </h2>
                <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 20 }}>
                  Tahap #{modal.item.stage_number} — {formatRupiah(Number(modal.item.amount))} kepada {modal.item.disbursed_to}
                </p>

                <div style={{
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                }}>
                  <p style={{ fontSize: 13, color: '#FBBF24', fontWeight: 700, marginBottom: 4 }}>
                    ⚠ Tindakan ini posting ke buku besar
                  </p>
                  <p style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 }}>
                    Jurnal di bawah diposting & pencairan <strong style={{ color: '#F8FAFC' }}>masuk transparansi publik ke donor</strong>. Lanjut?
                  </p>
                </div>

                {/* [JURNAL-VERIFY] Tabel jurnal yg akan diposting — EXACT (= raw amount, basis BE postDisbursementToBeneficiary). */}
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Jurnal yang akan diposting
                </p>
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#94A3B8', fontWeight: 700, fontSize: 10, letterSpacing: '0.04em' }}>AKUN</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#94A3B8', fontWeight: 700, fontSize: 10, letterSpacing: '0.04em' }}>DEBIT</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#94A3B8', fontWeight: 700, fontSize: 10, letterSpacing: '0.04em' }}>KREDIT</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '8px 12px', color: '#F8FAFC' }}><strong style={{ color: '#A5B4FC' }}>2101</strong> Utang Beneficiary</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#F8FAFC' }}>{formatRupiah(Number(modal.item.amount))}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>—</td>
                      </tr>
                      <tr style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '8px 12px', color: '#F8FAFC' }}><strong style={{ color: '#A5B4FC' }}>1101</strong> Kas Partner</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>—</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#F8FAFC' }}>{formatRupiah(Number(modal.item.amount))}</td>
                      </tr>
                      <tr style={{ borderTop: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 12px', color: '#94A3B8', fontWeight: 700 }}>TOTAL</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#34D399', fontWeight: 800 }}>{formatRupiah(Number(modal.item.amount))}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#34D399', fontWeight: 800 }}>{formatRupiah(Number(modal.item.amount))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 8 }}>
                    CATATAN ADMIN (opsional)
                  </label>
                  <textarea
                    value={actionNotes}
                    onChange={e => setActionNotes(e.target.value)}
                    placeholder="Misal: Sudah dicek sesuai bukti transfer..."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F8FAFC', fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setDrawerAction(null)}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94A3B8', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={submitting}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 12, cursor: submitting ? 'not-allowed' : 'pointer',
                      background: submitting ? 'rgba(16,185,129,0.4)' : '#10B981',
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {submitting ? 'Memverifikasi...' : '✓ Konfirmasi Verifikasi'}
                  </button>
                </div>
              </>
            )}

            {/* [L4] REJECT — alasan ≥10 */}
            {drawerAction === 'reject' && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>
                  Tolak Pencairan
                </h2>
                <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>
                  Tahap #{modal.item.stage_number} — {modal.item.campaigns?.title ?? '—'}
                </p>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', display: 'block', marginBottom: 8 }}>
                    ALASAN PENOLAKAN <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={e => setActionReason(e.target.value)}
                    placeholder="Jelaskan alasan penolakan (min. 10 karakter)..."
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)', border: `1px solid ${actionReason.length > 0 && actionReason.length < 10 ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
                      color: '#F8FAFC', fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  {actionReason.length > 0 && actionReason.length < 10 && (
                    <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
                      Minimal 10 karakter ({actionReason.length}/10)
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setDrawerAction(null)}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94A3B8', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={submitting || actionReason.trim().length < 10}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 12,
                      cursor: (submitting || actionReason.trim().length < 10) ? 'not-allowed' : 'pointer',
                      background: (submitting || actionReason.trim().length < 10) ? 'rgba(239,68,68,0.4)' : '#EF4444',
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {submitting ? 'Menolak...' : '✕ Tolak Pencairan'}
                  </button>
                </div>
              </>
            )}

            {/* [L4] FLAG — alasan ≥10 */}
            {drawerAction === 'flag' && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>
                  Flag untuk Review
                </h2>
                <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>
                  Tahap #{modal.item.stage_number} — {modal.item.campaigns?.title ?? '—'}
                </p>

                <div style={{
                  background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
                  borderRadius: 12, padding: 14, marginBottom: 20,
                }}>
                  <p style={{ fontSize: 12, color: '#F97316', lineHeight: 1.6 }}>
                    Pencairan akan ditandai sebagai "Sedang Direview". Mitra masih bisa melihat status ini.
                    Setelah review selesai, verifikasi atau tolak pencairan.
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: 8 }}>
                    ALASAN FLAG <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={e => setActionReason(e.target.value)}
                    placeholder="Misal: Bukti transfer tidak terbaca, perlu dokumen tambahan..."
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)', border: `1px solid ${actionReason.length > 0 && actionReason.length < 10 ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
                      color: '#F8FAFC', fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  {actionReason.length > 0 && actionReason.length < 10 && (
                    <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>
                      Minimal 10 karakter ({actionReason.length}/10)
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setDrawerAction(null)}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94A3B8', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleFlag}
                    disabled={submitting || actionReason.trim().length < 10}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 12,
                      cursor: (submitting || actionReason.trim().length < 10) ? 'not-allowed' : 'pointer',
                      background: (submitting || actionReason.trim().length < 10) ? 'rgba(249,115,22,0.4)' : '#F97316',
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {submitting ? 'Memflag...' : '⚑ Flag untuk Review'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </AdminAuthGuard>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({ t, icon, label, value, accent, highlight }: {
  t: any; icon: React.ReactNode; label: string; value: string;
  accent: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: t.mainBg, border: `1px solid ${highlight ? accent + '55' : t.sidebarBorder}`,
      borderRadius: 16, padding: 20,
      boxShadow: highlight ? `0 0 0 3px ${accent}10` : 'none',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: accent + '18',
        color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 12, color: t.textDim, fontWeight: 500, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color: t.textPrimary }}>{value}</p>
    </div>
  );
}

function ActionBtn({ children, label, color, onClick }: {
  children: React.ReactNode; label: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '5px 10px', borderRadius: 8, border: `1px solid ${color}33`,
        background: color + '15', color, fontSize: 11, fontWeight: 600,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {children} {label}
    </button>
  );
}

function DetailRow({ label, value, bold, children }: {
  label: string; value?: string; bold?: boolean; children?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, minWidth: 130, paddingTop: 2 }}>
        {label.toUpperCase()}
      </span>
      {children ?? (
        <span style={{ fontSize: 13, color: '#F8FAFC', fontWeight: bold ? 700 : 400, flex: 1 }}>
          {value ?? '—'}
        </span>
      )}
    </div>
  );
}

// [L3] Thumbnail bukti — PDF → link "Buka PDF"; gambar → thumb (klik = lightbox); gagal load → fallback.
function ImgThumb({ url, alt, onOpen }: { url: string; alt: string; onOpen: (u: string) => void }) {
  const [err, setErr] = useState(false);
  const isPdf = url.split('?')[0].toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return (
      <a
        href={url} target="_blank" rel="noreferrer"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
          aspectRatio: '1', borderRadius: 10, background: 'rgba(8,145,178,0.12)',
          border: '1px solid rgba(8,145,178,0.3)', color: '#0891B2', fontSize: 11, fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 20 }}>📄</span> Buka PDF
      </a>
    );
  }

  if (err) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        aspectRatio: '1', borderRadius: 10, background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', fontSize: 11, fontWeight: 600, textAlign: 'center',
      }}>
        <span style={{ fontSize: 18 }}>⚠</span> gagal muat
      </div>
    );
  }

  return (
    <button
      onClick={() => onOpen(url)}
      title="Perbesar"
      style={{
        padding: 0, aspectRatio: '1', borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in',
        border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url} alt={alt}
        onError={() => setErr(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </button>
  );
}

function PaginationBtn({ onClick, disabled, children }: {
  onClick: () => void; disabled: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        border: '1px solid rgba(255,255,255,0.1)',
        background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
        color: disabled ? '#475569' : '#CBD5E1',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
