// TUJUAN: src/app/(public)/aturan/badonasi/ketentuan/page.tsx
//   → URL: /aturan/badonasi/ketentuan
//   Mirror persis dari ketentuan/page.tsx & sos/page.tsx — swap ke badonasiDoc + judul/meta.
//   (Kalau lo lebih suka route /fundraising/ketentuan, tinggal pindah folder — isi identik.)
import type { Metadata } from 'next'
import { LegalPage } from '@/components/public/legal/LegalPage'
import { LEGAL_CONFIG, badonasiDoc } from '@/components/public/legal/serviceTerms'

export const metadata: Metadata = {
  title: 'Ketentuan Layanan BADONASI — TeraLoka',
  description:
    'Ketentuan layanan donasi BADONASI: peran TeraLoka sebagai fasilitator (bukan penyelenggara/pemegang dana), tanggung jawab penggalang, hak donatur, dan penanganan dugaan penyalahgunaan.',
}

export default function KetentuanBadonasiPage() {
  return (
    <LegalPage
      title="Ketentuan Layanan BADONASI"
      updated={LEGAL_CONFIG.tanggalBerlaku}
      content={badonasiDoc(LEGAL_CONFIG)}
    />
  )
}
