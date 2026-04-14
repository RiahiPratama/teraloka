'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  pending:  { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B', label: 'Pending' },
  verified: { bg: 'rgba(16,185,129,0.1)',  color: '#10B981', label: 'Verified' },
  rejected: { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444', label: 'Ditolak' },
  archived: { bg: 'rgba(107,114,128,0.1)', color: '#9CA3AF', label: 'Arsip' },
};

const ANON_LABEL: Record<string, string> = {
  anonim: '🕵️ Anonim',
  pseudonym: '✏️ Nama Samaran',
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
  if (phone.startsWith('62')) return '+62 ' + phone.slice(2);
  return phone;
}

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Identity modal state
  const [identityModal, setIdentityModal] = useState<{
    reportId: string; reportTitle: string;
  } | null>(null);
  const [identityReason, setIdentityReason] = useState('');
  const [convertLoading, setConvertLoading] = useState<string | null>(null);
  const [convertResult, setConvertResult] = useState<{ id: string; title: string; slug: string } | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityResult, setIdentityResult] = useState<{
    identity: Identity | null; message?: string; reason: string;
  } | null>(null);

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
      const res = await fetch(`${API_URL}/admin/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    setActionLoading(id + action);
    try {
      const res = await fetch(`${API_URL}/admin/reports/${id}/${action === 'verified' ? 'verify' : 'reject'}`, {
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
      setActionLoading(null);
    }
  };

  const openIdentity = async () => {
    if (!token || !identityModal || identityReason.trim().length < 5) return;
    setIdentityLoading(true);
    try {
      const params = new URLSearchParams({ reason: identityReason.trim() });
      const res = await fetch(`${API_URL}/admin/reports/${identityModal.reportId}/identity?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setIdentityResult({
        identity: data.data.identity,
        message: data.data.message,
        reason: identityReason.trim(),
      });
    } catch (err: any) {
      showToast(err.message || 'Gagal buka identitas', false);
    } finally {
      setIdentityLoading(false);
    }
  };

  const convertToArticle = async (reportId: string, reportTitle: string) => {
    if (!token) return;
    if (!confirm(`Convert laporan "${reportTitle.slice(0, 40)}..." jadi draft artikel via AI?\n\nProses ini membutuhkan 5-10 detik.`)) return;
    setConvertLoading(reportId);
    try {
      const res = await fetch(`${API_URL}/admin/reports/${reportId}/convert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      setConvertResult(data.data.article);
      showToast('Draft artikel berhasil dibuat! ✨');
      fetchReports();
    } catch (err: any) {
      showToast(err.message || 'Gagal convert ke artikel', false);
    } finally {
      setConvertLoading(null);
    }
  };

  const closeIdentityModal = () => {
    setIdentityModal(null);
    setIdentityReason('');
    setIdentityResult(null);
  };

  const STATUS_FILTERS = [
    { value: '', label: 'Semua' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Ditolak' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: "'Outfit', system-ui" }}>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 99,
          background: toast.ok ? '#10B981' : '#EF4444', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Convert Result Notification */}
      {convertResult && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 99,
          background: '#fff', borderRadius: 14, padding: '16px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          border: '1px solid rgba(8,145,178,0.2)',
          maxWidth: 340, animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 4 }}>
                Draft Artikel Dibuat!
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                "{convertResult.title.slice(0, 60)}..."
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`/admin/content`}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: '#0891B2', color: '#fff', textDecoration: 'none',
                  }}
                >
                  Lihat di BAKABAR
                </a>
                <button
                  onClick={() => setConvertResult(null)}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}
                >
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
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {!identityResult ? (
              <>
                <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>🔍</div>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: '#111827', textAlign: 'center', marginBottom: 4 }}>Buka Identitas Pelapor</h3>
                <p style={{ color: '#6B7280', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
                  Laporan: <strong>"{identityModal.reportTitle.slice(0, 50)}"</strong>
                </p>

                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#EF4444' }}>
                  ⚠️ <strong>Tindakan ini akan dicatat dalam audit log.</strong> Identitas pelapor hanya boleh dibuka untuk keperluan hukum atau klarifikasi mendesak.
                </div>

                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Alasan Buka Identitas <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  value={identityReason}
                  onChange={(e) => setIdentityReason(e.target.value)}
                  placeholder="Contoh: Laporan mengandung fitnah terhadap pejabat, perlu konfirmasi identitas pelapor untuk proses hukum..."
                  rows={3}
                  autoFocus
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #E5E7EB', fontSize: 13, outline: 'none', marginBottom: 6, boxSizing: 'border-box', resize: 'vertical' }}
                />
                <p style={{ fontSize: 11, color: identityReason.trim().length < 5 ? '#EF4444' : '#10B981', marginBottom: 16 }}>
                  {identityReason.trim().length}/5 karakter minimum
                </p>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeIdentityModal} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                  <button
                    onClick={openIdentity}
                    disabled={identityLoading || identityReason.trim().length < 5}
                    style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: identityReason.trim().length >= 5 ? '#EF4444' : '#9CA3AF', color: '#fff', fontWeight: 700, fontSize: 13, cursor: identityReason.trim().length >= 5 ? 'pointer' : 'not-allowed' }}
                  >
                    {identityLoading ? 'Membuka...' : '🔓 Buka Identitas'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>
                  {identityResult.identity ? '👤' : '🕵️'}
                </div>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: '#111827', textAlign: 'center', marginBottom: 16 }}>
                  {identityResult.identity ? 'Identitas Pelapor' : 'Pelapor Anonim Murni'}
                </h3>

                {identityResult.identity ? (
                  <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>NOMOR WA</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginTop: 2 }}>
                          {formatPhone(identityResult.identity.phone)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>NAMA</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginTop: 2 }}>
                          {identityResult.identity.name || 'Belum isi nama'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>BERGABUNG</div>
                        <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>
                          {new Date(identityResult.identity.joined_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                    {identityResult.message || 'Laporan dikirim tanpa akun — tidak ada identitas tersimpan.'}
                  </div>
                )}

                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#92400E' }}>
                  📋 Alasan dicatat: <em>"{identityResult.reason}"</em>
                </div>

                <button onClick={closeIdentityModal} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>
            🚨 BALAPOR
          </h1>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 3 }}>
            {total} laporan · Hanya Super Admin yang bisa akses halaman ini
          </p>
        </div>
        <Link href="/admin" style={{ fontSize: 13, color: '#1B6B4A', fontWeight: 500, textDecoration: 'none', padding: '6px 12px', background: 'rgba(27,107,74,0.08)', borderRadius: 8 }}>← Overview</Link>
      </div>

      {/* Security notice */}
      <div style={{
        background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#EF4444' }}>Area Terbatas — Super Admin Only</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            Data pelapor bersifat rahasia. Setiap aksi buka identitas dicatat dalam audit log. Gunakan fitur ini hanya untuk keperluan hukum atau klarifikasi mendesak.
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)} style={{ padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: statusFilter === f.value ? '#EF4444' : '#F3F4F6', color: statusFilter === f.value ? '#fff' : '#374151', transition: 'all 0.15s' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #EF4444', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Memuat laporan...
        </div>
      )}

      {/* Empty */}
      {!loading && reports.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <p style={{ color: '#6B7280', fontSize: 13 }}>Tidak ada laporan</p>
        </div>
      )}

      {/* Reports list */}
      {!loading && reports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map((r) => {
            const st = REPORT_STATUS[r.status] ?? { bg: '#F3F4F6', color: '#6B7280', label: r.status };
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                {/* Header row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{r.title}</span>
                      <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>{st.label}</span>
                      {r.photos && r.photos.length > 0 && (
                        <span style={{ background: 'rgba(8,145,178,0.1)', color: '#0891B2', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                          📷 {r.photos.length} foto
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {r.category || '—'} · {ANON_LABEL[r.anonymity_level || ''] || r.anonymity_level || '—'} · {r.location || '—'} · {timeAgo(r.created_at)}
                    </div>
                  </div>
                  <span style={{ color: '#9CA3AF', fontSize: 12, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '14px 16px' }}>
                    {/* Body */}
                    {r.body && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 6 }}>ISI LAPORAN</div>
                        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{r.body}</p>
                      </div>
                    )}

                    {/* Photos */}
                    {r.photos && r.photos.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 8 }}>FOTO BUKTI</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {r.photos.map((p, i) => (
                            <a key={i} href={p} target="_blank" rel="noopener noreferrer">
                              <img src={p} alt={`Foto ${i+1}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid #E5E7EB' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(r.id, 'verified', r.title)}
                            disabled={actionLoading === r.id + 'verified'}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            {actionLoading === r.id + 'verified' ? '...' : '✓ Verifikasi'}
                          </button>
                          <button
                            onClick={() => updateStatus(r.id, 'rejected', r.title)}
                            disabled={actionLoading === r.id + 'rejected'}
                            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                          >
                            {actionLoading === r.id + 'rejected' ? '...' : '✕ Tolak'}
                          </button>
                        </>
                      )}

                      {/* Buka identitas — always available */}
                      <button
                        onClick={() => {
                          setIdentityModal({ reportId: r.id, reportTitle: r.title });
                          setIdentityResult(null);
                          setIdentityReason('');
                        }}
                        style={{
                          padding: '7px 14px', borderRadius: 8,
                          border: '1px solid rgba(239,68,68,0.3)',
                          background: 'rgba(239,68,68,0.06)', color: '#EF4444',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        🔍 Buka Identitas
                      </button>

                      {/* Convert ke artikel — hanya untuk verified */}
                      {r.status === 'verified' && (
                        <button
                          onClick={() => convertToArticle(r.id, r.title)}
                          disabled={convertLoading === r.id}
                          style={{
                            padding: '7px 14px', borderRadius: 8,
                            border: '1px solid rgba(8,145,178,0.3)',
                            background: 'rgba(8,145,178,0.08)', color: '#0891B2',
                            fontSize: 12, fontWeight: 700, cursor: convertLoading === r.id ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            opacity: convertLoading === r.id ? 0.6 : 1,
                          }}
                        >
                          {convertLoading === r.id ? '⏳ AI sedang nulis...' : '📰 Jadikan Artikel'}
                        </button>
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
