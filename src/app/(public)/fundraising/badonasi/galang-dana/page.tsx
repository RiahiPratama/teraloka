// ═══════════════════════════════════════════════════════════════
// /fundraising/badonasi/galang-dana  (URL publik — SEO + info penggalang)
//
// Server component (no 'use client') → bisa export metadata.
// Render <CampaignInfoContent> (info, S1) + <CampaignActionCard> (aksi gated, S2a).
// Anon kebaca penuh (info + SEO); aksi gated di dalam (anon → "Login & Lanjut").
//
// 🛡️ Anti-kanibal: title/description fokus "cara & syarat galang dana"
// (penggalang/how-to), BEDA intent dari landing /fundraising/badonasi
// ("Torang Bantu Torang" — donor/emosional). Beda search-intent → no kanibal.
//
// canonical = ABSOLUT via APP_URL (pola bakabar/[slug]). metadataBase root
// SENGAJA tidak ditambah (efek global, out-of-scope).
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import CampaignInfoContent from '@/components/funding/CampaignInfoContent';
import CampaignActionCard from '@/components/funding/CampaignActionCard';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com';
const CANONICAL = `${APP_URL}/fundraising/badonasi/galang-dana`;

export const metadata: Metadata = {
  title: 'Cara Galang Dana di BADONASI — Syarat & Alur Pendaftaran | TeraLoka',
  description:
    'Panduan galang dana untuk warga Maluku Utara: syarat penggalang, verifikasi identitas 1–3 hari, alur pendaftaran 1×24 jam, kategori yang diizinkan, dan kewajiban laporan dana. Mulai campaign-mu di TeraLoka BADONASI.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Cara & Syarat Galang Dana — BADONASI TeraLoka',
    description:
      'Syarat penggalang, alur verifikasi, kategori yang diizinkan, & kewajiban laporan dana di TeraLoka BADONASI.',
    url: CANONICAL,
    siteName: 'TeraLoka',
    locale: 'id_ID',
    type: 'website',
    // images: sengaja dikosongin — belum ada OG raster default (cuma SVG logo). Jangan nunjuk 404.
  },
};

export default function GalangDanaPage() {
  return (
    <CampaignInfoContent>
      <CampaignActionCard />
    </CampaignInfoContent>
  );
}
