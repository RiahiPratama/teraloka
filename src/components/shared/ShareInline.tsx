'use client';

import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Link2, Check } from 'lucide-react';

// ════════════════════════════════════════════════════════════════
// ShareInline — Utility Action Share Bar
// ════════════════════════════════════════════════════════════════
//
// USE CASE: Share action di bawah article body / di akhir content.
// Style: UTILITY (minimal, inline, light bg), BUKAN promo CTA card.
//
// Beda dengan SharePopover (yang ada 2 variant icon/button + popover
// behavior), ini direct render 4 platform icon inline tanpa popover.
//
// Reference design: screenshot kompas/tribunnews/tirto style.
// ════════════════════════════════════════════════════════════════

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://teraloka-api.vercel.app/api/v1';

const COPIED_FEEDBACK_DURATION_MS = 2000;

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

type SharePlatformId = 'facebook' | 'twitter' | 'whatsapp' | 'copy';

// ── Platform Brand SVG Icons (inline) ────────────────────────────

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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

// ── Helpers ──────────────────────────────────────────────────────

function buildShareUrl(platform: SharePlatformId, url: string, title: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
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

// ── Props ────────────────────────────────────────────────────────

export interface ShareInlineProps {
  entity_id: string;
  entity_type: ShareEntityType;
  service_domain: ShareServiceDomain;
  title: string;
  url: string;
  label?: string;
  className?: string;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export default function ShareInline({
  entity_id,
  entity_type,
  service_domain,
  title,
  url,
  label = 'Bagikan artikel ini',
  className = '',
}: ShareInlineProps) {
  const [copied, setCopied] = useState(false);

  function handleShare(e: ReactMouseEvent, platform: SharePlatformId) {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = buildShareUrl(platform, url, title);
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    trackShareEvent({ entity_id, entity_type, service_domain, platform });
  }

  async function handleCopy(e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_DURATION_MS);
      trackShareEvent({ entity_id, entity_type, service_domain, platform: 'copy' });
    } catch {
      // Fallback
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
        // Final fallback no-op
      }
      document.body.removeChild(textarea);
    }
  }

  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 border border-gray-200 bg-white ${className}`}>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      <div className="flex items-center gap-2">
        {/* WhatsApp */}
        <button
          type="button"
          onClick={(e) => handleShare(e, 'whatsapp')}
          aria-label="Bagikan ke WhatsApp"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ background: '#25D366' }}
        >
          <WhatsAppIcon className="w-4 h-4 text-white" />
        </button>

        {/* Facebook */}
        <button
          type="button"
          onClick={(e) => handleShare(e, 'facebook')}
          aria-label="Bagikan ke Facebook"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ background: '#1877F2' }}
        >
          <FacebookIcon className="w-4 h-4 text-white" />
        </button>

        {/* X */}
        <button
          type="button"
          onClick={(e) => handleShare(e, 'twitter')}
          aria-label="Bagikan ke X (Twitter)"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ background: '#000000' }}
        >
          <XTwitterIcon className="w-4 h-4 text-white" />
        </button>

        {/* Copy link */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Link tersalin' : 'Salin tautan'}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            copied
              ? 'bg-green-50 border-green-200'
              : 'bg-white border-gray-300 hover:bg-gray-50'
          }`}
        >
          {copied
            ? <Check className="w-4 h-4 text-green-600" strokeWidth={2.5} />
            : <Link2 className="w-4 h-4 text-gray-600" strokeWidth={2} />
          }
        </button>
      </div>
    </div>
  );
}
