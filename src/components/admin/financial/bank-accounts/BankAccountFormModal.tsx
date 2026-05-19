'use client';

/**
 * TeraLoka — BankAccountFormModal
 * SESI 5F (19 Mei 2026) — BATCH 4 Delivery 2
 * ------------------------------------------------------------
 * Modal untuk create/edit bank account (single component, mode prop).
 *
 * Privacy-Critical:
 *   - account_holder_real = LEGAL name (DB only, RLS-protected)
 *   - Privacy warning visible saat input
 *   - 3-tier privacy: alias (public) / owner_label (internal) / real (legal)
 *
 * Pattern mirror DeleteAdModal/RejectAdModal (Tailwind v4).
 *
 * Backend:
 *   - Create: POST   /admin/bank-accounts
 *   - Update: PUT    /admin/bank-accounts/:id
 */

import { useState, useEffect, useRef } from 'react';
import {
  Building2, X, AlertTriangle, Loader2, ShieldAlert,
  User, Heart, ListOrdered, ToggleLeft, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ─── Types ───────────────────────────────────────────────────────

export interface BankAccountFull {
  id:                       string;
  bank_name:                string;
  account_number:           string;
  account_holder_alias:     string;
  owner_label:              string;
  account_holder_real:      string;
  is_personal_owner:        boolean;
  is_spouse:                boolean;
  is_active:                boolean;
  display_order:            number;
  notes:                    string | null;
}

export interface BankAccountFormModalProps {
  mode:      'create' | 'edit';
  account:   BankAccountFull | null;  // null for create mode
  token:     string | null;
  onSuccess: (msg: string) => void;
  onError:   (msg: string) => void;
  onClose:   () => void;
}

interface FormState {
  bank_name:            string;
  account_number:       string;
  account_holder_alias: string;
  owner_label:          string;
  account_holder_real:  string;
  is_personal_owner:    boolean;
  is_spouse:            boolean;
  is_active:            boolean;
  display_order:        number;
  notes:                string;
}

const EMPTY_FORM: FormState = {
  bank_name:            '',
  account_number:       '',
  account_holder_alias: '',
  owner_label:          '',
  account_holder_real:  '',
  is_personal_owner:    false,
  is_spouse:            false,
  is_active:            true,
  display_order:        0,
  notes:                '',
};

// ─── Component ───────────────────────────────────────────────────

export default function BankAccountFormModal({
  mode,
  account,
  token,
  onSuccess,
  onError,
  onClose,
}: BankAccountFormModalProps) {
  const [form, setForm]       = useState<FormState>(EMPTY_FORM);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  // ─── Effects ─────────────────────────────────────────────────

  // Initialize form from account (edit mode) or empty (create mode)
  useEffect(() => {
    if (!account && mode === 'create') {
      setForm(EMPTY_FORM);
      setError(null);
      setLoading(false);
    } else if (account && mode === 'edit') {
      setForm({
        bank_name:            account.bank_name,
        account_number:       account.account_number,
        account_holder_alias: account.account_holder_alias,
        owner_label:          account.owner_label,
        account_holder_real:  account.account_holder_real,
        is_personal_owner:    account.is_personal_owner,
        is_spouse:            account.is_spouse,
        is_active:            account.is_active,
        display_order:        account.display_order,
        notes:                account.notes ?? '',
      });
      setError(null);
      setLoading(false);
    }
  }, [account, mode]);

  // Focus first input on open
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [account, mode]);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [loading, onClose]);

  // ─── Form change helper ──────────────────────────────────────

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Mutual exclusive: owner vs spouse (can't be both)
  const handleOwnerToggle = (val: boolean) => {
    setForm((prev) => ({
      ...prev,
      is_personal_owner: val,
      is_spouse:         val ? false : prev.is_spouse,
    }));
  };
  const handleSpouseToggle = (val: boolean) => {
    setForm((prev) => ({
      ...prev,
      is_spouse:         val,
      is_personal_owner: val ? false : prev.is_personal_owner,
    }));
  };

  // ─── Submit handler ──────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!form.bank_name.trim())            return setError('Bank Name wajib diisi');
    if (!form.account_number.trim())       return setError('Account Number wajib diisi');
    if (!form.account_holder_alias.trim()) return setError('Account Holder Alias wajib diisi');
    if (!form.owner_label.trim())          return setError('Owner Label wajib diisi (e.g., "AR", "RY")');
    if (!form.account_holder_real.trim())  return setError('Account Holder Real Name wajib diisi (legal record)');

    if (!token) return setError('Session expired, login ulang');

    // Build payload
    const payload = {
      bank_name:            form.bank_name.trim(),
      account_number:       form.account_number.trim(),
      account_holder_alias: form.account_holder_alias.trim(),
      owner_label:          form.owner_label.trim(),
      account_holder_real:  form.account_holder_real.trim(),
      is_personal_owner:    form.is_personal_owner,
      is_spouse:            form.is_spouse,
      is_active:            form.is_active,
      display_order:        form.display_order,
      notes:                form.notes.trim() || null,
    };

    setLoading(true);

    try {
      const url    = mode === 'create'
        ? `${API}/admin/bank-accounts`
        : `${API}/admin/bank-accounts/${account!.id}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success || !json.data) {
        const msg = json.error?.message ?? `Gagal ${mode === 'create' ? 'membuat' : 'update'} rekening`;
        setError(msg);
        setLoading(false);
        return;
      }

      onSuccess(
        mode === 'create'
          ? `✓ Rekening ${form.bank_name} (${form.account_holder_alias}) tercatat`
          : `✓ Rekening ${form.bank_name} ter-update`
      );
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Network error — cek koneksi internet');
      setLoading(false);
    }
  };

  const isEdit = mode === 'edit';

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] bg-surface border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─── */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-status-info/12 text-status-info shrink-0">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-extrabold text-text leading-tight">
                {isEdit ? 'Edit Rekening' : 'Tambah Rekening Baru'}
              </h2>
              <p className="text-[11px] text-text-muted mt-1">
                {isEdit
                  ? `${account?.bank_name} ${account?.account_number}`
                  : 'Tambahkan rekening penerima pembayaran TeraLoka'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-text-muted hover:text-text p-1 rounded-md hover:bg-surface-muted transition-colors shrink-0 disabled:opacity-50"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Body (scrollable) ─── */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">

          {/* Privacy Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-status-warning/8 border border-status-warning/20">
            <ShieldAlert size={14} className="text-status-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[11px] text-status-warning font-bold leading-relaxed">
                Privacy Notice
              </p>
              <p className="text-[10px] text-status-warning/90 mt-0.5 leading-relaxed">
                Field <strong>Account Holder Real</strong> menyimpan nama legal (PII).
                Disimpan di DB dengan RLS protection — TIDAK pernah ditampilkan di UI publik.
                Hanya super_admin yang lihat. <strong>Owner Label</strong> ("AR", "RY") yang muncul di UI.
              </p>
            </div>
          </div>

          {/* Bank Name + Account Number (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                Bank Name <span className="text-status-critical">*</span>
              </label>
              <input
                ref={inputRef}
                type="text"
                value={form.bank_name}
                onChange={(e) => updateField('bank_name', e.target.value)}
                placeholder="BCA, BNI, Mandiri..."
                disabled={loading}
                className="w-full px-3 py-2.5 text-[13px] font-semibold text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info/30 focus:border-status-info/60 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                Account Number <span className="text-status-critical">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.account_number}
                onChange={(e) => updateField('account_number', e.target.value)}
                placeholder="1234567890"
                disabled={loading}
                className="w-full px-3 py-2.5 text-[13px] font-mono text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info/30 focus:border-status-info/60 disabled:opacity-50 tabular-nums"
              />
            </div>
          </div>

          {/* Account Holder Alias (PUBLIC) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Account Holder Alias <span className="text-status-critical">*</span>
              <span className="ml-2 text-[9px] text-status-healthy normal-case font-normal">
                (PUBLIC — muncul di dropdown payment)
              </span>
            </label>
            <input
              type="text"
              value={form.account_holder_alias}
              onChange={(e) => updateField('account_holder_alias', e.target.value)}
              placeholder="TeraLoka Operations, TeraLoka Media, TeraLoka Partner..."
              disabled={loading}
              className="w-full px-3 py-2.5 text-[13px] text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info/30 focus:border-status-info/60 disabled:opacity-50"
            />
            <p className="text-[10px] text-text-muted mt-1.5">
              Alias publik untuk hide identitas legal. Format: "TeraLoka [Kategori]".
            </p>
          </div>

          {/* Owner Label + Real Name (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                Owner Label <span className="text-status-critical">*</span>
                <span className="ml-1.5 text-[9px] text-status-warning normal-case font-normal">
                  (INTERNAL)
                </span>
              </label>
              <input
                type="text"
                value={form.owner_label}
                onChange={(e) => updateField('owner_label', e.target.value.toUpperCase())}
                placeholder="AR / RY / AR-RY"
                disabled={loading}
                maxLength={10}
                className="w-full px-3 py-2.5 text-[13px] font-bold uppercase text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-warning/30 focus:border-status-warning/60 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                Real Name <span className="text-status-critical">*</span>
                <span className="ml-1.5 text-[9px] text-status-critical normal-case font-normal">
                  (LEGAL · PII)
                </span>
              </label>
              <input
                type="text"
                value={form.account_holder_real}
                onChange={(e) => updateField('account_holder_real', e.target.value)}
                placeholder="Nama legal lengkap"
                disabled={loading}
                className="w-full px-3 py-2.5 text-[13px] text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-critical/30 focus:border-status-critical/60 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Ownership flags (mutual exclusive) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Ownership
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all',
                form.is_personal_owner
                  ? 'border-status-healthy bg-status-healthy/8 text-status-healthy'
                  : 'border-border bg-surface-muted text-text-muted hover:border-text-muted',
                loading && 'opacity-50 cursor-not-allowed'
              )}>
                <input
                  type="checkbox"
                  checked={form.is_personal_owner}
                  onChange={(e) => handleOwnerToggle(e.target.checked)}
                  disabled={loading}
                  className="sr-only"
                />
                <User size={14} />
                <span className="text-[11px] font-bold">Personal Owner</span>
              </label>
              <label className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all',
                form.is_spouse
                  ? 'border-baronda bg-baronda/8 text-baronda'
                  : 'border-border bg-surface-muted text-text-muted hover:border-text-muted',
                loading && 'opacity-50 cursor-not-allowed'
              )}>
                <input
                  type="checkbox"
                  checked={form.is_spouse}
                  onChange={(e) => handleSpouseToggle(e.target.checked)}
                  disabled={loading}
                  className="sr-only"
                />
                <Heart size={14} />
                <span className="text-[11px] font-bold">Spouse</span>
              </label>
            </div>
            <p className="text-[10px] text-text-muted mt-1.5">
              Owner XOR Spouse (eksklusif). Joint account: pilih salah satu sesuai PIC utama.
            </p>
          </div>

          {/* Display Order + Active toggle (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                <ListOrdered size={11} className="inline -mt-0.5 mr-1" />
                Display Order
              </label>
              <input
                type="number"
                min={0}
                value={form.display_order}
                onChange={(e) => updateField('display_order', Number(e.target.value) || 0)}
                disabled={loading}
                className="w-full px-3 py-2.5 text-[13px] text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info/30 focus:border-status-info/60 disabled:opacity-50 tabular-nums"
              />
              <p className="text-[10px] text-text-muted mt-1">
                Urutan di dropdown (0 = paling atas).
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                <ToggleLeft size={11} className="inline -mt-0.5 mr-1" />
                Status
              </label>
              <label className={cn(
                'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-all',
                form.is_active
                  ? 'border-status-healthy bg-status-healthy/8 text-status-healthy'
                  : 'border-border bg-surface-muted text-text-muted',
                loading && 'opacity-50 cursor-not-allowed'
              )}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                  disabled={loading}
                  className="sr-only"
                />
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  form.is_active ? 'bg-status-healthy animate-pulse' : 'bg-text-muted'
                )} />
                <span className="text-[11px] font-bold">
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              <MessageSquare size={11} className="inline -mt-0.5 mr-1" />
              Notes (Opsional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="e.g., Primary ADS revenue, Operational reserve, Backup channel..."
              rows={2}
              disabled={loading}
              className="w-full px-3 py-2 text-[12px] text-text bg-surface-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-status-info/30 focus:border-status-info/60 disabled:opacity-50 resize-none"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Free text. Hindari wording sensitif seperti "diversifikasi pajak".
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-status-critical/8 border border-status-critical/20">
              <AlertTriangle size={14} className="text-status-critical shrink-0 mt-0.5" />
              <p className="text-[11px] text-status-critical leading-relaxed">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-[12px] font-bold text-text-muted hover:text-text transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wide transition-all',
              'bg-status-info text-white hover:bg-status-info/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Building2 size={13} />
                {isEdit ? 'Update Rekening' : 'Simpan Rekening'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
