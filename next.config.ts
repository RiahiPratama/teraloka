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
// May 7, 2026 — Sprint 1B-B5: redirect /admin/reports + /profile/donations
//               di-handle di src/proxy.ts (runtime) karena Vercel routes-
//               manifest cache stale untuk rules baru.
// May 14, 2026 — Sprint 2A Batch 1: route migration /news → /bakabar.
//               Mengikuti pola refactor /reports → /balapor — folder
//               sekarang RENAMED (bukan rewrite) jadi URL public 1:1
//               dengan brand BAKABAR. Pola brand-aligned routing.
// May 20, 2026 — SESI 5H Phase 1.7: sponsored migration ke nested route.
//               /sponsored/* → /bakabar/sponsored/* (semantic alignment:
//               advertorial = konten mitra BAKABAR). Editorial-ADS Firewall
//               preserved via URL distinction. Backend endpoint
//               /public/sponsored/${slug} TIDAK berubah (API contract).
//
// Architectural philosophy LOCKED:
//   📁 Folder code = URL public 1:1 untuk service yang sudah mature
//      brand-nya (BAKABAR, BALAPOR ke depan)
//   🪟 Rewrite tetap berlaku untuk migration parsial (transisi)
//
// ════════════════════════════════════════════════════════════════

const nextConfig: NextConfig = {
  // ════════════════════════════════════════════════════════════════
  // REDIRECTS (308 permanent — URL lama → URL baru)
  // ════════════════════════════════════════════════════════════════
  async redirects() {
    return [
      // ─── /owner/campaign/* → /owner/funding/campaigns/* ────────
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

      // ─── /news → /bakabar (BAKABAR refactor, May 14, 2026) ─────
      // Sprint 2A Batch 1 — brand consistency:
      //   - Admin sudah brand "BAKABAR Command Center" sejak lama
      //   - Public URL `/news` jadi `/bakabar` untuk match
      //   - Folder src/app/(public)/news/ RENAMED ke bakabar/
      //   - 308 permanent — SEO juice preserved, bookmark/share warga
      //     yang udah tersebar tetap jalan via redirect
      //
      // Backward compat:
      //   - WhatsApp shares yang udah tersebar (pakai /news/[slug])
      //   - Browser bookmarks user
      //   - Screenshots yang udah beredar
      //   - Sitemap Google Search yang udah indexed
      {
        source: '/news/:path*',
        destination: '/bakabar/:path*',
        permanent: true,
      },
      {
        source: '/news',
        destination: '/bakabar',
        permanent: true,
      },

      // ─── /sponsored → /bakabar/sponsored (SESI 5H, May 20, 2026) ─
      // Phase 1.7 folder migration — advertorial = konten mitra BAKABAR.
      //   - Folder src/app/(public)/sponsored/ RENAMED ke bakabar/sponsored/
      //   - Word "sponsored" PRESERVED di URL (industry-standard signal)
      //   - Editorial-ADS Firewall: URL distinction tambahan layer guard
      //   - 308 permanent — preserve SEO juice + bookmark/share warga
      //
      // Backward compat:
      //   - Existing advertorial yang sudah pernah live di /sponsored/[slug]
      //   - WhatsApp shares yang sudah tersebar
      //   - Klien iklan yang sudah notice URL lama
      //   - Internal hardcoded link (sudah di-update di code,
      //     redirect ini untuk external traffic)
      {
        source: '/sponsored/:path*',
        destination: '/bakabar/sponsored/:path*',
        permanent: true,
      },
      {
        source: '/sponsored',
        destination: '/bakabar/sponsored',
        permanent: true,
      },
    ];
  },

  // ════════════════════════════════════════════════════════════════
  // REWRITES (URL aliasing — URL public → folder generic)
  // ────────────────────────────────────────────────────────────────
  // History:
  //   - May 3, 2026: /balapor → /reports (rewrite, folder name TETAP)
  //   - May 14, 2026: /balapor TETAP rewrite ke folder /reports
  //     (BAKABAR migrate via RENAME, BALAPOR migrate via REWRITE —
  //      strategi beda karena BAKABAR siap full migrate, BALAPOR
  //      masih ada aspek admin route reuse)
  // ════════════════════════════════════════════════════════════════
  async rewrites() {
    return [
      // ─── /balapor → /reports (BALAPOR pilot, dipertahankan) ────
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
