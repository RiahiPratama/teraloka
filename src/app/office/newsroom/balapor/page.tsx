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
}

interface Identity {
  phone: string;
  name: string | null;
  joined_at: string;
}

const REPORT_STATUS: Record<string, { bg: string; color: string; label: string }> = {
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Kemarin';
  return `${d} hari lalu`;
}

function formatPhone(phone: string) {
  return phone.startsWith('62') ? '+62 ' + phone.slice(2) : phone;
}

const STATUS_FILTERS = [
  { value: '',         label: 'Semua'   },
  { value: 'pending',  label: 'Pending' },
  { value: 'verified', label: 'Verified'},
  { value: 'rejected', label: 'Ditolak' },
];

export default function BakabarReportsPage() {
  const { token } = useAuth();
  const { t } = useContext(AdminThemeContext);

  const [reports, setReports]           = useState<Report[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setAction]      = useState<string | null>(null);
  const [statusFilter, setStatus]       = useState('');
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [convertLoading, setConvert]    = useState<string | null>(null);
  const [convertResult, setConvertResult] = useState<{ id: string; title: string; slug: string } | null>(null);

  const [identityModal, setIdentityModal] = useState<{ reportId: string; reportTitle: string } | null>(null);
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
      if (statusFilter) params.set('status', statusFilter);
      const res  = await fetch(`${API_URL}/admin/reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setReports(data.data.data);
      setTotal(data.data.total);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat laporan', false);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const updateStatus = async (id: string, action: 'verified' | 'rejected', title: string) => {
    if (!token) return;
    setAction(id + action);
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${id}/${action === 'verified' ? 'verify' : 'reject'}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(action === 'verified' ? `"${title.slice(0,30)}" diverifikasi ✓` : `"${title.slice(0,30)}" ditolak`);
      fetchReports();
    } catch (err: any) {
      showToast(err.message || 'Gagal update', false);
    } finally {
      setAction(null);
    }
  };

  const deleteReport = async (id: string, title: string) => {
    if (!token) return;
    if (!confirm(`Hapus laporan "${title.slice(0, 50)}" secara permanen?\nTindakan ini tidak bisa dibatalkan.`)) return;
    setAction(id + 'delete');
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      showToast(`Laporan "${title.slice(0, 30)}" dihapus`);
      setExpandedId(null);
      fetchReports();
    } catch (err: any) {
      showToast(err.message || 'Gagal hapus', false);
    } finally {
      setAction(null);
    }
  };

  const openIdentity = async () => {
    if (!token || !identityModal || identityReason.trim().length < 5) return;
    setIdentityLoading(true);
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${identityModal.reportId}/identity?reason=${encodeURIComponent(identityReason.trim())}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setIdentityResult({ identity: data.data.identity, message: data.data.message, reason: identityReason.trim() });
    } catch (err: any) {
      showToast(err.message || 'Gagal buka identitas', false);
    } finally {
      setIdentityLoading(false);
    }
  };

  const convertToArticle = async (reportId: string, reportTitle: string) => {
    if (!token) return;
    if (!confirm(`Convert laporan "${reportTitle.slice(0, 40)}..." jadi draft artikel via AI?\nProses 5-10 detik.`)) return;
    setConvert(reportId);
    try {
      const res  = await fetch(`${API_URL}/admin/reports/${reportId}/convert`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setConvertResult(data.data.article);
      showToast('Draft artikel berhasil dibuat! ✨');
      fetchReports();
    } catch (err: any) {
      showToast(err.message || 'Gagal convert', false);
    } finally {
      setConvert(null);
    }
  };

  const closeIdentityModal = () => {
    setIdentityModal(null);
    setIdentityReason('');
    setIdentityResult(null);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99, background: toast.ok ? '#10B981' : '#EF4444', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Convert result */}
      {convertResult && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 99, background: t.sidebar, borderRadius: 14, padding: '16px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: `1px solid ${t.sidebarBorder}`, maxWidth: 340, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: t.textPrimary, marginBottom: 4 }}>Draft Artikel Dibuat!</div>
              <div style={{ fontSize: 12, color: t.textDim, marginBottom: 10 }}>"{convertResult.title.slice(0, 55)}..."</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href="/office/newsroom/bakabar/hub" style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#0891B2', color: '#fff', textDecoration: 'none' }}>
                  Buka Hub
                </Link>
                <button onClick={() => setConvertResult(null)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, border: `1px solid ${t.sidebarBorder}`, background: t.sidebar, color: t.textPrimary, cursor: 'pointer' }}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Identity Modal */}
      {identityModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: t.sidebar, borderRadius: 16, padding: 24, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: `1px solid ${t.sidebarBorder}` }}>
            {!identityResult ? (
              <>
                <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🔍</div>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: t.textPrimary, textAlign: 'center', marginBottom: 4 }}>Buka Identitas Pelapor</h3>
                <p style={{ color: t.textDim, fontSize: 12, textAlign: 'center', marginBottom: 16 }}>"{identityModal.reportTitle.slice(0, 50)}"</p>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#EF4444' }}>
                  ⚠️ <strong>Tindakan ini akan dicatat dalam audit log.</strong>
                </div>
                <label style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, display: 'block', marginBottom: 6 }}>
                  Alasan <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea value={identityReason} onChange={e => setIdentityReason(e.target.value)} placeholder="Minimal 5 karakter..." rows={3} autoFocus
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>NOMOR WA</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: t.textPrimary, marginTop: 2 }}>{formatPhone(identityResult.identity.phone)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>NAMA</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: t.textMuted, marginTop: 2 }}>{identityResult.identity.name || 'Belum isi nama'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: t.mainBg, borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center', color: t.textDim, fontSize: 13 }}>
                    {identityResult.message || 'Laporan dikirim tanpa akun.'}
                  </div>
                )}
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#92400E' }}>
                  📋 Alasan: <em>"{identityResult.reason}"</em>
                </div>
                <button onClick={closeIdentityModal} style={{ width: '100%', padding: 10, borderRadius: 10, border: `1px solid ${t.sidebarBorder}`, background: t.sidebar, color: t.textPrimary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Tutup
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, letterSpacing: '-0.4px' }}>🚨 BALAPOR</h1>
          <p style={{ color: t.textDim, fontSize: 13, marginTop: 3 }}>{total} laporan · Super Admin only</p>
        </div>
        <Link href="/office/newsroom/bakabar" style={{ fontSize: 13, color: t.textMuted, fontWeight: 500, textDecoration: 'none', padding: '6px 12px', background: t.navHover, borderRadius: 8 }}>
          ← Overview
        </Link>
      </div>

      {/* Security notice */}
      <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#EF4444' }}>Area Terbatas — Super Admin Only</div>
          <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Data pelapor bersifat rahasia. Setiap aksi buka identitas dicatat dalam audit log.</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setStatus(f.value)}
            style={{ padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: statusFilter === f.value ? '#EF4444' : t.mainBg, color: statusFilter === f.value ? '#fff' : t.textMuted, transition: 'all 0.15s' }}>
            {f.label}
          </button>
        ))}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map(r => {
            const st = REPORT_STATUS[r.status] ?? { bg: t.navHover, color: t.textDim, label: r.status };
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id} style={{ background: t.sidebar, borderRadius: 14, border: `1px solid ${t.sidebarBorder}`, overflow: 'hidden' }}>

                {/* Header row */}
                <div onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: t.textPrimary }}>{r.title}</span>
                      <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{st.label}</span>
                      {r.photos && r.photos.length > 0 && (
                        <span style={{ background: 'rgba(8,145,178,0.1)', color: '#0891B2', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                          📷 {r.photos.length} foto
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: t.textDim }}>
                      {r.category || '—'} · {ANON_LABEL[r.anonymity_level || ''] || r.anonymity_level || '—'} · {r.location || '—'} · {timeAgo(r.created_at)}
                    </div>
                  </div>
                  <span style={{ color: t.textDim, fontSize: 12, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${t.sidebarBorder}`, padding: '14px 16px' }}>
                    {r.body && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textDim, marginBottom: 6 }}>ISI LAPORAN</div>
                        <p style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{r.body}</p>
                      </div>
                    )}
                    {r.photos && r.photos.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textDim, marginBottom: 8 }}>FOTO BUKTI</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {r.photos.map((p, i) => (
                            <a key={i} href={p} target="_blank" rel="noopener noreferrer">
                              <img src={p} alt={`Foto ${i+1}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: `1px solid ${t.sidebarBorder}` }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
                      <button onClick={() => { setIdentityModal({ reportId: r.id, reportTitle: r.title }); setIdentityResult(null); setIdentityReason(''); }}
                        style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        🔍 Buka Identitas
                      </button>
                      {r.status === 'verified' && (
                        <button onClick={() => convertToArticle(r.id, r.title)} disabled={convertLoading === r.id}
                          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(8,145,178,0.3)', background: 'rgba(8,145,178,0.08)', color: '#0891B2', fontSize: 12, fontWeight: 700, cursor: convertLoading === r.id ? 'wait' : 'pointer', opacity: convertLoading === r.id ? 0.6 : 1 }}>
                          {convertLoading === r.id ? '⏳ AI sedang nulis...' : '📰 Jadikan Artikel'}
                        </button>
                      )}
                      <button onClick={() => deleteReport(r.id, r.title)} disabled={actionLoading === r.id + 'delete'}
                        style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: t.textDim, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#EF4444'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = t.textDim; }}>
                        {actionLoading === r.id + 'delete' ? '...' : '🗑 Hapus'}
                      </button>
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
