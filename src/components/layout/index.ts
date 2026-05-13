// ════════════════════════════════════════════════════════════════
// LAYOUT BARREL EXPORT
// ────────────────────────────────────────────────────────────────
// History:
//   - 14 Mei 2026 (Sprint 2A Batch 1): hapus export Header
//     (file ./header.tsx di-delete sebagai dead code).
//     Audit grep — tidak ada consumer Header dari barrel ini.
//     `HeaderBar` di admin layout = component berbeda
//     (PascalCase, subfolder admin/), unrelated.
// ════════════════════════════════════════════════════════════════

export { default as Ticker } from './Ticker';
export { default as BottomNav } from './BottomNav';
