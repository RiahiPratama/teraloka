'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Lease Reminder Modal (kirim WA pengingat sewa)
// PATH: src/components/bakos/owner/LeaseReminderModal.tsx
// PENANDA: L5-FE-LEASE-REMINDER-MODAL
// ────────────────────────────────────────────────────────────────
// POST /bakos/owner/lease/:id/remind/preview → tampil pesan + anti-spam
// POST /bakos/owner/lease/:id/remind          → kirim WA
// 🛡️ Gating cara (b): kalau backend balik 403 (tier < Pro) → teaser upgrade.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApi, ApiError } from '@/lib/api/client';
import { BAKOS_TOKENS } from './types';
import { type Lease } from './lease-types';
import { X, Loader2, Send, BellRing, Clock, CheckCircle2, Crown, MessageCircle } from 'lucide-react';

const BRAND = BAKOS_TOKENS.accent;

interface Preview {
  tenant_name: string;
  tenant_phone: string | null;
  kos_title: string;
  room_name: string | null;
  message_preview: string;
  anti_spam_blocked: boolean;
  anti_spam_reason: string | null;
  anti_spam_next_allowed_at: string | null;
}

type Phase = 'loading' | 'ready' | 'locked' | 'sending' | 'sent' | 'error';

export default function LeaseReminderModal({
  lease, onClose,
}: {
  lease: Lease;
  onClose: () => void;
}) {
  const api = useApi();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false); // tier < Pro (403)

  useEffect(() => {
    (async () => {
      try {
        const p = await api.post<Preview>(`/bakos/owner/lease/${lease.id}/remind/preview`, {});
        setPreview(p);
        setPhase('ready');
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          setUpgrade(true);
          setPhase('locked');
        } else {
          setError(e instanceof ApiError ? e.message : 'Gagal memuat pengingat.');
          setPhase('error');
        }
      }
    })();
  }, [api, lease.id]);

  async function handleSend() {
    try {
      setPhase('sending');
      const res = await api.post<{ success: boolean; blocked?: boolean; blocked_reason?: string }>(
        `/bakos/owner/lease/${lease.id}/remind`, {},
      );
      if (res.success) {
        setPhase('sent');
      } else {
        setError(res.blocked_reason ?? 'Gagal mengirim.');
        setPhase('error');
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) { setUpgrade(true); setPhase('locked'); return; }
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim.');
      setPhase('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(44,44,42,0.45)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl" style={{ background: BAKOS_TOKENS.pageBg }} onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b backdrop-blur" style={{ background: 'rgba(239,237,229,0.95)', borderColor: BAKOS_TOKENS.border }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: BAKOS_TOKENS.textPrimary }}>
            <BellRing size={18} style={{ color: BRAND }} /> Ingatkan Sewa
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5"><X size={18} style={{ color: BAKOS_TOKENS.textSecondary }} /></button>
        </div>

        <div className="px-5 py-4">
          {/* LOADING */}
          {phase === 'loading' && (
            <div className="flex items-center justify-center py-12"><Loader2 size={22} className="animate-spin" style={{ color: BRAND }} /></div>
          )}

          {/* LOCKED — tier < Pro (cara b: teaser upgrade) */}
          {phase === 'locked' && upgrade && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ background: BAKOS_TOKENS.accentBg }}>
                <Crown size={26} style={{ color: BRAND }} />
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: BAKOS_TOKENS.textPrimary }}>Pengingat WA — fitur Pro</p>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: BAKOS_TOKENS.textSecondary }}>
                Kirim pengingat WhatsApp otomatis ke penyewa hanya tersedia di paket <b>Pro</b> & <b>Bisnis</b>.
              </p>
              <button onClick={() => router.push('/owner/bakos/langganan')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform"
                style={{ background: BRAND, color: '#fff' }}>
                <Crown size={15} /> Upgrade Paket
              </button>
            </div>
          )}

          {/* READY — preview pesan */}
          {phase === 'ready' && preview && (
            <>
              <div className="rounded-2xl p-3.5 mb-3 flex items-center gap-3" style={{ background: '#fff', border: `1px solid ${BAKOS_TOKENS.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: BAKOS_TOKENS.accentBg }}>
                  <MessageCircle size={18} style={{ color: BRAND }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: BAKOS_TOKENS.textPrimary }}>{preview.tenant_name}</p>
                  <p className="text-[11px]" style={{ color: BAKOS_TOKENS.textSecondary }}>{preview.tenant_phone ?? '— no WA —'} · {preview.room_name ?? ''}</p>
                </div>
              </div>

              {/* preview bubble (mirip WA) */}
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: BAKOS_TOKENS.textTertiary }}>Pesan yang dikirim</p>
              <div className="rounded-2xl p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap mb-3" style={{ background: '#E7F6EA', color: '#1B3A28', border: '1px solid #C9E9CF' }}>
                {preview.message_preview}
              </div>

              {/* anti-spam */}
              {preview.anti_spam_blocked && (
                <div className="rounded-xl p-3 mb-3 flex items-start gap-2" style={{ background: BAKOS_TOKENS.surfaceAlt }}>
                  <Clock size={15} className="shrink-0 mt-0.5" style={{ color: BAKOS_TOKENS.textTertiary }} />
                  <p className="text-[11px]" style={{ color: BAKOS_TOKENS.textSecondary }}>{preview.anti_spam_reason}</p>
                </div>
              )}

              {!preview.tenant_phone && (
                <p className="text-[11px] mb-3" style={{ color: '#A32D2D' }}>Penyewa ini belum punya nomor WA. Edit dulu untuk menambahkan.</p>
              )}
            </>
          )}

          {/* SENT */}
          {phase === 'sent' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: '#E1F5EE' }}>
                <CheckCircle2 size={28} style={{ color: '#15803D' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: BAKOS_TOKENS.textPrimary }}>Pengingat terkirim!</p>
              <p className="text-xs mt-1" style={{ color: BAKOS_TOKENS.textSecondary }}>WhatsApp sudah dikirim ke {preview?.tenant_name}.</p>
            </div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <div className="rounded-xl p-3 my-2 flex items-start gap-2" style={{ background: '#FDECEC' }}>
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* footer — tombol kirim (cuma di ready/sending) */}
        {(phase === 'ready' || phase === 'sending') && preview && (
          <div className="sticky bottom-0 px-5 py-4 border-t backdrop-blur" style={{ background: 'rgba(239,237,229,0.95)', borderColor: BAKOS_TOKENS.border }}>
            <button
              onClick={handleSend}
              disabled={phase === 'sending' || preview.anti_spam_blocked || !preview.tenant_phone}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: BRAND }}>
              {phase === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {phase === 'sending' ? 'Mengirim...' : preview.anti_spam_blocked ? 'Sudah diingatkan' : 'Kirim Pengingat WA'}
            </button>
          </div>
        )}

        {(phase === 'sent' || phase === 'error' || phase === 'locked') && (
          <div className="px-5 pb-5">
            <button onClick={onClose} className="w-full rounded-xl py-3 text-sm font-semibold border" style={{ borderColor: BAKOS_TOKENS.border, color: BAKOS_TOKENS.textPrimary, background: '#fff' }}>
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
