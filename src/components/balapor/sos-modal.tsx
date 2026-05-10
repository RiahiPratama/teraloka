'use client';

/**
 * TeraLoka — SOS Modal (3-Screen Flow)
 * Bridge Sprint Day 12 Step 6 (10 Mei 2026)
 * ------------------------------------------------------------
 * 3-screen flow untuk panic button:
 *
 *   Screen 1: TYPE SELECT
 *     - 6 emergency type cards (maritime, fire, medical, security, natural, other)
 *     - Most-likely-first sort (Pattern H)
 *     - Tap → langsung Screen 2 (gak ada confirm transitional)
 *
 *   Screen 2: CONFIRM
 *     - Auto-request GPS permission
 *     - Show captured location (atau warning kalau denied)
 *     - Optional note input (max 500 char)
 *     - Optional callback phone
 *     - Big red SUBMIT button
 *
 *   Screen 3: SUCCESS
 *     - Display ID (SOS-2026-NNNN)
 *     - Status message (Tim TeraLoka akan hubungi instansi)
 *     - Hotline reminders (115/113/110/118)
 *     - Close button
 *
 * Anti-abuse:
 *   - Honeypot field 'website' (hidden, expect empty)
 *   - User-Agent default browser (no spoof needed di production)
 *
 * State Management:
 *   - Local useState (no Redux/Zustand needed untuk single-modal flow)
 *   - GPS capture via navigator.geolocation
 *
 * Style: replicate photo-policy-notice.tsx (red palette + Material Symbols)
 */

import { useEffect, useState } from 'react';
import { apiPost, ApiError } from '@/lib/api/client';
import {
  EMERGENCY_TYPE_OPTIONS,
  type EmergencyType,
  type GpsCapture,
  type SosCallCreated,
  type SosModalScreen,
  type SubmitSosPayload,
} from '@/types/sos';

interface SosModalProps {
  onClose: () => void;
}

export function SosModal({ onClose }: SosModalProps) {
  const [screen, setScreen] = useState<SosModalScreen>('type-select');
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [gps, setGps] = useState<GpsCapture>({ state: 'idle' });
  const [note, setNote] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [websiteHoneypot, setWebsiteHoneypot] = useState('');
  const [result, setResult] = useState<SosCallCreated | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-request GPS saat masuk Screen 2
  useEffect(() => {
    if (screen !== 'confirm') return;
    if (gps.state !== 'idle') return;

    if (!('geolocation' in navigator)) {
      setGps({ state: 'unavailable' });
      return;
    }

    setGps({ state: 'requesting' });

    const timeoutId = setTimeout(() => {
      setGps({ state: 'timeout', errorMessage: 'GPS timeout, coba lagi atau lanjut tanpa lokasi' });
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        setGps({
          state: 'success',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        clearTimeout(timeoutId);
        if (err.code === err.PERMISSION_DENIED) {
          setGps({ state: 'denied', errorMessage: 'Izin lokasi ditolak. Tetap bisa kirim SOS.' });
        } else {
          setGps({ state: 'unavailable', errorMessage: err.message });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Lock body scroll saat modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleTypeSelect = (type: EmergencyType) => {
    setSelectedType(type);
    setScreen('confirm');
  };

  const handleSubmit = async () => {
    if (!selectedType) return;

    setScreen('submitting');
    setErrorMessage(null);

    const gpsStatus =
      gps.state === 'success' ? 'available'
      : gps.state === 'denied' ? 'denied'
      : 'unavailable';

    const payload: SubmitSosPayload = {
      emergency_type: selectedType,
      gps_status: gpsStatus,
      latitude: gps.latitude,
      longitude: gps.longitude,
      gps_accuracy_meters: gps.accuracy,
      note: note.trim() || undefined,
      caller_phone: callerPhone.trim() || undefined,
      website: websiteHoneypot, // honeypot — empty kalau real user
    };

    try {
      const data = await apiPost<SosCallCreated>('/balapor/sos', { body: payload });
      setResult(data);
      setScreen('success');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Gagal kirim SOS. Coba lagi atau hubungi langsung 115/113/110.';
      setErrorMessage(message);
      setScreen('error');
    }
  };

  const handleRetryFromError = () => {
    setErrorMessage(null);
    setScreen('confirm');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // Close kalau click backdrop (bukan modal content)
        if (e.target === e.currentTarget && screen !== 'submitting') {
          onClose();
        }
      }}
    >
      <div
        className="
          w-full sm:max-w-lg
          bg-white
          rounded-t-3xl sm:rounded-3xl
          shadow-2xl
          max-h-[92vh] overflow-y-auto
          relative
        "
      >
        {/* Header — red gradient */}
        <div
          className="sticky top-0 z-10 bg-gradient-to-br from-[#EF4444] to-[#DC2626] px-5 py-4 flex items-center gap-3"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
        >
          <span
            className="material-symbols-outlined text-white text-3xl"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
          >
            sos
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-lg font-extrabold leading-tight">
              {screen === 'type-select' && 'Tombol Darurat'}
              {screen === 'confirm' && 'Konfirmasi Darurat'}
              {screen === 'submitting' && 'Mengirim...'}
              {screen === 'success' && 'Berhasil Terkirim'}
              {screen === 'error' && 'Gagal Mengirim'}
            </h2>
            <p className="text-white/90 text-xs mt-0.5">
              {screen === 'type-select' && 'Pilih jenis darurat'}
              {screen === 'confirm' && 'Periksa lokasi & kirim'}
              {screen === 'submitting' && 'Tim TeraLoka segera diberitahu'}
              {screen === 'success' && 'Bantuan akan segera datang'}
              {screen === 'error' && 'Periksa koneksi atau coba lagi'}
            </p>
          </div>
          {screen !== 'submitting' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="rounded-full p-1 hover:bg-white/20 active:bg-white/30 transition"
            >
              <span className="material-symbols-outlined text-white text-2xl">close</span>
            </button>
          )}
        </div>

        {/* Honeypot — invisible, bot fill, human skip */}
        <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={websiteHoneypot}
            onChange={(e) => setWebsiteHoneypot(e.target.value)}
            placeholder="Website"
          />
        </div>

        {/* Content per screen */}
        <div className="px-5 py-4 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))' }}>
          {screen === 'type-select' && (
            <ScreenTypeSelect onSelect={handleTypeSelect} />
          )}
          {screen === 'confirm' && selectedType && (
            <ScreenConfirm
              selectedType={selectedType}
              gps={gps}
              note={note}
              onNoteChange={setNote}
              callerPhone={callerPhone}
              onCallerPhoneChange={setCallerPhone}
              onBack={() => setScreen('type-select')}
              onSubmit={handleSubmit}
            />
          )}
          {screen === 'submitting' && <ScreenSubmitting />}
          {screen === 'success' && result && (
            <ScreenSuccess result={result} onClose={onClose} />
          )}
          {screen === 'error' && (
            <ScreenError errorMessage={errorMessage} onRetry={handleRetryFromError} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Screen 1: Type Select ──────────────────────────────────

function ScreenTypeSelect({ onSelect }: { onSelect: (t: EmergencyType) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 font-medium">
        Tap satu kategori untuk mengirim SOS. Tim TeraLoka akan teruskan ke instansi terkait.
      </p>
      <div className="grid grid-cols-1 gap-2">
        {EMERGENCY_TYPE_OPTIONS.map((meta) => (
          <button
            key={meta.type}
            type="button"
            onClick={() => onSelect(meta.type)}
            className={`
              group
              flex items-center gap-4
              w-full
              p-4
              rounded-2xl
              border-2 border-gray-200
              bg-white
              hover:border-gray-300 hover:ring-4 ${meta.hoverRing}
              hover:shadow-md hover:-translate-y-0.5
              active:scale-[0.98] active:translate-y-0
              transition-all duration-200
              text-left
            `}
          >
            {/* Premium icon container with gradient */}
            <div
              className={`
                flex-shrink-0
                h-12 w-12
                rounded-xl
                bg-gradient-to-br ${meta.gradientFrom} ${meta.gradientTo}
                flex items-center justify-center
                shadow-sm
                group-hover:shadow-lg group-hover:scale-110
                transition-all duration-200
              `}
            >
              <span
                className="material-symbols-outlined text-white text-2xl leading-none"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
              >
                {meta.iconName}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-extrabold text-gray-900 leading-tight tracking-tight">
                {meta.label}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                {meta.description}
              </p>
            </div>

            <span className="material-symbols-outlined text-gray-300 text-xl flex-shrink-0 group-hover:text-gray-500 transition-colors">
              chevron_right
            </span>
          </button>
        ))}
      </div>

      {/* Hotline reminders even before submit */}
      <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        <p className="font-bold mb-1.5 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-amber-600 text-base">
            phone_in_talk
          </span>
          Bila urgent banget, telepon langsung:
        </p>
        <div className="grid grid-cols-2 gap-1 ml-1">
          <span>• Basarnas <strong>115</strong></span>
          <span>• Damkar <strong>113</strong></span>
          <span>• Polisi <strong>110</strong></span>
          <span>• Ambulans <strong>118</strong></span>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: Confirm ──────────────────────────────────────

function ScreenConfirm({
  selectedType,
  gps,
  note,
  onNoteChange,
  callerPhone,
  onCallerPhoneChange,
  onBack,
  onSubmit,
}: {
  selectedType: EmergencyType;
  gps: GpsCapture;
  note: string;
  onNoteChange: (v: string) => void;
  callerPhone: string;
  onCallerPhoneChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const meta = EMERGENCY_TYPE_OPTIONS.find((m) => m.type === selectedType)!;

  return (
    <div className="space-y-4">
      {/* Selected type recap with premium icon */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border-2 border-gray-200">
        <div
          className={`
            flex-shrink-0
            h-11 w-11
            rounded-xl
            bg-gradient-to-br ${meta.gradientFrom} ${meta.gradientTo}
            flex items-center justify-center
            shadow-sm
          `}
        >
          <span
            className="material-symbols-outlined text-white text-xl leading-none"
            style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
          >
            {meta.iconName}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Jenis darurat</p>
          <h3 className="text-base font-extrabold text-gray-900 leading-tight">{meta.label}</h3>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-[#EF4444] font-bold hover:underline px-2 py-1 rounded-lg hover:bg-red-50 transition"
        >
          Ganti
        </button>
      </div>

      {/* GPS Status */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-gray-600 text-base">my_location</span>
          Lokasi GPS
        </label>
        {gps.state === 'requesting' && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-base animate-pulse">
              gps_fixed
            </span>
            <p className="text-sm text-blue-700">Mendeteksi lokasi...</p>
          </div>
        )}
        {gps.state === 'success' && gps.latitude !== undefined && gps.longitude !== undefined && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-base mt-0.5">
                check_circle
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-700">Lokasi terdeteksi</p>
                <p className="text-xs text-emerald-600 mt-0.5 font-mono">
                  {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                </p>
                {gps.accuracy !== undefined && (
                  <p className="text-[10px] text-emerald-600/70 mt-0.5">
                    Akurasi ±{gps.accuracy}m
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {(gps.state === 'denied' || gps.state === 'unavailable' || gps.state === 'timeout') && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-base mt-0.5">
                location_off
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800">Lokasi tidak tersedia</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {gps.errorMessage ?? 'GPS tidak aktif. SOS tetap bisa dikirim.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Note (optional) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-gray-600 text-base">notes</span>
          Catatan singkat <span className="text-gray-400 font-normal lowercase tracking-normal">(opsional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value.slice(0, 500))}
          placeholder="Contoh: kapal mati mesin di selat Maitara, 5 orang di kapal"
          rows={3}
          className="
            w-full
            rounded-xl
            border-2 border-gray-200
            px-3 py-2.5
            text-sm
            focus:outline-none focus:border-[#EF4444]
            placeholder:text-gray-400
            resize-none
          "
        />
        <p className="text-[10px] text-gray-400 text-right">{note.length}/500</p>
      </div>

      {/* Caller phone (optional) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-gray-600 text-base">call</span>
          Nomor untuk dihubungi <span className="text-gray-400 font-normal lowercase tracking-normal">(opsional)</span>
        </label>
        <input
          type="tel"
          value={callerPhone}
          onChange={(e) => onCallerPhoneChange(e.target.value)}
          placeholder="08xxxxxxxxxx"
          className="
            w-full
            rounded-xl
            border-2 border-gray-200
            px-3 py-2.5
            text-sm
            focus:outline-none focus:border-[#EF4444]
            placeholder:text-gray-400
          "
        />
        <p className="text-[10px] text-gray-500">
          Tim TeraLoka mungkin perlu hubungi balik. Boleh dikosongkan kalau tidak nyaman.
        </p>
      </div>

      {/* Submit button */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={gps.state === 'requesting'}
          className="
            w-full
            rounded-2xl
            bg-gradient-to-br from-[#EF4444] to-[#DC2626]
            text-white text-base font-extrabold
            py-4
            shadow-lg shadow-red-500/30
            hover:shadow-xl hover:shadow-red-500/40
            active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
            flex items-center justify-center gap-2
          "
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            send
          </span>
          KIRIM SOS SEKARANG
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm text-gray-500 font-medium py-2 hover:text-gray-700"
        >
          ← Kembali pilih jenis
        </button>
      </div>
    </div>
  );
}

// ─── Screen Submitting (overlay) ────────────────────────────

function ScreenSubmitting() {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <div className="relative h-16 w-16 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-red-200" />
        <div className="absolute inset-0 rounded-full border-4 border-[#EF4444] border-t-transparent animate-spin" />
      </div>
      <h3 className="text-base font-extrabold text-gray-900">Mengirim SOS...</h3>
      <p className="text-xs text-gray-500 mt-1">Mohon tunggu sebentar</p>
    </div>
  );
}

// ─── Screen 3: Success ──────────────────────────────────────

function ScreenSuccess({ result, onClose }: { result: SosCallCreated; onClose: () => void }) {
  return (
    <div className="space-y-4">
      {/* Success badge */}
      <div className="text-center py-3">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-2">
          <span
            className="material-symbols-outlined text-emerald-600 text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <h3 className="text-lg font-extrabold text-gray-900">SOS Terkirim</h3>
        <p className="text-xs text-gray-500 mt-0.5">Tim TeraLoka segera diberitahu</p>
      </div>

      {/* Display ID */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 p-4 text-center">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
          Nomor laporan darurat
        </p>
        <p className="text-2xl font-mono font-extrabold text-[#003526] mt-1 tracking-wider">
          {result.display_id}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          Simpan nomor ini untuk pantau status
        </p>
      </div>

      {/* Status message */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900 leading-relaxed">
        {result.message}
      </div>

      {/* Hotline reminders */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
        <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-amber-600 text-base">phone_in_talk</span>
          Bila urgent banget, telepon langsung:
        </p>
        <div className="grid grid-cols-2 gap-1.5 text-xs text-amber-900">
          {result.hotline_reminders.map((h) => (
            <a
              key={h.organization}
              href={`tel:${h.number}`}
              className="flex items-center gap-1.5 underline hover:text-amber-700"
            >
              <span>{h.organization}</span>
              <strong>{h.number}</strong>
            </a>
          ))}
        </div>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="
          w-full
          rounded-2xl
          bg-[#003526]
          text-white text-base font-extrabold
          py-3.5
          hover:bg-[#003526]/90
          active:scale-[0.98]
          transition-all duration-150
        "
      >
        Tutup
      </button>
    </div>
  );
}

// ─── Screen Error ───────────────────────────────────────────

function ScreenError({
  errorMessage,
  onRetry,
  onClose,
}: {
  errorMessage: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center py-3">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-2">
          <span
            className="material-symbols-outlined text-[#EF4444] text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            error
          </span>
        </div>
        <h3 className="text-lg font-extrabold text-gray-900">SOS Gagal Terkirim</h3>
        <p className="text-xs text-gray-500 mt-0.5">{errorMessage ?? 'Terjadi kesalahan'}</p>
      </div>

      {/* Hotline reminders prioritized saat error */}
      <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4">
        <p className="text-sm font-extrabold text-amber-900 mb-2 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-amber-700 text-lg">phone_in_talk</span>
          Telepon langsung instansi darurat:
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <a
            href="tel:115"
            className="rounded-lg bg-white border border-amber-300 p-2 text-center hover:bg-amber-50"
          >
            <p className="text-[10px] text-amber-700 font-bold uppercase">Basarnas</p>
            <p className="text-lg font-extrabold text-amber-900">115</p>
          </a>
          <a
            href="tel:113"
            className="rounded-lg bg-white border border-amber-300 p-2 text-center hover:bg-amber-50"
          >
            <p className="text-[10px] text-amber-700 font-bold uppercase">Damkar</p>
            <p className="text-lg font-extrabold text-amber-900">113</p>
          </a>
          <a
            href="tel:110"
            className="rounded-lg bg-white border border-amber-300 p-2 text-center hover:bg-amber-50"
          >
            <p className="text-[10px] text-amber-700 font-bold uppercase">Polisi</p>
            <p className="text-lg font-extrabold text-amber-900">110</p>
          </a>
          <a
            href="tel:118"
            className="rounded-lg bg-white border border-amber-300 p-2 text-center hover:bg-amber-50"
          >
            <p className="text-[10px] text-amber-700 font-bold uppercase">Ambulans</p>
            <p className="text-lg font-extrabold text-amber-900">118</p>
          </a>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onRetry}
          className="
            w-full
            rounded-2xl
            bg-gradient-to-br from-[#EF4444] to-[#DC2626]
            text-white text-base font-extrabold
            py-3.5
            active:scale-[0.98]
            transition-all duration-150
          "
        >
          Coba Kirim Ulang
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full text-sm text-gray-500 font-medium py-2 hover:text-gray-700"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
