'use client';

// ════════════════════════════════════════════════════════════════
// DRIVER APPLY SHELL — form pendaftaran driver BALAJU
// ────────────────────────────────────────────────────────────────
// Segmen /mitra/driver/daftar. Mirror pola DriverHomeShell (useApi, ApiError,
// auth gate, CSS bl-landing). OTAK validasi tetap di backend applyAsDriver;
// client cuma validasi ringan (fail-fast sebelum upload berat) + susun ApplyInput.
//
// SMART GATE (cegah dobel-apply + UX):
//   GET /driver/me →
//     404            → bukan driver  → tampilkan FORM
//     200            → sudah driver   → tampilkan STATUS (jangan tampilkan form)
//     401/403        → redirect login
//   POST /apply 409 (ALREADY_APPLIED) → backstop race → pindah ke STATUS
//
// SCOPE MVP (keputusan terkunci): vehicle_type = motorcycle (ride_bike) saja.
//   Alasan: REQUIRED_DOC_TYPES minta sim_c (SIM C = motor). Mobil/kurir = nanti.
//
// 🛡️ KycDocUpload balikin RAW PATH (bukan URL) → langsung masuk file_path.
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bike, Loader2, CheckCircle2, ShieldCheck, ClipboardList, User, FileText, AlertCircle,
} from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import KycDocUpload from '@/components/ui/KycDocUpload';
import '@/components/balaju/public/balaju-landing.css';

const HOME_URL = '/mitra/driver';
const LOGIN_URL = '/login?redirect=/mitra/driver/daftar';

// ── Tipe payload (mirror ApplyInput backend; repo terpisah jadi didefinisikan ulang) ──
interface ApplyDoc {
  doc_type: 'ktp' | 'sim_c' | 'stnk';
  file_path: string;
}
interface ApplyPayload {
  name: string;
  phone: string;
  dob?: string;
  address?: string;
  service_capabilities: string[];
  vehicle: {
    vehicle_type: 'motorcycle';
    plate_number: string;
    brand_model?: string;
    color?: string;
    year?: number;
  };
  documents: ApplyDoc[];
}

type Phase = 'booting' | 'form' | 'already' | 'success';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu verifikasi admin',
  verified: 'Terverifikasi — kamu sudah aktif',
  suspended: 'Ditangguhkan',
  rejected: 'Ditolak',
};

export function DriverApplyShell() {
  const api = useApi();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [phase, setPhase] = useState<Phase>('booting');
  const [checked, setChecked] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  // ── Field data diri ──
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');

  // ── Field kendaraan ──
  const [plate, setPlate] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');

  // ── Dokumen (raw path dari KycDocUpload) ──
  const [ktpPath, setKtpPath] = useState<string | null>(null);
  const [simPath, setSimPath] = useState<string | null>(null);
  const [stnkPath, setStnkPath] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Smart gate: cek /driver/me sekali setelah auth settle ──
  useEffect(() => {
    if (isLoading || checked) return;
    setChecked(true);

    if (!user) {
      router.push(LOGIN_URL);
      return;
    }

    (async () => {
      try {
        const me = await api.get<Record<string, unknown>>('/driver/me');
        const d = (me?.driver as Record<string, unknown> | undefined) ?? me;
        const driverId = d?.id ?? d?.driver_id ?? null;
        const status =
          (d?.verification_status as string | undefined) ??
          (me?.verification_status as string | undefined) ??
          null;

        // Hanya "sudah terdaftar" kalau BENAR ada row driver (driver_id valid).
        // /driver/me bisa balik 200 + objek kosong utk non-driver → itu = FORM.
        if (driverId) {
          setExistingStatus(status ?? 'pending');
          setPhase('already');
        } else {
          setName(user.name ?? '');
          setPhone(user.phone ?? '');
          setPhase('form');
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          // Bukan driver → tampilkan form. Prefill dari akun.
          setName(user.name ?? '');
          setPhone(user.phone ?? '');
          setPhase('form');
          return;
        }
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          router.push(LOGIN_URL);
          return;
        }
        // Error lain (jaringan dll): biarkan isi form; backend tetap guard saat submit.
        setName(user.name ?? '');
        setPhone(user.phone ?? '');
        setPhase('form');
      }
    })();
  }, [isLoading, user, checked, api, router]);

  const docsReady = !!ktpPath && !!simPath && !!stnkPath;

  const validate = useCallback((): string | null => {
    if (name.trim().length < 2) return 'Nama wajib diisi (min 2 huruf).';
    if (phone.replace(/\D/g, '').length < 9) return 'Nomor HP tidak valid.';
    if (plate.trim().length < 3) return 'Plat nomor wajib diisi.';
    if (!ktpPath) return 'Foto KTP wajib diupload.';
    if (!simPath) return 'Foto SIM C wajib diupload.';
    if (!stnkPath) return 'Foto STNK wajib diupload.';
    return null;
  }, [name, phone, plate, ktpPath, simPath, stnkPath]);

  async function handleSubmit() {
    if (submitting) return;
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setSubmitting(true);

    const yearNum = year.trim() ? Number(year.trim()) : undefined;
    const payload: ApplyPayload = {
      name: name.trim(),
      phone: phone.trim(),
      service_capabilities: ['ride_bike'],
      vehicle: {
        vehicle_type: 'motorcycle',
        plate_number: plate.trim().toUpperCase(),
        ...(brandModel.trim() ? { brand_model: brandModel.trim() } : {}),
        ...(color.trim() ? { color: color.trim() } : {}),
        ...(yearNum && !Number.isNaN(yearNum) ? { year: yearNum } : {}),
      },
      documents: [
        { doc_type: 'ktp', file_path: ktpPath as string },
        { doc_type: 'sim_c', file_path: simPath as string },
        { doc_type: 'stnk', file_path: stnkPath as string },
      ],
      ...(dob ? { dob } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
    };

    try {
      await api.post('/driver/apply', payload);
      setPhase('success');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // ALREADY_APPLIED — sudah jadi driver (race). Pindah ke status.
        setExistingStatus('pending');
        setPhase('already');
        return;
      }
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        router.push(LOGIN_URL);
        return;
      }
      setFormError(e instanceof ApiError ? e.message : 'Gagal mengirim pengajuan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── BOOTING ──
  if (phase === 'booting' || isLoading) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--bl-forest)]" />
          <p className="mt-3 text-sm text-[var(--bl-muted)]">Memuat…</p>
        </div>
      </div>
    );
  }

  // ── SUDAH TERDAFTAR ──
  if (phase === 'already') {
    const label = existingStatus ? (STATUS_LABEL[existingStatus] ?? existingStatus) : 'Terdaftar';
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--bl-forest-10)] text-[var(--bl-forest)]">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="bl-display mt-3 text-lg font-extrabold text-[var(--bl-ink)]">Kamu sudah terdaftar</h1>
          <p className="mt-1 text-sm text-[var(--bl-muted)]">
            Status: <span className="font-bold text-[var(--bl-forest-d)]">{label}</span>
          </p>
          <Link
            href={HOME_URL}
            className="bl-shadow-lift mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--bl-forest)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)]"
          >
            Buka Dasbor Driver
          </Link>
        </div>
      </div>
    );
  }

  // ── SUKSES ──
  if (phase === 'success') {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--bl-forest-10)] text-[var(--bl-forest)]">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h1 className="bl-display mt-3 text-lg font-extrabold text-[var(--bl-ink)]">Pengajuan terkirim!</h1>
          <p className="mt-1 text-sm text-[var(--bl-muted)]">
            Tim TeraLoka akan memeriksa dokumenmu. Kamu bisa mulai menerima order setelah akun diverifikasi.
          </p>
          <Link
            href={HOME_URL}
            className="bl-shadow-lift mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--bl-forest)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)]"
          >
            Buka Dasbor Driver
          </Link>
        </div>
      </div>
    );
  }

  // ── FORM ──
  const userId = user?.id;
  return (
    <div className="bl-landing">
      <div className="mx-auto max-w-md px-4 py-6 md:pt-12">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--bl-forest)] text-white">
            <Bike className="h-[18px] w-[18px]" />
          </span>
          <div className="leading-none">
            <div className="bl-display text-base font-extrabold text-[var(--bl-forest-d)]">Daftar Jadi Driver</div>
            <div className="mt-0.5 text-[11px] text-[var(--bl-muted)]">BALAJU Mitra · Ternate</div>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-[var(--bl-forest-10)] px-3 py-2.5 text-xs text-[var(--bl-forest-d)]">
          Saat ini BALAJU membuka pendaftaran untuk <strong>Ojek (motor)</strong>. Mobil &amp; kurir menyusul.
        </p>

        {/* Form: native form, Enter-to-submit, preventDefault */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="mt-5 space-y-6"
        >
          {/* ── DATA DIRI ── */}
          <section className="bl-shadow-soft rounded-2xl border border-[var(--bl-line)] bg-white p-4">
            <SectionHeader icon={User} title="Data Diri" />
            <div className="mt-3 space-y-3">
              <Field label="Nama lengkap" required>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sesuai KTP"
                  className={inputCls}
                />
              </Field>
              <Field label="Nomor HP (WhatsApp)" required>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className={inputCls}
                />
              </Field>
              <Field label="Tanggal lahir">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Alamat domisili">
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="Kelurahan, kecamatan (opsional)"
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          {/* ── KENDARAAN ── */}
          <section className="bl-shadow-soft rounded-2xl border border-[var(--bl-line)] bg-white p-4">
            <SectionHeader icon={Bike} title="Kendaraan (Motor)" />
            <div className="mt-3 space-y-3">
              <Field label="Plat nomor" required>
                <input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="DG 1234 XX"
                  className={`${inputCls} uppercase`}
                />
              </Field>
              <Field label="Merek / Model">
                <input
                  type="text"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  placeholder="cth: Honda Beat"
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Warna">
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="cth: Hitam"
                    className={inputCls}
                  />
                </Field>
                <Field label="Tahun">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="cth: 2021"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* ── DOKUMEN ── */}
          <section className="bl-shadow-soft rounded-2xl border border-[var(--bl-line)] bg-white p-4">
            <SectionHeader icon={FileText} title="Dokumen Wajib" />
            <p className="mt-1 mb-3 text-xs text-[var(--bl-muted)]">
              Foto jelas, semua tulisan terbaca. Disimpan aman, hanya untuk verifikasi.
            </p>
            {userId ? (
              <div className="space-y-4">
                <KycDocUpload docType="ktp" userId={userId} label="KTP" required value={ktpPath ?? undefined} onChange={setKtpPath} />
                <KycDocUpload docType="sim_c" userId={userId} label="SIM C" required value={simPath ?? undefined} onChange={setSimPath} />
                <KycDocUpload docType="stnk" userId={userId} label="STNK" required value={stnkPath ?? undefined} onChange={setStnkPath} />
              </div>
            ) : (
              <p className="text-xs text-red-500">Sesi tidak terbaca. Muat ulang halaman.</p>
            )}
          </section>

          {/* Error */}
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs font-medium text-red-600">{formError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !docsReady}
            className="bl-shadow-lift flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--bl-forest)] py-3.5 text-sm font-bold text-white transition hover:bg-[var(--bl-forest-d)] disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Mengirim…
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4" /> Kirim Pengajuan
              </>
            )}
          </button>

          {!docsReady && (
            <p className="-mt-3 text-center text-[11px] text-[var(--bl-muted)]">
              Lengkapi ketiga dokumen wajib untuk mengirim.
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-[11px] text-[var(--bl-muted)]">TeraLoka BALAJU · Mitra Driver</p>
      </div>
    </div>
  );
}

// ─── Sub-komponen kecil (lokal) ───────────────────────────────────
const inputCls =
  'w-full rounded-xl border border-[var(--bl-line)] bg-white px-3 py-2.5 text-sm text-[var(--bl-ink)] outline-none transition focus:border-[var(--bl-forest)] focus:ring-2 focus:ring-[var(--bl-forest-10)]';

function SectionHeader({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--bl-forest-10)] text-[var(--bl-forest)]">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="bl-display text-sm font-extrabold text-[var(--bl-forest-d)]">{title}</h2>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-[var(--bl-muted)]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
