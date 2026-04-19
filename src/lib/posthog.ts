/**
 * TeraLoka — PostHog Analytics Client (Browser)
 * Phase 2 · Batch 7e3 — Frontend Integration
 * ------------------------------------------------------------
 * PostHog browser client config.
 *
 * Initialization strategy:
 * - Init sekali di client (lazy, hanya di browser)
 * - Guard dengan `typeof window` untuk prevent SSR issues
 * - Auto-capture pageviews + clicks enabled
 * - Session recording DISABLED by default (privacy + cost)
 *   Enable selectively via feature flag kalau butuh
 * - Opt-out capable untuk cookie consent compliance
 *
 * Environment:
 * - NEXT_PUBLIC_POSTHOG_KEY — project API key (phc_...)
 * - NEXT_PUBLIC_POSTHOG_HOST — https://us.i.posthog.com
 *
 * Usage:
 *   import { posthog, initPostHog } from '@/lib/posthog';
 *   initPostHog(); // Panggil di provider
 *
 *   // Capture custom event
 *   posthog.capture('article_clicked', { slug: 'xxx' });
 *
 *   // Identify user (after login)
 *   posthog.identify(user.id, { name, role });
 *
 *   // Reset on logout
 *   posthog.reset();
 */

import posthogJs from 'posthog-js';
import type { PostHog } from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

/**
 * Initialize PostHog client.
 * Safe to call multiple times — only inits once.
 * Call di PostHogProvider mount.
 */
export function initPostHog(): void {
  if (typeof window === 'undefined') return; // SSR guard
  if (initialized) return;
  if (!POSTHOG_KEY) {
    console.warn(
      '[PostHog] NEXT_PUBLIC_POSTHOG_KEY not set — analytics disabled.'
    );
    return;
  }

  posthogJs.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Capture settings
    capture_pageview: true, // Auto-track pageviews
    capture_pageleave: true, // Track ketika user leave (for dwell time)
    // Autocapture: capture clicks, form submits, input changes automatically
    // Ini CRITICAL untuk Distribution Metrics — captures share button clicks, dll
    autocapture: true,
    // Session recording — OFF default (privacy + cost)
    // Bisa enable per-user via feature flag atau posthog.startSessionRecording()
    disable_session_recording: true,
    // Persistence
    persistence: 'localStorage+cookie',
    // Error handling
    loaded: (ph) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[PostHog] Initialized in browser');
        ph.debug(false); // Set true kalau debugging
      }
    },
    // Privacy
    respect_dnt: true, // Respect Do Not Track header
    // Performance
    disable_persistence: false,
    enable_recording_console_log: false,
  });

  initialized = true;
}

/**
 * Re-export the posthog-js client for direct usage.
 * Safe wrappers di usePostHog hook (below).
 */
export const posthog: PostHog = posthogJs;

/**
 * Check apakah PostHog sudah di-init.
 * Useful untuk guard before calling capture/identify.
 */
export function isPostHogReady(): boolean {
  return initialized && typeof window !== 'undefined';
}
