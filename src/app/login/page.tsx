'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PinInput from '@/components/auth/PinInput';

type Step = 'phone' | 'otp' | 'setpin' | 'onboard' | 'pinlogin';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, lockedSession, requestOtp, verifyOtp, pinLogin, setPin, updateProfile, logoutFull } =
    useAuth();

  const rawRedirect = searchParams.get('redirect');
  const redirectTo =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [pin1, setPin1] = useState(['', '', '', '', '', '']);
  const [pin2, setPin2] = useState(['', '', '', '', '', '']);
  const [loginPin, setLoginPin] = useState(['', '', '', '', '', '']);
  const [isNewUser, setIsNewUser] = useState(false);
  const [resetPinMode, setResetPinMode] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Boot: kalau ada sesi terkunci + device trusted -> langsung layar PIN-login.
  useEffect(() => {
    if (isLoading || bootDone) return;
    if (lockedSession) {
      setPhone(lockedSession.phone.replace(/^62/, ''));
      setStep('pinlogin');
    }
    setBootDone(true);
  }, [isLoading, lockedSession, bootDone]);

  useEffect(() => {
    // Redirect hanya pas user sudah login DAN tidak lagi di tengah setup/PIN.
    if (user && (step === 'phone' || step === 'pinlogin')) router.replace(redirectTo);
  }, [user, step, redirectTo, router]);

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
      setIsNewUser(!!result.is_new);
      if (resetPinMode || !result.has_pin) {
        setStep('setpin'); // reset PIN (lupa) ATAU belum punya PIN
      } else if (result.is_new) {
        setStep('onboard');
      } else {
        router.replace(redirectTo);
      }
    } else {
      setError(result.message);
    }
  }

  async function handlePinLogin() {
    setError('');
    const p = loginPin.join('');
    if (p.length !== 6) {
      setError('Masukkan 6 angka PIN.');
      return;
    }
    setLoading(true);
    const r = await pinLogin(p);
    setLoading(false);
    if (r.success) {
      router.replace(redirectTo);
    } else {
      setError(r.message);
      setLoginPin(['', '', '', '', '', '']);
      if (r.fallbackOtp) {
        // device tidak valid / expired / terkunci -> jatuh ke OTP
        setInfo('Verifikasi ulang dengan OTP diperlukan.');
        setStep('phone');
      }
    }
  }

  function handleForgotPin() {
    setError('');
    setInfo('');
    setResetPinMode(true);
    // phone sudah ke-set dari lockedSession; langsung kirim OTP
    handleSendOtp();
  }

  function handleNotMe() {
    logoutFull();
    setResetPinMode(false);
    setLoginPin(['', '', '', '', '', '']);
    setPhone('');
    setError('');
    setInfo('');
    setStep('phone');
  }

  async function handleSetPin() {
    setError('');
    const p1 = pin1.join('');
    const p2 = pin2.join('');
    if (p1.length !== 6) {
      setError('PIN harus 6 angka.');
      return;
    }
    if (p1 !== p2) {
      setError('PIN dan ulangi PIN tidak sama.');
      setPin2(['', '', '', '', '', '']);
      return;
    }
    setLoading(true);
    const r = await setPin(p1);
    setLoading(false);
    if (r.success) {
      if (resetPinMode) {
        router.replace(redirectTo);
      } else if (isNewUser) {
        setStep('onboard');
      } else {
        router.replace(redirectTo);
      }
    } else {
      setError(r.message);
      setPin1(['', '', '', '', '', '']);
      setPin2(['', '', '', '', '', '']);
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
  const pinFilled = pin1.every((d) => d.length === 1) && pin2.every((d) => d.length === 1);
  const loginPinFilled = loginPin.every((d) => d.length === 1);

  const maskedPhone = lockedSession
    ? `${lockedSession.phone.slice(0, 5)}***${lockedSession.phone.slice(-3)}`
    : '';

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

        {/* Step: PIN Login (device trusted) */}
        {step === 'pinlogin' && (
          <div>
            <h1 className="mb-1 text-xl font-semibold text-gray-900">
              Halo{lockedSession?.name ? `, ${lockedSession.name}` : ''}
            </h1>
            <p className="mb-5 text-sm text-gray-500">
              Masukkan PIN untuk masuk{maskedPhone ? ` (${maskedPhone})` : ''}
            </p>

            <div className="mb-4">
              <PinInput value={loginPin} onChange={(v) => { setLoginPin(v); setError(''); }} autoFocus />
            </div>

            {error && <p className="mb-2 text-center text-xs text-red-500">{error}</p>}

            <button
              onClick={handlePinLogin}
              disabled={!loginPinFilled || loading}
              className="h-12 w-full rounded-xl bg-[#1B6B4A] text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>

            <div className="mt-4 flex items-center justify-between">
              <button onClick={handleForgotPin} className="text-xs font-medium text-[#1B6B4A]">
                Lupa PIN?
              </button>
              <button onClick={handleNotMe} className="text-xs text-gray-400 hover:text-gray-600">
                Bukan akun ini
              </button>
            </div>
          </div>
        )}

        {/* Step: Phone */}
        {step === 'phone' && (
          <div>
            <h1 className="mb-1 text-xl font-semibold text-gray-900">Masuk ke TeraLoka</h1>
            <p className="mb-5 text-sm text-gray-500">Kode OTP akan dikirim ke WhatsApp kamu</p>

            <label className="mb-1.5 block text-xs font-medium text-gray-500">Nomor WhatsApp</label>
            <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 transition-colors focus-within:border-[#1B6B4A]">
              <span className="flex h-12 items-center border-r border-gray-200 px-3 text-sm text-gray-400">+62</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder="812 3456 7890"
                className="h-12 flex-1 bg-transparent px-3 text-sm outline-none"
              />
            </div>

            {info && <p className="mt-2 text-xs text-[#1B6B4A]">{info}</p>}
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

            <button
              onClick={handleSendOtp}
              disabled={phone.length < 9 || loading}
              className="mt-4 h-12 w-full rounded-xl bg-[#1B6B4A] text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
            </button>

            <p className="mt-4 text-center text-xs leading-relaxed text-gray-400">
              Dengan masuk, kamu setuju dengan <span className="text-[#1B6B4A]">Syarat & Ketentuan</span> TeraLoka
            </p>
          </div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <div>
            <button onClick={() => setStep('phone')} className="mb-4 text-sm text-gray-400 hover:text-gray-600">
              ← Kembali
            </button>

            <h1 className="mb-1 text-xl font-semibold text-gray-900">Verifikasi WhatsApp</h1>
            <p className="mb-5 text-sm text-gray-500">
              Masukkan kode 6 digit yang dikirim ke WA <strong className="text-gray-800">+62{phone}</strong>
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
                <span className="text-xs text-gray-400">Kirim ulang dalam <strong>{timer}s</strong></span>
              ) : (
                <button onClick={handleSendOtp} className="text-xs font-medium text-[#1B6B4A]">Kirim Ulang OTP</button>
              )}
            </div>
          </div>
        )}

        {/* Step: Set PIN */}
        {step === 'setpin' && (
          <div>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <svg className="h-7 w-7 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {resetPinMode ? 'Atur Ulang PIN' : 'Buat PIN Keamanan'}
              </h2>
              <p className="text-sm text-gray-500">PIN 6 angka untuk amankan akun & login cepat tanpa OTP.</p>
            </div>

            <label className="mb-1.5 block text-xs font-medium text-gray-500">PIN baru</label>
            <div className="mb-4">
              <PinInput value={pin1} onChange={(v) => { setPin1(v); setError(''); }} autoFocus />
            </div>

            <label className="mb-1.5 block text-xs font-medium text-gray-500">Ulangi PIN</label>
            <div className="mb-2">
              <PinInput value={pin2} onChange={(v) => { setPin2(v); setError(''); }} />
            </div>

            {error && <p className="mb-2 text-center text-xs text-red-500">{error}</p>}

            <button
              onClick={handleSetPin}
              disabled={!pinFilled || loading}
              className="mt-2 h-12 w-full rounded-xl bg-[#1B6B4A] text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? 'Menyimpan...' : 'Simpan PIN'}
            </button>

            <p className="mt-3 text-center text-xs text-gray-400">Hindari PIN mudah ditebak (123456, 000000, dst).</p>
          </div>
        )}

        {/* Step: Onboard */}
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

            <label className="mb-1.5 block text-xs font-medium text-gray-500">Nama Lengkap</label>
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
