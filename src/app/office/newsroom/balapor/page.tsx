'use client';

import { useEffect, useState, useCallback, useContext } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Report {
  id: string;
  title: string;
  body: string | null;
  status: string;
  category: string | null;
  anonymity_level: string | null;
  risk_score: number | null;
  reporter_id: string | null;
  location: string | null;
  photos: string[] | null;
  created_at: string;
  priority: 'urgent' | 'high' | 'normal';
  is_spam: boolean;
  forwarded_at: string | null;
}

interface Identity {
  phone: string;
  name: string | null;
  joined_at: string;
}

const PRIORITY_STYLE = {
  urgent: { bg: 'rgba(239,68,68,0.12)',  color: '#EF4444', label: '🔴 Urgent', border: '#EF4444' },
  high:   { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '🟠 High',   border: '#F59E0B' },
  normal: { bg: 'rgba(107,114,128,0.1)', color: '#6B7280', label: '⚪ Normal', border: '#6B7280' },
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.12)',  color: '#D97706', label: 'Pending'  },
  verified: { bg: 'rgba(16,185,129,0.12)',  color: '#059669', label: 'Verified' },
  rejected: { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444', label: 'Ditolak'  },
  archived: { bg: 'rgba(107,114,128,0.12)', color: '#6B7280', label: 'Arsip'    },
};

const ANON_LABEL: Record<string, string> = {
  anonim:      '🕵️ Anonim',
  pseudonym:   '✏️ Nama Samaran',
  nama_terang: '👤 Nama Terang',
};

const FILTER_TABS = [
  { value: '',        label: 'Queues',      icon: '📋' },
  { value: 'urgent',  label: 'Urgent',      icon: '🔴', isPriority: true },
  { value: 'high',    label: 'High',        icon: '🟠', isPriority: true },
  { value: 'normal',  label: 'Normal',      icon: '⚪', isPriority: true },
  { value: 'verified',label: 'In Review',   icon: '🔍' },
  { value: 'all',     label: 'All Reports', icon: '📂' },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function formatPhone(phone: string) {
  return phone.startsWith('62') ? '+62 ' + phone.slice(2) : phone;
}

export default function BalaporPage() {
  const { token, user } = useAuth();
  const { t } = useContext(AdminThemeContext);
  const isSuperAdmin = user?.role === 'super_admin';

  const [reports, setReports]       = useState<Report[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [activeFilter, setFilter]   = useState('');
  const [expandedId, setExpanded]   = useState<string | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [actionLoading, setAction]  = useState<string | null>(null);
  const [convertLoading, setConvert]= useState<string | null>(null);

  // Identity modal
  const [identityModal, setIdentityModal]   = useState<{ reportId: string; reportTitle: string } | null>(null);
  const [identityReason, setIdentityReason] = useState('');
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityResult, setIdentityResult] = useState<{ identity: Identity | null; message?: string; reason: string } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (activeFilter === 'urgent' || activeFilter === 'high' || activeFilter === 'normal') {
        params.set('priority', activeFilter);
      } else if (activeFilter && activeFilter !== 'all') {
        params.set('status', activeFilter);
      }
      const res  = await fetch(`${API_URL}/admin/reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setReports(data.data.data);
      setTotal(data.data.total);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat', false);
    } finally {
      setLoading(false);
    }
  }, [token, activeFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const updateStatus = async (id: string, action: 'verified' | 'rejected', title: string) => {
    if (!token) return;
    setAction(id + action);
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${id}/${action === 'verified' ? 'verify' : 'reject'}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(action === 'verified' ? `✓ "${title.slice(0,30)}" diverifikasi` : `"${title.slice(0,30)}" ditolak`);
      fetchReports();
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setAction(null); }
  };

  const setPriority = async (id: string, priority: string, title: string) => {
    if (!token) return;
    setAction(id + 'priority');
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${id}/priority`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ priority }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`Priority "${title.slice(0,25)}" → ${priority}`);
      fetchReports();
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setAction(null); }
  };

  const markSpam = async (id: string, title: string) => {
    if (!token) return;
    setAction(id + 'spam');
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${id}/spam`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_spam: true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`"${title.slice(0,30)}" ditandai spam`);
      setExpanded(null);
      fetchReports();
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setAction(null); }
  };

  const forwardReport = async (id: string, title: string) => {
    if (!token) return;
    setAction(id + 'forward');
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${id}/forward`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`✓ Laporan diteruskan`);
      fetchReports();
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setAction(null); }
  };

  const convertToArticle = async (id: string, title: string) => {
    if (!token) return;
    if (!confirm(`Convert "${title.slice(0,40)}..." jadi draft artikel via AI?`)) return;
    setConvert(id);
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${id}/convert`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast('✨ Draft artikel berhasil dibuat!');
      fetchReports();
    } catch (err: any) { showToast(err.message || 'Gagal convert', false); }
    finally { setConvert(null); }
  };

  const deleteReport = async (id: string, title: string) => {
    if (!token) return;
    if (!confirm(`Hapus "${title.slice(0,50)}" permanen?`)) return;
    setAction(id + 'delete');
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`Laporan dihapus`);
      setExpanded(null);
      fetchReports();
    } catch (err: any) { showToast(err.message || 'Gagal hapus', false); }
    finally { setAction(null); }
  };

  const openIdentity = async () => {
    if (!token || !identityModal || identityReason.trim().length < 5) return;
    setIdentityLoading(true);
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${identityModal.reportId}/identity?reason=${encodeURIComponent(identityReason.trim())}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setIdentityResult({ identity: data.data.identity, message: data.data.message, reason: identityReason.trim() });
    } catch (err: any) { showToast(err.message || 'Gagal', false); }
    finally { setIdentityLoading(false); }
  };

  const closeIdentityModal = () => { setIdentityModal(null); setIdentityReason(''); setIdentityResult(null); };

  // Stats
  const urgentCount  = reports.filter(r => r.priority === 'urgent').length;
  const highCount    = reports.filter(r => r.priority === 'high').length;
  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const resolvedCount= reports.filter(r => r.status === 'verified').length;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .rpt-hover:hover  { background: ${t.navHover} !important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99, background: toast.ok ? '#10B981' : '#EF4444', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Identity Modal */}
      {identityModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: t.sidebar, borderRadius: 16, padding: 24, maxWidth: 440, width: '100%', border: `1px solid ${t.sidebarBorder}` }}>
            {!identityResult ? (
              <>
                <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🔍</div>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: t.textPrimary, textAlign: 'center', marginBottom: 4 }}>Buka Identitas Pelapor</h3>
                <p style={{ color: t.textDim, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>"{identityModal.reportTitle.slice(0, 50)}"</p>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#EF4444' }}>
                  ⚠️ Tindakan ini dicatat dalam audit log.
                </div>
                <textarea value={identityReason} onChange={e => setIdentityReason(e.target.value)}
                  placeholder="Alasan membuka identitas... (min. 5 karakter)" rows={3} autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `2px solid ${t.sidebarBorder}`, fontSize: 13, outline: 'none', marginBottom: 6, boxSizing: 'border-box', resize: 'vertical', background: t.mainBg, color: t.textPrimary }} />
                <p style={{ fontSize: 11, color: identityReason.trim().length < 5 ? '#EF4444' : '#10B981', marginBottom: 16 }}>
                  {identityReason.trim().length}/5 karakter minimum
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeIdentityModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, background: t.sidebar, color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button onClick={openIdentity} disabled={identityLoading || identityReason.trim().length < 5}
                    style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: identityReason.trim().length >= 5 ? '#EF4444' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: identityReason.trim().length >= 5 ? 'pointer' : 'not-allowed' }}>
                    {identityLoading ? 'Membuka...' : '🔓 Buka Identitas'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>{identityResult.identity ? '👤' : '🕵️'}</div>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: t.textPrimary, textAlign: 'center', marginBottom: 16 }}>
                  {identityResult.identity ? 'Identitas Pelapor' : 'Pelapor Anonim Murni'}
                </h3>
                {identityResult.identity ? (
                  <div style={{ background: t.mainBg, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>NOMOR WA</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: t.textPrimary, marginTop: 2, marginBottom: 10 }}>{formatPhone(identityResult.identity.phone)}</div>
                    <div style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>NAMA</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: t.textMuted, marginTop: 2 }}>{identityResult.identity.name || 'Belum isi nama'}</div>
                  </div>
                ) : (
                  <div style={{ background: t.mainBg, borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center', color: t.textDim, fontSize: 13 }}>
                    {identityResult.message || 'Laporan dikirim tanpa akun.'}
                  </div>
                )}
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#92400E' }}>
                  📋 Alasan: <em>"{identityResult.reason}"</em>
                </div>
                <button onClick={closeIdentityModal} style={{ width: '100%', padding: 10, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, background: t.sidebar, color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Tutup</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.4px' }}>🚨 BALAPOR Incident Management</h1>
          <p style={{ color: t.textDim, fontSize: 13, marginTop: 3 }}>{total} laporan masuk</p>
        </div>
        <Link href="/office/newsroom/bakabar/hub" style={{ fontSize: 13, color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '8px 16px', background: '#1B6B4A', borderRadius: 10 }}>
          + Tulis Cepat
        </Link>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Pending', value: pendingCount,  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)'  },
          { label: 'Urgent',  value: urgentCount,   color: '#EF4444', bg: 'rgba(239,68,68,0.08)'   },
          { label: 'In Review',value: resolvedCount, color: '#0891B2', bg: 'rgba(8,145,178,0.08)'   },
          { label: 'Total',   value: total,         color: '#1B6B4A', bg: 'rgba(27,107,74,0.08)'   },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 16px', border: `1px solid ${s.color}22` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: t.textDim, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {FILTER_TABS.map(f => {
          const isActive = activeFilter === f.value;
          const urgentBadge = f.value === 'urgent' ? urgentCount : f.value === 'high' ? highCount : null;
          return (
            <button key={f.value} onClick={() => setFilter(f.value)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 20, border: `1px solid ${isActive ? '#1B6B4A' : t.sidebarBorder}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: isActive ? '#1B6B4A' : t.sidebar, color: isActive ? '#fff' : t.textMuted, whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0 }}>
              {f.icon} {f.label}
              {urgentBadge !== null && urgentBadge > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '0 5px', borderRadius: 99, background: isActive ? 'rgba(255,255,255,0.25)' : '#EF4444', color: '#fff' }}>
                  {urgentBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: t.textDim }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #EF4444', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Memuat laporan...
        </div>
      )}

      {/* Empty */}
      {!loading && reports.length === 0 && (
        <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <p style={{ color: t.textDim, fontSize: 13 }}>Tidak ada laporan</p>
        </div>
      )}

      {/* Reports list */}
      {!loading && reports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map(r => {
            const st   = STATUS_STYLE[r.status]   ?? { bg: t.navHover, color: t.textDim,   label: r.status   };
            const pr   = PRIORITY_STYLE[r.priority] ?? PRIORITY_STYLE.normal;
            const isEx = expandedId === r.id;

            return (
              <div key={r.id} style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${isEx ? pr.border + '60' : t.sidebarBorder}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>

                {/* Row header */}
                <div onClick={() => setExpanded(isEx ? null : r.id)}
                  className="rpt-hover"
                  style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.15s' }}>

                  {/* Priority indicator */}
                  <div style={{ width: 4, height: 40, borderRadius: 4, background: pr.color, flexShrink: 0 }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>{r.title}</span>
                      <span style={{ background: pr.bg, color: pr.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{pr.label}</span>
                      <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{st.label}</span>
                      {r.photos && r.photos.length > 0 && (
                        <span style={{ background: 'rgba(8,145,178,0.1)', color: '#0891B2', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>📷 {r.photos.length}</span>
                      )}
                      {r.forwarded_at && (
                        <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>✈️ Diteruskan</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: t.textDim }}>
                      {r.category || '—'} · {ANON_LABEL[r.anonymity_level || ''] || '—'} · {r.location || '—'} · {timeAgo(r.created_at)}
                    </div>
                  </div>

                  {/* Quick priority selector */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {(['urgent', 'high', 'normal'] as const).map(p => (
                      <button key={p} onClick={() => setPriority(r.id, p, r.title)}
                        disabled={actionLoading === r.id + 'priority' || r.priority === p}
                        title={`Set ${p}`}
                        style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${r.priority === p ? PRIORITY_STYLE[p].color : t.sidebarBorder}`, background: r.priority === p ? PRIORITY_STYLE[p].bg : 'transparent', cursor: r.priority === p ? 'default' : 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {p === 'urgent' ? '🔴' : p === 'high' ? '🟠' : '⚪'}
                      </button>
                    ))}
                  </div>

                  <span style={{ color: t.textDim, fontSize: 12, flexShrink: 0 }}>{isEx ? '▲' : '▼'}</span>
                </div>

                {/* Expanded content */}
                {isEx && (
                  <div style={{ borderTop: `1px solid ${t.sidebarBorder}`, padding: '16px' }}>

                    {/* Body */}
                    {r.body && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Isi Laporan</div>
                        <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7, whiteSpace: 'pre-wrap', background: t.mainBg, padding: '12px 14px', borderRadius: 10, border: `1px solid ${t.sidebarBorder}` }}>{r.body}</p>
                      </div>
                    )}

                    {/* Photos */}
                    {r.photos && r.photos.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Foto Bukti</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {r.photos.map((p, i) => (
                            <a key={i} href={p} target="_blank" rel="noopener noreferrer">
                              <img src={p} alt={`Foto ${i+1}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: `1px solid ${t.sidebarBorder}` }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

                      {/* Verifikasi / Tolak */}
                      {r.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(r.id, 'verified', r.title)} disabled={actionLoading === r.id + 'verified'}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {actionLoading === r.id + 'verified' ? '...' : '✓ Verifikasi'}
                          </button>
                          <button onClick={() => updateStatus(r.id, 'rejected', r.title)} disabled={actionLoading === r.id + 'rejected'}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {actionLoading === r.id + 'rejected' ? '...' : '✕ Tolak'}
                          </button>
                        </>
                      )}

                      {/* Forward */}
                      <button onClick={() => forwardReport(r.id, r.title)} disabled={actionLoading === r.id + 'forward' || !!r.forwarded_at}
                        style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${r.forwarded_at ? t.sidebarBorder : 'rgba(27,107,74,0.3)'}`, background: r.forwarded_at ? 'transparent' : 'rgba(27,107,74,0.08)', color: r.forwarded_at ? t.textDim : '#1B6B4A', fontSize: 12, fontWeight: 700, cursor: r.forwarded_at ? 'default' : 'pointer' }}>
                        {actionLoading === r.id + 'forward' ? '...' : r.forwarded_at ? '✈️ Diteruskan' : '✈️ Forward'}
                      </button>

                      {/* Convert to artikel */}
                      {r.status === 'verified' && (
                        <button onClick={() => convertToArticle(r.id, r.title)} disabled={convertLoading === r.id}
                          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(8,145,178,0.3)', background: 'rgba(8,145,178,0.08)', color: '#0891B2', fontSize: 12, fontWeight: 700, cursor: convertLoading === r.id ? 'wait' : 'pointer', opacity: convertLoading === r.id ? 0.6 : 1 }}>
                          {convertLoading === r.id ? '⏳ AI menulis...' : '📰 Buat Berita'}
                        </button>
                      )}

                      {/* Super Admin only */}
                      {isSuperAdmin && (
                        <>
                          <button onClick={() => markSpam(r.id, r.title)} disabled={actionLoading === r.id + 'spam'}
                            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(107,114,128,0.2)', background: 'transparent', color: t.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {actionLoading === r.id + 'spam' ? '...' : '🚫 Tanda Spam'}
                          </button>
                          <button onClick={() => { setIdentityModal({ reportId: r.id, reportTitle: r.title }); setIdentityResult(null); setIdentityReason(''); }}
                            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            🔍 Buka Identitas
                          </button>
                          <button onClick={() => deleteReport(r.id, r.title)} disabled={actionLoading === r.id + 'delete'}
                            style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: t.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EF4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textDim; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            {actionLoading === r.id + 'delete' ? '...' : '🗑 Hapus'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
