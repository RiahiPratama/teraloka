'use client';

import { useContext, useState } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import type { Donation } from './DonationsTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  Check:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X:        () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Alert:    () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Shield:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
};

type ActionType = 'verify' | 'reject' | null;

interface BulkResult {
  succeeded: string[];
  failed: { id: string; reason: string }[];
}

function shortRupiah(n: number): string {
  if (n >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (n >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + n.toLocaleString('id-ID');
}

// ═══════════════════════════════════════════════════════════════
// DONATIONS BULK ACTIONS TOOLBAR
// ═══════════════════════════════════════════════════════════════

export default function DonationsBulkActionsToolbar({
  selectedIds,
  selectedDonations,
  currentQueryString,
  onClear,
  onComplete,
  onToast,
}: {
  selectedIds: Set<string>;
  selectedDonations: Donation[];
  currentQueryString: string;
  onClear: () => void;
  onComplete: () => void;
  onToast: (ok: boolean, msg: string) => void;
}) {
  const { t } = useContext(AdminThemeContext);
  const [action, setAction] = useState<ActionType>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (selectedIds.size === 0) return null;

  const pendingDonations = selectedDonations.filter(d => d.verification_status === 'pending');
  const pendingCount = pendingDonations.length;
  const nonPendingCount = selectedDonations.length - pendingCount;

  const totalAmountPending = pendingDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  const canVerify = pendingCount > 0;
  const canReject = pendingCount > 0;

  // ═══════ API Calls ═══════

  async function callBulkAPI(endpoint: string, body: any): Promise<BulkResult | null> {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return null;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/donations/${endpoint}`, {
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
      return `✓ ${ok} donasi ${actionLabel}`;
    }
    return `✓ ${ok} berhasil, ${fail} gagal ${actionLabel}`;
  }

  function resetModalState() {
    setAction(null);
    setRejectReason('');
    setSafetyChecked(false);
  }

  async function handleVerify() {
    if (!safetyChecked) {
      onToast(false, 'Mohon centang konfirmasi terlebih dahulu');
      return;
    }
    const ids = pendingDonations.map(d => d.id);
    const result = await callBulkAPI('bulk-verify', { ids });
    if (result) {
      onToast(result.failed.length === 0, formatBulkResult('ter-verifikasi', result));
      resetModalState();
      onClear();
      onComplete();
    }
  }

  async function handleReject() {
    if (rejectReason.trim().length < 10) {
      onToast(false, 'Alasan penolakan minimal 10 karakter');
      return;
    }
    if (!safetyChecked) {
      onToast(false, 'Mohon centang konfirmasi terlebih dahulu');
      return;
    }
    const ids = pendingDonations.map(d => d.id);
    const result = await callBulkAPI('bulk-reject', {
      ids,
      reason: rejectReason.trim(),
    });
    if (result) {
      onToast(result.failed.length === 0, formatBulkResult('ditolak', result));
      resetModalState();
      onClear();
      onComplete();
    }
  }

  async function handleExport() {
    const tk = localStorage.getItem('tl_token');
    if (!tk) return;
    try {
      setSubmitting(true);
      const res = await fetch(
        `${API_URL}/funding/admin/donations/export.csv?${currentQueryString}`,
        { headers: { Authorization: `Bearer ${tk}` } }
      );
      if (!res.ok) throw new Error('Export gagal');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `donations-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
          {pendingCount > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>
              ({pendingCount} pending · total {shortRupiah(totalAmountPending)})
            </span>
          )}
          {nonPendingCount > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
              · {nonPendingCount} non-pending akan di-skip
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {canVerify && (
            <BulkBtn onClick={() => setAction('verify')} disabled={submitting}>
              <Icons.Check /> Verify
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
          <BulkBtn onClick={onClear} disabled={submitting} variant="ghost">
            Clear
          </BulkBtn>
        </div>
      </div>

      {/* Confirm Modals */}
      {action && (
        <div
          onClick={() => !submitting && resetModalState()}
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
                {action === 'verify' && `✓ Bulk Verify ${pendingCount} Donasi`}
                {action === 'reject' && `✗ Bulk Tolak ${pendingCount} Donasi`}
              </h3>
              <button
                onClick={() => !submitting && resetModalState()}
                style={{
                  background: 'transparent', border: 'none', color: t.textDim,
                  cursor: 'pointer', padding: 4,
                }}
              >
                <Icons.X />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

              {/* Verify flow — HIGH RISK warning */}
              {action === 'verify' && (
                <>
                  <div style={{
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 12, padding: 14, marginBottom: 16,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: '#F59E0B', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}><Icons.Alert /></div>
                    <div style={{ fontSize: 12, color: '#B45309', lineHeight: 1.5 }}>
                      <strong>PERHATIAN: Verifikasi Massal = Komitmen ke Donor!</strong>
                      <br />
                      {pendingCount} donasi akan di-mark sebagai "transfer diterima" dengan total {shortRupiah(totalAmountPending)}.
                      Pastikan semua transfer SUDAH masuk ke rekening partner sebelum approve.
                      {nonPendingCount > 0 && (
                        <div style={{ marginTop: 4 }}>
                          Catatan: {nonPendingCount} donasi non-pending akan di-skip.
                        </div>
                      )}
                    </div>
                  </div>

                  <DonationPreviewList
                    donations={pendingDonations}
                    t={t}
                  />

                  {/* Safety Checkbox */}
                  <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    marginTop: 16, padding: '12px 14px',
                    background: safetyChecked ? 'rgba(16,185,129,0.08)' : t.navHover,
                    border: `2px solid ${safetyChecked ? '#10B981' : t.sidebarBorder}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={safetyChecked}
                      onChange={e => setSafetyChecked(e.target.checked)}
                      style={{
                        cursor: 'pointer', marginTop: 2,
                        accentColor: '#10B981', width: 16, height: 16,
                      }}
                    />
                    <span style={{
                      fontSize: 12, color: safetyChecked ? '#10B981' : t.textPrimary,
                      fontWeight: 600, lineHeight: 1.4,
                    }}>
                      Saya sudah konfirmasi semua {pendingCount} transfer masuk
                      {' '}({shortRupiah(totalAmountPending)}) di rekening partner.
                    </span>
                  </label>

                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <CancelBtn t={t} onClick={resetModalState} disabled={submitting} />
                    <PrimaryBtn
                      onClick={handleVerify}
                      disabled={submitting || !safetyChecked || pendingCount === 0}
                      label={submitting ? 'Memproses...' : `✓ Ya, Verify ${pendingCount} Donasi`}
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
                      <strong>Alasan di bawah akan diterapkan ke {pendingCount} donasi.</strong>
                      {' '}Pastikan alasannya applicable ke semuanya.
                    </div>
                  </div>

                  <DonationPreviewList
                    donations={pendingDonations}
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
                      placeholder="Contoh: Transfer belum masuk setelah cek rekening 48 jam."
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

                  {/* Safety Checkbox */}
                  <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    marginTop: 14, padding: '12px 14px',
                    background: safetyChecked ? 'rgba(239,68,68,0.08)' : t.navHover,
                    border: `2px solid ${safetyChecked ? '#EF4444' : t.sidebarBorder}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={safetyChecked}
                      onChange={e => setSafetyChecked(e.target.checked)}
                      style={{
                        cursor: 'pointer', marginTop: 2,
                        accentColor: '#EF4444', width: 16, height: 16,
                      }}
                    />
                    <span style={{
                      fontSize: 12, color: safetyChecked ? '#EF4444' : t.textPrimary,
                      fontWeight: 600, lineHeight: 1.4,
                    }}>
                      Saya konfirmasi alasan di atas applicable untuk semua {pendingCount} donasi yang dipilih.
                    </span>
                  </label>

                  <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                    <CancelBtn t={t} onClick={resetModalState} disabled={submitting} />
                    <PrimaryBtn
                      onClick={handleReject}
                      disabled={submitting || rejectReason.trim().length < 10 || !safetyChecked || pendingCount === 0}
                      label={submitting ? 'Memproses...' : `✗ Tolak ${pendingCount} Donasi`}
                      colors={['#EF4444', '#DC2626']}
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

function DonationPreviewList({ donations, t }: { donations: Donation[]; t: any }) {
  if (donations.length === 0) {
    return (
      <div style={{
        padding: 14, textAlign: 'center',
        color: t.textMuted, fontSize: 12,
      }}>
        Tidak ada donasi yang valid untuk aksi ini.
      </div>
    );
  }
  return (
    <div style={{
      background: t.navHover, borderRadius: 12, padding: 10,
      maxHeight: 200, overflowY: 'auto',
    }}>
      {donations.map(d => (
        <div key={d.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 8px',
        }}>
          <span style={{
            fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
            color: t.textDim, minWidth: 80,
          }}>
            {d.donation_code}
          </span>
          <span style={{
            fontSize: 11, color: t.textPrimary, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {d.is_anonymous ? 'Anonim' : d.donor_name}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 700, color: t.textPrimary, flexShrink: 0,
          }}>
            {shortRupiah(d.amount)}
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
