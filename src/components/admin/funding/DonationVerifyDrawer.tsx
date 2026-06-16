'use client';

// [BADONASI-VERIFY-DRAWER] Step 2: drawer geser dari kanan di atas list donasi.
// Reuse DonationVerifyPanel (Step 1) PERSIS — NOL ubah komponen verify. List tetap terlihat
// di belakang overlay. Tutup: ✕ / klik overlay / Esc. Deep-link halaman [id] tetap hidup.
//
// z-index: overlay z=45 (di atas header z-30 + sidebar-mobile z-40, di BAWAH reject modal
// panel z-50 yang hidup di dalam stacking-context drawer → reject tetap muncul di atas drawer).

import { useEffect, useContext } from 'react';
import { X } from 'lucide-react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import DonationVerifyPanel from '@/components/admin/funding/DonationVerifyPanel';

export default function DonationVerifyDrawer({
  donationId,
  onClose,
  onDone,
}: {
  donationId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useContext(AdminThemeContext);
  const open = !!donationId;

  // Esc untuk tutup + lock scroll body selama drawer terbuka
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !donationId) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 45,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(560px, 100vw)', height: '100%',
          background: t.mainBg, borderLeft: `1px solid ${t.cardBorder}`,
          boxShadow: '-12px 0 40px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'tlDrawerIn 200ms ease-out',
        }}
      >
        {/* Header drawer + tombol tutup */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0,
        }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: t.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Verifikasi Donasi
          </span>
          <button
            onClick={onClose}
            aria-label="Tutup"
            title="Tutup (Esc)"
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: t.card, border: `1px solid ${t.cardBorder}`, color: t.textMuted, cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Area scroll: panel verify (reuse) — key=donationId → remount bersih saat ganti donasi */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <DonationVerifyPanel key={donationId} donationId={donationId} onDone={onDone} />
        </div>
      </div>

      <style>{`@keyframes tlDrawerIn { from { transform: translateX(28px); opacity: 0.5 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  );
}
