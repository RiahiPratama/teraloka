// ════════════════════════════════════════════════════════════════
// BAKABAR — Halaman Kanal (Asal) v1.0
// PATH: src/app/(public)/bakabar/kanal/[slug]/page.tsx
// ────────────────────────────────────────────────────────────────
// 2 Jun 2026 — Rak ASAL. Tiga jenis:
//   • nasional → ?source=rss      (terbukti dipakai homepage)
//   • viral    → ?source=social   (artikel medsos yg diangkat editor; bukan is_viral engine)
//   • daerah   → ?location=<slug> (11 kab/kota, slug dari REGIONS)
// Validasi slug via REGIONS + 'viral' → 404 kalau bukan kanal sah.
// Server Component.
// ════════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BakabarArchive, { type ArchiveArticle } from '@/components/bakabar/BakabarArchive';
import { REGIONS } from '@/components/bakabar/region-data';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// Kanal asal non-geografis (di luar REGIONS daerah)
const SPECIAL: Record<string, { label: string; query: string }> = {
  nasional: { label: 'Berita Nasional',       query: 'type=nasional' },
  viral:    { label: 'Viral Maluku Utara',    query: 'source=social' },
};

function resolveKanal(slug: string): { label: string; query: string } | null {
  if (SPECIAL[slug]) return SPECIAL[slug];
  // daerah (exclude 'nasional' yg sudah di SPECIAL)
  const region = REGIONS.find((r) => r.slug === slug && r.slug !== 'nasional');
  if (region) return { label: region.label, query: `location=${encodeURIComponent(slug)}` };
  return null;
}

async function fetchKanal(query: string): Promise<ArchiveArticle[]> {
  try {
    const res = await fetch(
      `${API}/content/articles?${query}&limit=30`,
      { next: { revalidate: 60 } },
    );
    const data = await res.json();
    return data?.success ? (data.data ?? []) : [];
  } catch {
    return [];
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const k = resolveKanal(slug);
  if (!k) return { title: 'Kanal tidak ditemukan — BAKABAR' };
  return {
    title: `${k.label} — BAKABAR Maluku Utara`,
    description: `Kumpulan berita ${k.label} di BAKABAR.`,
  };
}

export default async function KanalPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const k = resolveKanal(slug);
  if (!k) notFound();
  const articles = await fetchKanal(k.query);
  return <BakabarArchive kicker="Kanal" title={k.label} articles={articles} />;
}
