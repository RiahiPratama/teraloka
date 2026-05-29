// TUJUAN: src/app/(public)/privasi/page.tsx
// (taro file ini ke folder privasi/ lalu rename jadi page.tsx)
import type { Metadata } from 'next'
import { LegalPage } from '@/components/public/legal/LegalPage'
import { LEGAL_CONFIG, privasiDoc } from '@/components/public/legal/legalContent'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — TeraLoka',
  description:
    'Bagaimana TeraLoka mengumpulkan, memproses, dan melindungi Data Pribadi Anda sesuai UU No. 27 Tahun 2022 (UU PDP).',
}

export default function PrivasiPage() {
  return (
    <LegalPage
      title="Kebijakan Privasi"
      updated={LEGAL_CONFIG.tanggalBerlaku}
      content={privasiDoc(LEGAL_CONFIG)}
    />
  )
}
