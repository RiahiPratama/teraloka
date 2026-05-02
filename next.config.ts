import type { NextConfig } from "next";

// ════════════════════════════════════════════════════════════════
// TeraLoka Next.js Config
// ────────────────────────────────────────────────────────────────
// Redirect rules: preserve URL backward-compatibility setelah refactor
// May 2, 2026 — Owner BADONASI namespace migration ke /owner/funding/*
//
// Redirect rules ensure:
//   - Pak Budi owner URL bookmark (/owner/campaign/[id]) tetap kerja
//   - External link (whatsapp share, dll) ke owner pages tetap kerja
//   - Permanent (301) — search engine update + browser cache clear
//
// Public URL (/fundraising/[slug]) TIDAK kena impact (path beda).
// ════════════════════════════════════════════════════════════════

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
