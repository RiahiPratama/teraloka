'use client';

/**
 * TeraLoka — AdvertiserDetailModal
 * SESI 5A BATCH 2A (18 Mei 2026)
 * ------------------------------------------------------------
 * Read-only detail modal untuk Advertiser.
 *
 * 6 sections:
 *   1. Identity Card    (account type + PIC info)
 *   2. Business Card    (address, NPWP, industry — conditional)
 *   3. Politik Card     (CONDITIONAL kalau account_type='politik')
 *   4. Stats Card       (4 stat cells)
 *   5. Actions Panel    (Ban / Founder Veto / Un-Veto)
 *   6. Audit Timeline   (last 10 entries, fetched on mount)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Eye,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Advertiser } from './AdvertiserPanel';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface AuditEntry {
  id:         string;
  action:     string;
  old_data:   Record<string, any> | null;
  new_data:   Record<string, any> | null;
  created_at: string;
  user: {
    id:   string;
    name: string;
    role: string;
  };
}

interface AdvertiserDetailModalProps {
  advertiser: Advertiser;
  onClose:    () => void;
  onAction:   () => void; // refresh trigger
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  umkm:            'UMKM',
  local_corporate: 'Local Corporate',
  premium:         'Premium',
  politik:         'Politik',
  pemerintah:      'Pemerintah',
};

export default function AdvertiserDetailModal({ advertiser: adv, onClose, onAction }: AdvertiserDetailModalProps) {
  const { token } = useAuth();
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch audit log
  useEffect(() => {
    if (!token) return;
    const fetchAudit = async () => {
      setLoadingAudit(true);
      try {
        const res = await fetch(`${API}/admin/advertisers/${adv.id}/audit?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setAuditLog(json.data ?? []);
      } catch (err) {
        console.error('[AdvertiserDetailModal] audit fetch failed', err);
      } finally {
        setLoadingAudit(false);
      }
    };
    fetchAudit();
  }, [token, adv.id]);

  const doAction = async (action: 'ban' | 'founder-veto' | 'founder-unveto', confirmMsg: string) => {
    if (!token) return;
    if (!confirm(confirmMsg)) return;
    setProcessing(action);
    setError(null);
    try {
      const res = await fetch(`${API}/admin/advertisers/${adv.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      onAction();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Action gagal');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-surface-muted/30">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] font-extrabold text-text truncate">{adv.business_name}</h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-muted text-text-muted font-mono">
                {adv.display_id}
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              {ACCOUNT_TYPE_LABEL[adv.account_type]} • Created {formatDate(adv.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-muted text-text-muted hover:text-text transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — Scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2 rounded-md bg-balapor/12 border border-balapor/30 text-balapor text-[11px] font-bold">
              {error}
            </div>
          )}

          {/* Section 1: Identity Card */}
          <section className="rounded-xl border border-border bg-surface-muted/40 px-4 py-3">
            <SectionTitle icon={Briefcase} label="Identity" />
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Field label="Account Type" value={ACCOUNT_TYPE_LABEL[adv.account_type]} />
              <Field label="Status" value={
                <span className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-bold',
                  adv.status === 'active' && 'text-status-healthy',
                  adv.status === 'suspended' && 'text-status-warning',
                  adv.status === 'banned' && 'text-balapor',
                )}>
                  {adv.status === 'active' && <CheckCircle2 size={11} />}
                  {adv.status === 'banned' && <Ban size={11} />}
                  {adv.status === 'active' ? 'Aktif' : adv.status === 'suspended' ? `Suspended s/d ${adv.suspended_until ? formatDate(adv.suspended_until) : '—'}` : 'Banned'}
                </span>
              } />
              <Field label="PIC Name" value={adv.pic_name} />
              <Field label="PIC Role" value={adv.pic_role || '—'} />
              <Field label="WhatsApp" value={
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone size={10} />
                  {adv.pic_phone}
                </span>
              } />
              <Field label="Email" value={adv.pic_email ? (
                <span className="inline-flex items-center gap-1">
                  <Mail size={10} />
                  {adv.pic_email}
                </span>
              ) : '—'} />
            </div>
          </section>

          {/* Section 2: Business Card (kalau ada data) */}
          {(adv.business_address || adv.business_city || adv.business_kabupaten || adv.business_npwp || adv.business_legal_form || adv.business_industry) && (
            <section className="rounded-xl border border-border bg-surface-muted/40 px-4 py-3">
              <SectionTitle icon={Building2} label="Business Info" />
              <div className="grid grid-cols-2 gap-3 mt-2">
                {adv.business_kabupaten && <Field label="Kabupaten" value={
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={10} />
                    {adv.business_kabupaten}
                  </span>
                } />}
                {adv.business_city && <Field label="Kota" value={adv.business_city} />}
                {adv.business_address && <Field label="Alamat" value={adv.business_address} fullSpan />}
                {adv.business_npwp && <Field label="NPWP" value={<span className="font-mono">{adv.business_npwp}</span>} />}
                {adv.business_legal_form && <Field label="Legal Form" value={adv.business_legal_form} />}
                {adv.business_industry && <Field label="Industry" value={adv.business_industry} />}
              </div>
            </section>
          )}

          {/* Section 3: Politik Compliance (CONDITIONAL) */}
          {adv.account_type === 'politik' && (
            <section className="rounded-xl border border-balapor/30 bg-balapor/8 px-4 py-3">
              <SectionTitle icon={ShieldCheck} label="Politik Compliance" iconColor="text-balapor" />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Field label="Partai" value={adv.politik_partai || '—'} />
                <Field label="Calon" value={adv.politik_calon || '—'} />
                <Field label="Jabatan" value={adv.politik_jabatan || '—'} />
                <Field label="Periode" value={adv.politik_periode || '—'} />
              </div>

              <div className="mt-3 pt-3 border-t border-balapor/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-balapor mb-2">
                  Clauses Signed
                  {adv.politik_clauses_signed_at && (
                    <span className="ml-2 text-text-muted font-normal normal-case">
                      • {formatDateTime(adv.politik_clauses_signed_at)}
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <ClauseStatus label="KPU Verified" signed={adv.politik_kpu_verified} />
                  <ClauseStatus label="Anti-Black Signed" signed={adv.politik_anti_black_signed} />
                  <ClauseStatus label="Liability Signed" signed={adv.politik_liability_signed} />
                  <ClauseStatus label="Kill Switch Ack" signed={adv.politik_kill_switch_acknowledged} />
                </div>
              </div>
            </section>
          )}

          {/* Section 4: Stats Card */}
          <section className="rounded-xl border border-border bg-surface-muted/40 px-4 py-3">
            <SectionTitle icon={Eye} label="Activity Stats" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <StatCell label="Total Ads" value={adv.total_ads_count} />
              <StatCell label="Total Spent" value={adv.total_spent > 0 ? `Rp ${adv.total_spent.toLocaleString('id-ID')}` : '—'} />
              <StatCell
                label="First Ad"
                value={adv.first_ad_at ? formatDate(adv.first_ad_at) : '—'}
                muted={!adv.first_ad_at}
              />
              <StatCell
                label="Last Ad"
                value={adv.last_ad_at ? formatDate(adv.last_ad_at) : '—'}
                muted={!adv.last_ad_at}
              />
              <StatCell
                label="Failed Payment"
                value={adv.failed_payment_count}
                warn={adv.failed_payment_count > 0}
              />
              <StatCell
                label="Abuse Strike"
                value={adv.abuse_strike_count}
                warn={adv.abuse_strike_count > 0}
              />
            </div>
          </section>

          {/* Section 5: Founder Veto + Action Panel */}
          <section className="rounded-xl border border-bakabar/30 bg-bakabar/8 px-4 py-3">
            <SectionTitle icon={ShieldAlert} label="Founder Actions" iconColor="text-bakabar" />

            {adv.founder_rejected ? (
              <div className="flex items-center justify-between gap-3 mt-2">
                <div>
                  <p className="text-[11px] font-bold text-bakabar">⚠️ Status: FOUNDER VETOED</p>
                  {adv.founder_rejected_at && (
                    <p className="text-[10px] text-text-muted mt-0.5">
                      di-veto {formatDateTime(adv.founder_rejected_at)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => doAction('founder-unveto', `Cabut founder veto untuk "${adv.business_name}"?`)}
                  disabled={processing !== null}
                  className="px-3 py-1.5 rounded-md bg-status-healthy text-white text-[11px] font-bold uppercase hover:bg-status-healthy/90 disabled:opacity-50"
                >
                  {processing === 'founder-unveto' ? <Loader2 size={11} className="animate-spin" /> : 'Cabut Veto'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 mt-2">
                <p className="text-[11px] text-text-muted">
                  Founder veto belum aktif. Hanya gunakan kalau advertiser violate filosofi TeraLoka.
                </p>
                <button
                  type="button"
                  onClick={() => doAction('founder-veto', `Veto "${adv.business_name}" sebagai founder?\n\nIni tindakan high-trust — hanya Riahi yang seharusnya pakai.`)}
                  disabled={processing !== null}
                  className="px-3 py-1.5 rounded-md bg-bakabar text-white text-[11px] font-bold uppercase hover:bg-bakabar/90 disabled:opacity-50"
                >
                  {processing === 'founder-veto' ? <Loader2 size={11} className="animate-spin" /> : 'Founder Veto'}
                </button>
              </div>
            )}

            {/* Ban action (kalau bukan banned) */}
            {adv.status !== 'banned' && (
              <div className="mt-3 pt-3 border-t border-bakabar/20 flex items-center justify-between gap-3">
                <p className="text-[11px] text-text-muted">
                  Ban permanent — hanya untuk pelanggaran serius (fraud, abuse repeated).
                </p>
                <button
                  type="button"
                  onClick={() => doAction('ban', `BAN "${adv.business_name}" permanent?\n\nTindakan ini menandai advertiser sebagai banned. Bisa di-unban kemudian kalau perlu.`)}
                  disabled={processing !== null}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-balapor text-white text-[11px] font-bold uppercase hover:bg-balapor/90 disabled:opacity-50"
                >
                  {processing === 'ban' ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
                  Ban
                </button>
              </div>
            )}
          </section>

          {/* Section 6: Audit Timeline */}
          <section className="rounded-xl border border-border bg-surface-muted/40 px-4 py-3">
            <SectionTitle icon={FileText} label={`Audit Timeline (last ${auditLog.length})`} />

            {loadingAudit ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={14} className="text-text-muted animate-spin" />
              </div>
            ) : auditLog.length === 0 ? (
              <p className="text-[11px] text-text-muted text-center py-3">Belum ada audit log</p>
            ) : (
              <ul className="flex flex-col gap-2 mt-2">
                {auditLog.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2 text-[11px]">
                    <Clock size={10} className="text-text-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-text">
                        <span className="font-bold uppercase text-[9px] tracking-wider">{entry.action}</span>
                        <span className="text-text-muted"> oleh </span>
                        <span className="font-semibold">{entry.user.name}</span>
                        <span className="text-text-muted"> ({entry.user.role})</span>
                      </p>
                      <p className="text-[10px] text-text-muted">{formatDateTime(entry.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-surface-muted text-text text-[11px] font-bold uppercase tracking-wide hover:bg-surface-muted/80 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────

function SectionTitle({
  icon: Icon, label, iconColor = 'text-text-muted',
}: { icon: typeof X; label: string; iconColor?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className={iconColor} />
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</h3>
    </div>
  );
}

function Field({
  label, value, fullSpan,
}: { label: string; value: React.ReactNode; fullSpan?: boolean }) {
  return (
    <div className={cn(fullSpan && 'col-span-2')}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-0.5">{label}</p>
      <div className="text-[12px] font-semibold text-text">{value}</div>
    </div>
  );
}

function StatCell({
  label, value, muted, warn,
}: { label: string; value: number | string; muted?: boolean; warn?: boolean }) {
  return (
    <div className="px-2 py-1.5 rounded-md bg-surface border border-border">
      <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={cn(
        'text-[13px] font-extrabold tabular-nums mt-0.5',
        muted && 'text-text-subtle',
        warn && 'text-balapor',
        !muted && !warn && 'text-text',
      )}>
        {value}
      </p>
    </div>
  );
}

function ClauseStatus({ label, signed }: { label: string; signed: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface">
      {signed ? (
        <CheckCircle2 size={11} className="text-status-healthy shrink-0" />
      ) : (
        <AlertTriangle size={11} className="text-balapor shrink-0" />
      )}
      <span className={cn(
        'text-[10px] font-bold',
        signed ? 'text-status-healthy' : 'text-balapor',
      )}>
        {label}
      </span>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}
