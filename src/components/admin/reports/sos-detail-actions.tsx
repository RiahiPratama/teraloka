'use client';

/**
 * TeraLoka — SOS Detail Actions
 * Bridge Sprint Day 12 Step 7 Batch B2 (10 Mei 2026)
 * ------------------------------------------------------------
 * 7 action buttons untuk detail page SOS:
 *   - Acknowledge   (pending → acknowledged)
 *   - Dispatch      (acknowledged → dispatched)
 *   - Mark On Scene (dispatched → on_scene)
 *   - Resolve       (any active → resolved + note)
 *   - False Alarm   (any active → false_alarm + reason)
 *   - Cancel        (any active → cancelled + reason)
 *   - Toggle Expose (any status, on/off public map)
 *
 * State machine validation: ALLOWED_TRANSITIONS dari Step 7 Batch A engine.
 * Modal confirm + note input untuk resolve/false_alarm/cancel.
 *
 * Pattern reference: delete-report-modal.tsx (modal pattern).
 */

import { useState } from 'react';
import {
  Eye,
  Send,
  MapPin,
  CheckCircle2,
  Ban,
  XCircle,
  Globe,
  Lock,
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';
import type { AdminSosCall, AdminSosAction, UpdateAdminSosInput } from '@/types/sos-admin';

interface SosDetailActionsProps {
  sos: AdminSosCall;
  onUpdated: (updated: AdminSosCall) => void;
}

interface ActionConfig {
  action: AdminSosAction;
  label: string;
  description: string;
  Icon: typeof Eye;
  requiresNote: boolean;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

const ACTION_CONFIGS: ActionConfig[] = [
  {
    action: 'acknowledge',
    label: 'Acknowledge',
    description: 'Saya tahu, sedang dilihat',
    Icon: Eye,
    requiresNote: false,
    variant: 'primary',
  },
  {
    action: 'dispatch',
    label: 'Dispatch',
    description: 'Sudah saya teruskan ke instansi',
    Icon: Send,
    requiresNote: false,
    variant: 'primary',
  },
  {
    action: 'mark_on_scene',
    label: 'Tim di Lokasi',
    description: 'Tim emergency sudah di lokasi',
    Icon: MapPin,
    requiresNote: false,
    variant: 'primary',
  },
  {
    action: 'resolve',
    label: 'Selesai',
    description: 'Penanganan tuntas, semua aman',
    Icon: CheckCircle2,
    requiresNote: true,
    variant: 'success',
  },
  {
    action: 'mark_false_alarm',
    label: 'False Alarm',
    description: 'Bukan emergency nyata',
    Icon: Ban,
    requiresNote: true,
    variant: 'warning',
  },
  {
    action: 'cancel',
    label: 'Batalkan',
    description: 'Pelapor batalkan / duplikat',
    Icon: XCircle,
    requiresNote: true,
    variant: 'neutral',
  },
];

// State machine — sama dengan backend ALLOWED_TRANSITIONS
const ALLOWED_TRANSITIONS: Record<string, AdminSosAction[]> = {
  pending: ['acknowledge', 'mark_false_alarm', 'cancel'],
  acknowledged: ['dispatch', 'resolve', 'mark_false_alarm', 'cancel'],
  dispatched: ['mark_on_scene', 'resolve', 'mark_false_alarm', 'cancel'],
  on_scene: ['resolve', 'mark_false_alarm'],
  resolved: [],
  false_alarm: [],
  cancelled: [],
};

export function SosDetailActions({ sos, onUpdated }: SosDetailActionsProps) {
  const api = useApi();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<AdminSosAction | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowedActions = ALLOWED_TRANSITIONS[sos.status] ?? [];
  const isFinal = allowedActions.length === 0;

  const handleActionClick = (config: ActionConfig) => {
    if (config.requiresNote) {
      // Open modal for note input
      setPendingAction(config.action);
      setNote('');
    } else {
      // Direct action (no confirmation needed for simple state moves)
      void executeAction(config.action);
    }
  };

  const executeAction = async (action: AdminSosAction, noteValue?: string) => {
    setIsSubmitting(true);
    try {
      const input: UpdateAdminSosInput = { action };
      if (noteValue) {
        input.note = noteValue;
      }

      const result = await api.patch<AdminSosCall>(
        `/admin/balapor/sos/${sos.id}`,
        input,
      );

      onUpdated(result);
      toast.success(`Action ${action} berhasil`);
      setPendingAction(null);
      setNote('');
    } catch (err) {
      console.error('[SOS Action] error:', err);
      const message =
        err instanceof ApiError
          ? err.message
          : 'Gagal menjalankan action';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleExpose = async () => {
    setIsSubmitting(true);
    try {
      const result = await api.patch<AdminSosCall>(
        `/admin/balapor/sos/${sos.id}`,
        {
          action: 'toggle_expose',
          expose: !sos.expose_to_public_map,
        },
      );
      onUpdated(result);
      toast.success(
        result.expose_to_public_map
          ? 'SOS sekarang tampil di public map'
          : 'SOS disembunyikan dari public map',
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Gagal toggle expose';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingConfig = pendingAction
    ? ACTION_CONFIGS.find((c) => c.action === pendingAction)
    : null;

  return (
    <>
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h3
          className="text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Tindakan Admin
        </h3>

        {isFinal ? (
          <p
            className="text-sm py-4 text-center"
            style={{ color: 'var(--color-text-muted)' }}
          >
            SOS sudah final ({sos.status}). Tidak ada action lifecycle lagi.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {ACTION_CONFIGS.map((config) => {
              const allowed = allowedActions.includes(config.action);
              if (!allowed) return null;
              return (
                <ActionButton
                  key={config.action}
                  config={config}
                  onClick={() => handleActionClick(config)}
                  disabled={isSubmitting}
                />
              );
            })}
          </div>
        )}

        {/* Toggle Expose — independent dari lifecycle */}
        <div
          className="pt-3 mt-1"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            type="button"
            onClick={handleToggleExpose}
            disabled={isSubmitting}
            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm font-bold transition active:scale-[0.99] disabled:opacity-50"
            style={{
              background: sos.expose_to_public_map
                ? 'var(--color-status-info)'
                : 'var(--color-surface-muted)',
              color: sos.expose_to_public_map
                ? '#FFFFFF'
                : 'var(--color-text-secondary)',
              border: '2px solid var(--color-border)',
            }}
          >
            <span className="flex items-center gap-2">
              {sos.expose_to_public_map ? (
                <Globe className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <Lock className="h-4 w-4" strokeWidth={2.5} />
              )}
              {sos.expose_to_public_map ? 'Tampil di Public Map' : 'Tersembunyi'}
            </span>
            <span className="text-xs opacity-75">
              {sos.expose_to_public_map ? 'Klik untuk sembunyikan' : 'Klik untuk tampilkan'}
            </span>
          </button>
        </div>
      </div>

      {/* Modal confirm dengan note input */}
      {pendingConfig && (
        <ConfirmActionModal
          config={pendingConfig}
          note={note}
          onNoteChange={setNote}
          isSubmitting={isSubmitting}
          onConfirm={() => executeAction(pendingConfig.action, note)}
          onCancel={() => {
            setPendingAction(null);
            setNote('');
          }}
        />
      )}
    </>
  );
}

// ─── Action Button ─────────────────────────────────────────────

function ActionButton({
  config,
  onClick,
  disabled,
}: {
  config: ActionConfig;
  onClick: () => void;
  disabled: boolean;
}) {
  const variantColors = {
    primary: { bg: 'var(--color-primary)', text: '#FFFFFF' },
    success: { bg: 'var(--color-status-healthy)', text: '#FFFFFF' },
    warning: { bg: 'var(--color-status-warning)', text: '#FFFFFF' },
    danger: { bg: 'var(--color-status-critical)', text: '#FFFFFF' },
    neutral: { bg: 'var(--color-surface-muted)', text: 'var(--color-text-secondary)' },
  };

  const { bg, text } = variantColors[config.variant];
  const Icon = config.Icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
      style={{ background: bg, color: text }}
    >
      <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />
      <div className="flex-1 text-left min-w-0">
        <p className="leading-tight">{config.label}</p>
        <p className="text-[10px] font-normal opacity-80 leading-tight mt-0.5">
          {config.description}
        </p>
      </div>
    </button>
  );
}

// ─── Confirm Modal ─────────────────────────────────────────────

function ConfirmActionModal({
  config,
  note,
  onNoteChange,
  isSubmitting,
  onConfirm,
  onCancel,
}: {
  config: ActionConfig;
  note: string;
  onNoteChange: (val: string) => void;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const minLength = 10;
  const isValid = note.trim().length >= minLength;
  const Icon = config.Icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-balapor-muted)' }}
            >
              <Icon
                className="h-4 w-4"
                strokeWidth={2.5}
                style={{ color: 'var(--color-balapor)' }}
              />
            </div>
            <h3
              className="font-extrabold"
              style={{ color: 'var(--color-text)' }}
            >
              {config.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1 rounded-lg hover:opacity-80"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {config.description}
          </p>

          <div
            className="rounded-lg p-3 flex items-start gap-2"
            style={{
              background: 'var(--color-status-warning)' + '15',
              border: '1px solid var(--color-status-warning)' + '40',
            }}
          >
            <AlertTriangle
              className="h-4 w-4 flex-shrink-0 mt-0.5"
              style={{ color: 'var(--color-status-warning)' }}
            />
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Tindakan ini tercatat di audit log dan tidak bisa di-undo.
            </p>
          </div>

          <div>
            <label
              className="block text-xs font-bold mb-1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Catatan <span style={{ color: 'var(--color-status-critical)' }}>*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={4}
              placeholder={`Jelaskan kenapa SOS ini di-${config.label.toLowerCase()}... (minimal ${minLength} karakter)`}
              className="w-full px-3 py-2 rounded-xl text-sm focus:outline-none resize-none"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '2px solid var(--color-border)',
              }}
            />
            <p
              className="text-[10px] mt-1"
              style={{
                color: isValid
                  ? 'var(--color-status-healthy)'
                  : 'var(--color-text-muted)',
              }}
            >
              {note.trim().length}/{minLength} karakter minimum
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex justify-end gap-2"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{
              background: 'var(--color-surface-muted)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isValid || isSubmitting}
            className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-1.5"
            style={{
              background: 'var(--color-balapor)',
              color: '#FFFFFF',
            }}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
}
