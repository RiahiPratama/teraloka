'use client';

// ════════════════════════════════════════════════════════════════
// CONDITIONAL CHROME (v3 — 12 Jun 2026) — IMMERSIVE MOBILE ONLY
// ────────────────────────────────────────────────────────────────
// Client wrapper yang HANYA mengatur tampil/sembunyi chrome global
// (Ticker/Navbar/CategoryTabs/Footer) per-path. Default: tampil semua.
// Di immersive slug (/bakos/<slug>): chrome HILANG hanya di mobile
// (≤979px) via CSS — desktop tetap utuh.
//
// ⚠️ ARSITEKTUR (PENTING — kenapa pakai PROPS, bukan import):
//   Ticker/Navbar/Footer adalah **async Server Components** (fetch di
//   server). Client Component TIDAK BOLEH meng-import Server Component
//   (memaksa jadi client → "async Client Component" error). Solusi
//   resmi Next.js: Server Component dioper sebagai PROPS/children ke
//   Client Component. Jadi layout.tsx (server) yang me-render chrome,
//   wrapper ini cuma membungkus + memberi penanda data-immersive.
//
// MEKANISME MOBILE-ONLY:
//   data-immersive="true" → CSS @media(max-width:979px) sembunyikan
//   .bk-chrome-top/.bk-chrome-foot + nolin .bk-chrome-pad. (globals.css
//   blok BK-IMMERSIVE.) Desktop ≥980px tak terpengaruh.
//
// REUSABLE: slug layanan lain → tambah regex ke IMMERSIVE_DETAIL_PATTERNS.
// ════════════════════════════════════════════════════════════════

import { usePathname } from 'next/navigation';

const IMMERSIVE_DETAIL_PATTERNS: RegExp[] = [
  /^\/bakos\/(?!cari(?:\/|$))[^/]+\/?$/,   // BAKOS detail kos (bukan /bakos & /bakos/cari)
  // (future) /balapor/<slug>, /badonasi/<slug> → tambah di sini
];

function isImmersive(pathname: string): boolean {
  return IMMERSIVE_DETAIL_PATTERNS.some((re) => re.test(pathname));
}

export function PublicChrome({
  topChrome,
  categoryTabs,
  footer,
  children,
}: {
  topChrome: React.ReactNode;   // <Ticker/><Navbar/> (Server Components, dari layout)
  categoryTabs: React.ReactNode; // <CategoryTabs/> (Server Component, dari layout)
  footer: React.ReactNode;       // <Footer/> (Server Component, dari layout)
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const immersive = isImmersive(pathname);

  return (
    <div data-immersive={immersive ? 'true' : undefined}>
      <div className="bk-chrome-top">{topChrome}</div>
      <div className="bk-chrome-pad" style={{ paddingTop: 72 }}>
        <div className="bk-chrome-top">{categoryTabs}</div>
        <main className="pb-nav">{children}</main>
      </div>
      <div className="bk-chrome-foot">{footer}</div>
    </div>
  );
}
