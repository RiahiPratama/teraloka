'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import PinInput from '@/components/auth/PinInput';

interface ChangePinModalProps {
  open: boolean;
  onClose: () => void;
}

type Stage = 'current' | 'new' | 'done';

const EMPTY: string[] = ['', '', '', '', '', ''];

export default function ChangePinModal({ open, onClose }: ChangePinModalProps) {
  const { verifyPin, setPin } = useAuth();

  const [stage, setStage] = useState<Stage>('current');
  const [curPin, setCurPin] = useState<string[]>([...EMPTY]);
  const [newPin1, setNewPin1] = useState<string[]>([...EMPTY]);
  const [newPin2, setNewPin2] = useState<string[]>([...EMPTY]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset penuh tiap modal dibuka (jangan bocorin state antar-sesi).
  useEffect(() => {
    if (open) {
      setStage('current');
      setCurPin([...EMPTY]);
      setNewPin1([...EMPTY]);
      setNewPin2([...EMPTY]);
      setError('');
      setLoading(false);
    }
  }, [open]);

  // Tutup pakai ESC.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const curFilled = curPin.every((d) => d.length === 1);
  const newFilled = newPin1.every((d) => d.length === 1) && newPin2.every((d) => d.length === 1);

  async function handleVerifyCurrent() {
    setError('');
    setLoading(true);
    const r = await verifyPin(curPin.join(''));
    setLoading(false);
    if (r.success) {
      setStage('new');
    } else {
      setError(r.message || 'PIN lama salah.');
      setCurPin([...EMPTY]);
    }
  }

  async function handleSaveNew() {
    setError('');
    const p1 = newPin1.join('');
    const p2 = newPin2.join('');
    if (p1 !== p2) {
      setError('PIN baru & ulangi PIN tidak sama.');
      setNewPin2([...EMPTY]);
      return;
    }
    setLoading(true);
    const r = await setPin(p1); // backend tolak PIN lemah (422) -> pesan ditampilkan
    setLoading(false);
    if (r.success) {
      setStage('done');
    } else {
      setError(r.message || 'Gagal menyimpan PIN baru.');
      setNewPin1([...EMPTY]);
      setNewPin2([...EMPTY]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50">
              <svg className="h-5 w-5 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Ganti PIN</h2>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="text-gray-400 hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stage: verifikasi PIN lama */}
        {stage === 'current' && (
          <div>
            <p className="mb-4 text-sm text-gray-500">Masukkan PIN lama kamu untuk lanjut.</p>
            <div className="mb-4">
              <PinInput value={curPin} onChange={(v) => { setCurPin(v); setError(''); }} autoFocus />
            </div>

            {error && <p className="mb-2 text-center text-xs text-red-500">{error}</p>}

            <button
              onClick={handleVerifyCurrent}
              disabled={!curFilled || loading}
              className="h-12 w-full rounded-xl bg-[#1B6B4A] text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? 'Memeriksa...' : 'Lanjut'}
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">
              Lupa PIN lama? Keluar lalu masuk dengan OTP untuk atur ulang.
            </p>
          </div>
        )}

        {/* Stage: PIN baru */}
        {stage === 'new' && (
          <div>
            <p className="mb-4 text-sm text-gray-500">Buat PIN baru 6 angka.</p>

            <label className="mb-1.5 block text-xs font-medium text-gray-500">PIN baru</label>
            <div className="mb-4">
              <PinInput value={newPin1} onChange={(v) => { setNewPin1(v); setError(''); }} autoFocus />
            </div>

            <label className="mb-1.5 block text-xs font-medium text-gray-500">Ulangi PIN baru</label>
            <div className="mb-2">
              <PinInput value={newPin2} onChange={(v) => { setNewPin2(v); setError(''); }} />
            </div>

            {error && <p className="mb-2 text-center text-xs text-red-500">{error}</p>}

            <button
              onClick={handleSaveNew}
              disabled={!newFilled || loading}
              className="mt-2 h-12 w-full rounded-xl bg-[#1B6B4A] text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? 'Menyimpan...' : 'Simpan PIN Baru'}
            </button>
            <p className="mt-3 text-center text-xs text-gray-400">Hindari PIN mudah ditebak (123456, 000000, dst).</p>
          </div>
        )}

        {/* Stage: sukses */}
        {stage === 'done' && (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <svg className="h-7 w-7 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">PIN Berhasil Diganti</h3>
            <p className="mb-5 text-sm text-gray-500">PIN baru kamu sudah aktif untuk login berikutnya.</p>
            <button
              onClick={onClose}
              className="h-12 w-full rounded-xl bg-[#1B6B4A] text-sm font-semibold text-white"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
