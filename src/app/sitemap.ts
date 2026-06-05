import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com';

// 14 Mei 2026 — Sprint 2A Batch 1:
//   - /news → /bakabar (route rename, full migration)
//   - /reports → /balapor (URL public yang aktif via rewrite, sitemap diupdate
//     untuk signal canonical ke Google Search Console — biar indexing pakai
//     URL public yang branded, bukan folder code generic)
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '', '/bakabar', '/balapor', '/speed', '/ferry', '/ship', '/pelni',
    '/bakos', '/property', '/vehicle', '/services', '/fundraising',
    '/events', '/bills', '/login',
  ];

  return staticPages.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.8,
  }));
}
