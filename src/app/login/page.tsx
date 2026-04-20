'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type Step = 'phone' | 'otp' | 'onboard';

// Inner component — menggunakan useSearchParams.
// Harus di-wrap Suspense (required oleh Next.js 15+).
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, requestOtp, verifyOtp, updateProfile } = useAuth();

  // Baca ?redirect= dari URL dengan security guard:
  // - HANYA path internal yang dimulai dengan "/"
  // - Tolak "//anything" (protocol-relative URL bypass)
  // - Tolak "https://evil.com" (external redirect attack)
  // Ini mencegah "open redirect vulnerability".
  const rawRedirect = searchParams.get('redirect');
  const redirectTo =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/';

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, redirectTo, router]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  async function handleSendOtp() {
    setError('');
    setLoading(true);
    const result = await requestOtp(phone);
    setLoading(false);
    if (result.success) {
      setInfo(result.message);
      setStep('otp');
      setTimer(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else {
      setError(result.message);
    }
  }

  async function handleVerifyOtp() {
    setError('');
    setLoading(true);
    const code = otp.join('');
    const result = await verifyOtp(phone, code);
    setLoading(false);
    if (result.success) {
      if (result.is_new) {
        setStep('onboard');
      } else {
        router.replace(redirectTo);
      }
    } else {
      setError(result.message);
    }
  }

  async function handleSaveName() {
    setError('');
    setLoading(true);
    const ok = await updateProfile(name);
    setLoading(false);
    if (ok) {
      router.replace(redirectTo);
    } else {
      setError('Gagal simpan nama. Coba lagi.');
    }
  }

  function handleOtpChange(val: string, idx: number) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
      otpRefs.current[idx - 1]?.focus();
    }
  }

  const otpFilled = otp.every((d) => d.length === 1);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">

        {/* Logo */}
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B6B4A]">
            <span className="text-lg font-bold text-white">T</span>
          </div>
          <span className="font-semibold text-gray-900">TeraLoka</span>
        </div>

        {/* ─── Step: Phone ─── */}
        {step === 'phone' && (
          <div>
            <h1 className="mb-1 text-xl font-semibold text-gray-900">Masuk ke TeraLoka</h1>
            <p className="mb-5 text-sm text-gray-500">Kode OTP akan dikirim ke WhatsApp kamu</p>

            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Nomor WhatsApp
            </label>
            <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 transition-colors focus-within:border-[#1B6B4A]">
              <span className="flex h-12 items-center border-r border-gray-200 px-3 text-sm text-gray-400">
                +62
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder="812 3456 7890"
                className="h-12 flex-1 bg-transparent px-3 text-sm outline-none"
              />
            </div>

            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

            <button
              onClick={handleSendOtp}
              disabled={phone.length < 9 || loading}
              className="mt-4 h-12 w-full rounded-xl bg-[#1B6B4A] text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
            </button>

            <p className="mt-4 text-center text-xs leading-relaxed text-gray-400">
              Dengan masuk, kamu setuju dengan{' '}
              <span className="text-[#1B6B4A]">Syarat & Ketentuan</span> TeraLoka
            </p>
          </div>
        )}

        {/* ─── Step: OTP ─── */}
        {step === 'otp' && (
          <div>
            <button
              onClick={() => setStep('phone')}
              className="mb-4 text-sm text-gray-400 hover:text-gray-600"
            >
              ← Kembali
            </button>

            <h1 className="mb-1 text-xl font-semibold text-gray-900">Verifikasi WhatsApp</h1>
            <p className="mb-5 text-sm text-gray-500">
              Masukkan kode 6 digit yang dikirim ke WA{' '}
              <strong className="text-gray-800">+62{phone}</strong>
            </p>

            {info && <p className="mb-3 text-xs text-[#1B6B4A]">{info}</p>}

            <div className="mb-4 flex justify-center gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { otpRefs.current[idx] = el; }}
                  type="tel"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  className="h-14 w-11 rounded-xl border border-gray-200 text-center text-xl font-semibold outline-none transition-colors focus:border-[#1B6B4A]"
                />
              ))}
            </div>

            {error && <p className="mb-2 text-center text-xs text-red-500">{error}</p>}

            <button
              onClick={handleVerifyOtp}
              disabled={!otpFilled || loading}
              className="h-12 w-full rounded-xl bg-[#1B6B4A] text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? 'Memverifikasi...' : 'Verifikasi'}
            </button>

            <div className="mt-4 text-center">
              {timer > 0 ? (
                <span className="text-xs text-gray-400">
                  Kirim ulang dalam <strong>{timer}s</strong>
                </span>
              ) : (
                <button
                  onClick={handleSendOtp}
                  className="text-xs font-medium text-[#1B6B4A]"
                >
                  Kirim Ulang OTP
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Step: Onboard (user baru) ─── */}
        {step === 'onboard' && (
          <div>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <svg className="h-7 w-7 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Akun Terverifikasi!</h2>
              <p className="text-sm text-gray-500">Satu langkah lagi — siapa nama kamu?</p>
            </div>

            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Contoh: Ahmad Riahi"
              className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition-colors focus:border-[#1B6B4A]"
            />

            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

            <button
              onClick={handleSaveName}
              disabled={name.trim().length < 2 || loading}
              className="mt-4 h-12 w-full rounded-xl bg-[#1B6B4A] text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? 'Menyimpan...' : 'Simpan & Masuk'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// Default export — Suspense wrapper untuk useSearchParams (Next.js 15+).
// Fallback: card kosong dengan dimensi sama biar ga ada layout shift.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="h-[420px] animate-pulse rounded-xl bg-gray-50" />
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
