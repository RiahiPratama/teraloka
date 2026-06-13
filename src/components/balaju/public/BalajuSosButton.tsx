// src/components/balaju/public/BalajuSosButton.tsx
// ============================================================
// Tombol + modal SOS rider BALAJU. SAFETY-CRITICAL.
// Self-contained: cuma butuh rideId. Backend (POST /balaju-sos) yang ambil
// snapshot driver/rute, kirim WA ops, simpan event.
// Prinsip (PRD-SOS-RIDER-BALAJU):
//   - tel:110 = tombol UTAMA (paling andal, gak butuh data/izin apa pun).
//   - Lokasi = browser Geolocation one-shot (opsional). Gagal/ditolak ≠ SOS batal.
//   - Tahan-gagal: "Kirim tanpa lokasi" selalu tersedia.
//   - Copy jujur: TeraLoka meneruskan sinyal, BUKAN pengganti polisi.
// ============================================================
'use client';

import { useState } from 'react';
import { Siren, X, Phone, MapPin, Loader2, Check } from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';

// Nomor darurat polisi nasional (Polri), 24 jam, gratis.
const POLICE_TEL = '110';

type SendState = 'idle' | 'locating' | 'sending' | 'sent' | 'error';

export function BalajuSosButton({ rideId }: { rideId: string }) {
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SendState>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  function reset() {
    setState('idle');
    setErrMsg(null);
  }

  // Ambil lokasi sekali (one-shot). Resolve null kalau gagal/ditolak/timeout.
  function getLocationOnce(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => resolve(null), // ditolak / gagal → null, SOS tetap lanjut
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      );
    });
  }

  async function sendSos(withLocation: boolean) {
    if (state === 'sending' || state === 'locating') return;
    setErrMsg(null);

    let loc: { lat: number; lng: number; accuracy: number } | null = null;
    if (withLocation) {
      setState('locating');
      loc = await getLocationOnce();
      // kalau lokasi gagal, JANGAN batal — tetap kirim tanpa lokasi.
    }

    setState('sending');
    try {
      await api.post('/balaju-sos', {
        ride_id: rideId,
        lat: loc?.lat,
        lng: loc?.lng,
        accuracy: loc?.accuracy,
        location_shared: !!loc,
      });
      setState('sent');
    } catch (e: any) {
      setState('error');
      setErrMsg(e instanceof ApiError ? e.message : 'Gagal mengirim sinyal. Tetap telepon polisi 110.');
    }
  }

  return (
    <>
      {/* Tombol pemicu — merah, jelas, butuh konfirmasi (gak langsung kirim) */}
      <button
        onClick={() => { setOpen(true); reset(); }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
        aria-label="Darurat SOS"
      >
        <Siren className="h-4 w-4" /> Darurat / SOS
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-red-100 text-red-600">
                  <Siren className="h-5 w-5" />
                </span>
                <h2 className="text-base font-extrabold text-[var(--bl-ink)]">Keadaan darurat?</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-[var(--bl-muted)] hover:bg-[var(--bl-line)]/40"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {state === 'sent' ? (
              // ── Konfirmasi terkirim ──
              <div className="mt-4 rounded-2xl bg-green-50 p-4 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-600">
                  <Check className="h-6 w-6" />
                </span>
                <p className="mt-2 text-sm font-bold text-green-700">Sinyal darurat terkirim</p>
                <p className="mt-1 text-xs text-green-700/80">
                  Tim TeraLoka menerima lokasi & detail perjalananmu. Kalau bahaya, tetap telepon polisi.
                </p>
                <a
                  href={'tel:' + POLICE_TEL}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white"
                >
                  <Phone className="h-4 w-4" /> Telepon Polisi ({POLICE_TEL})
                </a>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-2 w-full rounded-xl border border-[var(--bl-line)] bg-white py-2.5 text-sm font-semibold text-[var(--bl-muted)]"
                >
                  Tutup
                </button>
              </div>
            ) : (
              // ── Aksi SOS ──
              <>
                {/* tel:110 — tombol UTAMA, paling atas, paling andal */}
                <a
                  href={'tel:' + POLICE_TEL}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-base font-extrabold text-white transition hover:bg-red-700"
                >
                  <Phone className="h-5 w-5" /> TELEPON POLISI ({POLICE_TEL})
                </a>

                <p className="mt-4 text-center text-xs text-[var(--bl-muted)]">
                  Kirim lokasi &amp; detail perjalanan ke tim TeraLoka:
                </p>

                <button
                  onClick={() => sendSos(true)}
                  disabled={state === 'locating' || state === 'sending'}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {state === 'locating' ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Mengambil lokasi...</>
                  ) : state === 'sending' ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</>
                  ) : (
                    <><MapPin className="h-4 w-4" /> Bagikan lokasi &amp; kirim</>
                  )}
                </button>

                <button
                  onClick={() => sendSos(false)}
                  disabled={state === 'locating' || state === 'sending'}
                  className="mt-2 w-full rounded-xl border border-[var(--bl-line)] bg-white py-2.5 text-sm font-semibold text-[var(--bl-muted)] transition hover:text-[var(--bl-ink)] disabled:opacity-60"
                >
                  {state === 'sending' ? 'Mengirim...' : 'Kirim tanpa lokasi'}
                </button>

                {errMsg && (
                  <p className="mt-3 text-center text-xs font-medium text-red-500">{errMsg}</p>
                )}

                <p className="mt-4 border-t border-[var(--bl-line)] pt-3 text-center text-[11px] leading-relaxed text-[var(--bl-muted)]">
                  ⚠️ TeraLoka membantu meneruskan sinyal daruratmu, bukan pengganti layanan
                  polisi. Untuk bahaya langsung, telepon {POLICE_TEL}.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
