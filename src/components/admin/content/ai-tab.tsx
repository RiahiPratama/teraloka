'use client';

/**
 * TeraLoka — Tab "AI" (dashboard /admin/content, super_admin-only)
 * ------------------------------------------------------------
 * RUMAH fungsi AI editorial BAKABAR. Kontainer EXTENSIBLE: tiap fungsi AI =
 * 1 section (Card mandiri) di-stack vertikal. Nambah fungsi AI baru (mis.
 * Viral Radar, AI History) = buat section-nya lalu render di sini — TANPA
 * rombak struktur.
 *
 *   <AiTab>
 *     ├─ <AiDeskSection/>        ← AI Desk (panjang → ringkas + kategori)
 *     ├─ <AiPenulisSection/>     ← AI Penulis (bahan mentah → draft editorial)
 *     ├─ (nanti) <ViralRadarSection/>
 *     └─ (nanti) <AiHistorySection/>
 *
 * Gating super_admin sudah di page.tsx (activeTab === 'ai' && isSuperAdmin),
 * jadi komponen ini tidak perlu cek role lagi.
 */

import { AiDeskSection } from './ai-desk-section';
import { AiPenulisSection } from './ai-penulis-section';

export function AiTab() {
  return (
    <div className="space-y-6">
      {/* Tambah <SectionAiLain /> di bawah sini saat fungsi baru siap. */}
      <AiDeskSection />
      <AiPenulisSection />
    </div>
  );
}
