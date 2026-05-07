import { type NextRequest, NextResponse } from 'next/server';

// ════════════════════════════════════════════════════════════════
// PROXY (Next.js 16 convention)
// ────────────────────────────────────────────────────────────────
// Renamed dari middleware.ts → proxy.ts (7 Mei 2026, Sprint 1B-B5)
//
// REDIRECT RULES — runtime-based (bukan via next.config.ts redirects())
// ────────────────────────────────────────────────────────────────
// Note: Sprint 1B-B5 awalnya pakai next.config.ts redirects() untuk legacy
// URL backward-compat. Tapi setelah deploy + cache invalidation, rules baru
// gak fire di production (X-Matched-Path: /404). Vercel routes-manifest
// kemungkinan stale untuk rules yang baru ditambah, sementara rules lama
// (/owner/campaign, /reports) tetap jalan.
//
// Solusi: handle redirect baru di proxy.ts (runtime per-request, bypass cache).
// Rules lama tetap di next.config.ts (works fine).
//
// Rules ini akan di-migrate kembali ke next.config.ts kalau Vercel cache
// issue resolved (atomic dengan TD-021 cleanup).
// ════════════════════════════════════════════════════════════════

interface RedirectRule {
  test: (pathname: string) => boolean;
  build: (pathname: string, search: string) => string;
}

const REDIRECTS: RedirectRule[] = [
  // /admin/reports/* → /admin/balapor/* (Sprint 1B-B2 admin URL canonical)
  {
    test: (path) => path === '/admin/reports' || path.startsWith('/admin/reports/'),
    build: (path, search) => `/admin/balapor${path.slice('/admin/reports'.length)}${search}`,
  },

  // /profile/donations → /my-donations (Sprint 1B citizen group migration)
  {
    test: (path) => path === '/profile/donations' || path.startsWith('/profile/donations/'),
    build: (path, search) => `/my-donations${path.slice('/profile/donations'.length)}${search}`,
  },
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Apply first matching redirect rule
  for (const rule of REDIRECTS) {
    if (rule.test(pathname)) {
      const target = rule.build(pathname, search);
      const url = new URL(target, request.url);
      // 308 Permanent Redirect — preserve method (POST etc) + cacheable
      return NextResponse.redirect(url, 308);
    }
  }

  // No redirect match — proceed normally
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
