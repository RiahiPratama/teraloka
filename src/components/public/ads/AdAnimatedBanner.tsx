/**
 * AdAnimatedBanner — GSAP-powered animated banner for ad_format='animated'
 * SESI 5H Phase 2-5A.7 (20-21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/public/ads/AdAnimatedBanner.tsx
 *
 * Features:
 *   ✅ Animation engine (6 patterns: fade_in/out, slide_in, text_reveal, scale, stagger_group)
 *   ✅ Lifecycle management (GSAP context + explicit phases + cleanup discipline)
 *   ✅ IntersectionObserver replay-on-scroll (play-once + replay)
 *   ✅ Static fallback (prefers-reduced-motion + slow-network)
 *   ✅ Editorial-ADS Firewall structure (IKLAN badge + amber tint + disclaimer + border)
 *   ✅ Phase 5A.7: Dynamic dimensions (width/height props, MPU default)
 *
 * Patterns: PPP (lazy load), QQQ (reduce-motion respect), RRR (timeline schema)
 * ────────────────────────────────────────────────────────────────
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { gsap } from 'gsap';

import {
  loadGsap,
  shouldUseStaticFallback,
  type StaticFallbackReason,
} from '@/lib/ads/gsap-loader';
import {
  applyFadeIn,
  applyFadeOut,
  applyFadeStatic,
} from '@/components/public/ads/animations/fade';
import {
  applySlideIn,
  applySlideStatic,
} from '@/components/public/ads/animations/slide';
import {
  applyTextReveal,
  applyTextRevealStatic,
} from '@/components/public/ads/animations/text-reveal';
import {
  applyScaleIn,
  applyScaleStatic,
} from '@/components/public/ads/animations/scale';
import {
  applyStaggerGroup,
  applyStaggerGroupStatic,
} from '@/components/public/ads/animations/stagger-group';

// ════════════════════════════════════════════════════════════════
// TIMELINE JSON SCHEMA (Pattern RRR)
// ════════════════════════════════════════════════════════════════

export type AnimationPattern =
  | 'fade_in'
  | 'fade_out'
  | 'slide_in'
  | 'text_reveal'
  | 'scale'
  | 'stagger_group';

export interface AnimationStep {
  target_selector: string;
  pattern:         AnimationPattern;
  delay:           number;
  duration:        number;
  from?:           'left' | 'right' | 'top' | 'bottom';
  distance?:       number;
  unit?:           'char' | 'word';
  stagger?:        number;
  ease?:           string;
  from_scale?:     number;
  y_offset?:       number;
}

export interface AnimationTimelineConfig {
  duration_ms: number;
  loop:        boolean;
  steps:       AnimationStep[];
}

// ════════════════════════════════════════════════════════════════
// AD DATA SHAPE
// ════════════════════════════════════════════════════════════════

export interface AnimatedBannerAd {
  id: string;
  slug?: string | null;
  title: string;
  body?: string | null;
  image_url?: string | null;
  link_url: string;
  advertiser_name: string;
  advertiser_logo_url?: string | null;
  disclaimer_text?: string | null;
  animation_timeline: AnimationTimelineConfig;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ════════════════════════════════════════════════════════════════

export interface AdAnimatedBannerProps {
  ad: AnimatedBannerAd;
  className?: string;
  onClick?: (adId: string) => void;
  /**
   * SESI 5H Phase 5A.7: Dynamic dimensions per position.
   * Default MPU 300×250 untuk backward compat.
   *
   * Examples per position:
   *   - top_leaderboard: 888 × 220 (Top Billboard horizontal 4:1)
   *   - sidebar:         300 × 250 (MPU square-ish)
   *   - in_article:      640 × 360 (Mid-article 16:9)
   */
  width?: number;
  height?: number;
}

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const DEFAULT_WIDTH      = 300;
const DEFAULT_HEIGHT     = 250;
const REPLAY_THRESHOLD   = 0.5;
const REPLAY_ROOT_MARGIN = '0px 0px -50px 0px';

// ════════════════════════════════════════════════════════════════
// ANIMATION ENGINE
// ════════════════════════════════════════════════════════════════

interface BuildTimelineParams {
  gsapInstance: typeof import('gsap');
  containerEl:  HTMLElement;
  config:       AnimationTimelineConfig;
}

interface BuiltTimeline {
  timeline: gsap.core.Timeline;
  context:  gsap.Context;
}

function preSetInitialState(
  gsapInstance: typeof import('gsap'),
  containerEl:  HTMLElement,
  config:       AnimationTimelineConfig,
): void {
  for (const step of config.steps) {
    const targetEl = containerEl.querySelector<HTMLElement>(step.target_selector);
    if (!targetEl) continue;

    switch (step.pattern) {
      case 'fade_in':
      case 'slide_in':
      case 'text_reveal':
        gsapInstance.gsap.set(targetEl, { opacity: 0 });
        break;
      case 'fade_out':
        gsapInstance.gsap.set(targetEl, { opacity: 1 });
        break;
      case 'scale':
        gsapInstance.gsap.set(targetEl, { opacity: 0, scale: 0.8 });
        break;
      case 'stagger_group':
        gsapInstance.gsap.set(targetEl.children, { opacity: 0, y: 12 });
        break;
      default:
        break;
    }
  }
}

function buildAnimationTimeline({
  gsapInstance,
  containerEl,
  config,
}: BuildTimelineParams): BuiltTimeline {
  let tl: gsap.core.Timeline | null = null;

  const ctx = gsapInstance.gsap.context(() => {
    preSetInitialState(gsapInstance, containerEl, config);

    tl = gsapInstance.gsap.timeline({
      paused: true,
      repeat: config.loop ? -1 : 0,
    });

    for (const step of config.steps) {
      const targetEl = containerEl.querySelector<HTMLElement>(step.target_selector);
      if (!targetEl) {
        console.warn(
          `[AdAnimatedBanner] Target not found: "${step.target_selector}" — skipping step`,
        );
        continue;
      }

      switch (step.pattern) {
        case 'fade_in':
          applyFadeIn(tl, targetEl, {
            delay:    step.delay,
            duration: step.duration,
            ease:     step.ease,
          });
          break;

        case 'fade_out':
          applyFadeOut(tl, targetEl, {
            delay:    step.delay,
            duration: step.duration,
            ease:     step.ease,
          });
          break;

        case 'slide_in':
          applySlideIn(tl, targetEl, {
            delay:    step.delay,
            duration: step.duration,
            from:     step.from,
            distance: step.distance,
            ease:     step.ease,
          });
          break;

        case 'text_reveal':
          applyTextReveal(tl, targetEl, {
            delay:    step.delay,
            duration: step.duration,
            unit:     step.unit,
            stagger:  step.stagger,
            ease:     step.ease,
          });
          break;

        case 'scale':
          applyScaleIn(tl, targetEl, {
            delay:      step.delay,
            duration:   step.duration,
            from_scale: step.from_scale,
            ease:       step.ease,
          });
          break;

        case 'stagger_group':
          applyStaggerGroup(tl, targetEl, {
            delay:    step.delay,
            duration: step.duration,
            stagger:  step.stagger,
            y_offset: step.y_offset,
            ease:     step.ease,
          });
          break;

        default: {
          const _exhaustive: never = step.pattern;
          console.warn(
            `[AdAnimatedBanner] Unknown pattern: ${String(_exhaustive)} — skipping`,
          );
        }
      }
    }
  }, containerEl);

  if (!tl) {
    ctx.revert();
    throw new Error('Timeline build failed — gsap.context callback did not assign');
  }

  return { timeline: tl, context: ctx };
}

// ════════════════════════════════════════════════════════════════
// STATIC FALLBACK ENGINE
// ════════════════════════════════════════════════════════════════

function applyStaticFallback(
  containerEl: HTMLElement,
  config:      AnimationTimelineConfig,
): void {
  for (const step of config.steps) {
    const targetEl = containerEl.querySelector<HTMLElement>(step.target_selector);
    if (!targetEl) continue;

    switch (step.pattern) {
      case 'fade_in':
        applyFadeStatic(targetEl);
        break;
      case 'fade_out':
        targetEl.style.opacity = '0';
        break;
      case 'slide_in':
        applySlideStatic(targetEl);
        break;
      case 'text_reveal':
        applyTextRevealStatic(targetEl);
        break;
      case 'scale':
        applyScaleStatic(targetEl);
        break;
      case 'stagger_group':
        applyStaggerGroupStatic(targetEl);
        break;
      default: {
        const _exhaustive: never = step.pattern;
        void _exhaustive;
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

type Phase = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'static' | 'error';

export default function AdAnimatedBanner({
  ad,
  className,
  onClick,
  width  = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: AdAnimatedBannerProps) {
  const containerRef     = useRef<HTMLDivElement | null>(null);
  const timelineRef      = useRef<gsap.core.Timeline | null>(null);
  const contextRef       = useRef<gsap.Context | null>(null);
  const observerRef      = useRef<IntersectionObserver | null>(null);
  const hasPlayedOnceRef = useRef(false);

  const [phase, setPhase]               = useState<Phase>('idle');
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [staticReason, setStaticReason] = useState<StaticFallbackReason>(null);

  const handleClick = () => {
    if (onClick) onClick(ad.id);
  };

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setErrorMsg(null);
    setStaticReason(null);
    hasPlayedOnceRef.current = false;

    async function initAnimation() {
      try {
        const fallbackCheck = shouldUseStaticFallback();
        if (fallbackCheck.useStatic) {
          const containerEl = containerRef.current;
          if (!containerEl) {
            throw new Error('Container ref not attached');
          }
          if (!ad.animation_timeline?.steps?.length) {
            if (!cancelled) {
              setStaticReason(fallbackCheck.reason);
              setPhase('static');
            }
            return;
          }
          applyStaticFallback(containerEl, ad.animation_timeline);
          if (!cancelled) {
            setStaticReason(fallbackCheck.reason);
            setPhase('static');
          }
          return;
        }

        const gsapMod = await loadGsap();
        if (cancelled) return;

        const containerEl = containerRef.current;
        if (!containerEl) {
          throw new Error('Container ref not attached');
        }

        if (!ad.animation_timeline?.steps?.length) {
          throw new Error('animation_timeline.steps empty or invalid');
        }

        const built = buildAnimationTimeline({
          gsapInstance: gsapMod,
          containerEl,
          config:       ad.animation_timeline,
        });

        if (cancelled) {
          built.timeline.kill();
          built.context.revert();
          return;
        }

        timelineRef.current = built.timeline;
        contextRef.current  = built.context;

        setPhase('ready');

      } catch (err: any) {
        if (cancelled) return;
        console.error('[AdAnimatedBanner] initAnimation failed:', err);
        setErrorMsg(err?.message ?? 'Animation init failed');

        const containerEl = containerRef.current;
        if (containerEl && ad.animation_timeline?.steps?.length) {
          try {
            applyStaticFallback(containerEl, ad.animation_timeline);
          } catch (fbErr) {
            console.warn('[AdAnimatedBanner] static fallback also failed:', fbErr);
          }
        }
        setPhase('error');
      }
    }

    initAnimation();

    return () => {
      cancelled = true;

      if (timelineRef.current) {
        try {
          timelineRef.current.kill();
        } catch (err) {
          console.warn('[AdAnimatedBanner] timeline.kill() failed:', err);
        }
        timelineRef.current = null;
      }

      if (contextRef.current) {
        try {
          contextRef.current.revert();
        } catch (err) {
          console.warn('[AdAnimatedBanner] context.revert() failed:', err);
        }
        contextRef.current = null;
      }
    };
  }, [ad.id, ad.animation_timeline]);

  useEffect(() => {
    if (phase !== 'ready' && phase !== 'playing' && phase !== 'paused') {
      return;
    }

    const containerEl = containerRef.current;
    const tl          = timelineRef.current;
    if (!containerEl || !tl) return;

    if (typeof IntersectionObserver === 'undefined') {
      if (!hasPlayedOnceRef.current) {
        tl.play(0);
        hasPlayedOnceRef.current = true;
        setPhase('playing');
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!hasPlayedOnceRef.current) {
              tl.play(0);
              hasPlayedOnceRef.current = true;
              setPhase('playing');
            } else {
              tl.restart();
              setPhase('playing');
            }
          } else {
            if (hasPlayedOnceRef.current) {
              tl.pause();
              setPhase('paused');
            }
          }
        }
      },
      {
        threshold:  REPLAY_THRESHOLD,
        rootMargin: REPLAY_ROOT_MARGIN,
      },
    );

    observer.observe(containerEl);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [phase]);

  const isLoading      = phase === 'idle' || phase === 'loading';
  const hasError       = phase === 'error';
  const isStaticActive = phase === 'static';

  return (
    <div className={`teraloka-animated-banner ${className ?? ''}`}>
      <div
        ref={containerRef}
        onClick={handleClick}
        className="
          relative cursor-pointer overflow-hidden
          rounded-lg border-2 border-amber-200
          bg-amber-50/30
          transition-all duration-200
          hover:border-amber-300 hover:shadow-md
        "
        style={{ width, height }}
        data-ad-id={ad.id}
        data-ad-format="animated"
        data-phase={phase}
        data-static-reason={staticReason ?? undefined}
        role="link"
        aria-label={`Iklan: ${ad.title} oleh ${ad.advertiser_name}`}
      >
        <div
          className="
            absolute top-2 left-2 z-30
            rounded-md bg-amber-500 px-2 py-0.5
            text-[10px] font-bold uppercase tracking-wider text-white
            shadow-sm
          "
        >
          IKLAN
        </div>

        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-amber-50/80">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          </div>
        )}

        {hasError && (
          <div
            className="absolute top-2 right-2 z-25 rounded-sm bg-red-100 px-1.5 py-0.5 text-[9px] text-red-700"
            title={errorMsg ?? undefined}
          >
            ⚠️ static
          </div>
        )}

        <Link
          href={ad.link_url}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="block h-full w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {ad.image_url && (
            <img
              src={ad.image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              aria-hidden="true"
            />
          )}

          <div className="relative z-10 flex h-full flex-col gap-2 px-3 pt-10 pb-7">
            {ad.advertiser_logo_url && (
              <div className="logo flex items-start">
                <img
                  src={ad.advertiser_logo_url}
                  alt={ad.advertiser_name}
                  className="h-8 w-auto"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <h3 className="headline text-[14px] font-bold leading-tight text-gray-900">
                {ad.title}
              </h3>
              {ad.body && (
                <p className="body text-[11px] leading-snug text-gray-700">
                  {ad.body}
                </p>
              )}
            </div>

            <div className="mt-auto">
              <div className="cta inline-block rounded-md bg-amber-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm">
                Pelajari Lebih Lanjut
              </div>
            </div>
          </div>
        </Link>

        {ad.disclaimer_text && (
          <div
            className="
              absolute bottom-0 left-0 right-0 z-20
              bg-amber-100/95 px-2 py-1
              text-[9px] leading-tight text-amber-900
            "
          >
            {ad.disclaimer_text}
          </div>
        )}
      </div>

      <p className="mt-1 text-center text-[9px] text-gray-500">
        oleh <span className="font-medium">{ad.advertiser_name}</span>
        {isStaticActive && staticReason && (
          <span className="ml-1 text-amber-600" title={`Static fallback: ${staticReason}`}>
            · static
          </span>
        )}
      </p>
    </div>
  );
}
