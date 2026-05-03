import type { NextConfig } from "next";

// ════════════════════════════════════════════════════════════════
// TeraLoka Next.js Config
// ────────────────────────────────────────────────────────────────
// REDIRECTS: preserve URL backward-compatibility setelah refactor
// REWRITES:  URL aliasing untuk filosofi "DAPUR vs ETALASE"
//            (folder code generic, URL public branded)
//
// History:
// May 2, 2026 — Owner BADONASI namespace migration ke /owner/funding/*
// May 3, 2026 — BALAPOR pilot: URL public /balapor (folder TETAP /reports)
//
// Architectural philosophy locked:
//   📁 DAPUR (folder/code): src/app/(public)/reports/page.tsx
//   🪟 ETALASE (URL public): /balapor
//   ↑ Decoupled via rewrites() — brand layer ≠ engineering layer
//
// Public URL (/fundraising/[slug]) TIDAK kena impact (path beda).
// ════════════════════════════════════════════════════════════════

const nextConfig: NextConfig = {
  // ════════════════════════════════════════════════════════════════
  // REDIRECTS (308 permanent — URL lama → URL baru)
  // ════════════════════════════════════════════════════════════════
  async redirects() {
    return [
      // ─── /owner/campaign/* → /owner/funding/campaigns/* ────────
      // Match nested paths first (more specific), Next.js handles order
      {
        source: '/owner/campaign/:path*',
        destination: '/owner/funding/campaigns/:path*',
        permanent: true,
      },
      {
        source: '/owner/campaign',
        destination: '/owner/funding/campaigns',
        permanent: true,
      },

      // ─── /owner/donations → /owner/funding/donations ───────────
      {
        source: '/owner/donations/:path*',
        destination: '/owner/funding/donations/:path*',
        permanent: true,
      },
      {
        source: '/owner/donations',
        destination: '/owner/funding/donations',
        permanent: true,
      },

      // ─── /owner/financial → /owner/funding/financial ───────────
      {
        source: '/owner/financial/:path*',
        destination: '/owner/funding/financial/:path*',
        permanent: true,
      },
      {
        source: '/owner/financial',
        destination: '/owner/funding/financial',
        permanent: true,
      },

      // ─── /reports → /balapor (BALAPOR pilot, May 3, 2026) ──────
      // Public URL alias — backward compat untuk:
      //   - WhatsApp shares yang udah tersebar
      //   - Browser bookmarks user
      //   - Screenshots dengan URL /reports
      //   - Internal links (Navbar, Footer, Hero, dll yang masih
      //     pakai /reports — sengaja TIDAK diubah, biar single
      //     source of truth = next.config.ts ini)
      {
        source: '/reports/:path*',
        destination: '/balapor/:path*',
        permanent: true,
      },
      {
        source: '/reports',
        destination: '/balapor',
        permanent: true,
      },
    ];
  },

  // ════════════════════════════════════════════════════════════════
  // REWRITES (URL aliasing — URL public → folder generic)
  // ────────────────────────────────────────────────────────────────
  // Mechanism:
  //   1. User akses /balapor (URL bar tampil /balapor)
  //   2. Next.js internal serve dari src/app/(public)/reports/page.tsx
  //   3. URL bar TETAP /balapor (no redirect, no flash)
  //
  // Pattern execution order (Next.js):
  //   redirects → rewrites → file system routes
  //   ↓
  //   /reports request → redirect to /balapor → rewrite to serve /reports
  //   ↓
  //   Result: URL bar = /balapor, content from /reports/page.tsx ✅
  //
  // Future expansion (post-BALAPOR pilot success):
  //   /bakabar  → /news        (BAKABAR — berita)
  //   /badonasi → /fundraising (BADONASI — donasi)
  //   /bapasiar → /speed       (BAPASIAR — speedboat)
  //   /bakos    → /kos         (BAKOS — kos-kosan)
  // ════════════════════════════════════════════════════════════════
  async rewrites() {
    return [
      // ─── /balapor → /reports (BALAPOR pilot) ────────────────────
      // Specific path first, then catch-all subpaths
      {
        source: '/balapor',
        destination: '/reports',
      },
      {
        source: '/balapor/:path*',
        destination: '/reports/:path*',
      },
    ];
  },
};

export default nextConfig;
