'use client';

/**
 * TeraLoka — WahaControlPanel
 * Panel Kontrol WAHA (20 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Founder kontrol gateway WAHA dari browser admin TANPA terminal:
 * lihat status sesi, Start/Stop, dan "Scan Ulang" (logout → QR).
 *
 * Source (BE, super_admin): /admin/waha-control/*
 *   GET  /status   POST /start   POST /stop   POST /logout {confirm:true}   GET /qr
 *
 * Filosofi:
 *   - Frontend = WAJAH: cuma display + tombol. WAHA TIDAK PERNAH disentuh
 *     langsung dari sini — selalu lewat BE (yang pegang WAHA_API_KEY).
 *   - Mirror WaMonitoringPanel: 'use client' + useAuth() token + fetch ${API} +
 *     Tailwind SEMANTIC TOKEN (bg-surface/text-text/status-*), lucide, cn().
 *
 * Catatan:
 *   - TIDAK pakai /restart (Core unverified) → "restart" = Stop lalu Start manual.
 *   - QR cuma dirender saat status=SCAN_QR_CODE (available:true). Selain itu hidden.
 *   - Auto-refresh status ~12s & qr ~8s, WAJIB clearInterval saat unmount/tab pindah.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Loader2, AlertTriangle, Power, PowerOff, QrCode,
  Smartphone, Radio, CheckCircle2, X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const BASE = `${API}/admin/waha-control`;
const STATUS_POLL_MS = 12_000;
const QR_POLL_MS = 8_000;

// ─── Types (mirror response BE) ──────────────────────────────────
interface WahaMe {
  id?: string;
  pushName?: string;
}
interface WahaStatus {
  name: string;
  status: string;
  me: WahaMe | null;
  engine: string | null;
}
interface QrData {
  available: boolean;
  status: string;
  image: string | null;
  message?: string;
}
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// ─── Status → badge styling (token semantik, adaptif theme) ───────
function statusStyle(status: string): { label: string; cls: string; dot: string } {
  switch (status) {
    case 'WORKING':
      return { label: 'Aktif (WORKING)', cls: 'bg-status-healthy/12 text-status-healthy', dot: 'bg-status-healthy' };
    case 'STARTING':
      return { label: 'Memulai…', cls: 'bg-status-warning/12 text-status-warning', dot: 'bg-status-warning' };
    case 'STOPPED':
      return { label: 'Berhenti (STOPPED)', cls: 'bg-status-warning/12 text-status-warning', dot: 'bg-status-warning' };
    case 'SCAN_QR_CODE':
      return { label: 'Perlu Scan QR', cls: 'bg-status-critical/12 text-status-critical', dot: 'bg-status-critical' };
    case 'FAILED':
      return { label: 'Gagal (FAILED)', cls: 'bg-status-critical/12 text-status-critical', dot: 'bg-status-critical' };
    default:
      return { label: status || 'Tidak diketahui', cls: 'bg-surface-muted text-text-muted', dot: 'bg-text-subtle' };
  }
}

// ─── Component ────────────────────────────────────────────────────
export default function WahaControlPanel() {
  const { token, isLoading: authLoading } = useAuth();
  const alive = useRef(true);

  const [data, setData] = useState<WahaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [action, setAction] = useState<null | 'start' | 'stop' | 'logout'>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [qr, setQr] = useState<QrData | null>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // ─── Fetchers ───────────────────────────────────────────────────
  const fetchStatus = useCallback(
    async (showSpinner = false) => {
      if (!token) return;
      if (showSpinner) setLoading(true);
      try {
        const res = await fetch(`${BASE}/status`, { headers: { Authorization: `Bearer ${token}` } });
        const json = (await res.json()) as ApiResponse<WahaStatus>;
        if (!alive.current) return;
        if (json?.success && json.data) {
          setData(json.data);
          setError(null);
        } else {
          setError(json?.error?.message ?? 'Gagal memuat status WAHA');
        }
      } catch (err: any) {
        if (alive.current) setError(err?.message ?? 'Network error');
      } finally {
        if (alive.current) setLoading(false);
      }
    },
    [token],
  );

  const fetchQr = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE}/qr`, { headers: { Authorization: `Bearer ${token}` } });
      const json = (await res.json()) as ApiResponse<QrData>;
      if (!alive.current) return;
      if (json?.success && json.data) setQr(json.data);
    } catch {
      /* qr poll error non-fatal — biarkan QR lama tampil sampai poll berikut */
    }
  }, [token]);

  // ─── Poll: status ~12s (cleanup on unmount/tab switch) ──────────
  useEffect(() => {
    if (authLoading || !token) return;
    fetchStatus(true);
    const id = setInterval(() => fetchStatus(false), STATUS_POLL_MS);
    return () => clearInterval(id);
  }, [authLoading, token, fetchStatus]);

  // ─── Poll: qr ~8s — HANYA saat SCAN_QR_CODE (cleanup on exit) ───
  const isScan = data?.status === 'SCAN_QR_CODE';
  useEffect(() => {
    if (!isScan || !token) {
      setQr(null);
      return;
    }
    fetchQr();
    const id = setInterval(fetchQr, QR_POLL_MS);
    return () => clearInterval(id);
  }, [isScan, token, fetchQr]);

  // ─── Actions ────────────────────────────────────────────────────
  const doAction = useCallback(
    async (act: 'start' | 'stop', label: string) => {
      if (!token) return;
      setAction(act);
      setNotice(null);
      setError(null);
      try {
        const res = await fetch(`${BASE}/${act}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json()) as ApiResponse<unknown>;
        if (!alive.current) return;
        if (json?.success) {
          setNotice(`${label} terkirim. Status menyesuaikan dalam beberapa detik.`);
          setTimeout(() => {
            if (alive.current) fetchStatus(false);
          }, 1500);
        } else {
          setError(json?.error?.message ?? `Gagal ${label.toLowerCase()}`);
        }
      } catch (err: any) {
        if (alive.current) setError(err?.message ?? 'Network error');
      } finally {
        if (alive.current) setAction(null);
      }
    },
    [token, fetchStatus],
  );

  const doLogout = useCallback(async () => {
    if (!token) return;
    setAction('logout');
    setNotice(null);
    setError(null);
    setShowLogout(false);
    try {
      const res = await fetch(`${BASE}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!alive.current) return;
      if (json?.success) {
        setNotice('Sesi diputus. Tunggu status “Perlu Scan QR”, lalu scan dari HP.');
        setTimeout(() => {
          if (alive.current) fetchStatus(false);
        }, 1500);
      } else {
        setError(json?.error?.message ?? 'Gagal memutus sesi');
      }
    } catch (err: any) {
      if (alive.current) setError(err?.message ?? 'Network error');
    } finally {
      if (alive.current) setAction(null);
    }
  }, [token, fetchStatus]);

  // ─── Derived ────────────────────────────────────────────────────
  const status = data?.status ?? '';
  const badge = statusStyle(status);
  const busy = action !== null;
  const startDisabled = busy || status === 'WORKING' || status === 'STARTING';
  const stopDisabled = busy || status === 'STOPPED';

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-status-info/12 text-status-info">
            <Radio size={18} />
          </div>
          <div>
            <h2 className="text-[16px] font-extrabold text-text">Panel Kontrol WAHA</h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Status &amp; kontrol gateway WhatsApp (self-host)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchStatus(true)}
          disabled={loading || busy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-surface-muted text-text-muted hover:text-text transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-status-critical/8 border border-status-critical/20">
          <AlertTriangle size={14} className="text-status-critical shrink-0 mt-0.5" />
          <p className="text-[11px] text-status-critical">{error}</p>
        </div>
      )}

      {/* ─── Notice (aksi sukses) ─── */}
      {notice && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-status-info/8 border border-status-info/20">
          <CheckCircle2 size={14} className="text-status-info shrink-0 mt-0.5" />
          <p className="text-[11px] text-status-info">{notice}</p>
        </div>
      )}

      {/* ─── Loading awal ─── */}
      {loading && !data && (
        <div className="flex items-center justify-center gap-2 py-16 bg-surface border border-border rounded-xl">
          <Loader2 size={16} className="animate-spin text-text-muted" />
          <span className="text-[12px] text-text-muted">Memuat status...</span>
        </div>
      )}

      {/* ─── Status Card ─── */}
      {data && (
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex w-2.5 h-2.5 rounded-full', badge.dot)} />
              <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-[12px] font-bold', badge.cls)}>
                {badge.label}
              </span>
            </div>
            <span className="text-[10px] font-mono text-text-subtle">
              sesi: {data.name}
              {data.engine ? ` · ${data.engine}` : ''}
            </span>
          </div>

          {/* Info nomor (saat tersedia) */}
          {data.me && (data.me.pushName || data.me.id) && (
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <Smartphone size={14} className="text-text-muted shrink-0" />
              <div className="flex flex-col">
                {data.me.pushName && (
                  <span className="text-[12px] font-semibold text-text">{data.me.pushName}</span>
                )}
                {data.me.id && (
                  <span className="text-[10px] font-mono text-text-muted">{data.me.id}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Action buttons ─── */}
      {data && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => doAction('start', 'Start')}
            disabled={startDisabled}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-bold bg-status-healthy/12 text-status-healthy border border-status-healthy/20 hover:bg-status-healthy/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {action === 'start' ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
            Start
          </button>

          <button
            type="button"
            onClick={() => doAction('stop', 'Stop')}
            disabled={stopDisabled}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-bold bg-status-warning/12 text-status-warning border border-status-warning/20 hover:bg-status-warning/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {action === 'stop' ? <Loader2 size={14} className="animate-spin" /> : <PowerOff size={14} />}
            Stop
          </button>

          {/* Scan Ulang — aksi PALING destruktif (danger/merah) */}
          <button
            type="button"
            onClick={() => setShowLogout(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-bold bg-status-critical/12 text-status-critical border border-status-critical/25 hover:bg-status-critical/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
          >
            {action === 'logout' ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
            Scan Ulang
          </button>
        </div>
      )}

      {/* ─── QR (hanya saat SCAN_QR_CODE) ─── */}
      {isScan && (
        <div className="bg-surface border border-status-critical/30 rounded-xl p-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-status-critical">
            <QrCode size={16} />
            <h3 className="text-[12px] font-bold uppercase tracking-wider">Scan QR dari HP</h3>
          </div>
          {qr?.available && qr.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.image}
                alt="WAHA QR code"
                className="w-56 h-56 rounded-lg border border-border bg-white p-2"
              />
              <p className="text-[11px] text-text-muted text-center max-w-xs">
                Buka WhatsApp di HP → <strong>Perangkat Tertaut</strong> → Tautkan Perangkat → arahkan ke QR ini.
                QR berganti otomatis tiap beberapa detik.
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 py-8">
              <Loader2 size={16} className="animate-spin text-text-muted" />
              <span className="text-[12px] text-text-muted">
                {qr?.message ?? 'Menyiapkan QR...'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── Footer note ─── */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-status-info/4 border border-status-info/20">
        <Radio size={12} className="text-status-info shrink-0 mt-0.5" />
        <p className="text-[10px] text-status-info leading-relaxed">
          <strong>Start/Stop</strong> aman dipakai berkali-kali. <strong>Scan Ulang</strong> memutus sesi &amp;
          menghentikan notif sampai QR di-scan ulang dari HP — pakai hanya saat nomor benar-benar lepas.
        </p>
      </div>

      {/* ─── Modal konfirmasi 2-step Scan Ulang ─── */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-status-critical/12 text-status-critical shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-extrabold text-text">Putus Sesi WhatsApp?</h3>
                <p className="text-[12px] text-text-muted mt-1 leading-relaxed">
                  Notif TeraLoka akan <strong className="text-status-critical">BERHENTI</strong> sampai kamu
                  scan QR dari HP. Lanjut?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogout(false)}
                className="text-text-subtle hover:text-text transition-colors"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowLogout(false)}
                className="px-3.5 py-2 rounded-lg text-[12px] font-bold bg-surface-muted text-text-muted hover:text-text transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={doLogout}
                disabled={action === 'logout'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-bold bg-status-critical text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {action === 'logout' ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                Ya, Putus Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
