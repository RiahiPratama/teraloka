// TUJUAN: src/app/(public)/lisensi/page.tsx
// (taro file ini ke folder lisensi/ lalu rename jadi page.tsx)
import type { Metadata } from 'next'
import { LegalPage } from '@/components/public/legal/LegalPage'
import { LEGAL_CONFIG, lisensiDoc } from '@/components/public/legal/legalContent'

export const metadata: Metadata = {
  title: 'Lisensi Data — TeraLoka',
  description:
    'Kepemilikan dan lisensi konten editorial BAKABAR, konten pengguna, serta atribusi data pihak ketiga (Permendagri, BMKG, peta sumber terbuka).',
}

export default function LisensiPage() {
  return (
    <LegalPage
      title="Lisensi Data"
      updated={LEGAL_CONFIG.tanggalBerlaku}
      content={lisensiDoc(LEGAL_CONFIG)}
    />
  )
}
