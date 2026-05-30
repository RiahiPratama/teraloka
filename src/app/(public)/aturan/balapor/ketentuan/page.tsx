// TUJUAN (proposal): src/app/(public)/aturan/balapor/ketentuan/page.tsx
//   → URL: /aturan/balapor/ketentuan  (sibling dari /aturan/balapor/foto-bukti yg udah ada)
// Kalau lo mau route lain (mis. /reports/ketentuan), tinggal pindah folder — isi identik.
import type { Metadata } from 'next'
import { LegalPage } from '@/components/public/legal/LegalPage'
import { LEGAL_CONFIG, balaporDoc } from '@/components/public/legal/serviceTerms'

export const metadata: Metadata = {
  title: 'Ketentuan Layanan BALAPOR — TeraLoka',
  description:
    'Ketentuan layanan pelaporan warga BALAPOR: cara kerja, arti verifikasi, anonimitas pelapor, aturan isi laporan, dan tanggung jawab.',
}

export default function KetentuanBalaporPage() {
  return (
    <LegalPage
      title="Ketentuan Layanan BALAPOR"
      updated={LEGAL_CONFIG.tanggalBerlaku}
      content={balaporDoc(LEGAL_CONFIG)}
    />
  )
}
