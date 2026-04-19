'use client';

/**
 * TeraLoka — PostHogProvider (v3 — internal Suspense)
 * Phase 2 · Batch 7e3 — Frontend Integration
 * ------------------------------------------------------------
 * Split architecture:
 * - PostHogProvider: handle init + render children. No Suspense needed.
 * - PostHogPageviewTracker: internal component pakai useSearchParams,
 *   wrapped dalam Suspense. Init sudah jalan di parent, jadi tracker
 *   cuma tambah pageview capture on route change.
 *
 * Kenapa split begini:
 * - useSearchParams butuh Suspense boundary di App Router
 * - Tapi init ga butuh search params
 * - Dengan split, init tetap jalan walau Suspense suspend tracker
 * - Suspense internal biar consumer (layout.tsx) simple
 */

import { Suspense, useEffect, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, posthog, isPostHogReady } from '@/lib/posthog';

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  console.log('[PostHogProvider] Rendering...');

  // Init PostHog — tidak ada dependency ke search params,
  // jadi tidak butuh Suspense
  useEffect(() => {
    console.log('[PostHogProvider] Mount effect triggered');
    console.log(
      '[PostHogProvider] NEXT_PUBLIC_POSTHOG_KEY:',
      process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'SET' : 'NOT SET'
    );
    console.log(
      '[PostHogProvider] NEXT_PUBLIC_POSTHOG_HOST:',
      process.env.NEXT_PUBLIC_POSTHOG_HOST || 'default (us.i.posthog.com)'
    );
    initPostHog();
  }, []);

  return (
    <>
      {/* Pageview tracker — wrapped in Suspense karena useSearchParams */}
      <Suspense fallback={null}>
        <PostHogPageviewTracker />
      </Suspense>
      {children}
    </>
  );
}

/**
 * Internal: tracks pageview on route change.
 * Pakai useSearchParams — butuh Suspense boundary dari parent.
 */
function PostHogPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isPostHogReady()) {
      console.log('[PostHogPageviewTracker] PostHog not ready yet, skipping pageview');
      return;
    }
    if (!pathname) return;

    let url = window.location.origin + pathname;
    const search = searchParams?.toString();
    if (search) url += `?${search}`;

    console.log('[PostHogPageviewTracker] Capture $pageview:', url);
    posthog.capture('$pageview', { $current_url: url, pathname });
  }, [pathname, searchParams]);

  return null;
}
