'use client';

import { useState } from 'react';
import { MessageCircle, Check, Copy, Info } from 'lucide-react';

interface ShareBarProps {
  url: string;
  title: string;
}

/**
 * ShareBar — multi-platform share buttons untuk campaign detail.
 * Client component (butuh navigator.clipboard untuk copy link).
 *
 * Platforms:
 * - WhatsApp (URL intent)
 * - Facebook (sharer URL intent)
 * - X/Twitter (intent URL)
 * - Telegram (share URL)
 * - Copy link (clipboard API)
 *
 * Instagram/Threads ga ada URL intent di web, jadi user diarahkan
 * copy link lalu paste di platform masing-masing.
 */
export default function ShareBar({ url, title }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `Yuk bantu campaign ini di BADONASI 🙏\n\n"${title}"`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(url);

  const links = {
    whatsapp: `https://wa.me/?text=${encodedText}%0A%0A${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter:  `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const buttons = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      href: links.whatsapp,
      bg: 'bg-[#25D366]',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      ),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      href: links.facebook,
      bg: 'bg-[#1877F2]',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/>
        </svg>
      ),
    },
    {
      key: 'twitter',
      label: 'X',
      href: links.twitter,
      bg: 'bg-black',
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      key: 'telegram',
      label: 'Telegram',
      href: links.telegram,
      bg: 'bg-[#26A5E4]',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0m4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024q-.162.037-5.168 3.417-.734.504-1.328.49c-.436-.008-1.277-.247-1.902-.45-.767-.248-1.377-.38-1.323-.802q.04-.33.908-.67 5.336-2.325 7.118-3.066c3.386-1.41 4.09-1.654 4.549-1.66"/>
        </svg>
      ),
    },
  ];

  return (
    <div>
      {/* 4 platform buttons row */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {buttons.map(b => (
          <a
            key={b.key}
            href={b.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex flex-col items-center justify-center gap-1.5 ${b.bg} text-white rounded-xl py-3 hover:opacity-90 transition-opacity active:scale-95`}
          >
            {b.icon}
            <span className="text-[10px] font-semibold">{b.label}</span>
          </a>
        ))}
      </div>

      {/* Copy link button (full width) */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors active:scale-[0.98]"
      >
        {copied ? (
          <>
            <Check size={16} className="text-emerald-600" />
            <span className="text-emerald-600">Link tersalin!</span>
          </>
        ) : (
          <>
            <Copy size={16} />
            Salin tautan
          </>
        )}
      </button>

      {/* Instagram/Threads note */}
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-pink-50 border border-pink-100 p-2.5">
        <Info size={12} className="text-pink-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-pink-700 leading-relaxed">
          <strong>Instagram / Threads / TikTok?</strong> Salin tautan di atas, lalu paste di bio, caption, atau story kamu.
        </p>
      </div>
    </div>
  );
}
