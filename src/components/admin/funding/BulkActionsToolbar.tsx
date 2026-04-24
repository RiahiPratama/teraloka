'use client';

import { useContext, useState } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import type { Campaign } from './CampaignsTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Check:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Archive:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  Alert:    () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Shield:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
};

type ActionType = 'approve' | 'reject' | 'archive' | null;

interface BulkResult {
  succeeded: string[];
  failed: { id: string; reason: string }[];
}

// ═══════════════════════════════════════════════════════════════
// BULK ACTIONS TOOLBAR
// ═══════════════════════════════════════════════════════════════

export default function BulkActionsToolbar({
  selectedIds,
  selectedCampaigns,
  currentQueryString,
  onClear,
  onComplete,
  onToast,
}: {
  selectedIds: Set<string>;
  selectedCampaigns: Campaign[];
  currentQueryString: string;  // URL query string for CSV export (filters preserved)
  onClear: () => void;
  onComplete: () => void;       // refetch campaigns + counts after bulk op
  onToast: (ok: boolean, msg: string) => void;
}) {
  const { t } = useContext(AdminThemeContext);
  const [action, setAction] = useState<ActionType>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (selectedIds.size === 0) return null;

  // Compute which actions are valid
  const pendingCount = selectedCampaigns.filter(c => c.status === 'pending_review').length;
  const archivableCount = selectedCampaigns.filter(c => c.status === 'completed' || c.status === 'rejected').length;

  const canApprove = pendingCount > 0;
  const canReject = pendingCount > 0;
  const canArchive = archivableCount > 0;

  const selectedIdsArray = Array.from(selectedIds);

  // ═══════ API Calls ═══════

  async function callBulkAPI(endpoint: string, body: any): Promise<BulkResult | null> {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return null;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/campaigns/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? 'Operasi gagal');
      }
      return json.data as BulkResult;
    } catch (err: any) {
      onToast(false, err.message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  function formatBulkResult(actionLabel: string, result: BulkResult) {
    const ok = result.succeeded.length;
    const fail = result.failed.length;
    if (fail === 0) {
      return `✓ ${ok} kampanye ${actionLabel}`;
    }
    return `✓ ${ok} berhasil, ${fail} gagal ${actionLabel}`;
  }

  async function handleApprove() {
    const ids = selectedCampaigns
      .filter(c => c.status === 'pending_review')
      .map(c => c.id);

    const result = await callBulkAPI('bulk-approve', { ids });
    if (result) {
      onToast(result.failed.length === 0, formatBulkResult('di-approve', result));
      setAction(null);
      onClear();
      onComplete();
    }
  }

  async function handleReject() {
    if (rejectReason.trim().length < 10) {
      onToast(false, 'Alasan penolakan minimal 10 karakter');
      return;
    }
    const ids = selectedCampaigns
      .filter(c => c.status === 'pending_review')
      .map(c => c.id);

    const result = await callBulkAPI('bulk-reject', {
      ids,
      reason: rejectReason.trim(),
    });
    if (result) {
      onToast(result.failed.length === 0, formatBulkResult('ditolak', result));
      setAction(null);
      setRejectReason('');
      onClear();
      onComplete();
    }
  }

  async function handleArchive() {
    const ids = selectedCampaigns
      .filter(c => c.status === 'completed' || c.status === 'rejected')
      .map(c => c.id);

    const result = await callBulkAPI('bulk-archive', { ids });
    if (result) {
      onToast(result.failed.length === 0, formatBulkResult('diarsip', result));
      setAction(null);
      onClear();
      onComplete();
    }
  }

  async function handleExport() {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      setSubmitting(true);
      // Export uses current filters (not just selected). For selection-based export,
      // we'd need backend support. For now, export all filtered.
      const res = await fetch(
        `${API_URL}/funding/admin/campaigns/export.csv?${currentQueryString}`,
        { headers: { Authorization: `Bearer ${tk}` } }
      );
      if (!res.ok) throw new Error('Export gagal');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaigns-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onToast(true, '✓ CSV berhasil di-download');
    } catch (err: any) {
      onToast(false, err.message ?? 'Export gagal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div style={{
        position: 'sticky', top: 16, zIndex: 30,
        marginBottom: 16,
        background: 'linear-gradient(135deg, #EC4899, #BE185D)',
        color: '#fff',
        borderRadius: 14,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        boxShadow: '0 8px 24px rgba(236,72,153,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 12, fontWeight: 800,
            background: 'rgba(255,255,255,0.2)',
            padding: '4px 10px', borderRadius: 999,
          }}>
            {selectedIds.size}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            dipilih
          </span>
          {(pendingCount > 0 || archivableCount > 0) && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
              ({pendingCount} pending · {archivableCount} bisa diarsip)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {canApprove && (
            <BulkBtn onClick={() => setAction('approve')} disabled={submitting}>
              <Icons.Check /> Approve
            </BulkBtn>
          )}
          {canReject && (
            <BulkBtn onClick={() => setAction('reject')} disabled={submitting}>
              <Icons.X /> Tolak
            </BulkBtn>
          )}
          <BulkBtn onClick={handleExport} disabled={submitting}>
            <Icons.Download /> Export
          </BulkBtn>
          {canArchive && (
            <BulkBtn onClick={() => setAction('archive')} disabled={submitting}>
              <Icons.Archive /> Arsip
            </BulkBtn>
          )}
          <BulkBtn onClick={onClear} disabled={submitting} variant="ghost">
            Clear
          </BulkBtn>
        </div>
      </div>

      {/* Confirm Modals */}
      {action && (
        <div
          onClick={() => !submitting && setAction(null)}
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
              width: '100%', maxWidth: 560, margin: '32px 0', maxHeight: '85vh',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${t.sidebarBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>
                {action === 'approve' && `✓ Bulk Approve ${pendingCount} Kampanye`}
                {action === 'reject'  && `✗ Bulk Tolak ${pendingCount} Kampanye`}
                {action === 'archive' && `🗄 Arsip ${archivableCount} Kampanye`}
              </h3>
              <button
                onClick={() => !submitting && setAction(null)}
                style={{
                  background: 'transparent', border: 'none', color: t.textDim,
                  cursor: 'pointer', padding: 4,
                }}
              >
                <Icons.X />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

              {/* Approve flow */}
              {action === 'approve' && (
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
                      <strong>{pendingCount} kampanye akan langsung publik.</strong> Pastikan sudah review satu per satu.
                      {selectedIds.size > pendingCount && (
                        <div style={{ marginTop: 4, color: t.textDim }}>
                          Catatan: {selectedIds.size - pendingCount} kampanye non-pending akan di-skip.
                        </div>
                      )}
                    </div>
                  </div>

                  <CampaignPreviewList
                    campaigns={selectedCampaigns.filter(c => c.status === 'pending_review')}
                    t={t}
                  />

                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <CancelBtn t={t} onClick={() => setAction(null)} disabled={submitting} />
                    <PrimaryBtn
                      onClick={handleApprove}
                      disabled={submitting || pendingCount === 0}
                      label={submitting ? 'Memproses...' : `✓ Approve ${pendingCount} Kampanye`}
                      colors={['#10B981', '#059669']}
                    />
                  </div>
                </>
              )}

              {/* Reject flow */}
              {action === 'reject' && (
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
                      <strong>Alasan di bawah akan diterapkan ke semua {pendingCount} kampanye.</strong>
                      {' '}Pastikan alasannya applicable ke semuanya.
                    </div>
                  </div>

                  <CampaignPreviewList
                    campaigns={selectedCampaigns.filter(c => c.status === 'pending_review')}
                    t={t}
                  />

                  <div style={{ marginTop: 16 }}>
                    <label style={{
                      display: 'block', fontSize: 13, fontWeight: 600,
                      color: t.textPrimary, marginBottom: 8,
                    }}>
                      Alasan Penolakan (untuk semua) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Contoh: Dokumen identitas tidak jelas untuk semua kampanye ini."
                      rows={4}
                      maxLength={500}
                      disabled={submitting}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 12,
                        border: `1px solid ${t.sidebarBorder}`, background: t.mainBg,
                        color: t.textPrimary, fontSize: 13, resize: 'none',
                        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                      <p style={{ fontSize: 11, color: t.textMuted }}>Minimal 10 karakter.</p>
                      <p style={{ fontSize: 11, color: t.textMuted }}>{rejectReason.length}/500</p>
                    </div>
                  </div>

                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <CancelBtn t={t} onClick={() => { setAction(null); setRejectReason(''); }} disabled={submitting} />
                    <PrimaryBtn
                      onClick={handleReject}
                      disabled={submitting || rejectReason.trim().length < 10 || pendingCount === 0}
                      label={submitting ? 'Memproses...' : `✗ Tolak ${pendingCount} Kampanye`}
                      colors={['#EF4444', '#DC2626']}
                    />
                  </div>
                </>
              )}

              {/* Archive flow */}
              {action === 'archive' && (
                <>
                  <div style={{
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 12, padding: 14, marginBottom: 16,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#6366F1', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icons.Archive />
                    </div>
                    <div style={{ fontSize: 12, color: '#6366F1', lineHeight: 1.5 }}>
                      <strong>{archivableCount} kampanye akan diarsipkan.</strong>
                      {' '}Bisa dilihat dengan filter "Arsip". Tidak terhapus permanen.
                      {selectedIds.size > archivableCount && (
                        <div style={{ marginTop: 4, color: t.textDim }}>
                          Catatan: Hanya kampanye status Selesai/Ditolak yang bisa diarsip.
                          {' '}{selectedIds.size - archivableCount} di-skip.
                        </div>
                      )}
                    </div>
                  </div>

                  <CampaignPreviewList
                    campaigns={selectedCampaigns.filter(c => c.status === 'completed' || c.status === 'rejected')}
                    t={t}
                  />

                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <CancelBtn t={t} onClick={() => setAction(null)} disabled={submitting} />
                    <PrimaryBtn
                      onClick={handleArchive}
                      disabled={submitting || archivableCount === 0}
                      label={submitting ? 'Memproses...' : `🗄 Arsip ${archivableCount}`}
                      colors={['#6366F1', '#4F46E5']}
                    />
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub Components ──────────────────────────────────

function BulkBtn({
  children, onClick, disabled, variant,
}: {
  children: React.ReactNode; onClick: () => void;
  disabled?: boolean; variant?: 'ghost';
}) {
  const isGhost = variant === 'ghost';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '7px 12px',
        borderRadius: 9,
        border: isGhost ? '1px solid rgba(255,255,255,0.35)' : 'none',
        background: isGhost ? 'transparent' : 'rgba(255,255,255,0.18)',
        color: '#fff',
        fontSize: 12, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}

function CampaignPreviewList({ campaigns, t }: { campaigns: Campaign[]; t: any }) {
  if (campaigns.length === 0) {
    return (
      <div style={{
        padding: 14, textAlign: 'center',
        color: t.textMuted, fontSize: 12,
      }}>
        Tidak ada kampanye yang valid untuk aksi ini.
      </div>
    );
  }
  return (
    <div style={{
      background: t.navHover, borderRadius: 12, padding: 10,
      maxHeight: 200, overflowY: 'auto',
    }}>
      {campaigns.map(c => (
        <div key={c.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 8px',
        }}>
          <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, minWidth: 20 }}>•</span>
          <span style={{
            fontSize: 12, color: t.textPrimary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {c.title}
          </span>
          <span style={{
            fontSize: 10, color: t.textDim, flexShrink: 0,
          }}>
            {c.beneficiary_name}
          </span>
        </div>
      ))}
    </div>
  );
}

function CancelBtn({ t, onClick, disabled }: { t: any; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: '12px 16px', borderRadius: 12,
        border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
        color: t.textPrimary, fontWeight: 600, fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      Batal
    </button>
  );
}

function PrimaryBtn({
  onClick, disabled, label, colors,
}: {
  onClick: () => void; disabled: boolean; label: string;
  colors: [string, string];
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1.5, padding: '12px 16px', borderRadius: 12, border: 'none',
        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        color: '#fff', fontWeight: 700, fontSize: 14,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
