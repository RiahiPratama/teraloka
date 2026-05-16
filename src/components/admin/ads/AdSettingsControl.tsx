'use client';

/**
 * TeraLoka — AdSettingsControl
 * PATH: src/components/admin/ads/AdSettingsControl.tsx
 * Mission 8 Sub-Phase 8-D Phase 2 v3 Turn 3b OFFICE Form
 * ────────────────────────────────────────────────────────────────
 * Shared component untuk OFFICE BAKABAR form (NEW + EDIT).
 * Render section "Iklan dalam artikel" expand dengan:
 *   - ad_position dropdown (existing legacy — disable iklan tengah)
 *   - Master preset dropdown (5 option, simple default)
 *   - Advanced toggle reveal 3 count dropdown (kalau preset='custom')
 *   - Format filter dropdown
 *
 * Sync logic:
 *   - preset='none' → auto-set ad_position=0 (consistency UX)
 *   - preset='few'|'medium'|'lots' → ad_position default (kalau belum di-set)
 *   - preset='custom' → ad_position editor control manual
 *
 * Pattern (Pattern AAS Next.js explicit folder): component di
 * src/components/admin/ shared antar NEW + EDIT form.
 */

import {
  type AdSettings,
  type AdPreset,
  type AdFormatFilter,
  PRESET_META,
  COUNT_RANGES,
  resolvePresetCounts,
} from '@/lib/ad-settings';

// ────────────────────────────────────────────────────────────────
// Theme tokens — passed from parent (avoid AdminThemeContext coupling)
// ────────────────────────────────────────────────────────────────

interface ThemeTokens {
  textPrimary: string;
  textMuted:   string;
  textDim:     string;
  [k: string]: any;
}

interface EditorTokens {
  cardBg:      string;
  inputBg:     string;
  inputBorder: string;
  [k: string]: any;
}

// ────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────

interface Props {
  /** Current ad_settings value (controlled). */
  value: AdSettings;
  /** Setter callback — receive partial update, parent merge ke state. */
  onChange: (next: AdSettings) => void;
  /** Current ad_position (legacy field, existing dropdown). */
  adPosition: number | null;
  /** Setter callback untuk ad_position (parent state). */
  onAdPositionChange: (v: number | null) => void;
  /** Theme color tokens (passed from parent — AdminThemeContext or fallback). */
  t: ThemeTokens;
  /** Editor-specific derived tokens (cardBg, inputBg, inputBorder). */
  editorTokens: EditorTokens;
  /** Dark mode flag. */
  dark: boolean;
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

export default function AdSettingsControl({
  value,
  onChange,
  adPosition,
  onAdPositionChange,
  t,
  editorTokens,
  dark,
}: Props) {
  const isCustom = value.preset === 'custom';

  // ────────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────────

  function handlePresetChange(newPreset: AdPreset) {
    if (newPreset === 'custom') {
      // Custom mode — preserve current count, just flip preset
      onChange({ ...value, preset: 'custom' });
    } else {
      // Preset mode — auto-distribute deterministic
      const counts = resolvePresetCounts(newPreset);
      onChange({
        ...value,
        preset: newPreset,
        body_inject_count:   counts.body_inject_count,
        sidebar_count:       counts.sidebar_count,
        after_article_count: counts.after_article_count,
      });

      // Sync: preset='none' → auto-set ad_position=0 (consistency)
      if (newPreset === 'none' && adPosition !== 0) {
        onAdPositionChange(0);
      }
      // Sync: preset != 'none' AND ad_position=0 → reset ke null (auto)
      if (newPreset !== 'none' && adPosition === 0) {
        onAdPositionChange(null);
      }
    }
  }

  function handleCountChange(field: 'body_inject_count' | 'sidebar_count' | 'after_article_count', newCount: number) {
    onChange({ ...value, [field]: newCount });
  }

  function handleFormatChange(newFormat: AdFormatFilter) {
    onChange({ ...value, format_filter: newFormat });
  }

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      padding: 12, borderRadius: 10,
      background: editorTokens.cardBg, border: `1px solid ${editorTokens.inputBorder}`,
    }}>
      <label style={{ fontSize: 13, color: t.textMuted, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
        🎯 <span>Iklan dalam artikel</span>
      </label>

      {/* ════════════════════════════════════════════════════════ */}
      {/* AD_POSITION — existing legacy dropdown (disable iklan tengah) */}
      {/* ════════════════════════════════════════════════════════ */}

      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>
          Posisi iklan tengah artikel
        </p>
        <select
          value={adPosition === null ? 'auto' : String(adPosition)}
          onChange={(e) => {
            const v = e.target.value;
            onAdPositionChange(v === 'auto' ? null : Number(v));
          }}
          style={{
            padding: '8px 10px', borderRadius: 8,
            border: `1px solid ${editorTokens.inputBorder}`,
            background: editorTokens.inputBg, color: t.textPrimary,
            fontSize: 12, outline: 'none', cursor: 'pointer',
            width: '100%', boxSizing: 'border-box',
          }}>
          <option value="auto">Auto — smart spacing (default)</option>
          <option value="2">Setelah paragraf ke-2</option>
          <option value="3">Setelah paragraf ke-3</option>
          <option value="5">Setelah paragraf ke-5</option>
          <option value="7">Setelah paragraf ke-7</option>
          <option value="0">Nonaktifkan iklan tengah</option>
        </select>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* MASTER PRESET DROPDOWN — γ Hybrid main control */}
      {/* ════════════════════════════════════════════════════════ */}

      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>
          Jumlah iklan total
        </p>
        <select
          value={value.preset}
          onChange={(e) => handlePresetChange(e.target.value as AdPreset)}
          style={{
            padding: '8px 10px', borderRadius: 8,
            border: `1px solid ${editorTokens.inputBorder}`,
            background: editorTokens.inputBg, color: t.textPrimary,
            fontSize: 12, outline: 'none', cursor: 'pointer',
            width: '100%', boxSizing: 'border-box',
          }}>
          <option value="none">{PRESET_META.none.label}</option>
          <option value="few">{PRESET_META.few.label}</option>
          <option value="medium">{PRESET_META.medium.label}</option>
          <option value="lots">{PRESET_META.lots.label}</option>
          <option value="custom">{PRESET_META.custom.label}</option>
        </select>
        <p style={{ fontSize: 10, color: t.textDim, marginTop: 4, fontStyle: 'italic', margin: '4px 0 0 0' }}>
          💡 {PRESET_META[value.preset].description}
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* ADVANCED — 3 count dropdown (only when preset='custom') */}
      {/* ════════════════════════════════════════════════════════ */}

      {isCustom && (
        <div style={{
          padding: 10, borderRadius: 8,
          background: dark ? 'rgba(99,102,241,0.08)' : '#EEF2FF',
          border: `1px solid ${dark ? 'rgba(99,102,241,0.25)' : '#C7D2FE'}`,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: dark ? '#A5B4FC' : '#4338CA', margin: 0 }}>
            ⚙️ Custom — atur per zona
          </p>

          <CountSelect
            label="Iklan di tengah artikel"
            value={value.body_inject_count}
            min={COUNT_RANGES.body_inject.min}
            max={COUNT_RANGES.body_inject.max}
            onChange={(v) => handleCountChange('body_inject_count', v)}
            t={t} editorTokens={editorTokens}
          />

          <CountSelect
            label="Iklan sidebar"
            value={value.sidebar_count}
            min={COUNT_RANGES.sidebar.min}
            max={COUNT_RANGES.sidebar.max}
            onChange={(v) => handleCountChange('sidebar_count', v)}
            t={t} editorTokens={editorTokens}
          />

          <CountSelect
            label="Iklan setelah artikel"
            value={value.after_article_count}
            min={COUNT_RANGES.after_article.min}
            max={COUNT_RANGES.after_article.max}
            onChange={(v) => handleCountChange('after_article_count', v)}
            t={t} editorTokens={editorTokens}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* FORMAT FILTER */}
      {/* ════════════════════════════════════════════════════════ */}

      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: t.textDim, marginBottom: 6 }}>
          Jenis iklan yang ditampilkan
        </p>
        <select
          value={value.format_filter}
          onChange={(e) => handleFormatChange(e.target.value as AdFormatFilter)}
          style={{
            padding: '8px 10px', borderRadius: 8,
            border: `1px solid ${editorTokens.inputBorder}`,
            background: editorTokens.inputBg, color: t.textPrimary,
            fontSize: 12, outline: 'none', cursor: 'pointer',
            width: '100%', boxSizing: 'border-box',
          }}>
          <option value="all">Semua jenis (default)</option>
          <option value="image_only">Hanya iklan gambar</option>
          <option value="text_only">Hanya advertorial teks</option>
          <option value="dca_only">Hanya iklan DCA (multi-frame)</option>
        </select>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SUMMARY — visual feedback total ads */}
      {/* ════════════════════════════════════════════════════════ */}

      <div style={{
        padding: '8px 10px', borderRadius: 8,
        background: dark ? 'rgba(16,185,129,0.08)' : '#ECFDF5',
        border: `1px solid ${dark ? 'rgba(16,185,129,0.25)' : '#A7F3D0'}`,
      }}>
        <p style={{ fontSize: 11, color: dark ? '#6EE7B7' : '#047857', fontWeight: 600, margin: 0 }}>
          📊 Total iklan di artikel ini: <strong>{value.body_inject_count + value.sidebar_count + value.after_article_count}</strong> iklan
          {' '}({value.body_inject_count} body · {value.sidebar_count} sidebar · {value.after_article_count} setelah)
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Sub-component: CountSelect (reusable dropdown 0-N)
// ────────────────────────────────────────────────────────────────

interface CountSelectProps {
  label:  string;
  value:  number;
  min:    number;
  max:    number;
  onChange: (v: number) => void;
  t:      any;
  editorTokens: any;
}

function CountSelect({ label, value, min, max, onChange, t, editorTokens }: CountSelectProps) {
  const options = [];
  for (let i = min; i <= max; i++) options.push(i);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, fontSize: 11, color: t.textMuted, fontWeight: 500 }}>
        {label}:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          padding: '4px 8px', borderRadius: 6,
          border: `1px solid ${editorTokens.inputBorder}`,
          background: editorTokens.inputBg, color: t.textPrimary,
          fontSize: 11, outline: 'none', cursor: 'pointer',
          minWidth: 60,
        }}>
        {options.map(n => (
          <option key={n} value={n}>{n} {n === 0 ? '(tidak ada)' : 'iklan'}</option>
        ))}
      </select>
    </div>
  );
}
