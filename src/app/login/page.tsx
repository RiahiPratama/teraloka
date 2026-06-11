'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PinInput from '@/components/auth/PinInput';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import Logo from '@/components/ui/Logo';

type Step = 'phone' | 'otp' | 'setpin' | 'onboard' | 'addphone' | 'pinlogin';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, lockedSession, requestOtp, verifyOtp, googleLogin, pinLogin, setPin, updateProfile, savePhone, logoutFull } =
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
  const [googlePhone, setGooglePhone] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  // Nahan redirect-otomatis selama flow Google (login set user tapi kita mau
  // lanjut ke setpin/addphone dulu, bukan langsung tendang ke redirectTo).
  const [googleInProgress, setGoogleInProgress] = useState(false);
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
    // googleInProgress = nahan redirect selama flow Google (mau ke setpin/addphone dulu).
    if (!googleInProgress && user && (step === 'phone' || step === 'pinlogin')) router.replace(redirectTo);
  }, [user, step, redirectTo, router, googleInProgress]);

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

  // Google Sign-In: terima id_token dari tombol Google → backend → user set.
  // Flow: login → kalau belum punya PIN -> setpin (keputusan: PIN wajib utk Google).
  //       Setelah PIN -> step 'addphone' (soft-gate nomor) -> masuk.
  //       Kalau user lama (sudah punya PIN) -> langsung masuk.
  async function handleGoogleCredential(idToken: string) {
    setError('');
    setGoogleLoading(true);
    setGoogleInProgress(true); // tahan redirect-otomatis selama flow Google
    const result = await googleLogin(idToken);
    setGoogleLoading(false);
    if (result.success) {
      setIsNewUser(!!result.is_new);
      if (!result.has_pin) {
        // user Google baru / belum set PIN -> wajib set PIN dulu
        setStep('setpin');
      } else {
        // user Google lama yang sudah punya PIN -> langsung masuk
        setGoogleInProgress(false);
        router.replace(redirectTo);
      }
    } else {
      setGoogleInProgress(false);
      setError(result.message || 'Login Google gagal. Coba lagi.');
    }
  }

  // Simpan nomor WA (soft-gate, opsional). Skip = langsung masuk.
  async function handleSaveGooglePhone() {
    setError('');
    if (googlePhone.length < 9) {
      setError('Nomor tidak valid. Minimal 9 angka.');
      return;
    }
    setLoading(true);
    const r = await savePhone(googlePhone);
    setLoading(false);
    if (r.success) {
      router.replace(redirectTo);
    } else {
      setError(r.message);
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
    // OTP DIPARKIR (6511 throttle) → reset PIN via OTP gak jalan. User yang lupa
    // PIN diarahin LOGIN ULANG (Google). Login Google sukses → masuk → bisa set
    // PIN baru dari menu. logoutFull bersihin sesi terkunci → tampil layar Google.
    // Pas OTP reliable (Meta) masuk: balikin handleSendOtp() + setResetPinMode(true).
    logoutFull();
    setResetPinMode(false);
    setLoginPin(['', '', '', '', '', '']);
    setInfo('Untuk keamanan, silakan masuk lagi dengan Google.');
    setStep('phone');
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
      } else if (user && !user.phone) {
        // User Google baru (phone null) -> soft-gate tambah nomor WA dulu
        setStep('addphone');
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* === SIGNATURE: Latar gradient laut Maluku Utara (toska→hutan dalam) === */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -10%, #0E4D52 0%, #0A2E2A 45%, #071F1C 100%)',
        }}
      />
      {/* Ombak halus bawah (kurva laut) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 opacity-60"
        style={{
          background:
            'radial-gradient(80% 100% at 50% 120%, rgba(8,145,178,0.35) 0%, transparent 60%)',
        }}
      />
      {/* Butiran sinar matahari (sun glow, sangat halus, kanan-atas) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 h-72 w-72 rounded-full blur-3xl"
        style={{ top: '8%', right: '12%', background: 'rgba(232,150,58,0.10)' }}
      />

      {/* === KARTU: floating, depth berlapis, kertas hangat === */}
      <div
        className="w-full max-w-[380px] rounded-[28px] border border-white/60 bg-[#FBFAF6] px-8 pb-9 pt-8"
        style={{
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.6) inset, 0 30px 60px -20px rgba(7,31,28,0.55), 0 8px 24px -12px rgba(7,31,28,0.4)',
        }}
      >

        {/* === LOGO TeraLoka asli (komponen <Logo/> — sama kayak Navbar, height digedein) === */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo height={40} />
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[#0A2E2A]/40">
            Maluku Utara
          </p>
        </div>

        {/* Step: PIN Login (device trusted) */}
        {step === 'pinlogin' && (
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#0A2E2A]">
              Halo{lockedSession?.name ? `, ${lockedSession.name}` : ''}
            </h1>
            <p className="mb-6 mt-1 text-[13px] text-[#0A2E2A]/55">
              Masukkan PIN untuk masuk{maskedPhone ? ` (${maskedPhone})` : ''}
            </p>

            <div className="mb-4">
              <PinInput value={loginPin} onChange={(v) => { setLoginPin(v); setError(''); }} autoFocus />
            </div>

            {error && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-[12px] text-red-600">{error}</div>
            )}

            <button
              onClick={handlePinLogin}
              disabled={!loginPinFilled || loading}
              className="h-[52px] w-full rounded-2xl bg-[#1B6B4A] text-[14px] font-semibold tracking-wide text-white shadow-[0_8px_20px_-8px_rgba(27,107,74,0.6)] transition-all hover:bg-[#155c3f] disabled:opacity-40 disabled:shadow-none"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>

            <div className="mt-5 flex items-center justify-between">
              <button onClick={handleForgotPin} className="text-[12px] font-medium text-[#1B6B4A]">
                Lupa PIN?
              </button>
              <button onClick={handleNotMe} className="text-[12px] text-[#0A2E2A]/40 hover:text-[#0A2E2A]/70">
                Bukan akun ini
              </button>
            </div>
          </div>
        )}

        {/* Step: Phone — OTP DIPARKIR (6511 di-throttle WhatsApp, 11 Jun 2026).
            Google jadi satu-satunya jalur aktif. Form OTP disembunyiin TAPI semua
            handler (handleSendOtp/verifyOtp/step otp/setpin) TETAP UTUH di file —
            tinggal munculin lagi tombol "Masuk pakai nomor HP" pas channel OTP
            reliable (Meta Cloud API) masuk. GREP MARKER: OTP_PARKED_GOOGLE_PRIMARY_20260611 */}
        {step === 'phone' && (
          <div>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#0A2E2A]">
              Selamat datang
            </h1>
            <p className="mb-7 mt-1.5 text-[13.5px] leading-relaxed text-[#0A2E2A]/55">
              Pintu masuk warga Maluku Utara — satu akun untuk berita, lapor, donasi, dan layanan.
            </p>

            {info && (
              <div className="mb-4 rounded-xl border border-[#1B6B4A]/15 bg-[#1B6B4A]/5 px-3.5 py-2.5 text-center text-[12px] text-[#1B6B4A]">
                {info}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-[12px] text-red-600">
                {error}
              </div>
            )}

            {/* Tombol Google — frame premium membungkus tombol resmi Google */}
            <div className="rounded-2xl border border-[#0A2E2A]/8 bg-white p-1 shadow-[0_4px_16px_-8px_rgba(7,31,28,0.25)]">
              <div className="flex items-center justify-center rounded-xl py-1">
                <GoogleSignInButton
                  onCredential={handleGoogleCredential}
                  onError={() => setError('Login Google dibatalkan atau gagal. Coba lagi.')}
                  disabled={googleLoading}
                />
              </div>
            </div>
            {googleLoading && (
              <p className="mt-3 text-center text-[12px] text-[#0A2E2A]/45">Menghubungkan ke akun kamu...</p>
            )}

            {/* Garis pasir tipis (hairline) + jaminan */}
            <div className="mt-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#0A2E2A]/8" />
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#0A2E2A]/35">
                Aman & Terenkripsi
              </span>
              <div className="h-px flex-1 bg-[#0A2E2A]/8" />
            </div>

            <p className="mt-5 text-center text-[11.5px] leading-relaxed text-[#0A2E2A]/40">
              Dengan masuk, kamu menyetujui{' '}
              <span className="font-medium text-[#1B6B4A]">Syarat &amp; Ketentuan</span> TeraLoka
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
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#0891B2]/10 ring-1 ring-[#1B6B4A]/10">
                <svg className="h-8 w-8 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-[20px] font-bold tracking-tight text-[#0A2E2A]">
                {resetPinMode ? 'Atur Ulang PIN' : 'Buat PIN Keamanan'}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#0A2E2A]/55">PIN 6 angka untuk amankan akun &amp; login cepat tanpa OTP.</p>
            </div>

            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[#0A2E2A]/50">PIN baru</label>
            <div className="mb-4">
              <PinInput value={pin1} onChange={(v) => { setPin1(v); setError(''); }} autoFocus />
            </div>

            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[#0A2E2A]/50">Ulangi PIN</label>
            <div className="mb-3">
              <PinInput value={pin2} onChange={(v) => { setPin2(v); setError(''); }} />
            </div>

            {error && (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-[12px] text-red-600">{error}</div>
            )}

            <button
              onClick={handleSetPin}
              disabled={!pinFilled || loading}
              className="mt-2 h-[52px] w-full rounded-2xl bg-[#1B6B4A] text-[14px] font-semibold tracking-wide text-white shadow-[0_8px_20px_-8px_rgba(27,107,74,0.6)] transition-all hover:bg-[#155c3f] disabled:opacity-40 disabled:shadow-none"
            >
              {loading ? 'Menyimpan...' : 'Simpan PIN'}
            </button>

            <p className="mt-4 text-center text-[11.5px] text-[#0A2E2A]/40">Hindari PIN mudah ditebak (123456, 000000, dst).</p>
          </div>
        )}

        {/* Step: Onboard */}
        {step === 'onboard' && (
          <div>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#0891B2]/10 ring-1 ring-[#1B6B4A]/10">
                <svg className="h-8 w-8 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-[20px] font-bold tracking-tight text-[#0A2E2A]">Akun Terverifikasi</h2>
              <p className="mt-1.5 text-[13px] text-[#0A2E2A]/55">Satu langkah lagi — siapa nama kamu?</p>
            </div>

            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[#0A2E2A]/50">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Contoh: Ahmad Riahi"
              className="h-[52px] w-full rounded-2xl border border-[#0A2E2A]/12 bg-white px-4 text-[14px] text-[#0A2E2A] outline-none transition-colors placeholder:text-[#0A2E2A]/30 focus:border-[#1B6B4A]"
            />

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-[12px] text-red-600">{error}</div>
            )}

            <button
              onClick={handleSaveName}
              disabled={name.trim().length < 2 || loading}
              className="mt-5 h-[52px] w-full rounded-2xl bg-[#1B6B4A] text-[14px] font-semibold tracking-wide text-white shadow-[0_8px_20px_-8px_rgba(27,107,74,0.6)] transition-all hover:bg-[#155c3f] disabled:opacity-40 disabled:shadow-none"
            >
              {loading ? 'Menyimpan...' : 'Simpan & Masuk'}
            </button>
          </div>
        )}

        {/* Step: Tambah Nomor WA (soft-gate Google user — alasan jelas + skippable) */}
        {step === 'addphone' && (
          <div>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#0891B2]/10 ring-1 ring-[#1B6B4A]/10">
                <svg className="h-8 w-8 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h2 className="text-[20px] font-bold tracking-tight text-[#0A2E2A]">Tambah Nomor WhatsApp</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#0A2E2A]/55">
                Supaya kami bisa kirim notifikasi pesanan, panggilan darurat (SOS), dan koordinasi BALAJU.
              </p>
            </div>

            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[#0A2E2A]/50">Nomor WhatsApp</label>
            <div className="flex items-center overflow-hidden rounded-2xl border border-[#0A2E2A]/12 bg-white transition-colors focus-within:border-[#1B6B4A]">
              <span className="flex h-[52px] items-center border-r border-[#0A2E2A]/10 px-4 text-[14px] font-medium text-[#0A2E2A]/50">+62</span>
              <input
                type="tel"
                value={googlePhone}
                onChange={(e) => { setGooglePhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder="812 3456 7890"
                className="h-[52px] flex-1 bg-transparent px-4 text-[14px] text-[#0A2E2A] outline-none placeholder:text-[#0A2E2A]/30"
                autoFocus
              />
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-[12px] text-red-600">{error}</div>
            )}

            <button
              onClick={handleSaveGooglePhone}
              disabled={googlePhone.length < 9 || loading}
              className="mt-5 h-[52px] w-full rounded-2xl bg-[#1B6B4A] text-[14px] font-semibold tracking-wide text-white shadow-[0_8px_20px_-8px_rgba(27,107,74,0.6)] transition-all hover:bg-[#155c3f] disabled:opacity-40 disabled:shadow-none"
            >
              {loading ? 'Menyimpan...' : 'Simpan & Masuk'}
            </button>

            <button
              onClick={() => router.replace(redirectTo)}
              className="mt-3 w-full text-center text-[12px] text-[#0A2E2A]/40 transition-colors hover:text-[#0A2E2A]/65"
            >
              Nanti saja
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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{ background: 'radial-gradient(120% 90% at 50% -10%, #0E4D52 0%, #0A2E2A 45%, #071F1C 100%)' }}
          />
          <div className="w-full max-w-[380px] rounded-[28px] border border-white/60 bg-[#FBFAF6] px-8 pb-9 pt-8" style={{ boxShadow: '0 30px 60px -20px rgba(7,31,28,0.55)' }}>
            <div className="h-[420px] animate-pulse rounded-2xl bg-[#0A2E2A]/5" />
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
