'use client';

/**
 * TeraLoka — AdFormSectionAdvertiser
 * Mission 8 Sub-Phase 8-B (α / Batch 1)
 * ------------------------------------------------------------
 * Section 1 form: Advertiser Info.
 * Fields:
 *   - advertiser_name (text, required)
 *   - advertiser_type (radio: umum/politisi/pemerintah/komersial)
 *   - advertiser_phone (text, optional)
 *   - advertiser_logo_url (ImageUpload single, optional)
 *
 * Collapsible hybrid: section header click → toggle expand/collapse.
 * Completion indicator: green check kalau advertiser_name + type filled.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Building2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/ui/ImageUpload';
import { useAdForm, type AdvertiserType } from './AdFormProvider';

const TYPE_OPTIONS: Array<{
  value: AdvertiserType;
  label: string;
  description: string;
  emoji: string;
  warning?: string;
}> = [
  { value: 'umum',       label: 'Umum',       emoji: '🌐', description: 'UMKM, individual, organisasi non-formal' },
  { value: 'komersial',  label: 'Komersial',  emoji: '💼', description: 'PT/CV, brand nasional, korporasi' },
  { value: 'pemerintah', label: 'Pemerintah', emoji: '🏢', description: 'Instansi pemerintah, BUMN, BPJS', warning: 'Auto pending_review' },
  { value: 'politisi',   label: 'Politisi',   emoji: '🏛️', description: 'Calon legislatif, partai politik, calon kepala daerah', warning: 'KPU compliance + pending_review' },
];

export default function AdFormSectionAdvertiser() {
  const { state, setField, errorFor } = useAdForm();
  const [expanded, setExpanded] = useState(true);

  const isComplete =
    state.advertiser_name.trim().length > 0 && state.advertiser_type;

  const nameError = errorFor('advertiser_name');

  return (
    <section className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Section header (clickable to toggle) */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-surface-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-ads/12 text-ads shrink-0">
            <Building2 size={16} />
          </div>
          <div className="min-w-0 text-left">
            <h3 className="text-[13px] font-bold text-text uppercase tracking-wider">
              1. Informasi Advertiser
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Siapa yang pasang iklan ini?
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isComplete && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-healthy/12 text-status-healthy">
              <Check size={12} />
            </span>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </div>
      </button>

      {/* Section body */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-border">
          {/* Advertiser name */}
          <div className="pt-4">
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
              Nama Advertiser <span className="text-status-critical">*</span>
            </label>
            <input
              type="text"
              value={state.advertiser_name}
              onChange={(e) => setField('advertiser_name', e.target.value)}
              placeholder="Contoh: Pertashop Halmahera Utara"
              maxLength={80}
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'bg-surface border text-[13px] text-text',
                'placeholder:text-text-subtle',
                'focus:outline-none focus:ring-2 focus:ring-ads/20 transition-all',
                nameError
                  ? 'border-status-critical/40 focus:border-status-critical/60'
                  : 'border-border focus:border-ads/50'
              )}
            />
            <div className="flex items-center justify-between mt-1">
              {nameError ? (
                <p className="text-[10px] text-status-critical">{nameError}</p>
              ) : (
                <span />
              )}
              <p className="text-[10px] text-text-subtle">
                {state.advertiser_name.length}/80
              </p>
            </div>
          </div>

          {/* Advertiser type — radio cards */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Tipe Advertiser <span className="text-status-critical">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const isActive = state.advertiser_type === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                      isActive
                        ? 'bg-ads/8 border-ads/40'
                        : 'bg-surface border-border hover:bg-surface-muted'
                    )}
                  >
                    <input
                      type="radio"
                      name="advertiser_type"
                      checked={isActive}
                      onChange={() => setField('advertiser_type', opt.value)}
                      className="accent-ads mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span aria-hidden className="text-[15px]">
                          {opt.emoji}
                        </span>
                        <span
                          className={cn(
                            'text-[12px] font-bold',
                            isActive ? 'text-text' : 'text-text-muted'
                          )}
                        >
                          {opt.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                        {opt.description}
                      </p>
                      {opt.warning && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <AlertTriangle
                            size={9}
                            className="text-status-warning shrink-0"
                          />
                          <span className="text-[9px] font-semibold text-status-warning">
                            {opt.warning}
                          </span>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
              Nomor Kontak <span className="text-text-subtle">(opsional)</span>
            </label>
            <input
              type="tel"
              value={state.advertiser_phone}
              onChange={(e) => setField('advertiser_phone', e.target.value)}
              placeholder="Contoh: 08123456789"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[13px] text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-ads/20 focus:border-ads/50 transition-all"
            />
            <p className="text-[10px] text-text-subtle mt-1">
              Untuk koordinasi pembaruan iklan / billing
            </p>
          </div>

          {/* Logo upload */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
              Logo Advertiser <span className="text-text-subtle">(opsional)</span>
            </label>
            <ImageUpload
              bucket="ads"
              maxFiles={1}
              maxSizeMB={0.5}
              existingUrls={state.advertiser_logo_url ? [state.advertiser_logo_url] : []}
              onUpload={(urls) => setField('advertiser_logo_url', urls[0] ?? '')}
              label="Logo (square, max 500KB)"
            />
            <p className="text-[10px] text-text-subtle mt-1">
              Logo tampil di card iklan native (rekomen 200×200px)
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
