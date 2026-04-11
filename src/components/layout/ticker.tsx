'use client';

import { useEffect, useState } from 'react';
import { TICKER_PRIORITY } from '@/utils/constants';

interface TickerItem {
  id: string;
  priority: keyof typeof TICKER_PRIORITY;
  text: string;
  link: string | null;
}

const FALLBACK: TickerItem[] = [
  { id: '1', priority: 'transport', text: 'Speed Bastiong → Sofifi beroperasi normal', link: null },
  { id: '2', priority: 'promo', text: 'Selamat datang di TeraLoka!', link: null },
];

export function Ticker() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK);

  useEffect(() => {
    fetch('/api/v1/ticker')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.length > 0) setItems(res.data);
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden bg-gray-900 text-white text-sm">
      <div className="animate-marquee flex whitespace-nowrap py-1.5">
        {[...items, ...items].map((item, i) => {
          const config = TICKER_PRIORITY[item.priority];
          const content = (
            <span key={`${item.id}-${i}`} className="mx-6 inline-flex items-center gap-1.5">
              <span>{config.emoji}</span>
              <span>{item.text}</span>
            </span>
          );
          return item.link ? (
            <a key={`${item.id}-${i}`} href={item.link}>{content}</a>
          ) : content;
        })}
      </div>
    </div>
  );
}
