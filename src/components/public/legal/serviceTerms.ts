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

/* ════════════════════════════════════════════════════════════════
   KETENTUAN FITUR SOS DARURAT (BALAPOR)
   Model LOCKED — terverifikasi terhadap mekanisme:
   - SOS → notifikasi tim TeraLoka (WA admin) + peta darurat publik (lokasi opt-in)
   - TeraLoka = penyampai/penghubung, BUKAN penolong (tidak ada tim/armada lapangan)
   - TANPA jaminan respons; 112 = jalur pertolongan utama
   - Instansi (jika bergabung kelak via SaaS) = personel instansi yang memantau,
     menggunakan kewenangan mereka — bukan TeraLoka
   ════════════════════════════════════════════════════════════════ */
export function sosDoc(c: LegalConfig): string {
  return `Versi 1.0 — berlaku sejak ${c.tanggalBerlaku}

Ketentuan ini berlaku khusus untuk fitur **SOS Darurat** dan merupakan tambahan atas Syarat & Ketentuan serta Ketentuan Layanan BALAPOR. Bila ada pertentangan, ketentuan ini yang berlaku untuk fitur SOS.

## 1. SOS bukan layanan darurat — hubungi 112 lebih dulu

**SOS TeraLoka BUKAN layanan tanggap darurat dan BUKAN pengganti panggilan darurat resmi.** Untuk keadaan yang mengancam jiwa atau keselamatan, **segera hubungi kanal darurat resmi** lebih dulu:

- **112** — Panggilan darurat nasional (gratis, aktif 24 jam, diteruskan operator ke instansi terdekat)
- **110** — Kepolisian
- **113** — Pemadam Kebakaran
- **115** — Basarnas (SAR / kecelakaan laut)
- **119** — Gawat darurat medis

Jangan menunda menghubungi nomor di atas demi menunggu tanggapan atas siaran SOS Anda.

## 2. Apa yang sebenarnya dilakukan SOS

Saat Anda mengirim SOS, TeraLoka **menyampaikan siaran darurat Anda** ke dua tujuan:

1. **Tim TeraLoka**, melalui pemberitahuan internal; dan
2. **Peta darurat publik** TeraLoka, agar warga di sekitar lokasi dapat melihat dan—bila memungkinkan—saling membantu.

SOS adalah **alat penyiaran dan dokumentasi**, bukan pengiriman tim penyelamat. TeraLoka **tidak memiliki armada, petugas lapangan, ambulans, atau unit penyelamat**, dan **tidak memiliki kewenangan** untuk mengerahkan instansi darurat.

## 3. Tidak ada jaminan respons

TeraLoka berupaya menyampaikan siaran Anda secepat mungkin, **tetapi tidak menjamin** siaran akan terbaca, ditanggapi, atau ditindaklanjuti dalam waktu tertentu—atau sama sekali. Pemberitahuan dapat tertunda atau gagal karena keterbatasan jaringan, perangkat, atau operasional.

Karena itu, **panggilan ke 112 atau nomor darurat resmi tetap menjadi jalur pertolongan utama Anda.**

## 4. Lokasi & privasi

SOS dapat menyertakan lokasi GPS Anda **hanya bila Anda mengizinkannya**. Bila ditampilkan di peta publik, titik lokasi dapat dikaburkan demi keamanan Anda. Anda tetap dapat mengirim SOS tanpa lokasi. Pemrosesan Data Pribadi selengkapnya diatur dalam Kebijakan Privasi.

## 5. Gunakan dengan jujur

SOS hanya untuk **keadaan darurat yang nyata**. Siaran SOS palsu, iseng, atau menyesatkan **dilarang keras** — selain membahayakan dan membuang sumber daya warga, hal itu dapat berakibat pemblokiran akun dan implikasi hukum (mis. pemberitahuan keadaan bahaya palsu).

## 6. Rencana keterlibatan instansi

TeraLoka berharap, seiring pertumbuhan platform, instansi terkait (mis. pemadam kebakaran, SAR, kepolisian, layanan medis) bergabung untuk **memantau siaran darurat secara langsung** melalui akun mereka sendiri. Bila itu terjadi:

- yang memantau dan merespons adalah **personel instansi tersebut**, dengan kewenangan mereka — **bukan TeraLoka**;
- TeraLoka tetap berperan sebagai **penyampai/penghubung** siaran, bukan pihak penolong;
- perubahan ini akan **diberitahukan secara jelas** dan ketentuan ini diperbarui.

Sampai pemberitahuan resmi tersebut ada, anggaplah **belum ada instansi yang memantau** siaran SOS secara khusus.

## 7. Tanggung jawab & penafian

1. SOS disediakan **"sebagaimana adanya"** tanpa jaminan ketersediaan, kecepatan, atau hasil.
2. TeraLoka **tidak bertanggung jawab** atas keterlambatan, ketiadaan, atau kegagalan pertolongan, maupun atas tindakan/kelambanan pihak ketiga (termasuk warga lain dan instansi).
3. Sepanjang diizinkan hukum, Anda menggunakan SOS **atas risiko sendiri**, dengan kesadaran bahwa kanal darurat resmi adalah jalur pertolongan utama.

## 8. Perubahan & kontak

Ketentuan ini dapat diperbarui; perubahan material diberitahukan melalui Platform. Pertanyaan: ${c.emailKontak}.

---

*Lampiran atas Syarat & Ketentuan TeraLoka. Bukan nasihat hukum.*`
}

/* ════════════════════════════════════════════════════════════════
   KETENTUAN LAYANAN BADONASI
   Dokumen MITIGASI (jujur) — bukan klaim legalitas/izin.
   Model terverifikasi terhadap kode:
   - Dana donasi LANGSUNG Donatur → rekening kampanye (Penggalang). TeraLoka tidak menahan dana.
   - TeraLoka = fasilitator teknologi + verifikasi awal, BUKAN penyelenggara PUB, BUKAN pemegang/penyalur dana.
   - Fee + kode unik ikut masuk ke rekening kampanye (pre-yayasan jadi pendapatan penggalang).
   - Tanggung jawab + kewajiban perizinan digeser ke Penggalang (sejauh diizinkan hukum).
   Dasar: Permensos 8/2021 (Pasal 1, 3, 4, 5) jo. UU 9/1961 tentang PUB; UU PDP; UU ITE.
   CATATAN PASCA-YAYASAN: bila fee mulai disetor ke rekening TeraLoka, Section 5 WAJIB di-update
   (dari "masuk rekening kampanye" → "fee disetor ke entitas TeraLoka") + ranah pajak/pembukuan.
   ════════════════════════════════════════════════════════════════ */
export function badonasiDoc(c: LegalConfig): string {
  return `Versi 1.0 — berlaku sejak ${c.tanggalBerlaku}

Ketentuan ini berlaku khusus untuk layanan BADONASI dan merupakan tambahan atas Syarat & Ketentuan serta Pedoman Komunitas TeraLoka. Bila ada pertentangan, ketentuan ini yang berlaku untuk BADONASI. Dengan menggunakan BADONASI — baik sebagai **Penggalang** maupun **Donatur** — Anda menyetujui ketentuan ini.

## 1. Peran TeraLoka: fasilitator, bukan penyelenggara

BADONASI adalah layanan teknologi yang mempertemukan **Penggalang** (pihak yang mengajukan dan menjalankan penggalangan dana) dengan **Donatur** (pihak yang menyumbang), untuk membantu warga Maluku Utara.

Dalam BADONASI, TeraLoka berperan **semata-mata sebagai penyedia platform teknologi dan verifikasi awal**. TeraLoka **bukan**:

- penyelenggara pengumpulan uang atau barang;
- pengelola, penampung, atau penyalur dana donasi;
- pihak yang menjamin keberhasilan, penyaluran, atau penggunaan dana.

**Dana donasi tidak pernah masuk, transit, atau ditahan di rekening TeraLoka.** Donasi ditransfer **langsung dari Donatur ke rekening yang ditetapkan untuk kampanye** dan dikelola oleh Penggalang.

## 2. Tanggung jawab Penggalang

Penggalang adalah **pihak yang bertanggung jawab penuh dan pribadi** atas kampanye yang ia buat, termasuk:

- kebenaran seluruh informasi, cerita, dokumen, dan target dana;
- penerimaan, pengelolaan, penyaluran, dan pertanggungjawaban dana kepada penerima manfaat;
- **pemenuhan seluruh perizinan dan kewajiban hukum yang berlaku** atas kegiatan pengumpulan dana yang ia lakukan, termasuk — bila berlaku — ketentuan mengenai Pengumpulan Uang atau Barang (PUB);
- penyampaian laporan penggunaan dana beserta bukti yang sah.

Dengan membuat kampanye, Penggalang menyatakan bahwa ia berwenang dan memenuhi syarat untuk melakukannya, serta **membebaskan TeraLoka** dari segala tuntutan, kerugian, atau tanggung jawab hukum yang timbul dari kegiatannya.

> **Penting:** Berdasarkan peraturan tentang Pengumpulan Uang atau Barang (UU 9/1961 jo. Permensos 8/2021), penyelenggaraan pengumpulan dana publik tertentu hanya dapat dilakukan oleh organisasi kemasyarakatan berbadan hukum dan/atau memerlukan izin, dengan pengecualian tertentu (mis. zakat, pengumpulan di tempat ibadah, atau gotong royong di lingkungan terbatas). **Penggalang bertanggung jawab menilai dan memenuhi kewajiban perizinan yang berlaku atas kampanyenya.** TeraLoka tidak bertindak sebagai penyelenggara dan tidak mewakili bahwa suatu kampanye telah memenuhi perizinan tersebut.

## 3. Hubungan donasi: langsung Donatur ↔ Penggalang

Donasi merupakan **transaksi langsung antara Donatur dan Penggalang/penerima manfaat**. TeraLoka **bukan pihak** dalam transaksi tersebut, tidak menyalurkan dana, dan tidak menjamin dana akan diterima atau digunakan sesuai tujuan.

Donatur memahami bahwa keputusan menyumbang adalah **keputusan pribadi** berdasarkan informasi yang ditampilkan, dan menanggung sendiri risikonya.

## 4. Verifikasi: artinya & batasnya

TeraLoka melakukan **verifikasi awal** atas kampanye (mis. kelengkapan dokumen, kewajaran cerita, identitas pengaju). Verifikasi ini bertujuan **mengurangi — bukan menghilangkan** — risiko penyalahgunaan.

Label "terverifikasi" **bukan**:

- jaminan bahwa kampanye bebas dari penipuan;
- jaminan bahwa dana akan disalurkan atau digunakan dengan benar;
- pengesahan, rekomendasi, atau penjaminan oleh TeraLoka atas Penggalang maupun kampanyenya.

## 5. Biaya & nominal transfer

Donasi yang sampai ke penerima manfaat bersifat **utuh** — nominal donasi **tidak dipotong**. Yang ditambahkan **di atas** nominal donasi (ditanggung Donatur) dan **ikut masuk ke rekening kampanye yang dikelola Penggalang** terdiri atas:

- **Biaya layanan** untuk operasional teknologi BADONASI;
- **Kode unik** (digit terakhir nominal transfer) untuk pencocokan pembayaran secara otomatis;
- **Dukungan untuk Penggalang (opsional)** — bersifat sukarela, hanya berlaku bila Donatur memilih menambahkannya.

**Seluruh nominal transfer masuk ke rekening kampanye; tidak ada dana yang ditahan di rekening TeraLoka.** Rincian biaya ditampilkan secara transparan sebelum Donatur menyelesaikan donasi.

## 6. Larangan

Dilarang menggunakan BADONASI untuk:

- kampanye palsu, menyesatkan, atau melebih-lebihkan kebutuhan;
- pengumpulan dana untuk kegiatan yang melanggar hukum, termasuk radikalisme, terorisme, atau hal lain yang bertentangan dengan hukum;
- penyalahgunaan identitas atau dokumen orang lain;
- hal lain yang dilarang dalam Pedoman Komunitas atau peraturan yang berlaku.

Pelanggaran dapat berakibat penurunan kampanye, pemblokiran akun, dan — bila ada indikasi pidana — pelaporan kepada pihak berwenang. **Penyalahgunaan dana donasi dapat berimplikasi pidana (mis. penipuan atau penggelapan) yang menjadi tanggung jawab Penggalang.**

## 7. Hak Donatur & penanganan dugaan penyalahgunaan

- Donatur berhak memperoleh informasi yang jujur dan rincian biaya sebelum menyumbang.
- Donatur dapat **melaporkan kampanye yang mencurigakan** melalui kanal yang tersedia; laporan ditinjau tim TeraLoka.
- Bila ditemukan indikasi penyalahgunaan, TeraLoka dapat menurunkan kampanye dan menghentikan akses Penggalang. Namun, karena **dana tidak berada pada TeraLoka**, pemulihan dana berada di luar kendali TeraLoka dan menjadi urusan antara Donatur, Penggalang, dan/atau aparat penegak hukum.

## 8. Batasan tanggung jawab

Sepanjang diizinkan hukum, TeraLoka **tidak bertanggung jawab** atas:

- kebenaran isi kampanye maupun tindakan/kelalaian Penggalang;
- gagal, terlambat, atau disalahgunakannya penyaluran dana;
- kerugian yang timbul dari donasi yang Anda berikan.

Layanan BADONASI disediakan **"sebagaimana adanya"** tanpa jaminan hasil.

## 9. Data pribadi

Pemrosesan data pribadi (mis. identitas pengaju, kontak, bukti transfer) diatur dalam Kebijakan Privasi. Dokumen identitas sensitif diakses terbatas oleh tim verifikasi.

## 10. Perubahan & kontak

Ketentuan ini dapat diperbarui; perubahan material diberitahukan melalui Platform. Pertanyaan atau laporan: ${c.emailKontak}.

---

*Lampiran atas Syarat & Ketentuan TeraLoka. Bukan nasihat hukum.*`
}
