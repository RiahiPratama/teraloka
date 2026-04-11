import Link from 'next/link';
import { BRAND, APP_TAGLINE } from '@/utils/brand';

const MENU_ITEMS = [
  { key: 'speed', href: '/speed', emoji: '🚤' },
  { key: 'ship', href: '/ship', emoji: '🚢' },
  { key: 'ferry', href: '/ferry', emoji: '⛴️' },
  { key: 'pelni', href: '/pelni', emoji: '🛳️' },
  { key: 'kos', href: '/kos', emoji: '🏘️' },
  { key: 'property', href: '/property', emoji: '🏠' },
  { key: 'vehicle', href: '/vehicle', emoji: '🏍️' },
  { key: 'services', href: '/services', emoji: '🔧' },
  { key: 'news', href: '/news', emoji: '📰' },
  { key: 'reports', href: '/reports', emoji: '📢' },
  { key: 'fundraising', href: '/fundraising', emoji: '💚' },
  { key: 'events', href: '/events', emoji: '🎫' },
  { key: 'bills', href: '/bills', emoji: '💡' },
] as const;

export default function HomePage() {
  return (
    <div className="px-4 py-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-primary">TeraLoka</h1>
        <p className="mt-1 text-sm text-gray-600">{APP_TAGLINE}</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {MENU_ITEMS.map((item) => {
          const brand = BRAND[item.key as keyof typeof BRAND];
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-xl bg-gray-50 p-3 text-center active:bg-gray-100"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-xs font-medium leading-tight">
                {brand.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
