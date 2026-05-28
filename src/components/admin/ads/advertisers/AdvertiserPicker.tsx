'use client';

/**
 * TeraLoka — AdvertiserPicker
 * SESI 5B STEP 1 (18 Mei 2026)
 * ────────────────────────────────────────────────────────────────────
 * Controlled picker untuk wire Ad ↔ Advertiser entity.
 *
 * Used by:
 *   - AdFormSectionAdvertiser (Mission 8 Sub-Phase 8-B) — replace free-text
 *
 * Pattern: mirror LocationAutocomplete (debounce 300ms + dropdown + clear)
 * + Selected card view dengan visual status warning.
 *
 * Behavior:
 *   - Empty state: search input → ketik 2+ chars → fetch /admin/advertisers
 *   - Sort: active first → suspended → banned, then alphabetical
 *   - Selected state: replace input dengan card showing advertiser info
 *   - Clear button: emit onSelect(null) → kembali ke search mode
 *
 * USAGE:
 *   const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
 *
 *   <AdvertiserPicker
 *     value={advertiser}
 *     onSelect={setAdvertiser}
 *   />
 *
 *   // Parent edit mode bootstrap:
 *   // - Existing ad.advertiser_account_id exists? Fetch /admin/advertisers/:id
 *   //   → setAdvertiser(fetched)
 *   // - Existing ad legacy (no advertiser_account_id)? setAdvertiser(null)
 *   //   → picker tetap dalam search mode, parent show free-text fallback
 *
 * Plus warns admin via visual badge:
 *   - 🟡 Suspended → show status warning
 *   - ⛔ Banned → show status warning
 *   - 🛡️ Founder Veto → show veto badge
 *   (Admin still CAN select, backend final validation)
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Search,
  X,
  Loader2,
  Phone,
  MapPin,
  ShieldAlert,
  Check,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Advertiser, AccountType, AdvertiserStatus } from './AdvertiserPanel';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Constants (mirror AdvertiserPanel) ─────────────────────

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  umkm:            'UMKM',
  local_corporate: 'Local Corp',
  premium:         'Premium',
  politik:         'Politik',
  pemerintah:      'Pemerintah',
  internal:        'Internal',         // SESI 9 Sub-Phase A.5
};

const ACCOUNT_TYPE_COLOR: Record<AccountType, string> = {
  umkm:            'bg-status-healthy/12 text-status-healthy',
  local_corporate: 'bg-status-info/12 text-status-info',
  premium:         'bg-bakabar/12 text-bakabar',
  politik:         'bg-balapor/12 text-balapor',
  pemerintah:      'bg-baronda/12 text-baronda',
  internal:        'bg-amber-500/15 text-amber-700 dark:text-amber-400', // SESI 9 Sub-Phase A.5
};

// Status hierarchy: active first, then suspended, then banned
const STATUS_PRIORITY: Record<AdvertiserStatus, number> = {
  active:    0,
  suspended: 1,
  banned:    2,
};

// ─── Props ──────────────────────────────────────────────────

export interface AdvertiserPickerProps {
  /** Currently selected advertiser entity (controlled) */
  value: Advertiser | null;

  /** Called when user picks advertiser OR clears */
  onSelect: (advertiser: Advertiser | null) => void;

  /** Disabled state (e.g. form submitting) */
  disabled?: boolean;

  /** Custom placeholder */
  placeholder?: string;
}

// ─── Component ──────────────────────────────────────────────

export default function AdvertiserPicker({
  value,
  onSelect,
  disabled,
  placeholder,
}: AdvertiserPickerProps) {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [results, setResults] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search 300ms
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Fetch advertisers when debounced term changes
  useEffect(() => {
    if (!token || !debouncedTerm.trim() || debouncedTerm.length < 2) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: debouncedTerm.trim(),
          limit: '10',
        });
        const res = await fetch(`${API}/admin/advertisers?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) {
          // Hierarchy sort: active first → suspended → banned, then alphabetical
          const sorted = (json.data ?? []).slice().sort((a: Advertiser, b: Advertiser) => {
            const aPriority = STATUS_PRIORITY[a.status] ?? 99;
            const bPriority = STATUS_PRIORITY[b.status] ?? 99;
            if (aPriority !== bPriority) return aPriority - bPriority;
            return a.business_name.localeCompare(b.business_name, 'id');
          });
          setResults(sorted);
        }
      } catch (err) {
        console.error('[AdvertiserPicker] fetch failed', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [debouncedTerm, token]);

  // Outside click closes dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (adv: Advertiser) => {
    onSelect(adv);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchTerm('');
    setResults([]);
  };

  // ─── Selected Mode ─────────────────────────────────────────

  if (value) {
    return <SelectedCard advertiser={value} onClear={handleClear} disabled={disabled} />;
  }

  // ─── Search Mode ───────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search
          size={12}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder ?? 'Cari nama bisnis / WA / display ID...'}
          disabled={disabled}
          className="w-full pl-8 pr-7 py-2 rounded-md bg-surface border border-border text-[12px] text-text placeholder:text-text-subtle focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20 disabled:opacity-50"
        />
        {loading ? (
          <Loader2
            size={11}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ads animate-spin"
          />
        ) : searchTerm ? (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setResults([]);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-muted"
            tabIndex={-1}
          >
            <X size={10} className="text-text-muted" />
          </button>
        ) : null}
      </div>

      {/* Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-2xl max-h-72 overflow-y-auto z-50">
          {results.map((adv) => (
            <ResultRow key={adv.id} advertiser={adv} onSelect={() => handleSelect(adv)} />
          ))}
        </div>
      )}

      {/* No Results Hint */}
      {showDropdown &&
        !loading &&
        debouncedTerm.length >= 2 &&
        results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-2xl px-3 py-3 z-50">
            <div className="flex items-start gap-2">
              <Users size={12} className="text-text-muted shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-text-muted">
                  Advertiser "{debouncedTerm}" tidak ditemukan
                </p>
                <p className="text-[10px] text-text-subtle mt-1 leading-relaxed">
                  💡 Tambah advertiser baru via Tab Advertiser, atau aktifkan "Mode Cepat" untuk input free-text.
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

// ─── Sub-Component: ResultRow ──────────────────────────────────

function ResultRow({
  advertiser: adv,
  onSelect,
}: {
  advertiser: Advertiser;
  onSelect: () => void;
}) {
  const isUnusable = adv.status === 'banned' || adv.founder_rejected;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full px-3 py-2.5 text-left flex items-start gap-2 hover:bg-surface-muted transition-colors border-b border-border/50 last:border-b-0',
        isUnusable && 'opacity-60',
      )}
    >
      <div className="flex-1 min-w-0">
        {/* Top row: name + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[12px] font-bold text-text truncate">{adv.business_name}</p>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
              ACCOUNT_TYPE_COLOR[adv.account_type],
            )}
          >
            {ACCOUNT_TYPE_LABEL[adv.account_type]}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-muted text-text-muted font-mono">
            {adv.display_id}
          </span>
          {adv.status === 'suspended' && (
            <span className="text-[9px] font-bold text-status-warning uppercase tracking-wide">
              Suspended
            </span>
          )}
          {adv.status === 'banned' && (
            <span className="text-[9px] font-bold text-balapor uppercase tracking-wide">
              Banned
            </span>
          )}
          {adv.founder_rejected && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-bakabar uppercase tracking-wide">
              <ShieldAlert size={9} />
              Veto
            </span>
          )}
        </div>

        {/* Middle row: contact + location */}
        <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted flex-wrap">
          <span className="inline-flex items-center gap-1 font-mono">
            <Phone size={9} />
            {adv.pic_phone}
          </span>
          <span>•</span>
          <span>{adv.pic_name}</span>
          {adv.business_kabupaten && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={9} />
                {adv.business_kabupaten}
              </span>
            </>
          )}
        </div>

        {/* Bottom row: stats */}
        <p className="text-[10px] text-text-subtle mt-0.5">
          {adv.total_ads_count} ads ·{' '}
          {adv.total_spent > 0
            ? `Rp ${adv.total_spent.toLocaleString('id-ID')}`
            : 'belum ada spending'}
        </p>
      </div>
    </button>
  );
}

// ─── Sub-Component: SelectedCard ───────────────────────────────

function SelectedCard({
  advertiser: adv,
  onClear,
  disabled,
}: {
  advertiser: Advertiser;
  onClear: () => void;
  disabled?: boolean;
}) {
  const hasStatusWarning =
    adv.status !== 'active' || adv.founder_rejected;

  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-ads/8 border-2 border-ads/30">
      <Check size={12} className="text-ads shrink-0 mt-1" />

      <div className="flex-1 min-w-0">
        {/* Top row: name + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-extrabold text-text truncate">
            {adv.business_name}
          </p>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
              ACCOUNT_TYPE_COLOR[adv.account_type],
            )}
          >
            {ACCOUNT_TYPE_LABEL[adv.account_type]}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-muted text-text-muted font-mono">
            {adv.display_id}
          </span>
        </div>

        {/* Contact + location */}
        <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted flex-wrap">
          <span className="inline-flex items-center gap-1 font-mono">
            <Phone size={9} />
            {adv.pic_phone}
          </span>
          <span>•</span>
          <span>{adv.pic_name}</span>
          {adv.business_kabupaten && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={9} />
                {adv.business_kabupaten}
              </span>
            </>
          )}
        </div>

        {/* Status warning (kalau ada) */}
        {hasStatusWarning && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {adv.status === 'suspended' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-warning">
                ⚠️ Suspended
                {adv.suspended_until && ` s/d ${formatDate(adv.suspended_until)}`}
              </span>
            )}
            {adv.status === 'banned' && (
              <span className="text-[10px] font-bold text-balapor">
                ⛔ Advertiser dalam status Banned
              </span>
            )}
            {adv.founder_rejected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-bakabar">
                <ShieldAlert size={10} />
                Founder Veto Active
              </span>
            )}
          </div>
        )}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded hover:bg-surface-muted text-text-muted hover:text-text shrink-0"
          title="Ganti advertiser"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}
