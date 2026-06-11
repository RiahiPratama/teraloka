'use client';

// src/app/mitra/driver/akun/DriverAccountShell.tsx
// T2 (10 Jun 2026) — AKUN/PROFIL DRIVER (driver-scoped, read-only manual-first).
// Sumber: GET /driver/me (driver + vehicle + documents signed-URL) & useAuth() (identitas akun).
// Edit data via admin (etos manual-first). Aktivitas warga (BALAPOR/BADONASI) = akun warga, terpisah.

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Loader2, ShieldCheck, ShieldAlert, Clock, Bike, Car, Package,
  Phone, User, FileText, LogOut, AlertTriangle, Check, IdCard, Camera,
} from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/utils/pwa-utils';
import '@/components/balaju/public/balaju-landing.css';

const AVATAR_BUCKET = 'avatars';
const AVATAR_MAX_MB = 2; // limit bucket avatars

const HOME_URL = '/mitra/driver';

interface VehicleInfo { vehicle_type: string | null; plate_number: string | null; brand_model: string | null; color: string | null; year: number | null }
interface DocInfo { id: string; doc_type: string; doc_number: string | null; expiry_date: string | null; status: string | null; signed_url?: string | null; url?: string | null }
interface DriverInfo {
  id: string; name: string | null; phone: string | null;
  service_capabilities: string[] | null;
  verification_status: string | null; verification_tier: string | null;
  rides_completed: number | null; rating_avg: number | null; rating_count: number | null;
  is_active: boolean | null; is_online: boolean | null; created_at: string | null;
}
interface MeResponse { is_driver: boolean; driver: DriverInfo | null; vehicle: VehicleInfo | null; documents: DocInfo[] }

// Kartu kinerja (GET /driver/performance) — agregat, nol identitas rider.
interface PerformanceData {
  rating: { avg: number; count: number };
  completed_trips: number;
  acceptance: { rate: number | null; accepted: number; missed: number; sample: number };
}

const SERVICE_LABEL: Record<string, { Icon: typeof Bike; label: string }> = {
  ride_bike: { Icon: Bike, label: 'Ojek' },
  ride_car: { Icon: Car, label: 'Mobil' },
  courier: { Icon: Package, label: 'Kurir / Paket' },
};
const DOC_LABEL: Record<string, string> = { ktp: 'KTP', sim: 'SIM', stnk: 'STNK', skck: 'SKCK', selfie: 'Foto Selfie' };
const VEHICLE_LABEL: Record<string, string> = { motorcycle: 'Motor', car: 'Mobil' };

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jayapura' });
}
function initials(name: string | null): string {
  if (!name) return 'D';
  const clean = name.replace(/\[TEST\]/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'D';
}

export default function DriverAccountShell() {
  const api = useApi();
  const router = useRouter();
  const { user, logout, updateAvatar } = useAuth();

  const [data, setData] = useState<MeResponse | null>(null);
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Avatar upload (client-side, niru pola KycDocUpload tapi bucket publik).
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await api.get<MeResponse>('/driver/me');
        if (alive) setData(d);
      } catch (e) {
        if (alive) setErr(e instanceof ApiError ? e.message : 'Gagal memuat data akun.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    // Kinerja di-fetch terpisah & defensif — gagal = kartu kinerja gak muncul, akun tetap utuh.
    (async () => {
      try {
        const p = await api.get<PerformanceData>('/driver/performance');
        if (alive) setPerf(p);
      } catch {
        /* kinerja opsional */
      }
    })();
    return () => { alive = false; };
  }, [api]);

  function doLogout() {
    logout();
    router.push('/');
  }

  // Upload foto profil: pilih file -> compress -> bucket 'avatars' (publik) ->
  // getPublicUrl -> updateAvatar(url) (PATCH profile + setUser). Niru KycDocUpload,
  // bedanya emit URL publik (bukan raw path) krn avatar dilihat rider.
  async function onAvatarPick(file: File | undefined) {
    if (!file || avatarBusy) return;
    setAvatarErr(null);

    if (!file.type.startsWith('image/')) {
      setAvatarErr('Format harus JPG, PNG, atau WEBP.');
      return;
    }

    setAvatarBusy(true);
    try {
      const processed = await compressImage(file);
      if (processed.size > AVATAR_MAX_MB * 1024 * 1024) {
        setAvatarErr(`Foto terlalu besar. Maks ${AVATAR_MAX_MB}MB.`);
        setAvatarBusy(false);
        return;
      }

      const supabase = createClient();
      const uid = user?.id;
      if (!uid) {
        setAvatarErr('Sesi tidak ditemukan. Coba lagi.');
        setAvatarBusy(false);
        return;
      }

      const ext = (processed.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${uid}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, processed, { cacheControl: '3600', upsert: true });
      if (upErr) {
        setAvatarErr(`Upload gagal: ${upErr.message}`);
        setAvatarBusy(false);
        return;
      }

      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const url = pub?.publicUrl;
      if (!url) {
        setAvatarErr('Gagal mengambil URL foto.');
        setAvatarBusy(false);
        return;
      }

      const ok = await updateAvatar(url);
      if (!ok) {
        setAvatarErr('Foto terunggah tapi gagal disimpan. Coba lagi.');
      }
    } catch (e) {
      setAvatarErr(e instanceof Error ? e.message : 'Gagal memproses foto.');
    } finally {
      setAvatarBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[var(--bl-forest)]" />
          <p className="mt-3 text-sm text-[var(--bl-muted)]">Memuat akun…</p>
        </div>
      </div>
    );
  }

  if (err || !data?.is_driver || !data.driver) {
    return (
      <div className="bl-landing">
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--bl-amber-15)] text-[var(--bl-amber)]">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-[var(--bl-ink)]">{err || 'Kamu belum terdaftar sebagai driver'}</p>
          <Link href={HOME_URL} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--bl-forest)]">
            <ChevronLeft className="h-4 w-4" /> Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  const { driver, vehicle, documents } = data;
  const cleanName = (driver.name || user?.name || 'Driver').replace(/\[TEST\]\s*/gi, '');
  const caps = driver.service_capabilities?.length ? driver.service_capabilities : ['ride_bike'];

  // Badge verifikasi.
  const vstatus = driver.verification_status ?? 'pending';
  const vbadge = vstatus === 'verified'
    ? { bg: 'var(--bl-forest-10)', text: 'var(--bl-forest-d)', Icon: ShieldCheck, label: 'Terverifikasi' }
    : vstatus === 'rejected'
      ? { bg: '#fee2e2', text: '#dc2626', Icon: ShieldAlert, label: 'Ditolak' }
      : { bg: 'var(--bl-amber-15)', text: 'var(--bl-amber)', Icon: Clock, label: 'Menunggu verifikasi' };

  return (
    <div className="bl-landing">
      <div className="mx-auto max-w-md px-4 py-6 md:pt-12">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <Link href={HOME_URL} aria-label="Kembali"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--bl-line)] bg-white text-[var(--bl-ink)] transition hover:bg-[var(--bl-cream)]">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="bl-display text-base font-extrabold text-[var(--bl-forest-d)]">Akun saya</div>
        </div>

        {/* Kartu profil */}
        <div className="bl-shadow-lift mt-5 rounded-3xl border border-[var(--bl-line)] bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={cleanName}
                  className="h-16 w-16 rounded-full object-cover border border-[var(--bl-line)]"
                />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--bl-forest)] text-xl font-extrabold text-white bl-display">
                  {initials(driver.name)}
                </span>
              )}
              {/* Tombol kamera — upload foto profil */}
              <button
                type="button"
                onClick={() => !avatarBusy && fileRef.current?.click()}
                disabled={avatarBusy}
                aria-label="Ubah foto profil"
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-[var(--bl-forest)] text-white shadow-md ring-2 ring-white transition active:scale-90 disabled:opacity-60"
              >
                {avatarBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => onAvatarPick(e.target.files?.[0])}
                className="hidden"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="bl-display text-lg font-extrabold text-[var(--bl-ink)] truncate">{cleanName}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ background: vbadge.bg, color: vbadge.text }}>
                  <vbadge.Icon className="h-3 w-3" /> {vbadge.label}
                </span>
                {driver.verification_tier && (
                  <span className="inline-flex items-center rounded-full bg-[var(--bl-cream)] px-2 py-0.5 text-[11px] font-bold capitalize text-[var(--bl-muted)]">
                    Tier {driver.verification_tier}
                  </span>
                )}
              </div>
              {avatarErr && <p className="mt-1.5 text-[11px] font-medium text-red-500">{avatarErr}</p>}
            </div>
          </div>

          {/* mini-stat */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-[var(--bl-line)] pt-4">
            <div>
              <div className="text-[11px] text-[var(--bl-muted)]">Rating</div>
              <div className="bl-display text-base font-extrabold text-[var(--bl-ink)]">
                {driver.rating_count ? `${Number(driver.rating_avg ?? 0).toFixed(1)} ★` : 'Belum ada'}
                {driver.rating_count ? <span className="ml-1 text-[11px] font-medium text-[var(--bl-muted)]">({driver.rating_count})</span> : null}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--bl-muted)]">Gabung sejak</div>
              <div className="bl-display text-base font-extrabold text-[var(--bl-ink)]">{fmtDate(driver.created_at)}</div>
            </div>
          </div>
        </div>

        {/* Kartu Kinerja — 3 metrik agregat (rating, trip, acceptance). Nol identitas rider. */}
        {perf && (
          <div className="mt-5">
            <h2 className="bl-display mb-2 text-sm font-extrabold text-[var(--bl-forest-d)]">Kinerja</h2>
            <div className="bl-shadow-soft grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[var(--bl-line)] bg-[var(--bl-line)]">
              {/* Rating */}
              <div className="bg-white p-3.5 text-center">
                <div className="bl-display text-xl font-extrabold text-[var(--bl-ink)]">
                  {perf.rating.count ? perf.rating.avg.toFixed(1) : '—'}
                  {perf.rating.count ? <span className="text-sm text-[var(--bl-amber)]"> ★</span> : null}
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-[var(--bl-muted)]">
                  {perf.rating.count ? `${perf.rating.count} penilaian` : 'Belum dinilai'}
                </div>
              </div>
              {/* Trip selesai */}
              <div className="bg-white p-3.5 text-center">
                <div className="bl-display text-xl font-extrabold text-[var(--bl-ink)]">{perf.completed_trips}</div>
                <div className="mt-0.5 text-[10px] font-medium text-[var(--bl-muted)]">Trip selesai</div>
              </div>
              {/* Acceptance — data tipis (<5 sampel) -> tampil "—" biar gak misleading */}
              <div className="bg-white p-3.5 text-center">
                <div className="bl-display text-xl font-extrabold text-[var(--bl-ink)]">
                  {perf.acceptance.rate !== null && perf.acceptance.sample >= 5
                    ? `${perf.acceptance.rate}%`
                    : '—'}
                </div>
                <div className="mt-0.5 text-[10px] font-medium text-[var(--bl-muted)]">
                  {perf.acceptance.sample >= 5 ? 'Order diterima' : 'Data belum cukup'}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-[var(--bl-muted)]">
              Tingkat terima dihitung dari order yang ditawarkan ke kamu. Penilaian bersifat anonim.
            </p>
          </div>
        )}

        {/* Data diri */}
        <Section title="Data diri">
          <Row icon={User} label="Nama" value={cleanName} />
          <Row icon={Phone} label="No HP" value={driver.phone || user?.phone || '—'} />
        </Section>

        {/* Layanan aktif */}
        <Section title="Layanan">
          <div className="flex flex-wrap gap-2">
            {caps.map((c) => {
              const meta = SERVICE_LABEL[c] || { Icon: Package, label: c };
              return (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--bl-forest-10)] px-3 py-1.5 text-[12px] font-bold text-[var(--bl-forest-d)]">
                  <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
                </span>
              );
            })}
          </div>
        </Section>

        {/* Kendaraan */}
        {vehicle && (
          <Section title="Kendaraan">
            <Row icon={vehicle.vehicle_type === 'car' ? Car : Bike} label="Jenis"
              value={VEHICLE_LABEL[vehicle.vehicle_type ?? ''] || vehicle.vehicle_type || '—'} />
            <Row icon={IdCard} label="Plat nomor" value={vehicle.plate_number || '—'} />
            {vehicle.brand_model && <Row icon={Bike} label="Kendaraan" value={`${vehicle.brand_model}${vehicle.color ? ' · ' + vehicle.color : ''}`} />}
          </Section>
        )}

        {/* Dokumen */}
        <Section title="Dokumen">
          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--bl-line)] bg-white py-6 text-center">
              <FileText className="mx-auto h-6 w-6 text-[var(--bl-muted)]" />
              <p className="mt-1.5 text-xs text-[var(--bl-muted)]">Belum ada dokumen terunggah</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((d) => {
                const verified = (d.status ?? '').toLowerCase() === 'verified' || (d.status ?? '').toLowerCase() === 'approved';
                return (
                  <div key={d.id} className="flex items-center gap-3 rounded-xl border border-[var(--bl-line)] bg-white p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--bl-cream)] text-[var(--bl-muted)]">
                      <FileText className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[var(--bl-ink)]">{DOC_LABEL[d.doc_type] || d.doc_type.toUpperCase()}</div>
                      {d.doc_number && <div className="text-[11px] text-[var(--bl-muted)]">{d.doc_number}</div>}
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      verified ? 'bg-[var(--bl-forest-10)] text-[var(--bl-forest-d)]' : 'bg-[var(--bl-amber-15)] text-[var(--bl-amber)]'
                    }`}>
                      {verified ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {verified ? 'Terverifikasi' : 'Ditinjau'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-[10px] text-[var(--bl-muted)]">Perubahan data diatur lewat admin TeraLoka. Hubungi tim kalau ada yang perlu diperbaiki.</p>
        </Section>

        {/* Keluar */}
        <button onClick={doLogout}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--bl-line)] bg-white py-3.5 text-sm font-bold text-red-500 transition hover:bg-red-50">
          <LogOut className="h-4 w-4" /> Keluar
        </button>

        <p className="mt-4 text-center text-[10px] text-[var(--bl-muted)]">TeraLoka BALAJU · Mitra Driver</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h2 className="bl-display mb-2 text-sm font-extrabold text-[var(--bl-forest-d)]">{title}</h2>
      <div className="bl-shadow-soft rounded-2xl border border-[var(--bl-line)] bg-white p-4">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--bl-cream)] text-[var(--bl-muted)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-[var(--bl-muted)]">{label}</div>
        <div className="text-sm font-semibold text-[var(--bl-ink)] truncate">{value}</div>
      </div>
    </div>
  );
}
