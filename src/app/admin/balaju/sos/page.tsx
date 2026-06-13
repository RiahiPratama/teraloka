'use client';

// ═══════════════════════════════════════════════════════════════
// BALAJU Command Center — SOS Monitor (v2 actionable, LIVE contact)
// Path: /admin/balaju/sos   Route guard: admin/layout.tsx (auth + role)
//
// Konsumsi: GET /balaju-sos/admin → event + contact_rider/contact_driver/route (JOIN LIVE).
//           PATCH /balaju-sos/admin/:id/resolve { status, note }
//
// 🛡️ SOLO FOUNDER first. Kontak rider & driver SELALU tampil (join live, bukan snapshot).
//    Aksi cepat: WA/telp rider + driver, lihat lokasi, umur SOS, resolve 2-pilihan, auto-refresh.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import {
  Siren, MapPin, Phone, MessageCircle, Bike, Check, Clock, ShieldAlert, User, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AUTO_REFRESH_MS = 20000;

interface Contact { name: string | null; phone: string | null; plat?: string | null }
interface SosEvent {
  id: string;
  ride_id: string;
  rider_user_id: string;
  driver_user_id: string | null;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  location_shared: boolean;
  ops_notified: boolean;
  status: string; // active | resolved | false_alarm
  created_at: string;
  resolved_at: string | null;
  resolved_note: string | null;
  // dari backend join live:
  contact_rider?: Contact;
  contact_driver?: Contact;
  route?: { status: string | null; pickup: string | null; dropoff: string | null };
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function ageOf(iso: string): { label: string; urgent: boolean } {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return { label: 'baru saja', urgent: true };
  if (mins < 60) return { label: `${mins} mnt lalu`, urgent: mins >= 5 };
  const h = Math.floor(mins / 60);
  return { label: `${h} jam lalu`, urgent: true };
}

function waLink(phone?: string | null): string | null {
  if (!phone) return null;
  let p = phone.replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  else if (!p.startsWith('62')) p = '62' + p;
  return `https://wa.me/${p}`;
}

export default function AdminBalajuSosPage() {
  const api = useApi();
  const [events, setEvents] = useState<SosEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get<SosEvent[]>('/balaju-sos/admin');
      setEvents(Array.isArray(res) ? res : []);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat data SOS');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchEvents();
    const t = setInterval(fetchEvents, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchEvents]);

  async function resolve(id: string, status: 'resolved' | 'false_alarm', note?: string) {
    if (resolvingId) return;
    setResolvingId(id);
    try {
      await api.patch(`/balaju-sos/admin/${id}/resolve`, { status, note: note || undefined });
      await fetchEvents();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menandai selesai');
    } finally {
      setResolvingId(null);
    }
  }

  const active = events.filter((e) => e.status === 'active');
  const done = events.filter((e) => e.status !== 'active');

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-text">
            <Siren size={22} className="text-balaju" /> SOS Monitor
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Sinyal darurat rider BALAJU — pantau &amp; tangani. <span className="text-text-light">Diperbarui otomatis tiap 20 dtk.</span>
          </p>
        </div>
        <button onClick={fetchEvents} className="text-sm text-balaju hover:underline">Muat ulang</button>
      </div>

      {!loading && error && (
        <Card variant="muted" className="mb-5 py-8 text-center">
          <p className="text-sm font-semibold text-status-critical">{error}</p>
          <button onClick={fetchEvents} className="mt-3 text-sm text-balaju hover:underline">Coba lagi</button>
        </Card>
      )}

      {loading && (
        <Card variant="muted" className="py-12 text-center"><p className="text-sm text-text-muted">Memuat…</p></Card>
      )}

      {!loading && (
        <>
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-status-critical" />
            <h2 className="text-sm font-bold text-text">SOS Aktif</h2>
            <span className="rounded-full bg-status-critical/10 px-2 py-0.5 text-xs font-bold text-status-critical">{active.length}</span>
          </div>

          {active.length === 0 ? (
            <Card variant="muted" className="mb-6 py-8 text-center"><p className="text-sm text-text-muted">Tidak ada SOS aktif. 🙏</p></Card>
          ) : (
            <div className="mb-6 space-y-3">
              {active.map((ev) => <SosCard key={ev.id} ev={ev} onResolve={resolve} resolving={resolvingId === ev.id} active />)}
            </div>
          )}

          <div className="mb-2 flex items-center gap-2">
            <Clock size={16} className="text-text-muted" />
            <h2 className="text-sm font-bold text-text">Riwayat</h2>
            <span className="text-xs text-text-light">{done.length}</span>
          </div>

          {done.length === 0 ? (
            <Card variant="muted" className="py-6 text-center"><p className="text-xs text-text-muted">Belum ada riwayat.</p></Card>
          ) : (
            <div className="space-y-3">
              {done.map((ev) => <SosCard key={ev.id} ev={ev} onResolve={resolve} resolving={false} active={false} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Baris kontak (rider / driver) dengan tombol WA + telp ─── */
function ContactRow({
  role, icon, contact, tone,
}: { role: string; icon: React.ReactNode; contact?: Contact; tone: 'rider' | 'driver' }) {
  const name = contact?.name ?? null;
  const phone = contact?.phone ?? null;
  const wa = waLink(phone);
  // Rider = teal (balaju), Driver = amber — beda warna biar admin langsung bedain.
  const isRider = tone === 'rider';
  return (
    <div className={cn(
      'flex items-center justify-between gap-3 rounded-xl border px-3 py-2',
      isRider ? 'border-balaju/30 bg-balaju/5' : 'border-amber-300/40 bg-amber-50/50',
    )}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-full',
          isRider ? 'bg-balaju/15 text-balaju' : 'bg-amber-100 text-amber-700',
        )}>{icon}</span>
        <div className="min-w-0">
          {/* Label peran — JELAS, biar gak ketuker pas darurat */}
          <span className={cn(
            'inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide',
            isRider ? 'bg-balaju/15 text-balaju' : 'bg-amber-100 text-amber-700',
          )}>
            {role}
          </span>
          <div className="truncate text-sm font-bold text-text">
            {name ?? `(${role} tidak diketahui)`}
            {contact?.plat ? <span className="ml-1 text-xs font-medium text-text-muted">· {contact.plat}</span> : null}
          </div>
          <div className="truncate text-xs text-text-muted">{phone ?? 'nomor tidak tersedia'}</div>
        </div>
      </div>
      {phone ? (
        <div className="flex shrink-0 items-center gap-1.5">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
               className="grid h-9 w-9 place-items-center rounded-full bg-balaju text-white transition hover:opacity-90"
               aria-label={`WhatsApp ${role}`}>
              <MessageCircle size={16} />
            </a>
          )}
          <a href={'tel:' + phone}
             className="grid h-9 w-9 place-items-center rounded-full border border-balaju text-balaju transition hover:bg-balaju/5"
             aria-label={`Telepon ${role}`}>
            <Phone size={16} />
          </a>
        </div>
      ) : (
        <span className="shrink-0 text-[11px] text-text-light">belum ada</span>
      )}
    </div>
  );
}

/* ─── Kartu 1 event SOS ─── */
function SosCard({
  ev, onResolve, resolving, active,
}: {
  ev: SosEvent;
  onResolve: (id: string, status: 'resolved' | 'false_alarm', note?: string) => void;
  resolving: boolean;
  active: boolean;
}) {
  const gmaps = ev.lat != null && ev.lng != null ? `https://www.google.com/maps?q=${ev.lat},${ev.lng}` : null;
  const age = ageOf(ev.created_at);
  const route: { status: string | null; pickup: string | null; dropoff: string | null } =
    ev.route ?? { status: null, pickup: null, dropoff: null };
  const hasDriver = !!(ev.contact_driver?.name || ev.contact_driver?.phone);

  const [resolveOpen, setResolveOpen] = useState(false);
  const [note, setNote] = useState('');

  return (
    <Card padded={false} className={cn('overflow-hidden', active && 'border-status-critical')}>
      <div className={cn('flex items-center justify-between px-4 py-2.5', active ? 'bg-status-critical/10' : 'bg-surface-muted')}>
        <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold', active ? 'text-status-critical' : 'text-text-muted')}>
          <Siren size={15} /> {active ? 'SOS AKTIF' : (ev.status === 'false_alarm' ? 'False alarm' : 'Ditangani')}
        </span>
        <span className={cn('text-xs font-semibold', active && age.urgent ? 'text-status-critical' : 'text-text-light')}>
          {active ? age.label : fmtTime(ev.created_at)}
        </span>
      </div>

      <div className="px-4 py-3">
        {/* Kontak RIDER + DRIVER (join live, selalu tampil) */}
        <div className="space-y-2">
          <ContactRow role="Rider" icon={<User size={15} />} contact={ev.contact_rider} tone="rider" />
          {hasDriver
            ? <ContactRow role="Driver" icon={<Bike size={15} />} contact={ev.contact_driver} tone="driver" />
            : (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs text-text-light">
                <Bike size={14} /> Driver belum ditugaskan untuk order ini
              </div>
            )}
        </div>

        {/* Rute */}
        <div className="mt-3 flex items-start gap-2 text-sm">
          <MapPin size={15} className="mt-0.5 shrink-0 text-balaju" />
          <span className="text-text">
            <span className="font-semibold">{route.pickup ?? '-'}</span>
            <span className="text-text-light"> → </span>
            <span className="font-semibold">{route.dropoff ?? '-'}</span>
          </span>
        </div>

        {/* Badge status */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {route.status && <Badge variant="status" status="neutral" size="sm">order: {route.status}</Badge>}
          <Badge variant="status" status={ev.location_shared ? 'healthy' : 'neutral'} size="sm">
            {ev.location_shared ? 'lokasi dibagikan' : 'tanpa lokasi'}
          </Badge>
          <Badge variant="status" status={ev.ops_notified ? 'healthy' : 'warning'} size="sm">
            {ev.ops_notified ? 'WA ops terkirim' : 'WA ops gagal/skip'}
          </Badge>
        </div>

        {/* Aksi lokasi + resolve */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {gmaps && (
            <a href={gmaps} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 rounded-lg border border-balaju bg-white px-3 py-1.5 text-xs font-semibold text-balaju transition hover:bg-balaju/5">
              <MapPin size={13} /> Lihat lokasi{ev.accuracy_m ? ` (±${Math.round(ev.accuracy_m)}m)` : ''}
            </a>
          )}
          {active && !resolveOpen && (
            <button onClick={() => setResolveOpen(true)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-status-healthy px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90">
              <Check size={13} /> Tandai selesai
            </button>
          )}
        </div>

        {active && resolveOpen && (
          <div className="mt-3 rounded-xl border border-border bg-surface-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-text">Tutup SOS ini</span>
              <button onClick={() => { setResolveOpen(false); setNote(''); }}
                      className="grid h-6 w-6 place-items-center rounded-full text-text-muted hover:bg-border/40" aria-label="Batal">
                <X size={14} />
              </button>
            </div>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="Catatan (opsional): mis. sudah telp rider, aman / salah pencet…"
              className="mb-2 w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm text-text outline-none focus:border-balaju"
            />
            <div className="flex gap-2">
              <button onClick={() => onResolve(ev.id, 'resolved', note)} disabled={resolving}
                      className="flex-1 rounded-lg bg-status-healthy py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60">
                {resolving ? 'Menyimpan…' : '✓ Ditangani (aman)'}
              </button>
              <button onClick={() => onResolve(ev.id, 'false_alarm', note)} disabled={resolving}
                      className="flex-1 rounded-lg border border-border bg-white py-2 text-xs font-bold text-text-muted transition hover:text-text disabled:opacity-60">
                False alarm
              </button>
            </div>
          </div>
        )}

        {!active && ev.resolved_at && (
          <p className="mt-2 text-[11px] text-text-light">
            {ev.status === 'false_alarm' ? 'False alarm' : 'Ditangani'} · {fmtTime(ev.resolved_at)}
            {ev.resolved_note ? ` · ${ev.resolved_note}` : ''}
          </p>
        )}
      </div>
    </Card>
  );
}
