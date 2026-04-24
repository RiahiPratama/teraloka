'use client';

import { useContext, useState, useEffect, useMemo } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import type { PendingFeeDonation } from './PendingFeesTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Icons ─────────────────────────────────────────
const Icons = {
  X:      () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Receipt:() => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="11" x2="15" y2="11"/></svg>,
  Alert:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ── Helpers ──────────────────────────────────────
function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════
// RECORD REMITTANCE MODAL
// ═══════════════════════════════════════════════════════════════

export default function RecordRemittanceModal({
  open,
  donations,
  partnerName,
  onClose,
  onSuccess,
  onToast,
}: {
  open: boolean;
  donations: PendingFeeDonation[];
  partnerName: string;
  onClose: () => void;
  onSuccess: () => void;
  onToast: (ok: boolean, msg: string) => void;
}) {
  const { t } = useContext(AdminThemeContext);

  const totalFeeExpected = useMemo(() =>
    donations.reduce((sum, d) => sum + (Number(d.operational_fee) || 0), 0),
    [donations]
  );

  const [amount, setAmount] = useState<string>('');
  const [remittedDate, setRemittedDate] = useState<string>(todayISODate());
  const [referenceCode, setReferenceCode] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset state when modal opens with new donations
  useEffect(() => {
    if (open) {
      setAmount(String(totalFeeExpected));
      setRemittedDate(todayISODate());
      setReferenceCode('');
      setReceiptUrl('');
      setNotes('');
      setSafetyChecked(false);
      setSubmitting(false);
    }
  }, [open, totalFeeExpected]);

  if (!open) return null;

  const parsedAmount = Number(amount) || 0;
  const amountDiff = parsedAmount - totalFeeExpected;
  const hasAmountDiff = Math.abs(amountDiff) > 0.01;

  const canSubmit =
    parsedAmount > 0 &&
    partnerName.trim() !== '' &&
    donations.length > 0 &&
    safetyChecked &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    const tk = localStorage.getItem('tl_token');
    if (!tk) {
      onToast(false, 'Session expired');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/funding/admin/fees/remittances`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donation_ids: donations.map(d => d.id),
          partner_name: partnerName.trim(),
          amount: parsedAmount,
          reference_code: referenceCode.trim() || undefined,
          receipt_url: receiptUrl.trim() || undefined,
          notes: notes.trim() || undefined,
          remitted_at: new Date(remittedDate).toISOString(),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? 'Gagal simpan remittance');
      }

      onToast(true, `✓ Remittance ${formatRupiah(parsedAmount)} tercatat untuk ${partnerName}`);
      onClose();
      onSuccess();
    } catch (err: any) {
      onToast(false, err.message ?? 'Terjadi error');
    } finally {
      setSubmitting(false);
    }
  }

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
          width: '100%', maxWidth: 620, margin: '32px 0', maxHeight: '90vh',
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
              background: 'linear-gradient(135deg, #EC4899, #BE185D)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icons.Receipt />
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>
                🧾 Catat Remittance Fee
              </h3>
              <p style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
                Record setoran fee operasional dari partner
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
          {/* Partner Info */}
          <div style={{
            background: 'rgba(236,72,153,0.06)',
            border: '1px solid rgba(236,72,153,0.2)',
            borderRadius: 12, padding: 14, marginBottom: 16,
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#EC4899', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Partner
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, color: t.textPrimary }}>
              {partnerName}
            </p>
            <p style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
              {donations.length} donasi · Total fee expected: <strong style={{ color: '#EC4899' }}>{formatRupiah(totalFeeExpected)}</strong>
            </p>
          </div>

          {/* Donation Preview List */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Donasi Yang Akan Di-Settle ({donations.length})
            </p>
            <div style={{
              background: t.navHover, borderRadius: 10, padding: 8,
              maxHeight: 180, overflowY: 'auto',
            }}>
              {donations.map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 8px',
                  borderBottom: `1px solid ${t.sidebarBorder}44`,
                }}>
                  <span style={{
                    fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
                    color: t.textDim, minWidth: 70,
                  }}>
                    {d.donation_code}
                  </span>
                  <span style={{
                    fontSize: 11, color: t.textPrimary, fontWeight: 600,
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {d.is_anonymous ? 'Anonim' : d.donor_name}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: d.operational_fee > 0 ? '#EC4899' : t.textMuted,
                    flexShrink: 0,
                  }}>
                    {formatRupiah(d.operational_fee)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle(t)}>
              Jumlah Disetor <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, fontWeight: 700, color: t.textDim,
              }}>
                Rp
              </span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                disabled={submitting}
                style={{
                  ...inputStyle(t),
                  paddingLeft: 44,
                  fontSize: 16, fontWeight: 700,
                }}
              />
            </div>
            {hasAmountDiff && parsedAmount > 0 && (
              <p style={{
                fontSize: 11, marginTop: 6,
                color: amountDiff > 0 ? '#10B981' : '#F59E0B',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Icons.Alert />
                {amountDiff > 0
                  ? `Kelebihan ${formatRupiah(Math.abs(amountDiff))} dari expected (diterima sebagai tip/tambahan)`
                  : `Kurang ${formatRupiah(Math.abs(amountDiff))} dari expected (check selisih dengan partner)`
                }
              </p>
            )}
            {!hasAmountDiff && parsedAmount > 0 && (
              <p style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                Sesuai dengan total fee expected.
              </p>
            )}
          </div>

          {/* Date + Reference Code (2 columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle(t)}>Tanggal Remittance</label>
              <input
                type="date"
                value={remittedDate}
                onChange={e => setRemittedDate(e.target.value)}
                disabled={submitting}
                style={inputStyle(t)}
              />
            </div>
            <div>
              <label style={labelStyle(t)}>Reference Code</label>
              <input
                type="text"
                value={referenceCode}
                onChange={e => setReferenceCode(e.target.value)}
                placeholder="TRX-001 (optional)"
                disabled={submitting}
                maxLength={50}
                style={inputStyle(t)}
              />
            </div>
          </div>

          {/* Receipt URL */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle(t)}>
              URL Bukti Transfer (Optional)
            </label>
            <input
              type="url"
              value={receiptUrl}
              onChange={e => setReceiptUrl(e.target.value)}
              placeholder="https://... (paste link screenshot atau bukti transfer)"
              disabled={submitting}
              maxLength={500}
              style={inputStyle(t)}
            />
            <p style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>
              Upload dulu ke Supabase Storage atau cloud lain, lalu paste URL-nya di sini.
            </p>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle(t)}>Catatan (Optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Misal: Transfer via BRI jam 14:00, konfirmasi WA dari Ustaz Fauzi"
              rows={2}
              maxLength={300}
              disabled={submitting}
              style={{
                ...inputStyle(t),
                resize: 'none', fontFamily: 'inherit',
              }}
            />
            <p style={{ fontSize: 10, color: t.textMuted, marginTop: 3, textAlign: 'right' }}>
              {notes.length}/300
            </p>
          </div>

          {/* Safety Checkbox */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px',
            background: safetyChecked ? 'rgba(16,185,129,0.08)' : t.navHover,
            border: `2px solid ${safetyChecked ? '#10B981' : t.sidebarBorder}`,
            borderRadius: 12,
            cursor: 'pointer',
            transition: 'all 120ms',
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
              Saya konfirmasi <strong>{formatRupiah(parsedAmount)}</strong> sudah masuk rekening TeraLoka dari {partnerName}.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: `1px solid ${t.sidebarBorder}`,
          display: 'flex', gap: 12,
          background: t.navHover + '33',
        }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 12,
              border: `1px solid ${t.sidebarBorder}`, background: 'transparent',
              color: t.textPrimary, fontWeight: 600, fontSize: 14,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1.5, padding: '12px 16px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              opacity: canSubmit ? 1 : 0.5,
              boxShadow: canSubmit ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
            }}
          >
            {submitting ? 'Menyimpan...' : '✓ Simpan Remittance'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Style helpers ────────────────────────────────

function labelStyle(t: any): React.CSSProperties {
  return {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: t.textMuted, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 6,
  };
}

function inputStyle(t: any): React.CSSProperties {
  return {
    width: '100%', padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${t.sidebarBorder}`,
    background: t.mainBg, color: t.textPrimary,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
}
