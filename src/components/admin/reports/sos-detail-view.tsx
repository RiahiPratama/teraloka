'use client';

/**
 * TeraLoka — SOS Detail View
 * Bridge Sprint Day 12 Step 7 Batch B2 (10 Mei 2026)
 * ------------------------------------------------------------
 * Render lengkap SOS detail untuk admin:
 *   - Header dengan display_id + status badge + type
 *   - Forensic info (caller phone/IP/device/user_agent)
 *   - Note pelapor
 *   - GPS info (lat/lng/accuracy/status)
 *   - Authority notification log (per instansi)
 *   - Audit timeline (created → notified → acknowledged → resolved)
 *
 * Theme-adaptive via CSS variables.
 */

import {
  Phone,
  Globe,
  Smartphone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Eye,
  Siren,
  FileText,
  Shield,
} from 'lucide-react';
import type { AdminSosCall } from '@/types/sos-admin';
import { STATUS_META } from '@/types/sos-admin';
import { EMERGENCY_TYPE_OPTIONS } from '@/types/sos';

interface SosDetailViewProps {
  sos: AdminSosCall;
}

export function SosDetailView({ sos }: SosDetailViewProps) {
  const typeMeta = EMERGENCY_TYPE_OPTIONS.find(
    (m) => m.type === sos.emergency_type,
  );
  const statusMeta = STATUS_META[sos.status];
  const StatusIcon = statusMeta.Icon;

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-start gap-3 flex-wrap">
          {/* Type icon */}
          {typeMeta && (
            <div
              className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${typeMeta.gradientFrom} ${typeMeta.gradientTo} flex items-center justify-center flex-shrink-0`}
            >
              <span
                className="material-symbols-outlined text-white text-2xl"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
              >
                {typeMeta.iconName}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-xl font-extrabold tracking-tight"
                style={{ color: 'var(--color-text)' }}
              >
                {sos.display_id}
              </h1>
              <span
                className={`
                  inline-flex items-center gap-1
                  px-2 py-1 rounded-lg text-xs font-bold
                  ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass} border
                `}
              >
                <StatusIcon className="h-3 w-3" strokeWidth={2.5} />
                {statusMeta.label}
              </span>
            </div>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {typeMeta?.label ?? sos.emergency_type}
            </p>
            <p
              className="text-xs mt-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Dibuat: {formatDateTime(sos.created_at)}
            </p>
          </div>
        </div>

        {/* Note pelapor */}
        {sos.note && (
          <div
            className="mt-4 rounded-xl p-3"
            style={{
              background: 'var(--color-surface-muted)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Catatan Pelapor
            </p>
            <p
              className="text-sm whitespace-pre-wrap"
              style={{ color: 'var(--color-text)' }}
            >
              {sos.note}
            </p>
          </div>
        )}
      </div>

      {/* Forensic Info Card */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h3
          className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Shield className="h-3.5 w-3.5" />
          Info Forensik
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ForensicField
            Icon={Phone}
            label="Telepon Pelapor"
            value={sos.caller_phone || 'Tidak diberikan'}
            isPrimary={!!sos.caller_phone}
          />
          <ForensicField
            Icon={Globe}
            label="IP Address"
            value={sos.submitted_ip || 'N/A'}
            mono
          />
          <ForensicField
            Icon={Smartphone}
            label="Device"
            value={sos.submitted_device || 'unknown'}
          />
          <ForensicField
            Icon={MapPin}
            label="GPS Status"
            value={`${sos.gps_status}${sos.gps_accuracy_meters ? ` (±${sos.gps_accuracy_meters}m)` : ''}`}
          />
        </div>

        {sos.submitted_user_agent && (
          <div
            className="mt-3 pt-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              User Agent
            </p>
            <p
              className="text-xs font-mono break-all"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {sos.submitted_user_agent}
            </p>
          </div>
        )}
      </div>

      {/* Authority Notification Log */}
      {sos.authority_notification_log && sos.authority_notification_log.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h3
            className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <Send className="h-3.5 w-3.5" />
            Log Notifikasi Instansi
          </h3>

          <div className="space-y-2">
            {sos.authority_notification_log.map((entry, idx) => (
              <AuthorityLogRow key={idx} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Audit Timeline */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h3
          className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Clock className="h-3.5 w-3.5" />
          Timeline Audit
        </h3>

        <div className="space-y-3">
          <TimelineEvent
            Icon={Siren}
            label="SOS Dibuat"
            timestamp={sos.created_at}
            variant="critical"
            done
          />
          {sos.admin_notified_at && (
            <TimelineEvent
              Icon={AlertCircle}
              label="Admin Dinotifikasi (WA)"
              timestamp={sos.admin_notified_at}
              variant="warning"
              done
            />
          )}
          {sos.authority_dispatched_at && (
            <TimelineEvent
              Icon={Send}
              label="Diteruskan ke Instansi"
              timestamp={sos.authority_dispatched_at}
              variant="info"
              done
            />
          )}
          {sos.admin_acknowledged_at && (
            <TimelineEvent
              Icon={Eye}
              label="Admin Acknowledge"
              timestamp={sos.admin_acknowledged_at}
              by={sos.admin_acknowledged_by}
              variant="info"
              done
            />
          )}
          {sos.resolved_at && (
            <TimelineEvent
              Icon={CheckCircle2}
              label={`Final: ${STATUS_META[sos.status].label}`}
              timestamp={sos.resolved_at}
              by={sos.resolved_by}
              note={sos.resolution_note}
              variant="success"
              done
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Forensic Field ────────────────────────────────────────────

function ForensicField({
  Icon,
  label,
  value,
  isPrimary = false,
  mono = false,
}: {
  Icon: typeof Phone;
  label: string;
  value: string;
  isPrimary?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon
        className="h-4 w-4 flex-shrink-0 mt-0.5"
        style={{ color: 'var(--color-text-muted)' }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {label}
        </p>
        <p
          className={`text-sm font-bold ${mono ? 'font-mono text-xs' : ''}`}
          style={{
            color: isPrimary ? 'var(--color-balapor)' : 'var(--color-text)',
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Authority Log Row ─────────────────────────────────────────

function AuthorityLogRow({
  entry,
}: {
  entry: NonNullable<AdminSosCall['authority_notification_log']>[number];
}) {
  const isSuccess = entry.status === 'sent' || entry.status === 'delivered';
  const isSkipped = entry.status.startsWith('skipped');
  const statusColor = isSuccess
    ? 'var(--color-status-healthy)'
    : isSkipped
    ? 'var(--color-text-muted)'
    : 'var(--color-status-critical)';

  return (
    <div
      className="rounded-xl p-3 flex items-start gap-3"
      style={{
        background: 'var(--color-surface-muted)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className="h-2 w-2 rounded-full flex-shrink-0 mt-2"
        style={{ background: statusColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className="text-sm font-bold"
            style={{ color: 'var(--color-text)' }}
          >
            {entry.organization_name}
          </p>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{
              background: statusColor + '20',
              color: statusColor,
            }}
          >
            {entry.status}
          </span>
        </div>
        <p
          className="text-xs font-mono mt-0.5"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {entry.phone}
        </p>
        <p
          className="text-[10px] mt-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {formatDateTime(entry.attempted_at)} · provider: {entry.provider}
        </p>
        {entry.error && (
          <p
            className="text-[10px] mt-1"
            style={{ color: 'var(--color-status-critical)' }}
          >
            {entry.error}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Timeline Event ────────────────────────────────────────────

function TimelineEvent({
  Icon,
  label,
  timestamp,
  by,
  note,
  variant,
  done,
}: {
  Icon: typeof Phone;
  label: string;
  timestamp: string;
  by?: string | null;
  note?: string | null;
  variant: 'critical' | 'warning' | 'info' | 'success';
  done: boolean;
}) {
  const variantColors = {
    critical: 'var(--color-status-critical)',
    warning: 'var(--color-status-warning)',
    info: 'var(--color-status-info)',
    success: 'var(--color-status-healthy)',
  };
  const color = variantColors[variant];

  return (
    <div className="flex items-start gap-3">
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: color + '20',
          border: `2px solid ${color}`,
        }}
      >
        <Icon className="h-4 w-4" strokeWidth={2.5} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          {label}
        </p>
        <p
          className="text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {formatDateTime(timestamp)}
          {by && ` · oleh admin ${by.slice(0, 8)}…`}
        </p>
        {note && (
          <p
            className="text-xs mt-1 italic"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            "{note}"
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Helper ────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
