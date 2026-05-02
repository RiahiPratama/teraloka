'use client';

import { useContext, useState, useEffect } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import type { UsageReport } from './ReportsTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  X:       () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Alert:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Document:() => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
};

// ── Helpers ──────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

// ═══════════════════════════════════════════════════════════════
// REPORT REVIEW MODAL
// ═══════════════════════════════════════════════════════════════

type ActionMode = 'view' | 'approve' | 'reject';

export default function ReportReviewModal({
  open,
  reportId,
  initialMode,
  onClose,
  onSuccess,
  onToast,
}: {
  open: boolean;
  reportId: string | null;
  initialMode: ActionMode;
  onClose: () => void;
  onSuccess: () => void;
  onToast: (ok: boolean, msg: string) => void;
}) {
  const { t } = useContext(AdminThemeContext);

  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ActionMode>('view');
  const [submitting, setSubmitting] = useState(false);

  // Approve flow state
  const [safetyChecked, setSafetyChecked] = useState(false);

  // Reject flow state
  const [rejectReason, setRejectReason] = useState('');

  // Load report detail when modal opens
  useEffect(() => {
    if (!open || !reportId) return;

    setMode(initialMode);
    setSafetyChecked(false);
    setRejectReason('');
    setReport(null);
    setLoading(true);

    const tk = localStorage.getItem('tl_token');
    if (!tk) { onToast(false, 'Session expired'); setLoading(false); return; }

    fetch(`${API_URL}/funding/admin/usage-reports/${reportId}`, {
      headers: { Authorization: `Bearer ${tk}` },
    })
      .then(r => r.json())
      .then(json => {
        if (json.success) setReport(json.data);
        else onToast(false, json?.error?.message ?? 'Gagal load laporan');
      })
      .catch(err => onToast(false, err.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [open, reportId, initialMode, onToast]);

  if (!open) return null;

  // ═══════ Approve / Reject handlers ═══════

  async function handleApprove() {
    if (!report || !safetyChecked) return;
    const tk = localStorage.getItem('tl_token');
    if (!tk) { onToast(false, 'Session expired'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/usage-reports/${report.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal approve');
      onToast(true, `✓ Laporan "${report.title}" disetujui`);
      onClose();
      onSuccess();
    } catch (err: any) {
      onToast(false, err.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!report) return;
    if (rejectReason.trim().length < 10) {
      onToast(false, 'Alasan penolakan minimal 10 karakter');
      return;
    }
    const tk = localStorage.getItem('tl_token');
    if (!tk) { onToast(false, 'Session expired'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/usage-reports/${report.id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? 'Gagal reject');
      onToast(true, `✓ Laporan "${report.title}" ditolak`);
      onClose();
      onSuccess();
    } catch (err: any) {
      onToast(false, err.message ?? 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  // ═══════ Derived metrics ═══════

  const isPending = report?.status === 'pending';
  const alreadyApproved = report?.campaign_already_approved_disbursement ?? 0;
  const thisAmount = report?.amount_used ?? 0;
  const collected = report?.campaign?.collected_amount ?? 0;

  const afterApprove = alreadyApproved + thisAmount;
  const rateBefore = collected > 0 ? Math.round((alreadyApproved / collected) * 100) : 0;
  const rateAfter = collected > 0 ? Math.round((afterApprove / collected) * 100) : 0;
  const willOverflow = afterApprove > collected && collected > 0;

  return (
    <div
      onClick={() => !submitting && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)',
        backdropFilter: 'blur(4px)', zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: t.mainBg, borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          width: '100%', maxWidth: 720, margin: '32px 0', maxHeight: '90vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: `1px solid ${t.sidebarBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.Document />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>
                📋 Review Laporan
              </h3>
              <p style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
                {report ? `Laporan #${report.report_number}` : 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent', border: 'none', color: t.textDim,
              cursor: submitting ? 'not-allowed' : 'pointer', padding: 4,
            }}
          >
            <Icons.X />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: t.textDim, fontSize: 13 }}>
              Memuat detail laporan...
            </div>
          ) : !report ? (
            <div style={{ padding: 40, textAlign: 'center', color: t.textMuted }}>
              Laporan tidak ditemukan
            </div>
          ) : (
            <>
              {/* Campaign Context Banner */}
              {report.campaign && (
                <div style={{
                  background: 'rgba(236,72,153,0.06)',
                  border: '1px solid rgba(236,72,153,0.2)',
                  borderRadius: 12, padding: 14, marginBottom: 16,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#EC4899', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Kampanye
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: t.textPrimary, marginBottom: 4 }}>
                    {report.campaign.title}
                  </p>
                  <p style={{ fontSize: 11, color: t.textDim }}>
                    Partner: <strong style={{ color: '#EC4899' }}>{report.campaign.partner_name ?? '(tanpa partner)'}</strong>
                    {' · '}
                    Beneficiary: {report.campaign.beneficiary_name}
                  </p>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10, marginTop: 10, paddingTop: 10,
                    borderTop: '1px dashed rgba(236,72,153,0.25)',
                  }}>
                    <ContextStat label="Terkumpul" value={shortRupiah(collected)} color={t.textPrimary} t={t} />
                    <ContextStat label="Sudah Disalurkan" value={shortRupiah(alreadyApproved)} color="#10B981" t={t} />
                    <ContextStat label="Rate Saat Ini" value={`${rateBefore}%`} color={rateBefore > 0 ? '#10B981' : t.textMuted} t={t} />
                  </div>
                </div>
              )}

              {/* Report Header */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                    color: t.textDim, background: t.navHover,
                    padding: '3px 8px', borderRadius: 6,
                  }}>
                    #{report.report_number}
                  </span>
                  <StatusBadge status={report.status} />
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: t.textPrimary, marginBottom: 6 }}>
                  {report.title}
                </h4>
                <p style={{ fontSize: 13, color: t.textDim, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {report.description}
                </p>
              </div>

              {/* Amount Callout */}
              <div style={{
                background: t.navHover, borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 16,
              }}>
                <span style={{ fontSize: 12, color: t.textDim, fontWeight: 600 }}>
                  Jumlah Digunakan
                </span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#6366F1' }}>
                  {formatRupiah(report.amount_used)}
                </span>
              </div>

              {/* Items */}
              {Array.isArray(report.items) && report.items.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={sectionLabelStyle(t)}>
                    📦 Items ({report.items.length})
                  </p>
                  <div style={{
                    border: `1px solid ${t.sidebarBorder}`, borderRadius: 10, overflow: 'hidden',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: t.navHover + '66' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nama</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>Qty</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', width: 90 }}>Harga</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.items.map((item: any, i: number) => (
                          <tr key={i} style={{ borderTop: `1px solid ${t.sidebarBorder}` }}>
                            <td style={{ padding: '8px 10px', color: t.textPrimary, fontWeight: 600 }}>{item.name ?? '-'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: t.textDim }}>{item.qty ?? '-'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: t.textDim }}>{item.price ? shortRupiah(item.price) : '-'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: t.textPrimary, fontWeight: 700 }}>{item.total ? shortRupiah(item.total) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Proof Photos */}
              {Array.isArray(report.proof_photos) && report.proof_photos.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={sectionLabelStyle(t)}>
                    📸 Bukti Foto ({report.proof_photos.length})
                  </p>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 8,
                  }}>
                    {report.proof_photos.map((url, i) => (
                      <a
                        key={i} href={url} target="_blank" rel="noopener noreferrer"
                        style={{
                          position: 'relative', display: 'block',
                          aspectRatio: '1', borderRadius: 10,
                          overflow: 'hidden',
                          border: `1px solid ${t.sidebarBorder}`,
                          background: t.navHover,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Bukti ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={e => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            (img.parentElement as HTMLElement).innerHTML +=
                              `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;padding:8px;text-align:center;font-size:10px;color:${t.textMuted};">🔗<br/>Buka link</div>`;
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Sibling Reports */}
              {Array.isArray(report.sibling_reports) && report.sibling_reports.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={sectionLabelStyle(t)}>
                    📑 Riwayat Laporan Lain ({report.sibling_reports.length})
                  </p>
                  <div style={{
                    border: `1px solid ${t.sidebarBorder}`, borderRadius: 10, overflow: 'hidden',
                  }}>
                    {report.sibling_reports.map((s, i) => (
                      <div key={s.id} style={{
                        padding: '8px 12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderTop: i > 0 ? `1px solid ${t.sidebarBorder}` : 'none',
                        background: t.navHover + '22',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                            color: t.textDim,
                          }}>
                            #{s.report_number}
                          </span>
                          <StatusBadge status={s.status} small />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary }}>
                          {shortRupiah(s.amount_used)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revision Reason (if revision_needed) */}
              {report.status === 'revision_needed' && report.rejection_reason && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10, padding: 12, marginBottom: 16,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Alasan Perlu Revisi
                  </p>
                  <p style={{ fontSize: 12, color: t.textPrimary, lineHeight: 1.5 }}>
                    {report.rejection_reason}
                  </p>
                </div>
              )}

              {/* Impact Preview (only in approve mode for pending) */}
              {mode === 'approve' && isPending && report.campaign && (
                <div style={{
                  background: willOverflow ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                  border: `1px solid ${willOverflow ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  borderRadius: 12, padding: 14, marginBottom: 16,
                }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700,
                    color: willOverflow ? '#B45309' : '#10B981',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
                  }}>
                    📊 Impact Jika Di-Approve
                  </p>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
                  }}>
                    <ContextStat label="Rate Before" value={`${rateBefore}%`} color={t.textMuted} t={t} />
                    <ContextStat label="Rate After" value={`${rateAfter}%`} color={willOverflow ? '#F59E0B' : '#10B981'} t={t} />
                    <ContextStat label="Total Disalurkan" value={shortRupiah(afterApprove)} color={willOverflow ? '#F59E0B' : '#10B981'} t={t} />
                  </div>
                  {willOverflow && (
                    <div style={{
                      marginTop: 10, paddingTop: 10,
                      borderTop: '1px dashed rgba(245,158,11,0.4)',
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <span style={{ color: '#B45309', flexShrink: 0 }}><Icons.Alert /></span>
                      <p style={{ fontSize: 11, color: '#B45309', lineHeight: 1.5 }}>
                        <strong>Melebihi dana terkumpul</strong> ({shortRupiah(afterApprove - collected)} over).
                        Konfirmasi: apakah partner menerima dana dari sumber lain (donasi offline, sumbangan barang, dll)?
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reject form (only in reject mode for pending) */}
              {mode === 'reject' && isPending && (
                <div style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 12, padding: 14, marginBottom: 16,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Alasan Penolakan <span style={{ opacity: 0.6 }}>(min 10 karakter)</span>
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Contoh: Bukti foto buram, perlu upload ulang dengan nota yang lebih jelas"
                    maxLength={500}
                    disabled={submitting}
                    style={{
                      width: '100%', padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${t.sidebarBorder}`,
                      background: t.mainBg, color: t.textPrimary,
                      fontSize: 13, outline: 'none', boxSizing: 'border-box',
                      fontFamily: 'inherit', resize: 'none',
                    }}
                  />
                  <p style={{ fontSize: 10, color: t.textMuted, marginTop: 4, textAlign: 'right' }}>
                    {rejectReason.length}/500
                  </p>
                </div>
              )}

              {/* Safety Checkbox (only in approve mode) */}
              {mode === 'approve' && isPending && (
                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px',
                  background: safetyChecked ? 'rgba(16,185,129,0.08)' : t.navHover,
                  border: `2px solid ${safetyChecked ? '#10B981' : t.sidebarBorder}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 120ms',
                  marginBottom: 16,
                }}>
                  <input
                    type="checkbox"
                    checked={safetyChecked}
                    onChange={e => setSafetyChecked(e.target.checked)}
                    disabled={submitting}
                    style={{
                      cursor: submitting ? 'not-allowed' : 'pointer', marginTop: 2,
                      accentColor: '#10B981', width: 16, height: 16,
                    }}
                  />
                  <span style={{
                    fontSize: 12, color: safetyChecked ? '#10B981' : t.textPrimary,
                    fontWeight: 600, lineHeight: 1.4,
                  }}>
                    Saya sudah verifikasi deskripsi, items, dan bukti foto. Laporan ini layak di-approve & tampil ke publik.
                  </span>
                </label>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {report && (
          <div style={{
            padding: '14px 24px',
            borderTop: `1px solid ${t.sidebarBorder}`,
            display: 'flex', gap: 12,
            background: t.navHover + '33',
          }}>
            {mode === 'view' && (
              <>
                <button onClick={onClose} disabled={submitting} style={btnSecondaryStyle(t, submitting)}>
                  Tutup
                </button>
                {isPending && (
                  <>
                    <button
                      onClick={() => setMode('reject')}
                      disabled={submitting}
                      style={btnDangerStyle(submitting)}
                    >
                      Tolak
                    </button>
                    <button
                      onClick={() => setMode('approve')}
                      disabled={submitting}
                      style={btnSuccessStyle(submitting, true)}
                    >
                      ✓ Setujui
                    </button>
                  </>
                )}
              </>
            )}

            {mode === 'approve' && isPending && (
              <>
                <button onClick={() => setMode('view')} disabled={submitting} style={btnSecondaryStyle(t, submitting)}>
                  Kembali
                </button>
                <button
                  onClick={handleApprove}
                  disabled={!safetyChecked || submitting}
                  style={btnSuccessStyle(submitting, safetyChecked)}
                >
                  {submitting ? 'Memproses...' : '✓ Approve Laporan'}
                </button>
              </>
            )}

            {mode === 'reject' && isPending && (
              <>
                <button onClick={() => setMode('view')} disabled={submitting} style={btnSecondaryStyle(t, submitting)}>
                  Kembali
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectReason.trim().length < 10 || submitting}
                  style={btnDangerStyle(submitting || rejectReason.trim().length < 10)}
                >
                  {submitting ? 'Memproses...' : '✗ Tolak Laporan'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────

function ContextStat({ label, value, color, t }: { label: string; value: string; color: string; t: any }) {
  return (
    <div>
      <p style={{ fontSize: 9, color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ fontSize: 14, fontWeight: 800, color }}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status, small }: { status: string; small?: boolean }) {
  const style = {
    pending:         { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B', label: 'Pending' },
    approved:        { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: 'Approved' },
    revision_needed: { bg: 'rgba(239,68,68,0.15)',  text: '#EF4444', label: 'Revisi' },
  }[status] ?? { bg: '#E5E7EB', text: '#6B7280', label: status };

  return (
    <span style={{
      display: 'inline-block',
      background: style.bg, color: style.text,
      fontSize: small ? 9 : 10, fontWeight: 700,
      padding: small ? '2px 7px' : '3px 10px',
      borderRadius: 999,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {style.label}
    </span>
  );
}

// ── Style helpers ────────────────────────────────

function sectionLabelStyle(t: any): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 700, color: t.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
  };
}

function btnSecondaryStyle(t: any, disabled: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '12px 16px', borderRadius: 12,
    border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
    color: t.textPrimary, fontWeight: 600, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}

function btnSuccessStyle(disabled: boolean, enabled: boolean): React.CSSProperties {
  return {
    flex: 1.5, padding: '12px 16px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #10B981, #059669)',
    color: '#fff', fontWeight: 700, fontSize: 14,
    cursor: enabled && !disabled ? 'pointer' : 'not-allowed',
    opacity: enabled && !disabled ? 1 : 0.5,
    boxShadow: enabled && !disabled ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
  };
}

function btnDangerStyle(disabled: boolean): React.CSSProperties {
  return {
    flex: 1.5, padding: '12px 16px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
    color: '#fff', fontWeight: 700, fontSize: 14,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    boxShadow: disabled ? 'none' : '0 4px 12px rgba(239,68,68,0.3)',
  };
}
