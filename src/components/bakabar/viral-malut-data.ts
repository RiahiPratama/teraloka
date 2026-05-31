// ════════════════════════════════════════════════════════════════
// BAKABAR — Viral Maluku Utara (Dummy Data) v1.0
// PATH: src/components/bakabar/viral-malut-data.ts
// ────────────────────────────────────────────────────────────────
// 31 Mei 2026 — Section "Viral Maluku Utara" (kategori ke-3 selain
// Nasional + Daerah). Konten = postingan media sosial yang DIANGKAT
// MANUAL oleh editor (atas izin pemilik) + dikemas jurnalistik.
//
// 🛡️ PENTING: "viral" di sini = LABEL EDITORIAL MANUAL (kategori),
// BUKAN `is_viral` engine engagement (view/share score) di backend.
// Saat nyambung data real nanti: pakai kategori/label editorial
// (mis. category='viral_malut'), JANGAN pakai is_viral.
//
// Status: DUMMY (visual-first). Disambungin ke artikel real belakangan.
// Shape = RegionConfig (reuse RegionSection). layanan_variant/body +
// stack_banner cuma pelengkap tipe (gak dipakai sejak RegionSection v11.0).
// ════════════════════════════════════════════════════════════════

import type { RegionConfig } from './region-data';

export const VIRAL_MALUT: RegionConfig = {
  slug:            'viral-malut',
  label:           'Viral Maluku Utara',
  short_label:     'MalUt',
  gradient_class:  't-viral',
  layanan_variant: 'bakos',          // dummy (tidak dipakai v11.0)
  layanan_body:    '',               // dummy
  featured: {
    id:           'viral-f1',
    title:        'Video Warga Rekam Iring-iringan Lumba-lumba di Perairan Tidore, Tuai Pujian Netizen',
    slug:         'viral-lumba-lumba-tidore',
    category:     'viral',
    published_at: new Date(Date.now() - 43200000).toISOString(),
    source_name:  'BAKABAR Viral',
  },
  trending_list: [
    { id: 'viral-l1', title: 'Aksi Tukang Ojek Antar Ibu Melahirkan ke Puskesmas Jailolo Banjir Apresiasi', slug: 'viral-ojek-jailolo', category: 'viral', published_at: new Date(Date.now() - 86400000).toISOString(), source_name: 'BAKABAR Viral', thumb_class: 'thumb-8' },
    { id: 'viral-l2', title: 'Penjual Pisang Goreng di Ternate Viral Usai Layani Pembeli Pakai Bahasa Isyarat', slug: 'viral-pisang-goreng-isyarat', category: 'viral', published_at: new Date(Date.now() - 172800000).toISOString(), source_name: 'BAKABAR Viral', thumb_class: 'thumb-2' },
    { id: 'viral-l3', title: 'Bocah Sofifi Kembalikan Dompet Berisi Jutaan Rupiah, Aksinya Dipuji Warganet', slug: 'viral-bocah-dompet-sofifi', category: 'viral', published_at: new Date(Date.now() - 259200000).toISOString(), source_name: 'BAKABAR Viral', thumb_class: 'thumb-3' },
    { id: 'viral-l4', title: 'Tarian Soya-soya Pelajar Tidore di Acara Sekolah Tembus Jutaan Tayangan', slug: 'viral-soya-soya-tidore', category: 'viral', published_at: new Date(Date.now() - 345600000).toISOString(), source_name: 'BAKABAR Viral', thumb_class: 'thumb-4' },
    { id: 'viral-l5', title: 'Nelayan Morotai Bagikan Hasil Tangkapan Gratis ke Tetangga, Videonya Menyentuh', slug: 'viral-nelayan-morotai', category: 'viral', published_at: new Date(Date.now() - 432000000).toISOString(), source_name: 'BAKABAR Viral', thumb_class: 'thumb-5' },
    { id: 'viral-l6', title: 'Warung Kopi Tua di Bacan Jadi Spot Favorit Wisatawan Usai Viral di TikTok', slug: 'viral-warung-kopi-bacan', category: 'viral', published_at: new Date(Date.now() - 518400000).toISOString(), source_name: 'BAKABAR Viral', thumb_class: 'thumb-7' },
    { id: 'viral-l7', title: 'Pemuda Halmahera Sulap Sampah Pesisir Jadi Kerajinan, Diborong Pembeli Luar Daerah', slug: 'viral-kerajinan-sampah-halmahera', category: 'viral', published_at: new Date(Date.now() - 604800000).toISOString(), source_name: 'BAKABAR Viral', thumb_class: 'thumb-6' },
  ],
  stack_banner: {                    // dummy (tidak dipakai v11.0)
    brand_class: 'b-none',
    overline:    '',
    title:       '',
    body:        '',
    cta_label:   '',
  },
};
