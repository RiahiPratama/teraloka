// TUJUAN: src/app/(public)/fundraising/standar-verifikasi/page.tsx
//   → URL: /fundraising/standar-verifikasi  (fix 404 — ditaut dari LP & halaman kampanye)
//   Konten JUJUR, konsisten dengan badonasiDoc Section 4: verifikasi = mengurangi, BUKAN menghilangkan risiko.
//   Pakai renderer LegalPage (markdown) biar seragam dgn halaman ketentuan.
import type { Metadata } from 'next'
import { LegalPage } from '@/components/public/legal/LegalPage'
import { LEGAL_CONFIG } from '@/components/public/legal/serviceTerms'

export const metadata: Metadata = {
  title: 'Standar Verifikasi BADONASI — TeraLoka',
  description:
    'Bagaimana TeraLoka memverifikasi kampanye BADONASI, apa yang kami periksa, dan apa arti (serta batas) label "terverifikasi".',
}

const CONTENT = `Halaman ini menjelaskan bagaimana kami memeriksa kampanye di BADONASI, apa yang kami periksa, dan — yang sama pentingnya — **apa yang verifikasi ini bukan**.

## Yang kami periksa sebelum kampanye tayang

Setiap kampanye ditinjau manual oleh tim TeraLoka Maluku Utara. Pemeriksaan mencakup, antara lain:

- **Identitas pengaju** — kelengkapan data diri dan kontak yang dapat dihubungi.
- **Dokumen pendukung** — mis. dokumen kondisi/kebutuhan yang relevan dengan cerita kampanye.
- **Kewajaran cerita & target** — apakah narasi masuk akal dan target dana sebanding dengan kebutuhan.
- **Rekening kampanye** — kelengkapan data rekening tujuan yang dikelola penggalang.
- **Kepatuhan aturan** — kampanye tidak melanggar Pedoman Komunitas atau hukum yang berlaku.

Dokumen identitas yang sensitif (mis. KTP) disimpan terbatas dan hanya diakses tim verifikasi.

## Apa arti label "terverifikasi"

Label **"terverifikasi"** berarti kampanye telah melewati pemeriksaan awal di atas dan **layak ditampilkan**. Verifikasi ini bertujuan **mengurangi** risiko penyalahgunaan.

## Apa yang verifikasi ini BUKAN

Agar Anda mengambil keputusan dengan sadar, penting dipahami bahwa verifikasi **tidak menghilangkan** risiko. Label "terverifikasi" **bukan**:

- jaminan bahwa kampanye bebas dari penipuan;
- jaminan bahwa dana pasti disalurkan atau digunakan dengan benar;
- pengesahan, rekomendasi, atau penjaminan oleh TeraLoka atas penggalang.

Dana donasi mengalir **langsung dari Anda ke rekening kampanye yang dikelola penggalang** — TeraLoka tidak menahan, tidak menyalurkan, dan tidak menjamin dana. Tanggung jawab atas penggunaan dana ada pada penggalang.

## Peran Anda sebagai donatur

- Baca cerita dan rincian kampanye dengan saksama sebelum menyumbang.
- Perhatikan **laporan penggunaan dana** yang dipublikasikan terbuka.
- **Laporkan kampanye yang mencurigakan** melalui kanal yang tersedia — laporan Anda membantu menjaga ruang ini tetap sehat.

## Selengkapnya

Ketentuan lengkap layanan donasi ada di **Ketentuan Layanan BADONASI** (/aturan/badonasi/ketentuan). Pertanyaan: ${LEGAL_CONFIG.emailKontak}.

---

*Halaman informasi. Bukan nasihat hukum.*`

export default function StandarVerifikasiPage() {
  return (
    <LegalPage
      title="Standar Verifikasi BADONASI"
      updated={LEGAL_CONFIG.tanggalBerlaku}
      content={CONTENT}
    />
  )
}
