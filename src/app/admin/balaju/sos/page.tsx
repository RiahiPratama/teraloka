'use client';

// ═══════════════════════════════════════════════════════════════
// BALAJU Command Center — SOS Monitor
// Path: /admin/balaju/sos   Route guard: admin/layout.tsx (auth + role)
//
// Pantau & resolve sinyal darurat rider BALAJU.
// Konsumsi:
//   GET   /balaju-sos/admin?status=active   → list event
//   PATCH /balaju-sos/admin/:id/resolve     → tandai selesai
//
// 🛡️ SAFETY-CRITICAL display. Event aktif = MERAH, paling atas, jelas.
//    Lokasi → link Google Maps (kalau rider bagikan). Snapshot trip dari backend.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { Siren, MapPin, Phone, Bike, Check, Clock, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TripSnapshot {
  ride_status?: string | null;
  pickup?: string | null;
  dropoff?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  driver_plat?: string | null;
}
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
  trip_snapshot: TripSnapshot | null;
  created_at: string;
  resolved_at: string | null;
  resolved_note: string | null;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function AdminBalajuSosPage() {
  const api = useApi();
  const [events, setEvents] = useState<SosEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ambil semua (active + resolved) → split di klien
      const res = await api.get<SosEvent[]>('/balaju-sos/admin');
      setEvents(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat data SOS');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function resolve(id: string) {
    if (resolvingId) return;
    setResolvingId(id);
    try {
      await api.patch(`/balaju-sos/admin/${id}/resolve`, {});
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
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-text">
            <Siren size={22} className="text-balaju" /> SOS Monitor
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Sinyal darurat rider BALAJU — pantau &amp; tandai selesai.
          </p>
        </div>
        <button onClick={fetchEvents} className="text-sm text-balaju hover:underline">
          Muat ulang
        </button>
      </div>

      {/* Error */}
      {!loading && error && (
        <Card variant="muted" className="mb-5 py-8 text-center">
          <p className="text-sm font-semibold text-status-critical">{error}</p>
          <button onClick={fetchEvents} className="mt-3 text-sm text-balaju hover:underline">Coba lagi</button>
        </Card>
      )}

      {loading && (
        <Card variant="muted" className="py-12 text-center">
          <p className="text-sm text-text-muted">Memuat…</p>
        </Card>
      )}

      {!loading && !error && (
        <>
          {/* ─── SOS AKTIF (merah, prioritas) ─── */}
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-status-critical" />
            <h2 className="text-sm font-bold text-text">SOS Aktif</h2>
            <span className="rounded-full bg-status-critical/10 px-2 py-0.5 text-xs font-bold text-status-critical">
              {active.length}
            </span>
          </div>

          {active.length === 0 ? (
            <Card variant="muted" className="mb-6 py-8 text-center">
              <p className="text-sm text-text-muted">Tidak ada SOS aktif. 🙏</p>
            </Card>
          ) : (
            <div className="mb-6 space-y-3">
              {active.map((ev) => (
                <SosCard key={ev.id} ev={ev} onResolve={resolve} resolving={resolvingId === ev.id} active />
              ))}
            </div>
          )}

          {/* ─── Riwayat (resolved) ─── */}
          <div className="mb-2 flex items-center gap-2">
            <Clock size={16} className="text-text-muted" />
            <h2 className="text-sm font-bold text-text">Riwayat</h2>
            <span className="text-xs text-text-light">{done.length}</span>
          </div>

          {done.length === 0 ? (
            <Card variant="muted" className="py-6 text-center">
              <p className="text-xs text-text-muted">Belum ada riwayat.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {done.map((ev) => (
                <SosCard key={ev.id} ev={ev} onResolve={resolve} resolving={false} active={false} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Kartu 1 event SOS ─── */
function SosCard({
  ev, onResolve, resolving, active,
}: { ev: SosEvent; onResolve: (id: string) => void; resolving: boolean; active: boolean }) {
  const snap = ev.trip_snapshot ?? {};
  const gmaps = ev.lat != null && ev.lng != null ? `https://www.google.com/maps?q=${ev.lat},${ev.lng}` : null;

  return (
    <Card
      padded={false}
      className={cn('overflow-hidden', active && 'border-status-critical')}
    >
      {/* Header kartu */}
      <div className={cn('flex items-center justify-between px-4 py-2.5', active ? 'bg-status-critical/10' : 'bg-surface-muted')}>
        <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold', active ? 'text-status-critical' : 'text-text-muted')}>
          <Siren size={15} /> {active ? 'SOS AKTIF' : 'Selesai'}
        </span>
        <span className="text-xs text-text-light">{fmtTime(ev.created_at)}</span>
      </div>

      <div className="px-4 py-3">
        {/* Rute */}
        <div className="flex items-start gap-2 text-sm">
          <MapPin size={15} className="mt-0.5 shrink-0 text-balaju" />
          <span className="text-text">
            <span className="font-semibold">{snap.pickup ?? '-'}</span>
            <span className="text-text-light"> → </span>
            <span className="font-semibold">{snap.dropoff ?? '-'}</span>
          </span>
        </div>

        {/* Driver */}
        <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
          <Bike size={14} className="text-text-light" />
          {snap.driver_name ? (
            <span>
              {snap.driver_name}
              {snap.driver_plat ? ` · ${snap.driver_plat}` : ''}
              {snap.driver_phone ? ` · ${snap.driver_phone}` : ''}
            </span>
          ) : (
            <span className="text-text-light">Driver belum tercatat</span>
          )}
        </div>

        {/* Status order saat SOS + flags */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {snap.ride_status && (
            <Badge variant="status" status="neutral" size="sm">order: {snap.ride_status}</Badge>
          )}
          <Badge variant="status" status={ev.location_shared ? 'healthy' : 'neutral'} size="sm">
            {ev.location_shared ? 'lokasi dibagikan' : 'tanpa lokasi'}
          </Badge>
          <Badge variant="status" status={ev.ops_notified ? 'healthy' : 'warning'} size="sm">
            {ev.ops_notified ? 'WA ops terkirim' : 'WA ops gagal/skip'}
          </Badge>
        </div>

        {/* Aksi */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {gmaps && (
            <a
              href={gmaps}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-balaju bg-white px-3 py-1.5 text-xs font-semibold text-balaju transition hover:bg-balaju/5"
            >
              <MapPin size={13} /> Lihat lokasi{ev.accuracy_m ? ` (±${Math.round(ev.accuracy_m)}m)` : ''}
            </a>
          )}
          {snap.driver_phone && (
            <a
              href={'tel:' + snap.driver_phone}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:text-text"
            >
              <Phone size={13} /> Telp driver
            </a>
          )}
          {active && (
            <button
              onClick={() => onResolve(ev.id)}
              disabled={resolving}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-status-healthy px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <Check size={13} /> {resolving ? 'Menyimpan…' : 'Tandai selesai'}
            </button>
          )}
        </div>

        {!active && ev.resolved_at && (
          <p className="mt-2 text-[11px] text-text-light">
            Selesai {fmtTime(ev.resolved_at)}{ev.resolved_note ? ` · ${ev.resolved_note}` : ''}
          </p>
        )}
      </div>
    </Card>
  );
}
