export interface Service {
  name: string
  sub: string
  href: string
  iconPath: string
  carouselBg: string
  carouselStroke: string
  gridBg: string
  gridBorder: string
  gridStroke: string
}

// ────────────────────────────────────────────────────────────────
// TERALOKA SERVICE TAXONOMY (4-tier hierarchy)
// ────────────────────────────────────────────────────────────────
//
// TIER 1 — BA-Suite (core brand identity, BA-prefix services):
//   BAKABAR, BALAPOR, BADONASI, BAANTAR
//
// TIER 2 — Marketplace (revenue engine, hunian + aset):
//   BAKOS, Properti, Kendaraan, Bajasa
//
// TIER 3 — Mobilitas Laut (water palette gradient):
//   Speedboat, Kapal Lokal, Feri, Pelni
//
// TIER 4 — Lifestyle (modern utility):
//   BAWIFI, PPOB, Event
//
// ────────────────────────────────────────────────────────────────

export const SERVICES: Service[] = [
  // ═══════════════════════════════════════════════
  // TIER 1 — BA-SUITE (brand identity bold)
  // ═══════════════════════════════════════════════

  // 1. BAKABAR — Berita Lokal (indigo: authority, info)
  {
    name: 'BAKABAR',
    sub: 'Berita Lokal',
    href: '/bakabar',
    iconPath: 'M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2M18 14h-8M15 18h-5M10 6h8v4h-8Z',
    carouselBg: 'rgba(79,70,229,0.08)',
    carouselStroke: '#4F46E5',
    gridBg: 'rgba(79,70,229,0.07)',
    gridBorder: 'rgba(79,70,229,0.12)',
    gridStroke: '#4F46E5',
  },

  // 2. BALAPOR — Laporan Publik (red: urgency, action)
  {
    name: 'BALAPOR',
    sub: 'Laporan Publik',
    href: '/balapor',
    iconPath: 'm3 11 19-9-9 19-2-8-8-2z',
    carouselBg: 'rgba(220,38,38,0.08)',
    carouselStroke: '#DC2626',
    gridBg: 'rgba(220,38,38,0.07)',
    gridBorder: 'rgba(220,38,38,0.12)',
    gridStroke: '#DC2626',
  },

  // 3. BADONASI — Donasi Kemanusiaan (pink: care, warmth)
  {
    name: 'BADONASI',
    sub: 'Donasi Kemanusiaan',
    href: '/fundraising',
    iconPath: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    carouselBg: 'rgba(236,72,153,0.1)',
    carouselStroke: '#EC4899',
    gridBg: 'rgba(236,72,153,0.09)',
    gridBorder: 'rgba(236,72,153,0.12)',
    gridStroke: '#EC4899',
  },

  // 4. BAANTAR — Kurir & Antar Barang (orange: speed, energy) — COMING SOON
  {
    name: 'BAANTAR',
    sub: 'Kurir & Antar Barang',
    href: '/baantar',
    iconPath: 'M2 19h12 M14 19h6v-3.4l-2-3.6h-4v7z M5.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M16.5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M14 14V7H7v7 M9 7l3-3 M2 11h6',
    carouselBg: 'rgba(249,115,22,0.1)',
    carouselStroke: '#F97316',
    gridBg: 'rgba(249,115,22,0.09)',
    gridBorder: 'rgba(249,115,22,0.12)',
    gridStroke: '#F97316',
  },

  // ═══════════════════════════════════════════════
  // TIER 2 — MARKETPLACE (hunian, aset, jasa)
  // ═══════════════════════════════════════════════

  // 5. BAKOS — Kos-Kosan (emerald: home, settled)
  {
    name: 'BAKOS',
    sub: 'Kos-Kosan',
    href: '/bakos',
    iconPath: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    carouselBg: 'rgba(5,150,105,0.1)',
    carouselStroke: '#059669',
    gridBg: 'rgba(5,150,105,0.09)',
    gridBorder: 'rgba(5,150,105,0.12)',
    gridStroke: '#059669',
  },

  // 6. Properti — Jual Beli Sewa (cyan: real estate, sky/sea)
  {
    name: 'Properti',
    sub: 'Jual Beli Sewa',
    href: '/properti',
    iconPath: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2',
    carouselBg: 'rgba(8,145,178,0.1)',
    carouselStroke: '#0891B2',
    gridBg: 'rgba(8,145,178,0.09)',
    gridBorder: 'rgba(8,145,178,0.12)',
    gridStroke: '#0891B2',
  },

  // 7. Kendaraan — Sewa & Jual (violet: premium mobility)
  {
    name: 'Kendaraan',
    sub: 'Sewa & Jual',
    href: '/kendaraan',
    iconPath: 'M1 3h15a1 1 0 0 1 1 1v9H1V4a1 1 0 0 1 0 0z M16 8h4l3 3v5h-7V8Z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    carouselBg: 'rgba(124,58,237,0.1)',
    carouselStroke: '#7C3AED',
    gridBg: 'rgba(124,58,237,0.09)',
    gridBorder: 'rgba(124,58,237,0.12)',
    gridStroke: '#7C3AED',
  },

  // 8. Bajasa — Tukang & Teknisi (pink-700: service helpful)
  {
    name: 'Bajasa',
    sub: 'Tukang & Teknisi',
    href: '/bajasa',
    iconPath: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
    carouselBg: 'rgba(219,39,119,0.1)',
    carouselStroke: '#DB2777',
    gridBg: 'rgba(219,39,119,0.09)',
    gridBorder: 'rgba(219,39,119,0.12)',
    gridStroke: '#DB2777',
  },

  // ═══════════════════════════════════════════════
  // TIER 3 — MOBILITAS LAUT (water palette gradient)
  // ═══════════════════════════════════════════════

  // 9. Speedboat — Antar Pulau Cepat (cyan-500: surface fast)
  {
    name: 'Speedboat',
    sub: 'BAPASIAR Speed',
    href: '/bapasiar/speedboat',
    iconPath: 'M2 16c3-3.5 7-5 12-4.5l7 1.5-1 5H2z M2 16h20 M3 19.5c4.5-1 9-1 13 0',
    carouselBg: 'rgba(6,182,212,0.1)',
    carouselStroke: '#06B6D4',
    gridBg: 'rgba(6,182,212,0.09)',
    gridBorder: 'rgba(6,182,212,0.12)',
    gridStroke: '#06B6D4',
  },

  // 10. Kapal Lokal — Overnight Multi-stop (cyan-600: mid-water)
  {
    name: 'Kapal Lokal',
    sub: 'Overnight Multi-stop',
    href: '/bapasiar/kapal-lokal',
    iconPath: 'M3 18l2-7h14l2 7H3z M12 11V4 M12 4 L7 9 M12 4 L17 8 M2 21 Q12 19 22 21',
    carouselBg: 'rgba(8,145,178,0.1)',
    carouselStroke: '#0891B2',
    gridBg: 'rgba(8,145,178,0.09)',
    gridBorder: 'rgba(8,145,178,0.12)',
    gridStroke: '#0891B2',
  },

  // 11. Feri — Antar Pulau Reguler (cyan-700: deeper)
  {
    name: 'Feri',
    sub: 'BAPASIAR Feri',
    href: '/bapasiar/feri',
    iconPath: 'M1 13h22v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-6z M4 13V9h16v4 M9 9V6h6v3 M1 19h22 M7 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M17 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    carouselBg: 'rgba(14,116,144,0.1)',
    carouselStroke: '#0E7490',
    gridBg: 'rgba(14,116,144,0.09)',
    gridBorder: 'rgba(14,116,144,0.12)',
    gridStroke: '#0E7490',
  },

  // 12. Pelni — Info & Jadwal (cyan-800: deep ocean)
  {
    name: 'Pelni',
    sub: 'Info & Jadwal',
    href: '/bapasiar/pelni',
    iconPath: 'M2 17l2-6h16l2 6H2z M5 11V7h14v4 M10 7V4 M14 7V4 M1 20 Q12 18 23 20',
    carouselBg: 'rgba(21,94,117,0.1)',
    carouselStroke: '#155E75',
    gridBg: 'rgba(21,94,117,0.09)',
    gridBorder: 'rgba(21,94,117,0.12)',
    gridStroke: '#155E75',
  },

  // ═══════════════════════════════════════════════
  // TIER 4 — LIFESTYLE (modern utility)
  // ═══════════════════════════════════════════════

  // 13. BAWIFI — Internet & WiFi (indigo-500: connectivity) — COMING SOON
  {
    name: 'BAWIFI',
    sub: 'Internet & WiFi',
    href: '/bawifi',
    iconPath: 'M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01',
    carouselBg: 'rgba(99,102,241,0.1)',
    carouselStroke: '#6366F1',
    gridBg: 'rgba(99,102,241,0.09)',
    gridBorder: 'rgba(99,102,241,0.12)',
    gridStroke: '#6366F1',
  },

  // 14. PPOB — Bayar Tagihan (violet-500: utility modern)
  {
    name: 'PPOB',
    sub: 'Bayar Tagihan',
    href: '/ppob',
    iconPath: 'M2 3h20a0 0 0 0 1 0 0v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3z M8 21h8 M12 17v4',
    carouselBg: 'rgba(139,92,246,0.1)',
    carouselStroke: '#8B5CF6',
    gridBg: 'rgba(139,92,246,0.09)',
    gridBorder: 'rgba(139,92,246,0.12)',
    gridStroke: '#8B5CF6',
  },

  // 15. Event — Tiket Lokal (amber: energy fun)
  {
    name: 'Event',
    sub: 'Tiket Lokal',
    href: '/event',
    iconPath: 'M3 4h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18',
    carouselBg: 'rgba(245,158,11,0.1)',
    carouselStroke: '#F59E0B',
    gridBg: 'rgba(245,158,11,0.09)',
    gridBorder: 'rgba(245,158,11,0.12)',
    gridStroke: '#F59E0B',
  },
]
