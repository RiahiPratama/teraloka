'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useContext } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const Icons = {
  Check: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Eye: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  ExternalLink: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  Alert: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Shield: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
};

const STATUS_TABS = [
  { key: 'pending_review', label: 'Pending' },
  { key: 'active',         label: 'Aktif' },
  { key: 'completed',      label: 'Selesai' },
  { key: 'rejected',       label: 'Ditolak' },
  { key: '',               label: 'Semua' },
];

const CATEGORY_LABEL: Record<string, string> = {
  kesehatan: 'Kesehatan',
  bencana: 'Bencana',
  duka: 'Duka',
  anak_yatim: 'Anak Yatim',
  lansia: 'Lansia',
  hunian_darurat: 'Hunian Darurat',
};

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Campaign {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  beneficiary_name: string;
  beneficiary_relation: string;
  target_amount: number;
  collected_amount: number;
  donor_count: number;
  partner_name: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  cover_image_url?: string;
  proof_documents?: string[];
  is_urgent: boolean;
  is_verified: boolean;
  status: string;
  deadline?: string;
  rejection_reason?: string;
  created_at: string;
}

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
      display: 'flex', gap: 8, marginBottom: 24, borderBottom: `1px solid ${t.sidebarBorder}`,
      overflowX: 'auto',
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
              <span style={{ background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '2px 7px', borderRadius: 999, minWidth: 20, textAlign: 'center' }}>
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default function AdminCampaignsPage() {
  const { t } = useContext(AdminThemeContext);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const activeStatus = searchParams.get('status') ?? 'pending_review';
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pendingDonations, setPendingDonations] = useState(0);

  const [modal, setModal] = useState<{ type: 'approve' | 'reject' | 'detail'; campaign: Campaign } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchCampaigns = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: '50' });
    if (activeStatus) params.set('status', activeStatus);
    try {
      const res = await fetch(`${API_URL}/funding/admin/campaigns?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      setCampaigns(json.data ?? []);
    } catch { setCampaigns([]); }
    finally { setLoading(false); }
  }, [activeStatus]);

  const fetchCounts = useCallback(async () => {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    const statuses = ['pending_review', 'active', 'completed', 'rejected'];
    const results = await Promise.all(
      statuses.map(s =>
        fetch(`${API_URL}/funding/admin/campaigns?status=${s}&limit=1`, {
          headers: { Authorization: `Bearer ${tk}` },
        }).then(r => r.json()).catch(() => null)
      )
    );
    const next: Record<string, number> = {};
    statuses.forEach((s, i) => { next[s] = results[i]?.meta?.total ?? 0; });
    setCounts(next);

    const dRes = await fetch(`${API_URL}/funding/admin/donations?status=pending&limit=1`, {
      headers: { Authorization: `Bearer ${tk}` },
    }).then(r => r.json()).catch(() => null);
    setPendingDonations(dRes?.meta?.total ?? 0);
  }, []);

  useEffect(() => { fetchCampaigns(); fetchCounts(); }, [fetchCampaigns, fetchCounts]);

  function showToast(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleApprove(c: Campaign) {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/campaigns/${c.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal approve');
      showToast(true, `✓ "${c.title}" di-approve`);
      setModal(null);
      fetchCampaigns();
      fetchCounts();
    } catch (err: any) { showToast(false, err.message); }
    finally { setSubmitting(false); }
  }

  async function handleReject(c: Campaign) {
    if (rejectReason.trim().length < 10) {
      showToast(false, 'Alasan penolakan minimal 10 karakter');
      return;
    }
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/campaigns/${c.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal tolak');
      showToast(true, `✗ "${c.title}" ditolak`);
      setModal(null);
      setRejectReason('');
      fetchCampaigns();
      fetchCounts();
    } catch (err: any) { showToast(false, err.message); }
    finally { setSubmitting(false); }
  }

  function switchStatus(status: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (status) p.set('status', status);
    else p.delete('status');
    router.push(`/admin/funding/campaigns?${p.toString()}`);
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1280, color: t.textPrimary }}>

      <div style={{ marginBottom: 8 }}>
        <Link href="/admin/funding" style={{ fontSize: 12, color: t.textDim, textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span style={{ fontSize: 12, color: t.textMuted, margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>Kampanye</span>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
        Kelola Kampanye
      </h1>
      <p style={{ fontSize: 14, color: t.textDim, marginBottom: 24 }}>
        Verifikasi dokumen, approve kampanye yang memenuhi standar, atau tolak dengan alasan jelas.
      </p>

      <SubNav pendingCampaigns={counts.pending_review ?? 0} pendingDonations={pendingDonations} t={t} />

      {/* Status sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        {STATUS_TABS.map(tab => {
          const active = activeStatus === tab.key;
          const count = counts[tab.key] ?? 0;
          return (
            <button key={tab.key || 'all'} onClick={() => switchStatus(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                color: active ? '#fff' : t.textPrimary,
                background: active ? '#1F2937' : t.mainBg,
                border: `1px solid ${active ? '#1F2937' : t.sidebarBorder}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              {tab.label}
              {tab.key && (
                <span style={{
                  background: active ? 'rgba(255,255,255,0.2)' : (tab.key === 'pending_review' && count > 0 ? 'rgba(245,158,11,0.15)' : t.navHover),
                  color: active ? '#fff' : (tab.key === 'pending_review' && count > 0 ? '#F59E0B' : t.textDim),
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, padding: 60, textAlign: 'center', color: t.textDim, fontSize: 14 }}>
          Memuat kampanye...
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ background: t.mainBg, border: `1px solid ${t.sidebarBorder}`, borderRadius: 16, padding: 60, textAlign: 'center' }}>
          <p style={{ color: t.textPrimary, fontWeight: 600 }}>Tidak ada kampanye</p>
          <p style={{ color: t.textDim, fontSize: 13, marginTop: 4 }}>
            Tidak ada kampanye dengan status <strong>{STATUS_TABS.find(s => s.key === activeStatus)?.label ?? 'ini'}</strong>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map(c => (
            <CampaignCard key={c.id} campaign={c} t={t}
              onApprove={() => setModal({ type: 'approve', campaign: c })}
              onReject={() => setModal({ type: 'reject', campaign: c })}
              onDetail={() => setModal({ type: 'detail', campaign: c })} />
          ))}
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div onClick={() => !submitting && setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, overflowY: 'auto',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: t.mainBg, borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            width: '100%', maxWidth: 640, margin: '32px 0', maxHeight: '90vh',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${t.sidebarBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>
                {modal.type === 'approve' && '✓ Approve Kampanye'}
                {modal.type === 'reject'  && '✗ Tolak Kampanye'}
                {modal.type === 'detail'  && 'Detail Kampanye'}
              </h3>
              <button onClick={() => !submitting && setModal(null)}
                style={{ background: 'transparent', border: 'none', color: t.textDim, cursor: 'pointer', padding: 4 }}>
                <Icons.X />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {modal.type === 'approve' && (
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
                      <strong>Kampanye akan langsung publik.</strong> Pastikan:
                      <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                        <li>Identitas penerima valid</li>
                        <li>Rekening partner komunitas terverifikasi</li>
                        <li>Dokumen pendukung asli</li>
                      </ul>
                    </div>
                  </div>
                  <CampaignSummary c={modal.campaign} t={t} />
                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <button onClick={() => setModal(null)} disabled={submitting}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 12,
                        border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
                        color: t.textPrimary, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                      Batal
                    </button>
                    <button onClick={() => handleApprove(modal.campaign)} disabled={submitting}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                        background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
                        fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
                      {submitting ? 'Memproses...' : '✓ Ya, Approve'}
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
                      <strong>Alasan penolakan wajib jelas & spesifik.</strong> Pengaju akan melihat alasan ini.
                    </div>
                  </div>
                  <CampaignSummary c={modal.campaign} t={t} />
                  <div style={{ marginTop: 20 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 8 }}>
                      Alasan Penolakan <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Contoh: Dokumen identitas penerima tidak jelas. Mohon upload ulang KTP/KK yang readable."
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
                    <button onClick={() => handleReject(modal.campaign)}
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
                  <CampaignDetail c={modal.campaign} t={t} />
                  <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                    <a href={`/fundraising/${modal.campaign.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{
                        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '12px 16px', borderRadius: 12,
                        background: t.navHover, color: t.textPrimary,
                        fontWeight: 600, fontSize: 13, textDecoration: 'none',
                      }}>
                      <Icons.ExternalLink /> Buka Tab Baru
                    </a>
                    {modal.campaign.status === 'pending_review' && (
                      <>
                        <button onClick={() => setModal({ type: 'reject', campaign: modal.campaign })}
                          style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                            background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                          ✗ Tolak
                        </button>
                        <button onClick={() => setModal({ type: 'approve', campaign: modal.campaign })}
                          style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                            background: 'rgba(16,185,129,0.1)', color: '#10B981',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                          ✓ Approve
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
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

function CampaignCard({ campaign: c, onApprove, onReject, onDetail, t }: {
  campaign: Campaign;
  onApprove: () => void; onReject: () => void; onDetail: () => void;
  t: any;
}) {
  const pct = c.target_amount > 0
    ? Math.min(Math.round((c.collected_amount / c.target_amount) * 100), 100) : 0;

  const statusColor = {
    pending_review: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
    active:          { bg: 'rgba(16,185,129,0.12)', text: '#10B981' },
    completed:       { bg: t.navHover, text: t.textDim },
    rejected:        { bg: 'rgba(239,68,68,0.12)', text: '#EF4444' },
  }[c.status] ?? { bg: t.navHover, text: t.textDim };

  const statusLabel = ({
    pending_review: 'Pending', active: 'Aktif', completed: 'Selesai', rejected: 'Ditolak',
  } as any)[c.status] ?? c.status;

  return (
    <div style={{
      background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 16, padding: 16,
      display: 'flex', gap: 16, flexWrap: 'wrap',
    }}>
      {/* Image */}
      <div style={{
        width: 128, height: 128, borderRadius: 12, overflow: 'hidden',
        background: t.navHover, flexShrink: 0,
      }}>
        {c.cover_image_url ? (
          <img src={c.cover_image_url} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 11 }}>
            No image
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          <span style={{
            background: statusColor.bg, color: statusColor.text,
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {statusLabel}
          </span>
          {c.is_urgent && (
            <span style={{
              background: 'rgba(239,68,68,0.12)', color: '#EF4444',
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              textTransform: 'uppercase',
            }}>
              🔴 Urgent
            </span>
          )}
          <span style={{ fontSize: 10, color: t.textDim, fontWeight: 500, padding: '2px 4px' }}>
            {CATEGORY_LABEL[c.category] ?? c.category}
          </span>
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, marginBottom: 4, lineHeight: 1.35 }}>
          {c.title}
        </h3>
        <p style={{ fontSize: 12, color: t.textDim, marginBottom: 10 }}>
          untuk <strong style={{ color: t.textPrimary }}>{c.beneficiary_name}</strong>
          {' · '}Partner: <strong style={{ color: t.textPrimary }}>{c.partner_name}</strong>
        </p>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Stat t={t} label="Target" value={shortRupiah(c.target_amount)} />
          <Stat t={t} label="Terkumpul" value={`${shortRupiah(c.collected_amount)} (${pct}%)`} accent="#EC4899" />
          <Stat t={t} label="Donatur" value={(c.donor_count ?? 0).toString()} />
          <Stat t={t} label="Dibuat" value={formatDate(c.created_at)} />
        </div>

        {c.status === 'rejected' && c.rejection_reason && (
          <div style={{
            marginTop: 12, background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10,
            padding: '8px 12px',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              Alasan Penolakan
            </p>
            <p style={{ fontSize: 12, color: '#EF4444' }}>{c.rejection_reason}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <button onClick={onDetail} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          padding: '8px 14px', borderRadius: 10,
          border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
          color: t.textPrimary, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          <Icons.Eye /> Detail
        </button>
        {c.status === 'pending_review' && (
          <>
            <button onClick={onReject} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '8px 14px', borderRadius: 10, border: 'none',
              background: 'rgba(239,68,68,0.1)', color: '#EF4444',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              <Icons.X /> Tolak
            </button>
            <button onClick={onApprove} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '8px 14px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              <Icons.Check /> Approve
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent, t }: { label: string; value: string; accent?: string; t: any }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ fontSize: 13, fontWeight: 700, color: accent ?? t.textPrimary }}>{value}</p>
    </div>
  );
}

function CampaignSummary({ c, t }: { c: Campaign; t: any }) {
  return (
    <div style={{
      background: t.navHover, borderRadius: 12, padding: 14,
    }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>{c.title}</p>
      <p style={{ fontSize: 11, color: t.textDim, marginBottom: 10 }}>
        untuk {c.beneficiary_name} · {CATEGORY_LABEL[c.category] ?? c.category}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Target</p>
          <p style={{ fontWeight: 700, color: t.textPrimary }}>{shortRupiah(c.target_amount)}</p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Partner</p>
          <p style={{ fontWeight: 700, color: t.textPrimary }}>{c.partner_name}</p>
        </div>
      </div>
    </div>
  );
}

function CampaignDetail({ c, t }: { c: Campaign; t: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {c.cover_image_url && (
        <img src={c.cover_image_url} alt={c.title} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12 }} />
      )}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: t.textPrimary, marginBottom: 4, lineHeight: 1.3 }}>{c.title}</h2>
        <p style={{ fontSize: 13, color: t.textDim }}>
          untuk <strong style={{ color: t.textPrimary }}>{c.beneficiary_name}</strong>
          {c.beneficiary_relation && ` (${c.beneficiary_relation})`}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ background: t.navHover, borderRadius: 10, padding: 12 }}>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Target</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{shortRupiah(c.target_amount)}</p>
        </div>
        <div style={{ background: 'rgba(236,72,153,0.08)', borderRadius: 10, padding: 12 }}>
          <p style={{ fontSize: 10, color: '#EC4899', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Terkumpul</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#BE185D' }}>{shortRupiah(c.collected_amount)}</p>
        </div>
        <div style={{ background: t.navHover, borderRadius: 10, padding: 12 }}>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Donatur</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{c.donor_count ?? 0}</p>
        </div>
      </div>
      <div style={{ background: t.navHover, borderRadius: 12, padding: 14 }}>
        <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
          Partner Komunitas (Penerima Dana)
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{c.partner_name}</p>
        <div style={{ fontSize: 12, color: t.textDim, marginTop: 4 }}>
          <p>{c.bank_name} · <span style={{ fontFamily: 'monospace' }}>{c.bank_account_number}</span></p>
          <p>a.n. {c.bank_account_name}</p>
        </div>
      </div>
      <div>
        <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Deskripsi</p>
        <p style={{ fontSize: 13, color: t.textPrimary, whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 192, overflowY: 'auto' }}>
          {c.description}
        </p>
      </div>
      {c.proof_documents && c.proof_documents.length > 0 && (
        <div>
          <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
            Dokumen Pendukung ({c.proof_documents.length})
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {c.proof_documents.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                style={{ aspectRatio: '1', background: t.navHover, borderRadius: 10, overflow: 'hidden' }}>
                <img src={url} alt={`Dokumen ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
