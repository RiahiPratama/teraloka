import Link from 'next/link'

export default function Fab() {
  return (
    <Link
      href="/balapor/buat"
      className="fixed bottom-6 right-6 w-[52px] h-[52px] rounded-full flex items-center justify-center z-40 transition-all duration-200 hover:-translate-y-1 hover:scale-105 active:scale-95"
      style={{
        background: 'var(--primary)',
        boxShadow: '0 8px 28px rgba(53,37,205,0.35)',
      }}
      title="Buat Laporan"
      aria-label="Buat laporan baru"
    >
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </Link>
  )
}
