// TUJUAN: src/app/(public)/aturan/balapor/sos/page.tsx
//   → URL: /aturan/balapor/sos  (sibling dari /aturan/balapor/ketentuan)
//   Mirror persis dari ketentuan/page.tsx — cuma swap balaporDoc → sosDoc + judul/meta.
import type { Metadata } from 'next'
import { LegalPage } from '@/components/public/legal/LegalPage'
import { LEGAL_CONFIG, sosDoc } from '@/components/public/legal/serviceTerms'

export const metadata: Metadata = {
  title: 'Ketentuan SOS Darurat — TeraLoka',
  description:
    'Ketentuan fitur SOS Darurat: SOS adalah penyiaran darurat ke tim TeraLoka & komunitas, bukan layanan tanggap darurat. Untuk pertolongan, hubungi 112 lebih dulu.',
}

export default function KetentuanSosPage() {
  return (
    <LegalPage
      title="Ketentuan SOS Darurat"
      updated={LEGAL_CONFIG.tanggalBerlaku}
      content={sosDoc(LEGAL_CONFIG)}
    />
  )
}
