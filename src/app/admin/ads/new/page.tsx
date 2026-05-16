'use client';

/**
 * TeraLoka — /admin/ads/new
 * Mission 8 Sub-Phase 8-B (α / Batch 1)
 * ------------------------------------------------------------
 * Route page untuk create iklan baru.
 *
 * Next.js 16 App Router convention:
 *   - File: src/app/admin/ads/new/page.tsx
 *   - URL:  /admin/ads/new
 *
 * Component:
 *   - Render <AdFormPage /> tanpa editingAdId
 *   - Form kosong, submit POST /admin/ads/admin-create
 */

import AdFormPage from '@/components/admin/ads/AdFormPage';

export default function NewAdPage() {
  return <AdFormPage />;
}
