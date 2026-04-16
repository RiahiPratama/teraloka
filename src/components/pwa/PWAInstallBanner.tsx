'use client'

import { useEffect, useState } from 'react'

export default function PWAInstallBanner() {
  const [show, setShow]               = useState(false)
  const [deferredPrompt, setDeferred] = useState<any>(null)

  useEffect(() => {
    // Sudah install native? Jangan tampil
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // User sudah klik "Pasang" sebelumnya? Jangan tampil
    if (localStorage.getItem('tl_pwa_installed')) return

    // Hitung kunjungan
    const count = parseInt(localStorage.getItem('tl_visit_count') || '0', 10) + 1
    localStorage.setItem('tl_visit_count', String(count))

    // Tampil setelah kunjungan ke-2+
    if (count >= 2) setShow(true)

    // Simpan prompt untuk install native (Android Chrome)
    const handler = (e: any) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        // Sudah install → simpan permanen, tidak muncul lagi
        localStorage.setItem('tl_pwa_installed', '1')
        setShow(false)
      }
      // Kalau ditolak di native prompt → banner tetap hilang session ini
      // tapi muncul lagi next refresh (tidak simpan apapun ke localStorage)
      setShow(false)
    } else {
      // iOS / browser lain: instruksi manual
      alert('Buka menu browser kamu, lalu pilih "Tambahkan ke Layar Utama" / "Add to Home Screen".')
      // Anggap sudah tahu caranya → simpan sebagai installed
      localStorage.setItem('tl_pwa_installed', '1')
      setShow(false)
    }
  }

  const handleDismiss = () => {
    // "Nanti" = hilang session ini saja, tidak simpan ke localStorage
    // Banner muncul lagi saat refresh
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="md:hidden"
      style={{
        margin: '0 16px 16px',
        background: 'linear-gradient(135deg, #003526 0%, #1B6B4A 100%)',
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 4px 20px rgba(0,53,38,0.2)',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>
        📲
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
          Pasang TeraLoka di HP kamu!
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
          Akses lebih cepat, seperti aplikasi sungguhan
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            background: '#fff', color: 'var(--primary)',
            border: 'none', borderRadius: 99,
            padding: '5px 12px',
            fontSize: 11, fontWeight: 800, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          + Pasang
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent', color: 'rgba(255,255,255,0.6)',
            border: 'none', padding: '2px 0',
            fontSize: 11, cursor: 'pointer', textAlign: 'center',
          }}
        >
          Nanti
        </button>
      </div>
    </div>
  )
}
