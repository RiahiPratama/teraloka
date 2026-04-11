import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teraloka.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '', '/news', '/reports', '/speed', '/ferry', '/ship', '/pelni',
    '/kos', '/property', '/vehicle', '/services', '/fundraising',
    '/events', '/bills', '/login',
  ];

  return staticPages.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.8,
  }));
}
