'use client';

/**
 * TeraLoka — /admin/ads/[id]/edit
 * Mission 8 Sub-Phase 8-B (α / Batch 1)
 * ------------------------------------------------------------
 * Route page untuk edit iklan existing.
 *
 * Next.js 16 App Router convention:
 *   - File: src/app/admin/ads/[id]/edit/page.tsx
 *   - URL:  /admin/ads/<uuid>/edit
 *
 * Dynamic segment:
 *   - [id] = dynamic route param
 *   - Contoh: /admin/ads/7606e879-ffe3-47fb-8e31-c8e4f0a5bb15/edit
 *   - useParams() extract id dari URL
 *
 * Component:
 *   - Render <AdFormPage editingAdId={id} />
 *   - Form auto-fetch existing ad via GET /admin/ads/detail/:id
 *   - Submit PUT /admin/ads/admin-update/:id
 */

import { useParams } from 'next/navigation';
import AdFormPage from '@/components/admin/ads/AdFormPage';

export default function EditAdPage() {
  const params = useParams<{ id: string }>();
  return <AdFormPage editingAdId={params?.id ?? null} />;
}
