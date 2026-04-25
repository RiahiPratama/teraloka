'use client';

/**
 * ShareBar — Multi-platform sharing untuk public campaign page
 * 
 * 5 Platforms:
 *   1. WhatsApp     — wa.me intent (most popular Indonesia)
 *   2. Facebook     — sharer.php
 *   3. Threads      — threads.net intent
 *   4. X (Twitter)  — x.com intent
 *   5. Instagram    — Copy Link + toast (no native URL share API)
 * 
 * Plus: Universal Copy Link button.
 * 
 * Brand icons: Inline SVG (lucide-react removed brand icons due to trademark).
 */

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';

interface ShareBarProps {
  url: string;
  title: string;
}

export default function ShareBar({ url, title }: ShareBarProps) {
  const [copyState, setCopyState] = useState<'idle' | 'instagram' | 'copied'>('idle');

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const fullText = `${title}\n\nBantu sebar untuk #BADONASI:\n${url}`;
  const encodedFullText = encodeURIComponent(fullText);

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodedFullText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    threads:  `https://www.threads.net/intent/post?text=${encodedFullText}`,
    twitter:  `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&hashtags=BADONASI,TeraLoka`,
  };

  function handleShare(platform: keyof typeof shareLinks) {
    window.open(shareLinks[platform], '_blank', 'width=600,height=600,noopener,noreferrer');
  }

  async function handleInstagram() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('instagram');
      setTimeout(() => setCopyState('idle'), 3000);
    } catch {
      alert('Copy link: ' + url);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      alert('Copy link: ' + url);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        <ShareButton
          label="WA"
          color="#25D366"
          bg="bg-green-50"
          border="border-green-200"
          hoverBg="hover:bg-green-100"
          onClick={() => handleShare('whatsapp')}
          icon={<WhatsAppIcon />}
        />
        <ShareButton
          label="FB"
          color="#1877F2"
          bg="bg-blue-50"
          border="border-blue-200"
          hoverBg="hover:bg-blue-100"
          onClick={() => handleShare('facebook')}
          icon={<FacebookIcon />}
        />
        <ShareButton
          label="Threads"
          color="#000000"
          bg="bg-gray-50"
          border="border-gray-300"
          hoverBg="hover:bg-gray-100"
          onClick={() => handleShare('threads')}
          icon={<ThreadsIcon />}
        />
        <ShareButton
          label="X"
          color="#000000"
          bg="bg-gray-50"
          border="border-gray-300"
          hoverBg="hover:bg-gray-100"
          onClick={() => handleShare('twitter')}
          icon={<XIcon />}
        />
        <ShareButton
          label="IG"
          color="#E4405F"
          bg="bg-pink-50"
          border="border-pink-200"
          hoverBg="hover:bg-pink-100"
          onClick={handleInstagram}
          icon={<InstagramIcon />}
        />
      </div>

      <button
        onClick={handleCopyLink}
        className={`w-full flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-colors ${
          copyState === 'copied'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {copyState === 'copied' ? (
          <>
            <Check size={14} />
            Link Tersalin!
          </>
        ) : (
          <>
            <Link2 size={14} />
            Salin Link
          </>
        )}
      </button>

      {copyState === 'instagram' && (
        <div className="rounded-xl bg-pink-50 border border-pink-200 px-4 py-3 flex items-start gap-2">
          <div className="shrink-0 mt-0.5">
            <InstagramIcon size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#E4405F]">Link tersalin!</p>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
              Buka Instagram, paste di story atau bio. Instagram belum punya share button untuk link langsung.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareButton({
  label,
  color,
  bg,
  border,
  hoverBg,
  onClick,
  icon,
}: {
  label: string;
  color: string;
  bg: string;
  border: string;
  hoverBg: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl border ${bg} ${border} ${hoverBg} py-3 transition-colors`}
      aria-label={`Bagikan ke ${label}`}
    >
      {icon}
      <span className="text-[10px] font-bold" style={{ color }}>
        {label}
      </span>
    </button>
  );
}

// Brand SVG Icons (inline)

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function ThreadsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="#000000">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.78 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.745-1.757-.51-.586-1.297-.883-2.34-.89h-.030c-.84 0-1.98.232-2.705 1.32L7.62 6.587c.97-1.45 2.553-2.247 4.45-2.247h.044c3.172.02 5.06 1.953 5.249 5.327.108.046.214.094.32.144 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.227 0-.457.007-.692.022-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.262-.221z" />
    </svg>
  );
}

function XIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="#000000">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#FCAF45" />
          <stop offset="50%" stopColor="#F77737" />
          <stop offset="75%" stopColor="#E4405F" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
        fill="url(#ig-gradient)"
      />
    </svg>
  );
}
