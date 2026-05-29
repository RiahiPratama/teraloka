// TUJUAN: src/app/(public)/pedoman/page.tsx
// (taro file ini ke folder pedoman/ lalu rename jadi page.tsx)
import type { Metadata } from 'next'
import { LegalPage } from '@/components/public/legal/LegalPage'
import { LEGAL_CONFIG, pedomanDoc } from '@/components/public/legal/legalContent'

export const metadata: Metadata = {
  title: 'Pedoman Komunitas — TeraLoka',
  description:
    'Aturan komunitas TeraLoka: konten yang didorong dan dilarang, ketentuan laporan warga (BALAPOR), serta mekanisme Hak Jawab & Koreksi.',
}

export default function PedomanPage() {
  return (
    <LegalPage
      title="Pedoman Komunitas"
      updated={LEGAL_CONFIG.tanggalBerlaku}
      content={pedomanDoc(LEGAL_CONFIG)}
    />
  )
}
