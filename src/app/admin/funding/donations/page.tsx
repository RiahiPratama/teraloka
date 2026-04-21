'use client';

import { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import { formatRupiah } from '@/utils/format';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const ADMIN_ROLES = ['admin_funding', 'super_admin'];

// ── Icons ────────────────────────────────────────────────
const Icons = {
  Loader:       () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Check:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:            () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Eye:          () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Search:       () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Clock:        () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  CheckCircle:  () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  XCircle:      () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  RefreshCw:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Shield:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  Alert:        () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  ShieldAlert:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  FileText:     () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
};

const STATUS_TABS = [
  { key: 'pending',  label: 'Menunggu' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Ditolak' },
  { key: '',         label: 'Semua'    },
];

interface Donation {
  id: string;
  donor_name: string;
  donor_phone: string | null;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  total_transfer: number;
  donation_code: string;
  message: string | null;
  transfer_proof_url: string | null;
  verification_status: string;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  campaign_id: string;
  campaign: { id?: string; title: string; slug: string } | null;
}

function relativeTime(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

// ── Sub-Nav ─────────────────────────────────────────────
function SubNav({ pendingCampaigns, pendingDonations, t }: { pendingCampaigns: number; pendingDonations: number; t: any }) {
  const pathname = usePathname();
  const tabs = [
    { href: '/admin/funding',          label: 'Dashboard' },
    { href: '/admin/funding/campaigns', label: 'Kampanye', badge: pendingCampaigns },
    { href: '/admin/funding/donations', label: 'Donasi',    badge: pendingDonations },
    { href: '/admin/funding/settings',  label: 'Pengaturan' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 8, marginBottom: 24,
      borderBottom: `1px solid ${t.sidebarBorder}`, overflowX: 'auto',
    }}>
      {tabs.map(tab => {
        const active = pathname === tab.href
          || (tab.href !== '/admin/funding' && pathname.startsWith(tab.href));
        return (
          <Link key={tab.href} href={tab.href}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', fontSize: 13, fontWeight: 600,
              color: active ? '#EC4899' : t.textDim,
              borderBottom: active ? '2px solid #EC4899' : '2px solid transparent',
              marginBottom: -1, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
            {tab.label}
            {!!tab.badge && tab.badge > 0 && (
              <span style={{
                background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '2px 7px', borderRadius: 999, minWidth: 20, textAlign: 'center',
              }}>{tab.badge}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function AdminDonationsPage() {
  const { t } = useContext(AdminThemeContext);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading } = useAuth();

  const activeStatus = searchParams.get('status') ?? 'pending';

  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState({ pending: 0, verifiedToday: 0, rejectedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [pendingCampaigns, setPendingCampaigns] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const [modal, setModal] = useState<{ type: 'verify' | 'reject' | 'detail'; d: Donation } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!ADMIN_ROLES.includes(user.role)) { router.push('/'); return; }
  }, [user, authLoading, router]);

  const fetchDonations = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (activeStatus) params.set('status', activeStatus);

      const res = await fetch(`${API}/funding/admin/donations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setDonations(json.data ?? []);
        if (json.stats) setStats(json.stats);
      } else {
        setDonations([]);
      }
    } catch {
      setDonations([]);
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  const fetchPendingCampaigns = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      const res = await fetch(`${API}/funding/admin/campaigns?status=pending_review&limit=1`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      setPendingCampaigns(json?.meta?.total ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (user && ADMIN_ROLES.includes(user.role)) {
      fetchDonations();
      fetchPendingCampaigns();
    }
  }, [user, fetchDonations, fetchPendingCampaigns]);

  const filteredDonations = useMemo(() => {
    if (!searchQuery.trim()) return donations;
    const q = searchQuery.toLowerCase();
    return donations.filter(d =>
      d.donor_name.toLowerCase().includes(q) ||
      (d.campaign?.title.toLowerCase().includes(q) ?? false) ||
      d.donation_code.toLowerCase().includes(q)
    );
  }, [donations, searchQuery]);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleVerify(d: Donation) {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/funding/donations/${d.id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal verify');
      showToast(true, `✓ Donasi ${d.donation_code} diverifikasi`);
      setModal(null);
      fetchDonations();
    } catch (err: any) {
      showToast(false, err.message);
    } finally { setSubmitting(false); }
  }

  async function handleReject(d: Donation) {
    if (rejectReason.trim().length < 10) {
      showToast(false, 'Alasan penolakan minimal 10 karakter');
      return;
    }
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/funding/donations/${d.id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal tolak');
      showToast(true, `✗ Donasi ${d.donation_code} ditolak`);
      setModal(null);
      setRejectReason('');
      fetchDonations();
    } catch (err: any) {
      showToast(false, err.message);
    } finally { setSubmitting(false); }
  }

  function switchStatus(status: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (status) p.set('status', status);
    else p.delete('status');
    router.push(`/admin/funding/donations?${p.toString()}`);
  }

  if (authLoading || !user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textDim }}>
        <Icons.Loader />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, color: t.textPrimary }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Donasi</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
            Verifikasi Donasi
          </h1>
          <p style={{ fontSize: 14, color: t.textDim }}>
            Review & verifikasi donasi BADONASI yang sudah upload bukti transfer.
          </p>
        </div>
        <button onClick={fetchDonations} disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
            color: t.textPrimary, fontSize: 13, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
          }}>
          <Icons.RefreshCw /> Refresh
        </button>
      </div>

      <SubNav pendingCampaigns={pendingCampaigns} pendingDonations={stats.pending} t={t} />

      {/* Stats Row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12, marginBottom: 20,
      }}>
        <StatCard t={t} icon={<Icons.Clock />} label="Menunggu Review"
          value={stats.pending.toLocaleString('id-ID')} accent="#F59E0B"
          highlight={stats.pending > 0} />
        <StatCard t={t} icon={<Icons.CheckCircle />} label="Verified Hari Ini"
          value={stats.verifiedToday.toLocaleString('id-ID')} accent="#10B981" />
        <StatCard t={t} icon={<Icons.XCircle />} label="Rejected Hari Ini"
          value={stats.rejectedToday.toLocaleString('id-ID')} accent="#EF4444" />
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {STATUS_TABS.map(tab => {
          const active = activeStatus === tab.key;
          return (
            <button key={tab.key || 'all'} onClick={() => switchStatus(tab.key)}
              style={{
                padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                color: active ? '#fff' : t.textPrimary,
                background: active ? '#1F2937' : t.mainBg,
                border: `1px solid ${active ? '#1F2937' : t.sidebarBorder}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: t.textDim }}>
          <Icons.Search />
        </span>
        <input
          type="text"
          placeholder="Cari by nama donor, campaign, atau kode donasi..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '11px 14px 11px 40px',
            borderRadius: 12, border: `1px solid ${t.sidebarBorder}`,
            background: t.mainBg, color: t.textPrimary,
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* List */}
      <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', color: t.textDim }}><Icons.Loader /></div>
          </div>
        ) : filteredDonations.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{
              margin: '0 auto 12px', width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(16,185,129,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981',
            }}>
              <Icons.CheckCircle />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
              {searchQuery ? 'Tidak ada hasil' : (activeStatus === 'pending' ? 'Semua donasi sudah diverifikasi' : 'Tidak ada donasi')}
            </p>
            <p style={{ fontSize: 13, color: t.textDim }}>
              {searchQuery ? 'Coba keyword lain.' : 'Belum ada donasi di status ini.'}
            </p>
          </div>
        ) : (
          <div>
            {filteredDonations.map((d, idx) => (
              <DonationRow key={d.id} d={d} t={t}
                isLast={idx === filteredDonations.length - 1}
                onDetail={() => setModal({ type: 'detail', d })}
                onVerify={() => setModal({ type: 'verify', d })}
                onReject={() => setModal({ type: 'reject', d })} />
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div style={{
        marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 8,
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
        borderRadius: 12, padding: 12,
      }}>
        <span style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }}><Icons.ShieldAlert /></span>
        <p style={{ fontSize: 12, color: '#F59E0B', lineHeight: 1.5 }}>
          <strong>Tips verify:</strong> Pastikan nominal transfer di bukti sama persis dengan <strong>Total Transfer</strong> (amount + fee + kode unik 3 digit). Kalau beda 1 rupiah aja, reject dengan alasan jelas.
        </p>
      </div>

      {/* MODAL */}
      {modal && (
        <div onClick={() => !submitting && setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: t.mainBg, borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            width: '100%', maxWidth: 560, margin: '32px 0', maxHeight: '90vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${t.sidebarBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>
                {modal.type === 'verify' && '✓ Verify Donasi'}
                {modal.type === 'reject' && '✗ Tolak Donasi'}
                {modal.type === 'detail' && 'Detail Donasi'}
              </h3>
              <button onClick={() => !submitting && setModal(null)}
                style={{ background: 'transparent', border: 'none', color: t.textDim, cursor: 'pointer', padding: 4 }}>
                <Icons.X />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {modal.type === 'verify' && (
                <>
                  <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 12, padding: 14, marginBottom: 16,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#10B981', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}><Icons.Shield /></div>
                    <div style={{ fontSize: 12, color: '#10B981', lineHeight: 1.5 }}>
                      <strong>Sudah cek bukti transfer?</strong> Pastikan:
                      <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                        <li>Nominal sama persis dengan <strong>Total Transfer</strong></li>
                        <li>Rekening tujuan cocok dengan partner komunitas</li>
                        <li>Waktu transfer masuk akal</li>
                      </ul>
                    </div>
                  </div>
                  <DonationSummary d={modal.d} t={t} />
                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button onClick={() => setModal(null)} disabled={submitting}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 12,
                        border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
                        color: t.textPrimary, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                      Batal
                    </button>
                    <button onClick={() => handleVerify(modal.d)} disabled={submitting}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
                        fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                      {submitting ? 'Memproses...' : '✓ Ya, Verify'}
                    </button>
                  </div>
                </>
              )}

              {modal.type === 'reject' && (
                <>
                  <div style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 12, padding: 14, marginBottom: 16,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#EF4444', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}><Icons.Alert /></div>
                    <div style={{ fontSize: 12, color: '#EF4444', lineHeight: 1.5 }}>
                      <strong>Alasan penolakan wajib jelas.</strong> Donor akan menerima notifikasi.
                    </div>
                  </div>
                  <DonationSummary d={modal.d} t={t} />
                  <div style={{ marginTop: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 8 }}>
                      Alasan Penolakan <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Contoh: Nominal transfer tidak sesuai dengan Total Transfer yang diminta."
                      rows={4} maxLength={500} disabled={submitting}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        border: `1px solid ${t.sidebarBorder}`, background: t.mainBg,
                        color: t.textPrimary, fontSize: 13, resize: 'none',
                        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                      }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <p style={{ fontSize: 11, color: t.textMuted }}>Minimal 10 karakter.</p>
                      <p style={{ fontSize: 11, color: t.textMuted }}>{rejectReason.length}/500</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button onClick={() => { setModal(null); setRejectReason(''); }} disabled={submitting}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 12,
                        border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
                        color: t.textPrimary, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                      Batal
                    </button>
                    <button onClick={() => handleReject(modal.d)}
                      disabled={submitting || rejectReason.trim().length < 10}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff',
                        fontWeight: 700, fontSize: 14,
                        cursor: rejectReason.trim().length < 10 ? 'not-allowed' : 'pointer',
                        opacity: rejectReason.trim().length < 10 || submitting ? 0.5 : 1 }}>
                      {submitting ? 'Memproses...' : '✗ Tolak'}
                    </button>
                  </div>
                </>
              )}

              {modal.type === 'detail' && (
                <>
                  <DonationDetail d={modal.d} t={t} />
                  {modal.d.verification_status === 'pending' && (
                    <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                      <button onClick={() => setModal({ type: 'reject', d: modal.d })}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                          background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                          fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        ✗ Tolak
                      </button>
                      <button onClick={() => setModal({ type: 'verify', d: modal.d })}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                          background: 'rgba(16,185,129,0.1)', color: '#10B981',
                          fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        ✓ Verify
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 60,
          padding: '12px 20px', borderRadius: 12,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          fontWeight: 600, fontSize: 14, maxWidth: 400,
          boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatCard({ t, icon, label, value, accent, highlight }: {
  t: any; icon: React.ReactNode; label: string; value: string;
  accent: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: t.mainBg,
      border: `1px solid ${highlight ? accent + '55' : t.sidebarBorder}`,
      borderRadius: 16, padding: 18,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: accent + '18', color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{icon}</div>
      <div>
        <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary }}>{value}</p>
      </div>
    </div>
  );
}

function DonationRow({ d, t, isLast, onDetail, onVerify, onReject }: {
  d: Donation; t: any; isLast: boolean;
  onDetail: () => void; onVerify: () => void; onReject: () => void;
}) {
  const isPending = d.verification_status === 'pending';
  return (
    <div style={{
      padding: '16px 20px', borderBottom: isLast ? 'none' : `1px solid ${t.sidebarBorder}`,
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.2))',
        color: '#F59E0B',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        fontSize: 14, fontWeight: 700,
      }}>
        {d.is_anonymous ? '?' : d.donor_name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
            {d.is_anonymous ? 'Anonim' : d.donor_name}
          </p>
          {d.is_anonymous && (
            <span style={{ fontSize: 9, fontWeight: 700, color: t.textDim, background: t.navHover,
              padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>Anonim</span>
          )}
          {d.message && <span style={{ color: '#EC4899' }}><Icons.FileText /></span>}
          {d.verification_status !== 'pending' && (
            <StatusBadge status={d.verification_status} />
          )}
        </div>
        <p style={{ fontSize: 12, color: t.textDim, marginBottom: 4 }}>
          {d.campaign?.title ?? 'Campaign tidak dikenal'}
        </p>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: t.textMuted }}>
          <span>Kode: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: t.textDim }}>{d.donation_code}</span></span>
          <span>·</span>
          <span>{relativeTime(d.created_at)}</span>
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: t.textPrimary }}>{formatRupiah(d.amount)}</p>
        {d.operational_fee > 0 && (
          <p style={{ fontSize: 10, color: '#BA7517' }}>+{formatRupiah(d.operational_fee)} ops</p>
        )}
        <p style={{ fontSize: 10, color: t.textMuted, fontFamily: 'monospace', marginTop: 2 }}>
          Transfer {formatRupiah(d.total_transfer)}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onDetail} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          padding: '7px 12px', borderRadius: 8,
          border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
          color: t.textPrimary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          <Icons.Eye /> Detail
        </button>
        {isPending && (
          <>
            <button onClick={onReject} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '7px 12px', borderRadius: 8, border: 'none',
              background: 'rgba(239,68,68,0.1)', color: '#EF4444',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              <Icons.X />
            </button>
            <button onClick={onVerify} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '7px 12px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              <Icons.Check /> Verify
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    verified: { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: 'Verified' },
    rejected: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', label: 'Ditolak' },
    pending:  { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'Pending' },
  }[status] ?? { bg: '#e5e7eb', color: '#374151', label: status };
  return (
    <span style={{
      background: styles.bg, color: styles.color,
      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>{styles.label}</span>
  );
}

function DonationSummary({ d, t }: { d: Donation; t: any }) {
  return (
    <div style={{ background: t.navHover, borderRadius: 12, padding: 14 }}>
      <p style={{ fontSize: 13, color: t.textDim, marginBottom: 4 }}>
        <strong style={{ color: t.textPrimary }}>{d.is_anonymous ? 'Anonim' : d.donor_name}</strong>
        {' · '}
        {d.campaign?.title ?? 'Campaign'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Amount</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{formatRupiah(d.amount)}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Fee Ops</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{formatRupiah(d.operational_fee)}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Total</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#EC4899' }}>{formatRupiah(d.total_transfer)}</p>
        </div>
      </div>
      <p style={{ fontSize: 11, color: t.textMuted, marginTop: 10 }}>
        Kode: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: t.textDim }}>{d.donation_code}</span>
      </p>
    </div>
  );
}

function DonationDetail({ d, t }: { d: Donation; t: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DonationSummary d={d} t={t} />

      {d.message && (
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Pesan / Doa</p>
          <div style={{
            background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)',
            borderRadius: 10, padding: 12,
          }}>
            <p style={{ fontSize: 13, fontStyle: 'italic', color: t.textPrimary, lineHeight: 1.5 }}>
              "{d.message}"
            </p>
          </div>
        </div>
      )}

      {d.donor_phone && (
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Nomor HP</p>
          <p style={{ fontSize: 13, color: t.textPrimary, fontFamily: 'monospace' }}>{d.donor_phone}</p>
        </div>
      )}

      {d.transfer_proof_url && (
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Bukti Transfer</p>
          <a href={d.transfer_proof_url} target="_blank" rel="noopener noreferrer">
            <img src={d.transfer_proof_url} alt="Bukti transfer"
              style={{ width: '100%', borderRadius: 10, border: `1px solid ${t.sidebarBorder}` }} />
          </a>
        </div>
      )}

      {d.verification_status === 'rejected' && d.rejection_reason && (
        <div>
          <p style={{ fontSize: 10, color: '#EF4444', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Alasan Penolakan</p>
          <div style={{
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: 12,
          }}>
            <p style={{ fontSize: 13, color: '#EF4444' }}>{d.rejection_reason}</p>
          </div>
        </div>
      )}

      {d.campaign?.slug && (
        <a href={`/fundraising/${d.campaign.slug}`} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 10,
            background: t.navHover, color: t.textPrimary,
            fontSize: 13, fontWeight: 600, textDecoration: 'none', alignSelf: 'flex-start',
          }}>
          Lihat Campaign →
        </a>
      )}
    </div>
  );
}
