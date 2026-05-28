'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type CSSProperties,
} from 'react';
import { Share2, Copy, Check } from 'lucide-react';

// ════════════════════════════════════════════════════════════════
// SharePopover — Universal Cross-Service Share Component
// ════════════════════════════════════════════════════════════════
//
// Pattern CCC — Brand Identity per Service (auto-theme via service_domain).
// Pattern DDD — Brand Color Authority Hierarchy:
//   (1) CEO directive > (2) CSS variables canonical > (3) Code inline.
// Pattern EEE — Card-Button Color Pair Rule (Card vs Button alternation).
// Pattern UU  — Single-Mode Hardcoding (light-only public pages).
// ════════════════════════════════════════════════════════════════

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';

const COPIED_FEEDBACK_DURATION_MS = 2000;

// ── Cross-Service Types ──────────────────────────────────────────

export type ShareEntityType =
  | 'article'
  | 'campaign'
  | 'listing'
  | 'report'
  | 'koleksi';

export type ShareServiceDomain =
  | 'bakabar'
  | 'balapor'
  | 'badonasi'
  | 'bakos'
  | 'bapasiar';

type SharePlatformId =
  | 'facebook'
  | 'telegram'
  | 'twitter'
  | 'whatsapp'
  | 'copy';

// ── Service Brand Color Mapping (Pattern CCC + DDD) ──────────────
//
// AUTHORITATIVE SOURCE:
//   ✅ BAKABAR  #8B5CF6 (CANONICAL — globals.css line 87-89)
//                / strong #5B21B6 / muted #FAF5FF
//
//   ✅ BADONASI #EC4899 (CANONICAL — CEO directive 14 Mei 2026 +
//                past chat lock "1.2.9.3 Lanjut Badonasi-...")
//                / strong #BE185D pink-700
//
//   ✅ BALAPOR  #DC2626 (CANONICAL — CEO directive "merah berani"
//                14 Mei 2026 sore) — UPDATED dari coral #D85A30
//                / strong #991B1B red-800
//                Secondary palette untuk info card tint:
//                  bg #FFF7F5 + border #F5C4B3 + accent #D85A30 (coral)
//                  Existing legacy palette, accepted untuk MiniBALAPORFeed
//                  dan LiveBALAPORFeed info cards (NOT CTA buttons).
//
//   ⏳ BAKOS, BAPASIAR — placeholder pending canonical

interface ServiceBrandTheme {
  bg:      string;
  bgHover: string;
  text:    string;
  tint:    string;
}

const SERVICE_BRAND_COLORS: Record<ShareServiceDomain, ServiceBrandTheme> = {
  // ✅ CANONICAL — globals.css
  bakabar: {
    bg:      '#8B5CF6',
    bgHover: '#5B21B6',
    text:    '#ffffff',
    tint:    'rgba(139, 92, 246, 0.1)',
  },
  // ✅ CANONICAL — CEO directive "merah berani" 14 Mei 2026 sore
  // UPDATED dari coral #D85A30 → red berani #DC2626 (red-600)
  balapor: {
    bg:      '#DC2626', // red-600 berani
    bgHover: '#991B1B', // red-800 strong
    text:    '#ffffff',
    tint:    'rgba(220, 38, 38, 0.1)',
  },
  // ✅ CANONICAL — CEO directive 14 Mei 2026 (screenshot ZAKAT card)
  badonasi: {
    bg:      '#EC4899',
    bgHover: '#BE185D',
    text:    '#ffffff',
    tint:    'rgba(236, 72, 153, 0.1)',
  },
  // ⏳ PLACEHOLDER
  bakos: {
    bg:      '#0891B2',
    bgHover: '#0E7490',
    text:    '#ffffff',
    tint:    'rgba(8, 145, 178, 0.1)',
  },
  // ⏳ PLACEHOLDER
  bapasiar: {
    bg:      '#0C4A6E',
    bgHover: '#082F4A',
    text:    '#ffffff',
    tint:    'rgba(12, 74, 110, 0.1)',
  },
};

// ── Platform Brand SVG Icons ─────────────────────────────────────

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.465 3.488" />
    </svg>
  );
}

// ── Platform Configuration ───────────────────────────────────────

interface PlatformConfig {
  id: SharePlatformId;
  label: string;
  ariaLabel: string;
  brandColor: string;
  bgHover: string;
  Icon: (props: { className?: string }) => ReactNode;
}

const PLATFORMS: PlatformConfig[] = [
  { id: 'facebook',  label: 'Facebook',  ariaLabel: 'Bagikan ke Facebook',    brandColor: '#1877F2', bgHover: 'hover:bg-[#1877F2]/10', Icon: FacebookIcon  },
  { id: 'telegram',  label: 'Telegram',  ariaLabel: 'Bagikan ke Telegram',    brandColor: '#0088CC', bgHover: 'hover:bg-[#0088CC]/10', Icon: TelegramIcon  },
  { id: 'twitter',   label: 'X',         ariaLabel: 'Bagikan ke X (Twitter)', brandColor: '#000000', bgHover: 'hover:bg-gray-100',     Icon: XTwitterIcon  },
  { id: 'whatsapp',  label: 'WhatsApp',  ariaLabel: 'Bagikan ke WhatsApp',    brandColor: '#25D366', bgHover: 'hover:bg-[#25D366]/10', Icon: WhatsAppIcon  },
];

// ── Helpers ──────────────────────────────────────────────────────

function buildShareUrl(platform: SharePlatformId, url: string, title: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    case 'whatsapp':
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    default:
      return url;
  }
}

async function trackShareEvent(payload: {
  entity_id: string;
  entity_type: ShareEntityType;
  service_domain: ShareServiceDomain;
  platform: SharePlatformId;
}): Promise<void> {
  try {
    await fetch(`${API_URL}/content/analytics/share-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silent fail
  }
}

// ── Props Interface ──────────────────────────────────────────────

export interface SharePopoverProps {
  entity_id: string;
  entity_type: ShareEntityType;
  service_domain: ShareServiceDomain;
  title: string;
  url: string;
  description?: string;
  triggerVariant?: 'icon' | 'button';
  triggerLabel?: string;
  className?: string;
  onShareSuccess?: (platform: SharePlatformId) => void;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export default function SharePopover({
  entity_id,
  entity_type,
  service_domain,
  title,
  url,
  triggerVariant = 'icon',
  triggerLabel = 'Bagikan',
  className = '',
  onShareSuccess,
}: SharePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<'top' | 'bottom'>('bottom');
  const [copied, setCopied] = useState(false);
  const [isHoveringTrigger, setIsHoveringTrigger] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const serviceTheme = SERVICE_BRAND_COLORS[service_domain] || SERVICE_BRAND_COLORS.bakabar;

  const calculateDirection = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const POPOVER_HEIGHT_ESTIMATE = 80;
    setDirection(spaceBelow < POPOVER_HEIGHT_ESTIMATE ? 'top' : 'bottom');
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  function handleTriggerClick(e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) calculateDirection();
    setIsOpen((prev) => !prev);
  }

  function handlePlatformShare(e: ReactMouseEvent, platform: SharePlatformId) {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = buildShareUrl(platform, url, title);
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    trackShareEvent({ entity_id, entity_type, service_domain, platform });
    onShareSuccess?.(platform);
    setIsOpen(false);
  }

  async function handleCopy(e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_DURATION_MS);
      trackShareEvent({ entity_id, entity_type, service_domain, platform: 'copy' });
      onShareSuccess?.('copy');
      setTimeout(() => setIsOpen(false), 1000);
    } catch (err) {
      console.warn('[SharePopover] Clipboard API failed:', err);
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_FEEDBACK_DURATION_MS);
        trackShareEvent({ entity_id, entity_type, service_domain, platform: 'copy' });
      } catch {
        // Final fallback
      }
      document.body.removeChild(textarea);
      setTimeout(() => setIsOpen(false), 1000);
    }
  }

  const popoverPositionClass = direction === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  const popoverAnimationStyle: CSSProperties = {
    transformOrigin: direction === 'top' ? 'bottom center' : 'top center',
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {triggerVariant === 'icon' ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleTriggerClick}
          onMouseEnter={() => setIsHoveringTrigger(true)}
          onMouseLeave={() => setIsHoveringTrigger(false)}
          aria-label="Bagikan"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className="
            inline-flex items-center justify-center
            w-11 h-11
            rounded-full
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-offset-1
          "
          style={{
            color:      isHoveringTrigger ? serviceTheme.bgHover : serviceTheme.bg,
            background: isHoveringTrigger ? serviceTheme.tint : 'transparent',
          }}
        >
          <Share2 className="w-5 h-5" strokeWidth={2} />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleTriggerClick}
          onMouseEnter={() => setIsHoveringTrigger(true)}
          onMouseLeave={() => setIsHoveringTrigger(false)}
          aria-label="Bagikan"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className="
            inline-flex items-center gap-2
            px-5 py-2.5
            rounded-xl
            text-sm font-bold
            transition-all duration-150
            active:scale-95
            focus:outline-none focus:ring-2 focus:ring-offset-2
          "
          style={{
            background: isHoveringTrigger ? serviceTheme.bgHover : serviceTheme.bg,
            color:      serviceTheme.text,
          }}
        >
          <Share2 className="w-4 h-4" strokeWidth={2.5} />
          <span>{triggerLabel}</span>
        </button>
      )}

      {isOpen && (
        <div
          role="menu"
          aria-label="Pilih platform berbagi"
          style={popoverAnimationStyle}
          className={`
            absolute ${popoverPositionClass}
            left-1/2 -translate-x-1/2
            z-50
            flex items-center gap-1
            p-2
            bg-white
            border border-gray-200
            rounded-2xl
            shadow-lg
            animate-in fade-in zoom-in-95 duration-150
          `}
        >
          {PLATFORMS.map((platform) => {
            const { id, ariaLabel, brandColor, bgHover, Icon } = platform;
            return (
              <button
                key={id}
                type="button"
                onClick={(e) => handlePlatformShare(e, id)}
                aria-label={ariaLabel}
                role="menuitem"
                className={`
                  inline-flex items-center justify-center
                  w-11 h-11
                  rounded-full
                  transition-all duration-150
                  ${bgHover}
                  active:scale-95
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300
                `}
                style={{ color: brandColor }}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Link tersalin' : 'Salin link'}
            role="menuitem"
            className={`
              inline-flex items-center justify-center
              w-11 h-11
              rounded-full
              transition-all duration-150
              ${copied ? 'bg-green-50 text-green-600' : 'text-gray-700 hover:bg-gray-100'}
              active:scale-95
              focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300
            `}
          >
            {copied ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <Copy className="w-5 h-5" strokeWidth={2} />}
          </button>
        </div>
      )}
    </div>
  );
}
