// TUJUAN: src/app/(public)/syarat/page.tsx
// (taro file ini ke folder syarat/ lalu rename jadi page.tsx)
import type { Metadata } from 'next'
import { LegalPage } from '@/components/public/legal/LegalPage'
import { LEGAL_CONFIG, syaratDoc } from '@/components/public/legal/legalContent'

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — TeraLoka',
  description:
    'Ketentuan penggunaan platform TeraLoka: akun, aturan penggunaan, konten pengguna, batasan tanggung jawab, dan penyelesaian sengketa.',
}

export default function SyaratPage() {
  return (
    <LegalPage
      title="Syarat & Ketentuan"
      updated={LEGAL_CONFIG.tanggalBerlaku}
      content={syaratDoc(LEGAL_CONFIG)}
    />
  )
}
