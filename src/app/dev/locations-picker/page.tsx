'use client';

/**
 * TeraLoka — DEV: Geographic Scope Picker Verification Page
 * Pre-Sprint #0 Step 7 — Visual Verification
 * ────────────────────────────────────────────────────────────
 * Demo page untuk verify visual + UX `<GeographicScopePicker />`.
 *
 * Test scenarios:
 *   1. Citizen mode (default brand color #003526)
 *   2. BALAPOR admin mode (red urgent #DC2626)
 *   3. BAKOS admin mode (orange #F59E0B)
 *   4. Type-restricted picker (kelurahan/desa only)
 *   5. With GPS button
 *   6. localStorage persistence
 *   7. Mobile responsive (Chrome DevTools toggle)
 *
 * Display:
 *   - Live state inspector (current scope JSON)
 *   - localStorage state per picker
 *   - Reset button per picker
 *
 * IMPORTANT: Disposable. Hapus setelah Pre-Sprint #0 LOCK.
 *   rm -rf src/app/dev/locations-picker/
 *
 * URL: https://teraloka.vercel.app/dev/locations-picker
 */

import { useState } from 'react';
import {
  GeographicScopePicker,
  type LocationScope,
  type LocationBreadcrumb,
} from '@/components/shared/locations';

interface PickerState {
  scope: LocationScope | null;
  breadcrumb: LocationBreadcrumb | null;
}

const INITIAL_STATE: PickerState = { scope: null, breadcrumb: null };

export default function LocationsPickerDevPage() {
  // 4 picker instances dengan config berbeda
  const [citizenMode, setCitizenMode] = useState<PickerState>(INITIAL_STATE);
  const [balaporAdmin, setBalaporAdmin] = useState<PickerState>(INITIAL_STATE);
  const [bakosAdmin, setBakosAdmin] = useState<PickerState>(INITIAL_STATE);
  const [restrictedType, setRestrictedType] = useState<PickerState>(INITIAL_STATE);

  return (
    <div className="min-h-screen bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-status-warning/20 text-status-warning">
              DEV ONLY
            </span>
            <span className="text-xs text-text-muted">
              Pre-Sprint #0 Step 7 — Visual Verification
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">
            Geographic Scope Picker — Demo
          </h1>
          <p className="text-sm text-text-muted">
            Page ini untuk verify komponen <code className="px-1 py-0.5 rounded bg-surface-muted text-xs">&lt;GeographicScopePicker /&gt;</code>{' '}
            sebelum di-integrate ke production page. Hapus folder ini setelah verify selesai.
          </p>
        </header>

        {/* Test Scenarios */}
        <div className="space-y-6">

          {/* ═══════════════════════════════════════════════════ */}
          {/* SCENARIO 1: Citizen mode (default TeraLoka green)    */}
          {/* ═══════════════════════════════════════════════════ */}
          <section className="rounded-xl border border-border bg-surface-muted p-5">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-text mb-1">
                1. Citizen Mode (Default)
              </h2>
              <p className="text-xs text-text-muted">
                Use case: <code>/lapor</code> page — warga submit laporan dengan brand TeraLoka green.
                <br />
                Color: <code className="font-mono">#003526</code>
              </p>
            </div>

            <GeographicScopePicker
              value={citizenMode.scope}
              onChange={(scope, breadcrumb) =>
                setCitizenMode({ scope, breadcrumb: breadcrumb ?? null })
              }
              placeholder="Pilih lokasi laporan"
              storageKey="dev_picker_citizen"
              allowGps={true}
            />

            <StateInspector state={citizenMode} />
          </section>

          {/* ═══════════════════════════════════════════════════ */}
          {/* SCENARIO 2: BALAPOR admin mode (red urgent)          */}
          {/* ═══════════════════════════════════════════════════ */}
          <section className="rounded-xl border border-border bg-surface-muted p-5">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-text mb-1">
                2. BALAPOR Admin Mode
              </h2>
              <p className="text-xs text-text-muted">
                Use case: <code>/admin/balapor</code> filter scope — admin filter laporan per wilayah.
                <br />
                Color: <code className="font-mono">#DC2626</code> (red urgent)
              </p>
            </div>

            <GeographicScopePicker
              value={balaporAdmin.scope}
              onChange={(scope, breadcrumb) =>
                setBalaporAdmin({ scope, breadcrumb: breadcrumb ?? null })
              }
              placeholder="Filter wilayah laporan"
              storageKey="dev_picker_balapor_admin"
              brandColor="#DC2626"
              size="compact"
            />

            <StateInspector state={balaporAdmin} />
          </section>

          {/* ═══════════════════════════════════════════════════ */}
          {/* SCENARIO 3: BAKOS admin mode (orange)                */}
          {/* ═══════════════════════════════════════════════════ */}
          <section className="rounded-xl border border-border bg-surface-muted p-5">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-text mb-1">
                3. BAKOS Admin Mode
              </h2>
              <p className="text-xs text-text-muted">
                Use case: <code>/owner/listing/bakos</code> — owner pilih lokasi kos.
                <br />
                Color: <code className="font-mono">#F59E0B</code> (orange)
              </p>
            </div>

            <GeographicScopePicker
              value={bakosAdmin.scope}
              onChange={(scope, breadcrumb) =>
                setBakosAdmin({ scope, breadcrumb: breadcrumb ?? null })
              }
              placeholder="Pilih wilayah kos"
              storageKey="dev_picker_bakos_admin"
              brandColor="#F59E0B"
            />

            <StateInspector state={bakosAdmin} />
          </section>

          {/* ═══════════════════════════════════════════════════ */}
          {/* SCENARIO 4: Type-restricted (kelurahan/desa only)    */}
          {/* ═══════════════════════════════════════════════════ */}
          <section className="rounded-xl border border-border bg-surface-muted p-5">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-text mb-1">
                4. Type-Restricted (Kelurahan/Desa Only)
              </h2>
              <p className="text-xs text-text-muted">
                Use case: BALAPOR submit form — warga harus drill sampai kelurahan/desa.
                Provinsi/Kab/Kota cuma untuk navigasi, gak bisa di-pick langsung.
              </p>
            </div>

            <GeographicScopePicker
              value={restrictedType.scope}
              onChange={(scope, breadcrumb) =>
                setRestrictedType({ scope, breadcrumb: breadcrumb ?? null })
              }
              placeholder="Pilih kelurahan/desa"
              storageKey="dev_picker_restricted"
              allowedTypes={['kelurahan', 'desa']}
              allowGps={true}
            />

            <StateInspector state={restrictedType} />
          </section>

          {/* ═══════════════════════════════════════════════════ */}
          {/* DEBUG: localStorage inspector                        */}
          {/* ═══════════════════════════════════════════════════ */}
          <section className="rounded-xl border border-border bg-surface-muted p-5">
            <h2 className="text-lg font-semibold text-text mb-3">
              localStorage Inspector
            </h2>
            <p className="text-xs text-text-muted mb-3">
              Pilih lokasi di picker mana saja → reload page → state harus persist.
              Klik tombol bawah untuk hapus.
            </p>
            <button
              type="button"
              onClick={() => {
                const keys = [
                  'dev_picker_citizen',
                  'dev_picker_balapor_admin',
                  'dev_picker_bakos_admin',
                  'dev_picker_restricted',
                ];
                keys.forEach((k) => localStorage.removeItem(k));
                window.location.reload();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-status-critical text-status-critical hover:bg-status-critical/10 transition-colors"
            >
              Clear All localStorage + Reload
            </button>
          </section>

          {/* ═══════════════════════════════════════════════════ */}
          {/* CHECKLIST: What to verify                            */}
          {/* ═══════════════════════════════════════════════════ */}
          <section className="rounded-xl border border-border bg-surface-muted p-5">
            <h2 className="text-lg font-semibold text-text mb-3">
              ✅ Verification Checklist
            </h2>
            <ul className="space-y-2 text-sm text-text">
              <li>☐ Click trigger button → panel open (modal di desktop, bottom sheet di mobile)</li>
              <li>☐ Search "tern" → list autocomplete tampil (debounced 300ms)</li>
              <li>☐ Click "Maluku Utara" → drill ke kab/kota (10 items)</li>
              <li>☐ Click "Kota Ternate" → drill ke kecamatan (8 items)</li>
              <li>☐ Click 1 kelurahan → panel close, label update</li>
              <li>☐ Sofifi UUID = display "Sofifi ⭐" (provincial capital badge)</li>
              <li>☐ Tombol "Pakai GPS" → alert "tidak ditemukan" (Phase 1 expected)</li>
              <li>☐ Reset button → clear scope</li>
              <li>☐ Different brandColor → button border + accent color match</li>
              <li>☐ Mobile (DevTools toggle) → bottom sheet 70% height</li>
              <li>☐ localStorage persist setelah reload page</li>
              <li>☐ Type-restricted picker (Scenario 4) → kab/kota gak bisa langsung di-pick (auto-drill)</li>
            </ul>
          </section>

          {/* Footer */}
          <footer className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-text-muted">
              <strong>Cleanup:</strong> Setelah verify selesai, hapus folder ini:
              <br />
              <code className="px-2 py-1 rounded bg-surface text-xs mt-1 inline-block">
                rm -rf src/app/dev/locations-picker/
              </code>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: State Inspector
// ════════════════════════════════════════════════════════════════

function StateInspector({ state }: { state: PickerState }) {
  return (
    <div className="mt-4 space-y-2">
      <div>
        <div className="text-xs font-semibold text-text-muted mb-1">
          Current Scope (state):
        </div>
        <pre className="text-xs bg-surface p-2 rounded border border-border overflow-x-auto">
          {state.scope
            ? JSON.stringify(state.scope, null, 2)
            : 'null'}
        </pre>
      </div>

      {state.breadcrumb && (
        <div>
          <div className="text-xs font-semibold text-text-muted mb-1">
            Breadcrumb (auto-fetched):
          </div>
          <div className="text-sm text-text p-2 rounded border border-border bg-surface">
            <div>
              <strong>Display:</strong> {state.breadcrumb.display}
            </div>
            <div className="mt-1">
              <strong>Short:</strong> {state.breadcrumb.display_short}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
