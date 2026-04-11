'use client';

import { TICKER_PRIORITY } from '@/utils/constants';

interface TickerItem {
  id: string;
  priority: keyof typeof TICKER_PRIORITY;
  text: string;
  link: string | null;
}

// Placeholder data — nanti dari API/realtime
const PLACEHOLDER_ITEMS: TickerItem[] = [
  { id: '1', priority: 'transport', text: 'Speed Bastiong → Sofifi beroperasi normal', link: null },
  { id: '2', priority: 'promo', text: 'Selamat datang di TeraLoka!', link: null },
];

export function Ticker() {
  const items = PLACEHOLDER_ITEMS;

  return (
    <div className="overflow-hidden bg-gray-900 text-white text-sm">
      <div className="animate-marquee flex whitespace-nowrap py-1.5">
        {items.map((item) => {
          const config = TICKER_PRIORITY[item.priority];
          return (
            <span key={item.id} className="mx-6 inline-flex items-center gap-1.5">
              <span>{config.emoji}</span>
              <span>{item.text}</span>
            </span>
          );
        })}
        {/* Duplicate for seamless loop */}
        {items.map((item) => {
          const config = TICKER_PRIORITY[item.priority];
          return (
            <span key={`dup-${item.id}`} className="mx-6 inline-flex items-center gap-1.5">
              <span>{config.emoji}</span>
              <span>{item.text}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
