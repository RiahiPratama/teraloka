// ════════════════════════════════════════════════════════════════
// BAKABAR — Halaman Kategori (Tema) v1.0
// PATH: src/app/(public)/bakabar/kategori/[slug]/page.tsx
// ────────────────────────────────────────────────────────────────
// 2 Jun 2026 — Rak TEMA. /bakabar/kategori/politik → semua artikel
// category='politik' dari SELURUH kanal (nasional+daerah+viral).
// Validasi slug via SSoT categories.ts → 404 kalau bukan 1 dari 12 tema.
// Server Component (pola homepage). Filter ?category= sudah didukung backend
// (terbukti dipakai "Artikel Terkait" di halaman [slug]).
// ════════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidCategory, categoryLabel } from '@/lib/categories';
import BakabarArchive, { type ArchiveArticle } from '@/components/bakabar/BakabarArchive';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

async function fetchByCategory(slug: string): Promise<ArchiveArticle[]> {
  try {
    const res = await fetch(
      `${API}/content/articles?category=${encodeURIComponent(slug)}&limit=30`,
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
  if (!isValidCategory(slug)) return { title: 'Kategori tidak ditemukan — BAKABAR' };
  const label = categoryLabel(slug);
  return {
    title: `${label} — BAKABAR Maluku Utara`,
    description: `Kumpulan berita ${label} dari seluruh Maluku Utara di BAKABAR.`,
  };
}

export default async function KategoriPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isValidCategory(slug)) notFound();
  const articles = await fetchByCategory(slug);
  return <BakabarArchive kicker="Kategori" title={categoryLabel(slug)} articles={articles} />;
}
