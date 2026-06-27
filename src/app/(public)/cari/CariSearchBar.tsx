'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Search bar untuk halaman /cari. Submit (tombol / Enter) → push /cari?q=
export default function CariSearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [val, setVal] = useState(defaultValue)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = val.trim()
    if (q) router.push(`/cari?q=${encodeURIComponent(q)}`)
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'flex', gap: 8, alignItems: 'stretch',
        maxWidth: 640, width: '100%',
      }}
    >
      <input
        type="search"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Cari berita, kos, donasi, laporan…"
        autoFocus
        style={{
          flex: 1, minWidth: 0,
          fontSize: 15, fontWeight: 500,
          padding: '12px 16px',
          borderRadius: 12,
          border: '1.5px solid var(--border-light, #E5E7EB)',
          background: '#fff',
          color: 'var(--text, #111827)',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        style={{
          flexShrink: 0,
          fontSize: 14, fontWeight: 800,
          padding: '0 20px',
          borderRadius: 12,
          border: 'none',
          background: '#0891B2',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Cari
      </button>
    </form>
  )
}
