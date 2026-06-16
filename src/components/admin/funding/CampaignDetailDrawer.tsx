'use client';

// [CAMPAIGN-DETAIL-DRAWER] Shell drawer geser dari kanan untuk Detail Kampanye — konsisten
// pola DonationVerifyDrawer. Generic (children-based) supaya CampaignDetail + tombol aksi
// tetap di page.tsx (NOL ubah logika checklist/approve). List campaign tetap terlihat.
// Tutup: ✕ / klik overlay / Esc. z=45 (di atas header z-30, di bawah modal approve/reject z-50).

import { useEffect, useContext } from 'react';
import { X } from 'lucide-react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

export default function CampaignDetailDrawer({
  open,
  onClose,
  title = 'Detail Kampanye',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { t } = useContext(AdminThemeContext);

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

  if (!open) return null;

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
          animation: 'tlCampDrawerIn 200ms ease-out',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: `1px solid ${t.cardBorder}`, flexShrink: 0,
        }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: t.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {title}
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

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </div>
      </div>

      <style>{`@keyframes tlCampDrawerIn { from { transform: translateX(28px); opacity: 0.5 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  );
}
