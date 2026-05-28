'use client';

import { useContext, useState } from 'react';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';
import {
  X, ShieldCheck, ShieldAlert, ArrowUpCircle, AlertTriangle, MapPin,
} from 'lucide-react';
import type { FraudFlag } from './FraudFlagsTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ⭐ Mission 2P-B: 3T-aware signals (mirror FraudFlagsTable — single source of truth)
// Signal codes match backend fraud-engine (UPPERCASE).
const SIGNALS_3T_AWARE = new Set([
  'OFF_HOURS_SPIKE',
  'VELOCITY_SPIKE',
  'RAPID_FIRE',
  'ROUND_CLUSTER',
]);

type Resolution = 'false_positive' | 'confirmed' | 'escalated';

// Backend bulk-resolve response shape:
//   { total, succeeded: number, failed: number, resolution, errors?: [{flag_id, error}] }
interface BulkResolveResult {
  total: number;
  succeeded: number;
  failed: number;
  resolution: Resolution;
  errors?: { flag_id: string; error: string }[];
}

const RESOLUTION_CONFIG: Record<Resolution, {
  label: string;
  Icon: any;
  color: string;
  bg: string;
  desc: string;
  notesRequired: boolean;
}> = {
  false_positive: {
    label: 'False Positive',
    Icon: ShieldCheck,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    desc: 'Alarm palsu — bukan fraud. Catatan opsional.',
    notesRequired: false,
  },
  confirmed: {
    label: 'Confirmed',
    Icon: ShieldAlert,
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    desc: 'Fraud terbukti. Catatan WAJIB (jejak alasan).',
    notesRequired: true,
  },
  escalated: {
    label: 'Escalated',
    Icon: ArrowUpCircle,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    desc: 'Naik ke investigasi lanjut. Catatan WAJIB.',
    notesRequired: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// FRAUD BULK ACTIONS TOOLBAR
// ═══════════════════════════════════════════════════════════════

export default function FraudBulkActionsToolbar({
  selectedIds,
  selectedFlags,
  onClear,
  onComplete,
  onToast,
}: {
  selectedIds: Set<string>;
  selectedFlags: FraudFlag[];
  onClear: () => void;
  onComplete: () => void;
  onToast: (ok: boolean, msg: string) => void;
}) {
  const { t } = useContext(AdminThemeContext);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [notes, setNotes] = useState('');
  const [safetyChecked, setSafetyChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (selectedIds.size === 0) return null;

  // Hanya flag active yang bisa di-resolve (resolved sudah selesai)
  const activeFlags = selectedFlags.filter(f => f.status === 'active');
  const activeCount = activeFlags.length;

  // ⭐ Mission 2P-C: 3T-aware count untuk soft warning
  const flags3T = activeFlags.filter(f => SIGNALS_3T_AWARE.has(f.signal_code));
  const count3T = flags3T.length;

  const cfg = resolution ? RESOLUTION_CONFIG[resolution] : null;
  const CfgIcon = cfg ? cfg.Icon : null;

  // Soft warning: 3T flags + resolution 'confirmed' (3T sering false positive)
  const show3TWarning = resolution === 'confirmed' && count3T > 0;

  function resetState() {
    setResolution(null);
    setNotes('');
    setSafetyChecked(false);
  }

  async function handleResolve() {
    if (!resolution || !cfg) return;

    // Validasi notes wajib (confirmed/escalated)
    if (cfg.notesRequired && notes.trim().length < 10) {
      onToast(false, `Catatan wajib minimal 10 karakter untuk ${cfg.label}`);
      return;
    }
    if (!safetyChecked) {
      onToast(false, 'Mohon centang konfirmasi terlebih dahulu');
      return;
    }

    const tk = localStorage.getItem('tl_token');
    if (!tk) {
      onToast(false, 'Sesi berakhir, silakan login ulang');
      return;
    }

    const flag_ids = activeFlags.map(f => f.id);
    if (flag_ids.length === 0) {
      onToast(false, 'Tidak ada flag aktif yang dipilih');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/fraud/admin/flags/bulk-resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag_ids, resolution, notes: notes.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? 'Bulk resolve gagal');
      }

      const result = json.data as BulkResolveResult;
      const ok = result.failed === 0;
      const msg = ok
        ? `✓ ${result.succeeded} flag → ${cfg.label}`
        : `✓ ${result.succeeded} berhasil, ${result.failed} gagal → ${cfg.label}`;

      onToast(ok, msg);
      resetState();
      onClear();
      onComplete();
    } catch (err: any) {
      onToast(false, err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      width: 'min(92vw, 680px)',
      background: t.mainBg,
      border: `1px solid ${t.sidebarBorder}`,
      borderRadius: 18,
      boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
      padding: 18,
    }}>
      {/* Header: count + clear */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 9,
            background: 'rgba(139,92,246,0.15)', color: '#8B5CF6',
          }}>
            <ShieldAlert size={18} strokeWidth={2.2} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary, margin: 0 }}>
              {activeCount} flag aktif dipilih
            </p>
            {selectedIds.size > activeCount && (
              <p style={{ fontSize: 10.5, color: t.textDim, margin: 0 }}>
                {selectedIds.size - activeCount} flag resolved diabaikan (sudah selesai)
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => { resetState(); onClear(); }}
          disabled={submitting}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'transparent', border: `1px solid ${t.sidebarBorder}`,
            color: t.textDim, borderRadius: 9, padding: '6px 10px',
            fontSize: 11.5, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          <X size={13} /> Batal
        </button>
      </div>

      {/* Resolution picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: cfg ? 14 : 0 }}>
        {(Object.keys(RESOLUTION_CONFIG) as Resolution[]).map(key => {
          const rc = RESOLUTION_CONFIG[key];
          const RIcon = rc.Icon;
          const selected = resolution === key;
          return (
            <button
              key={key}
              onClick={() => { setResolution(selected ? null : key); setSafetyChecked(false); }}
              disabled={submitting}
              style={{
                flex: 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: selected ? rc.bg : 'transparent',
                border: `1.5px solid ${selected ? rc.color : t.sidebarBorder}`,
                color: selected ? rc.color : t.textMuted,
                borderRadius: 11, padding: '10px 8px',
                fontSize: 12, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <RIcon size={15} strokeWidth={2.2} /> {rc.label}
            </button>
          );
        })}
      </div>

      {/* Detail panel saat resolution dipilih */}
      {cfg && (
        <div>
          <p style={{ fontSize: 11.5, color: t.textDim, marginBottom: 10 }}>{cfg.desc}</p>

          {/* ⭐ 3T soft warning */}
          {show3TWarning && (
            <div style={{
              display: 'flex', gap: 9, alignItems: 'flex-start',
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: 11, padding: '10px 12px', marginBottom: 12,
            }}>
              <span style={{ color: '#8B5CF6', flexShrink: 0, marginTop: 1 }}>
                <MapPin size={15} strokeWidth={2.2} />
              </span>
              <p style={{ fontSize: 11, color: t.textMuted, margin: 0, lineHeight: 1.45 }}>
                <strong style={{ color: '#8B5CF6' }}>{count3T} dari {activeCount} flag</strong> termasuk
                signal 3T-aware (kemungkinan false positive karena kondisi Maluku Utara).
                Yakin tandai sebagai <strong>fraud terbukti</strong>? Pertimbangkan review manual dulu.
              </p>
            </div>
          )}

          {/* Notes */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={cfg.notesRequired
              ? `Catatan WAJIB (min 10 karakter) — alasan ${cfg.label}...`
              : 'Catatan opsional...'}
            disabled={submitting}
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: t.mainBg, border: `1px solid ${t.sidebarBorder}`,
              borderRadius: 10, padding: '9px 11px', fontSize: 12,
              color: t.textPrimary, resize: 'vertical', marginBottom: 12,
              fontFamily: 'inherit',
            }}
          />

          {/* Safety + submit */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12,
            cursor: 'pointer', fontSize: 11.5, color: t.textMuted,
          }}>
            <input
              type="checkbox"
              checked={safetyChecked}
              onChange={e => setSafetyChecked(e.target.checked)}
              disabled={submitting}
              style={{ marginTop: 1, accentColor: cfg.color, cursor: 'pointer' }}
            />
            <span>
              Saya paham aksi ini menandai <strong>{activeCount} flag</strong> sebagai
              <strong style={{ color: cfg.color }}> {cfg.label}</strong>. Aksi tercatat di audit log.
            </span>
          </label>

          <button
            onClick={handleResolve}
            disabled={submitting || !safetyChecked || (cfg.notesRequired && notes.trim().length < 10)}
            style={{
              width: '100%',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              background: (submitting || !safetyChecked || (cfg.notesRequired && notes.trim().length < 10))
                ? t.sidebarBorder : cfg.color,
              color: '#fff', border: 'none', borderRadius: 11,
              padding: '11px', fontSize: 13, fontWeight: 800,
              cursor: (submitting || !safetyChecked) ? 'not-allowed' : 'pointer',
              opacity: (submitting || !safetyChecked || (cfg.notesRequired && notes.trim().length < 10)) ? 0.55 : 1,
              transition: 'all 0.15s',
            }}
          >
            {submitting
              ? 'Memproses...'
              : <>{CfgIcon && <CfgIcon size={15} strokeWidth={2.3} />} Resolve {activeCount} Flag</>}
          </button>
        </div>
      )}
    </div>
  );
}
