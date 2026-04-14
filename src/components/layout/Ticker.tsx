import { TICKER_ITEMS } from '@/lib/data/ticker'

export default function Ticker() {
  // Duplikasi 2x untuk seamless loop
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <div
      className="overflow-hidden relative z-[60]"
      style={{ background: 'var(--green)', color: '#fff', padding: '8px 0' }}
    >
      <div className="ticker-track flex gap-12 whitespace-nowrap w-max">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-2 text-xs font-semibold tracking-wider"
          >
            <span
              className="badge-dot inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--orange)' }}
            />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
