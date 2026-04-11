'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Beranda', icon: '🏠' },
  { href: '/speed', label: 'Speed', icon: '🚤' },
  { href: '/kos', label: 'Kos', icon: '🏘️' },
  { href: '/services', label: 'Jasa', icon: '🔧' },
  { href: '/news', label: 'Berita', icon: '📰' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[48px] min-w-[48px] flex-col items-center justify-center px-2 py-1.5 text-xs',
                isActive
                  ? 'text-[#1B6B4A] font-semibold'
                  : 'text-gray-500',
              )}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
