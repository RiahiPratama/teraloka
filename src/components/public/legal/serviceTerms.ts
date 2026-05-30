// src/components/public/legal/serviceTerms.ts
//
// SINGLE SOURCE ketentuan layanan spesifik (lampiran atas Syarat & Ketentuan umum).
// Tumbuh bertahap: BALAPOR (ini) → BADONASI → BAKABAR.
// Reuse LEGAL_CONFIG dari legalContent.ts (satu sumber identitas/kontak).

import { LEGAL_CONFIG, type LegalConfig } from './legalContent'

export { LEGAL_CONFIG }

/* ════════════════════════════════════════════════════════════════
   KETENTUAN LAYANAN BALAPOR
   Model power-flip (LOCKED) — terverifikasi terhadap backend:
   - assigned_instansi = null (tidak ada forwarding saat ini)
   - anonymity_level: anonim | pseudonym | nama_terang
   - verified = end-state; civic feedback oleh pelapor
   ════════════════════════════════════════════════════════════════ */
export function balaporDoc(c: LegalConfig): string {
  return `Versi 1.0 — berlaku sejak ${c.tanggalBerlaku}

Ketentuan ini berlaku khusus untuk layanan BALAPOR dan merupakan tambahan atas Syarat & Ketentuan serta Pedoman Komunitas TeraLoka. Bila ada pertentangan, ketentuan ini yang berlaku untuk BALAPOR.

## 1. Apa itu BALAPOR

BALAPOR adalah ruang pelaporan warga untuk masalah publik di Maluku Utara (mis. infrastruktur rusak, sampah, banjir, layanan publik). BALAPOR adalah **platform sipil independen** — sebuah ruang dokumentasi dan transparansi yang dikelola bersama warga, bukan kanal pengaduan resmi pemerintah.

## 2. BALAPOR bukan layanan darurat

**Untuk keadaan darurat yang mengancam jiwa, keselamatan, atau memerlukan respons segera, JANGAN mengandalkan BALAPOR.** Hubungi langsung kanal darurat resmi:

- **112** — Panggilan darurat nasional
- **110** — Kepolisian
- **113** — Pemadam Kebakaran
- **115** — Basarnas (SAR / kecelakaan laut)
- **119** — Gawat darurat medis

BALAPOR maupun fitur terkait tidak menggantikan layanan darurat resmi dan tidak menjamin respons real-time.

## 3. Bagaimana laporan diproses

Setiap laporan melewati alur status yang dapat Anda pantau: *menunggu peninjauan → ditinjau → terverifikasi → dipublikasikan*, serta status lain seperti ditolak atau tidak aktif.

**Penting — status akhir:** Saat ini TeraLoka **tidak meneruskan laporan ke instansi pemerintah mana pun.** Status **"terverifikasi"** adalah status akhir yang sah di BALAPOR. Tindak lanjut nyata di lapangan dipantau dan diperbarui sendiri oleh pelapor melalui fitur *civic feedback* (mis. belum ditangani, sedang ditangani, sudah selesai). BALAPOR mencatat dan menampilkan perkembangan itu sebagai dokumentasi publik.

> Bila di kemudian hari TeraLoka menjalin kerja sama dengan instansi tertentu untuk menindaklanjuti laporan, hal itu akan diberitahukan secara jelas pada layanan dan ketentuan ini akan diperbarui.

## 4. Arti "verifikasi"

Verifikasi oleh TeraLoka adalah **pengecekan kewajaran dan kelengkapan** laporan (mis. lokasi masuk akal, konten tidak melanggar aturan, ada cukup informasi). Verifikasi **bukan**:

- putusan hukum atau pembuktian atas suatu tuduhan;
- pernyataan bahwa suatu pihak bersalah;
- jaminan bahwa masalah akan diselesaikan.

Label "terverifikasi" hanya berarti laporan layak ditampilkan, bukan pembenaran atas isinya.

## 5. Identitas pelapor & anonimitas

Saat membuat laporan, Anda memilih tingkat identitas:

- **Anonim** — nama Anda tidak ditampilkan ke publik.
- **Nama samaran (pseudonym)** — laporan tampil dengan nama samaran pilihan Anda.
- **Nama terang** — laporan tampil dengan nama Anda.

**Catatan penting soal "anonim":** anonim berarti identitas Anda tidak ditampilkan kepada publik. Namun untuk keamanan dan pencegahan penyalahgunaan, sistem tetap dapat memproses data teknis tertentu (mis. alamat IP). Selain itu, **laporan anonim tidak dapat ditautkan kembali ke akun Anda** — artinya Anda tidak dapat memantau atau mengelolanya melalui halaman "Laporan Saya". Jika Anda ingin memantau laporan, gunakan nama samaran atau nama terang.

Pemrosesan Data Pribadi selengkapnya diatur dalam Kebijakan Privasi.

## 6. Aturan isi laporan

Laporkan **fakta yang Anda lihat atau alami**, sertai bukti bila ada. Anda bertanggung jawab penuh atas kebenaran laporan Anda.

**Menyebut nama pihak tertentu:**
- **Boleh** menyebut **pejabat/lembaga publik dalam kapasitas jabatannya** sepanjang relevan dengan kepentingan publik dan disampaikan secara faktual.
- **Tidak boleh** menyebut nama, atau menampilkan identitas, **warga/individu pribadi** dengan cara yang merendahkan, menuduh, atau melanggar privasinya.

**Dilarang** (lihat Pedoman Komunitas untuk daftar lengkap): fitnah dan tuduhan tanpa dasar, ujaran kebencian/SARA, hoaks, membocorkan data pribadi orang lain (*doxing*), serta konten ilegal lainnya. Pelanggaran dapat berimplikasi pidana, termasuk berdasarkan UU ITE.

## 7. Foto & bukti

Bila melampirkan foto, pastikan: relevan dengan laporan; bukan milik/karya orang lain tanpa hak; dan **tidak menampilkan wajah, pelat nomor, atau data pribadi individu** yang dapat merugikan mereka, kecuali memang menjadi inti kepentingan publik yang sah. Ikuti panduan foto bukti pada layanan.

## 8. Tanggung jawab & penafian

1. Laporan dan *civic feedback* adalah **pernyataan pelapor**, bukan pernyataan, pendapat, atau temuan resmi TeraLoka.
2. TeraLoka **tidak menjamin** kebenaran isi laporan, tidak menjamin masalah akan ditindaklanjuti atau diselesaikan oleh pihak mana pun, dan tidak bertanggung jawab atas tindakan atau kelambanan pihak ketiga.
3. Segala akibat hukum yang timbul dari isi laporan yang melanggar hukum menjadi **tanggung jawab pelapor**.

## 9. Moderasi, Hak Jawab & penurunan

Laporan dapat ditinjau sebelum tampil (moderasi pra-publikasi), ditolak, disunting, atau diturunkan bila melanggar ketentuan. Pihak yang merasa dirugikan oleh suatu laporan berhak mengajukan **Hak Jawab atau koreksi** melalui ${c.emailHakJawab} (lihat mekanisme di Pedoman Komunitas).

## 10. Perubahan & kontak

Ketentuan ini dapat diperbarui; perubahan material diberitahukan melalui Platform. Pertanyaan: ${c.emailKontak}.

---

*Lampiran atas Syarat & Ketentuan TeraLoka. Bukan nasihat hukum.*`
}
