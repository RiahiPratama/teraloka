import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/operator/', '/owner/', '/api/'],
      },
    ],
    sitemap: 'https://teraloka.com/sitemap.xml',
  };
}
