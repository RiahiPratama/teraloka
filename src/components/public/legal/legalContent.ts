// src/content/legal/legalContent.ts
//
// SINGLE SOURCE OF TRUTH untuk 4 dokumen legal footer TeraLoka.
// Edit teks hukum di sini → semua halaman (/privasi /syarat /pedoman /lisensi) ikut update.
//
// ⚙️ ISI SEBELUM GO-LIVE: lengkapi LEGAL_CONFIG di bawah.
// 🏛️ SWAP BADAN HUKUM: ketika PT/Yayasan terbentuk, cukup ubah `pengelolaStatus`
//    dan `pengelolaNama` di LEGAL_CONFIG — seluruh dokumen merujuk ke variabel ini.

export interface LegalConfig {
  /** Tanggal dokumen mulai berlaku, mis. '1 Juli 2026' */
  tanggalBerlaku: string;
  /** Nama pihak pengendali/pengelola yang ditampilkan publik (BUKAN nama legal founder) */
  pengelolaNama: string;
  /** Paragraf status badan hukum — satu-satunya tempat yang di-swap saat PT/Yayasan berdiri */
  pengelolaStatus: string;
  emailPrivasi: string;
  emailKontak: string;
  emailHakJawab: string;
  alamat: string;
  kotaPengadilan: string;
}

export const LEGAL_CONFIG: LegalConfig = {
  tanggalBerlaku: '[ISI TANGGAL BERLAKU]',
  pengelolaNama: 'Tim Pengelola TeraLoka',
  pengelolaStatus:
    'TeraLoka saat ini dikelola sebagai sebuah inisiatif yang sedang dalam proses ' +
    'pembentukan badan hukum di Indonesia. Sampai badan hukum tersebut resmi berdiri, ' +
    'fungsi pengelolaan dijalankan oleh tim pengelola TeraLoka, dan akan dialihkan kepada ' +
    'badan hukum yang dibentuk segera setelah pendiriannya selesai. Perubahan ini akan ' +
    'diberitahukan melalui pembaruan dokumen ini.',
  emailPrivasi: 'privasi@teraloka.com',
  emailKontak: 'halo@teraloka.com',
  emailHakJawab: 'redaksi@teraloka.com',
  alamat: 'Ternate, Maluku Utara, Indonesia',
  kotaPengadilan: 'Ternate',
};

/* ════════════════════════════════════════════════════════════════
   1. KEBIJAKAN PRIVASI  (grounded UU PDP 27/2022)
   ════════════════════════════════════════════════════════════════ */
export function privasiDoc(c: LegalConfig): string {
  return `Versi 1.0 — berlaku sejak ${c.tanggalBerlaku}

## 1. Pendahuluan

TeraLoka ("Platform", "kami") adalah platform digital hiperlokal untuk wilayah Maluku Utara yang menyediakan beragam layanan, antara lain BAKABAR (berita), BALAPOR (laporan warga), BADONASI (penggalangan dana), BAKOS (kos-kosan), BAPASIAR (transportasi), serta layanan lainnya.

Kami menghormati privasi Anda. Kebijakan Privasi ini menjelaskan jenis Data Pribadi yang kami kumpulkan, dasar dan tujuan pemrosesannya, dengan siapa data dibagikan, berapa lama disimpan, serta hak-hak Anda sebagai pemilik data — sebagaimana diatur dalam Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi ("UU PDP") dan peraturan pelaksananya.

Dengan menggunakan Platform, Anda menyatakan telah membaca dan memahami Kebijakan Privasi ini.

## 2. Identitas Pengelola (Pengendali Data Pribadi)

${c.pengelolaStatus}

- **Pengendali Data:** ${c.pengelolaNama}
- **Kontak Privasi:** ${c.emailPrivasi}
- **Alamat Korespondensi:** ${c.alamat}

Kami sengaja bersikap transparan mengenai status badan hukum ini. Transparansi adalah prinsip kami — termasuk soal siapa yang bertanggung jawab atas data Anda.

## 3. Definisi

Mengacu pada UU PDP:

- **Data Pribadi** — data tentang orang perseorangan yang teridentifikasi atau dapat diidentifikasi.
- **Subjek Data Pribadi** — orang perseorangan yang melekat padanya Data Pribadi (yaitu Anda).
- **Pengendali Data Pribadi** — pihak yang menentukan tujuan dan kendali pemrosesan (yaitu ${c.pengelolaNama}).
- **Prosesor Data Pribadi** — pihak yang memroses data atas nama Pengendali (lihat Bagian 7).
- **Pemrosesan** — pemerolehan, pengumpulan, pengolahan, penyimpanan, perbaikan, penampilan, transfer, penyebarluasan, hingga penghapusan Data Pribadi (Pasal 16 UU PDP).

## 4. Data Pribadi yang Kami Kumpulkan

### 4.1 Data yang Anda berikan langsung
- **Nomor telepon (WhatsApp)** — untuk verifikasi dan autentikasi akun melalui kode OTP. Ini identitas utama akun Anda.
- **Nama tampilan** yang Anda pilih.
- **Konten yang Anda unggah** — teks, foto, dan informasi saat membuat laporan (BALAPOR), berdonasi (BADONASI), memasang listing, atau berkomentar.

### 4.2 Data lokasi
- **Koordinat lokasi (GPS)** — saat Anda membuat laporan BALAPOR atau menggunakan fitur berbasis wilayah (cuaca, jadwal salat). Lokasi hanya diambil dengan persetujuan Anda melalui izin perangkat.

### 4.3 Data teknis (otomatis)
- Jenis perangkat, sistem operasi, peramban; alamat IP dan log akses; data interaksi dan analitik; cookie dan teknologi serupa (Bagian 11).

### 4.4 Data spesifik per layanan
- **BALAPOR** — isi laporan, foto, lokasi, status verifikasi. Sebagian data dapat ditampilkan publik.
- **BADONASI** — nama donatur (atau anonim bila dipilih), nominal, bukti transaksi. Dana donasi disetorkan langsung ke rekening mitra penyelenggara, bukan ke TeraLoka.
- **BAKOS / Properti / Kendaraan / Jasa** — data listing dan kontak yang Anda cantumkan.

> Kami tidak meminta dan tidak menyimpan Nomor Induk Kependudukan (NIK), data biometrik, atau Data Pribadi spesifik lainnya dari pengguna umum, kecuali diatur khusus dalam suatu layanan dengan persetujuan terpisah.

## 5. Dasar Pemrosesan

Sesuai Pasal 20 UU PDP, kami memroses data berdasarkan satu atau lebih dasar berikut:

| Dasar | Penerapan |
|---|---|
| Persetujuan | Saat Anda mendaftar, mengaktifkan lokasi, atau menyetujui kebijakan ini. |
| Pelaksanaan perjanjian | Untuk menjalankan layanan yang Anda minta. |
| Pemenuhan kewajiban hukum | Saat diwajibkan peraturan perundang-undangan. |
| Kepentingan yang sah | Untuk keamanan Platform dan pencegahan penyalahgunaan, secara proporsional. |

Anda berhak menarik persetujuan kapan saja (Bagian 9).

## 6. Tujuan Pemrosesan

1. Membuat dan mengautentikasi akun (OTP WhatsApp).
2. Menyediakan dan mengoperasikan layanan.
3. Memetakan dan memverifikasi laporan warga (BALAPOR).
4. Menampilkan konten publik relevan dengan wilayah Anda.
5. Menjaga keamanan, mencegah penipuan dan penyalahgunaan.
6. Menganalisis dan meningkatkan layanan (analitik agregat).
7. Berkomunikasi terkait layanan (notifikasi transaksional).

Kami tidak menjual Data Pribadi Anda.

## 7. Pembagian Data & Penyedia Pihak Ketiga

| Penyedia | Fungsi | Lokasi |
|---|---|---|
| Basis data terkelola | Penyimpanan data Platform | Singapura |
| Hosting/komputasi | Menjalankan situs & aplikasi | Luar negeri |
| Gateway WhatsApp/OTP | Pengiriman kode verifikasi | Indonesia/luar negeri |
| Analitik & pemantauan error | Memahami penggunaan & kestabilan | Luar negeri |
| Mitra penyelenggara BADONASI | Menerima & menyalurkan dana donasi | Indonesia |

> **Transfer data ke luar Indonesia.** Sebagian pemrosesan dilakukan penyedia di luar Indonesia (mis. basis data di Singapura). Sesuai Pasal 56 UU PDP, kami memastikan penerima memiliki tingkat pelindungan yang setara/memadai, atau mengandalkan persetujuan Anda.

Kami juga dapat mengungkapkan data bila diwajibkan hukum, perintah pengadilan, atau permintaan sah aparat penegak hukum.

## 8. Penyimpanan & Retensi

Data disimpan selama akun aktif atau selama diperlukan untuk tujuan pemrosesan; dapat dipertahankan lebih lama bila diwajibkan hukum atau untuk audit, keamanan, dan penyelesaian sengketa. Setelah masa retensi berakhir atau atas permintaan penghapusan yang sah, data dihapus atau dianonimkan.

## 9. Hak Anda sebagai Subjek Data Pribadi

Sesuai Pasal 5 sampai dengan Pasal 13 UU PDP, Anda berhak:

1. **Hak atas informasi** atas identitas pengendali, dasar hukum, tujuan, dan akuntabilitas (Pasal 5).
2. **Memperbaiki & memperbarui** data yang tidak akurat (Pasal 6).
3. **Mengakses & memperoleh salinan** data Anda (Pasal 7).
4. **Mengakhiri pemrosesan, menghapus, dan/atau memusnahkan** data (Pasal 8).
5. **Menarik kembali persetujuan** (Pasal 9).
6. **Mengajukan keberatan** atas keputusan yang sepenuhnya otomatis, termasuk pemrofilan (Pasal 10).
7. **Menunda atau membatasi** pemrosesan secara proporsional (Pasal 11).
8. **Portabilitas data** dalam format yang lazim terbaca sistem elektronik (Pasal 12–13).

**Cara mengajukan:** sesuai Pasal 14 UU PDP, permohonan diajukan tertulis ke ${c.emailPrivasi}. Kami menindaklanjuti dalam waktu yang wajar.

**Pengecualian:** sebagian hak dapat dikecualikan untuk kepentingan pertahanan/keamanan nasional, penegakan hukum, kepentingan umum penyelenggaraan negara, pengawasan sektor jasa keuangan, atau statistik dan penelitian ilmiah (Pasal 15 UU PDP).

## 10. Data Anak & Pengguna di Bawah Umur

Layanan ditujukan untuk pengguna minimal 17 tahun atau yang sudah/pernah menikah. Pemrosesan data anak dilakukan dengan persetujuan orang tua/wali sesuai UU PDP. Bila kami mengetahui telah mengumpulkan data anak tanpa dasar sah, kami akan menghapusnya.

## 11. Cookie & Teknologi Serupa

Kami menggunakan cookie dan penyimpanan lokal seperlunya untuk autentikasi (mis. token sesi), preferensi, dan analitik agregat. Anda dapat mengatur cookie via peramban; menonaktifkan cookie tertentu dapat memengaruhi fungsi layanan.

## 12. Keamanan

Kami menerapkan pengamanan yang wajar: pembatasan akses berbasis peran, autentikasi berbasis token, dan enkripsi data dalam transit. Tidak ada sistem yang sepenuhnya kebal; bila terjadi kegagalan pelindungan data yang berdampak pada Anda, kami memberitahukan sesuai kewajiban UU PDP.

## 13. Perubahan Kebijakan

Kami dapat memperbarui kebijakan ini. Perubahan material diberitahukan melalui Platform. Tanggal berlaku terbaru tercantum di atas.

## 14. Kontak & Pengaduan

- **Email:** ${c.emailPrivasi}
- **Alamat:** ${c.alamat}

Apabila pengaduan tidak terselesaikan, Anda dapat menempuh upaya hukum sesuai peraturan perundang-undangan, termasuk melalui lembaga berwenang di bidang pelindungan data pribadi.

---

*Disusun mengacu pada UU No. 27 Tahun 2022. Bukan nasihat hukum; akan disesuaikan saat badan hukum pengelola resmi terbentuk.*`;
}

/* ════════════════════════════════════════════════════════════════
   2. SYARAT & KETENTUAN
   ════════════════════════════════════════════════════════════════ */
export function syaratDoc(c: LegalConfig): string {
  return `Versi 1.0 — berlaku sejak ${c.tanggalBerlaku}

## 1. Penerimaan Ketentuan

Dengan mengakses atau menggunakan TeraLoka ("Platform") — termasuk layanan BAKABAR, BALAPOR, BADONASI, BAKOS, BAPASIAR, dan lainnya — Anda ("Pengguna") menyatakan menyetujui Syarat & Ketentuan ini beserta Kebijakan Privasi dan Pedoman Komunitas yang merupakan satu kesatuan. Jika tidak setuju, mohon tidak menggunakan Platform.

## 2. Tentang Pengelola

${c.pengelolaStatus}

- **Kontak:** ${c.emailKontak}
- **Alamat:** ${c.alamat}

## 3. Definisi

- **Platform** — situs web, aplikasi, dan layanan TeraLoka.
- **Layanan** — fitur di Platform. Sebagian Layanan memiliki Ketentuan Layanan tersendiri yang berlaku sebagai tambahan.
- **Konten Pengguna** — materi yang diunggah, dikirim, atau ditampilkan oleh Pengguna.

## 4. Kelayakan Pengguna

Anda harus berusia minimal 17 tahun, atau sudah/pernah menikah, atau menggunakan Platform di bawah pengawasan orang tua/wali. Anda menyatakan memenuhi syarat ini dan memberikan informasi yang benar.

## 5. Akun & Keamanan

1. Pendaftaran dan autentikasi dilakukan melalui verifikasi nomor WhatsApp (OTP).
2. Anda bertanggung jawab menjaga kerahasiaan akses akun dan perangkat.
3. Seluruh aktivitas melalui akun Anda menjadi tanggung jawab Anda, kecuali terbukti sebaliknya.
4. Beri tahu kami segera bila ada penggunaan tanpa izin.

## 6. Aturan Penggunaan

Anda dilarang:
- Menggunakan Platform untuk tujuan melanggar hukum.
- Mengunggah konten yang melanggar Pedoman Komunitas (fitnah, ujaran kebencian, SARA, hoaks, pornografi, dsb).
- Menyebarkan Data Pribadi orang lain tanpa hak.
- Melakukan peretasan, penyebaran malware, scraping otomatis tanpa izin, atau merusak sistem.
- Menyamar sebagai pihak lain atau memberi informasi palsu.
- Menyalahgunakan Layanan untuk penipuan, termasuk penggalangan dana fiktif.

## 7. Konten Pengguna

1. Anda tetap pemilik Konten Pengguna yang diunggah.
2. Dengan mengunggah, Anda memberi kami lisensi non-eksklusif, bebas royalti, dan dapat dialihkan untuk menyimpan, menampilkan, mereproduksi, dan mendistribusikan Konten sepanjang diperlukan untuk mengoperasikan dan mempromosikan Layanan (lihat Lisensi Data).
3. Anda menjamin memiliki hak atas Konten dan bahwa Konten tidak melanggar hak pihak lain atau hukum.
4. Kami berhak — namun tidak berkewajiban — meninjau, memoderasi, dan menghapus Konten yang melanggar, termasuk moderasi pra-publikasi pada layanan tertentu (mis. BALAPOR).

## 8. Layanan & Ketentuan Tambahan

Sebagian Layanan diatur lebih lanjut oleh Ketentuan Layanan tersendiri:
- **BAKABAR** — layanan informasi/media warga.
- **BALAPOR** — pelaporan warga dengan verifikasi mandiri.
- **BADONASI** — TeraLoka berfungsi sebagai platform fasilitator; dana donasi disetorkan langsung ke rekening mitra penyelenggara, bukan ke TeraLoka.

Bila terdapat pertentangan, Ketentuan Layanan spesifik berlaku untuk Layanan terkait.

## 9. Penafian (Disclaimer)

1. Platform disediakan "sebagaimana adanya" dan "sebagaimana tersedia". Kami tidak menjamin Layanan bebas gangguan, kesalahan, atau selalu tersedia.
2. Konten Pengguna (laporan, komentar) bukan pernyataan resmi Pengelola. Kami tidak menjamin kebenaran, kelengkapan, atau keandalannya.
3. Informasi pada Platform tidak menggantikan nasihat profesional (hukum, medis, keuangan).

## 10. Batasan Tanggung Jawab

Sepanjang diizinkan hukum, Pengelola tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial dari penggunaan Platform, termasuk akibat Konten Pengguna pihak lain, transaksi dengan mitra, atau gangguan layanan pihak ketiga. Tanggung jawab atas transaksi donasi berada pada mitra penyelenggara yang menerima dan menyalurkan dana, sesuai Ketentuan Layanan BADONASI.

## 11. Hak Kekayaan Intelektual

Merek, logo, desain, dan kode Platform adalah milik Pengelola dan/atau pemberi lisensinya. Dilarang menyalin, memodifikasi, atau menggunakannya tanpa izin tertulis. Penggunaan data dan konten diatur dalam Lisensi Data.

## 12. Penangguhan & Penghentian

Kami dapat menangguhkan atau menghentikan akses akun yang melanggar ketentuan, menyalahgunakan, atau menimbulkan risiko hukum/keamanan, dengan atau tanpa pemberitahuan bila keadaan mendesak. Anda dapat berhenti kapan saja.

## 13. Hukum yang Berlaku & Penyelesaian Sengketa

1. Diatur oleh hukum Republik Indonesia.
2. Sengketa diupayakan diselesaikan secara musyawarah terlebih dahulu.
3. Bila tidak tercapai, diselesaikan melalui pengadilan yang berwenang di wilayah hukum ${c.kotaPengadilan}, Indonesia.

## 14. Perubahan Ketentuan

Kami dapat memperbarui ketentuan ini. Perubahan material diberitahukan melalui Platform. Penggunaan setelah perubahan berlaku berarti Anda menerimanya.

## 15. Kontak

- **Email:** ${c.emailKontak}
- **Alamat:** ${c.alamat}

---

*Perjanjian antara Pengguna dan Pengelola TeraLoka. Bukan nasihat hukum; akan disesuaikan saat badan hukum pengelola resmi terbentuk.*`;
}

/* ════════════════════════════════════════════════════════════════
   3. PEDOMAN KOMUNITAS  (mitigasi UU ITE + hak jawab)
   ════════════════════════════════════════════════════════════════ */
export function pedomanDoc(c: LegalConfig): string {
  return `Versi 1.0 — berlaku sejak ${c.tanggalBerlaku}

## 1. Semangat Komunitas

TeraLoka dibangun sebagai ruang sipil untuk Maluku Utara — tempat warga berbagi informasi, melaporkan masalah, dan bergerak bersama. Pedoman ini menjaga ruang itu tetap aman, faktual, dan saling menghormati. Berlaku untuk semua Konten Pengguna: laporan BALAPOR, komentar, listing, kampanye, dan kontribusi lainnya.

## 2. Yang Kami Dorong

- **Berbasis fakta.** Sampaikan apa yang benar-benar Anda lihat/alami; sertakan bukti bila ada.
- **Konstruktif.** Kritik boleh tajam, tapi tujukan pada masalah, bukan menyerang pribadi.
- **Menghormati privasi** orang lain.
- **Relevan secara lokal** bagi warga Maluku Utara.

## 3. Yang Dilarang

Anda dilarang memuat konten yang:

1. **Memfitnah atau mencemarkan nama baik** — tuduhan tanpa dasar terhadap orang/lembaga. Perbuatan ini dapat melanggar Pasal 27A dan Pasal 45 UU ITE (sebagaimana diubah, termasuk oleh UU No. 1 Tahun 2024) serta ketentuan pidana lain.
2. **Ujaran kebencian & SARA** — menyerang atau menghasut kebencian atas dasar suku, agama, ras, atau antargolongan.
3. **Hoaks / disinformasi** yang menyesatkan atau menimbulkan keonaran.
4. **Membocorkan Data Pribadi orang lain** (NIK, alamat lengkap, nomor telepon) tanpa hak.
5. **Pornografi, kekerasan grafis, atau konten yang membahayakan anak.**
6. **Penipuan** — termasuk penggalangan dana fiktif atau klaim palsu.
7. **Melanggar hak kekayaan intelektual** pihak lain.
8. **Spam, manipulasi, atau otomatisasi** yang mengganggu.
9. **Konten ilegal lainnya** menurut hukum Indonesia.

## 4. Ketentuan Khusus Laporan Warga (BALAPOR)

Karena laporan dapat menyangkut nama orang/lembaga, berlaku aturan tambahan:

- **Laporkan fakta, bukan tuduhan.** Uraikan kejadian, lokasi, dan dampak — bukan menuduh tindak pidana tanpa bukti.
- **Moderasi pra-publikasi.** Sebagian laporan ditinjau sebelum tampil publik. Verifikasi kami adalah pengecekan kewajaran dan kelengkapan — bukan putusan hukum atau pembenaran atas tuduhan.
- **Pihak yang disebut berhak menanggapi** (lihat Hak Jawab, Bagian 5).
- Laporan yang melanggar Pedoman ini akan ditolak atau diturunkan.

## 5. Hak Jawab & Koreksi

Jika Anda merasa dirugikan oleh suatu konten (laporan, artikel, atau komentar):

1. **Hak Koreksi** — meminta perbaikan atas kekeliruan fakta.
2. **Hak Jawab** — mengirim tanggapan/klarifikasi yang kami tampilkan secara proporsional bersama konten terkait.
3. **Permintaan Penurunan (Takedown)** — konten yang melanggar hukum atau Pedoman dapat diturunkan.

**Cara mengajukan:** kirim ke ${c.emailHakJawab} dengan menyebutkan tautan konten, bagian yang dipermasalahkan, dan tanggapan/koreksi Anda. Kami meninjau dan menindaklanjuti dalam waktu yang wajar.

## 6. Moderasi & Penegakan

Tergantung berat dan pengulangan pelanggaran, kami dapat: memberi peringatan; menurunkan atau menyunting konten; menangguhkan atau menghentikan akun; meneruskan ke aparat penegak hukum bila menyangkut dugaan tindak pidana. Kami berupaya adil dan proporsional, namun berhak bertindak segera untuk konten berisiko tinggi.

## 7. Melaporkan Pelanggaran

Laporkan melalui fitur pelaporan di Platform atau email ${c.emailKontak}. Sertakan tautan dan alasan. Identitas pelapor kami jaga sewajarnya.

## 8. Banding

Jika Anda menilai tindakan moderasi keliru, ajukan banding melalui ${c.emailKontak} dalam 14 hari. Kami akan meninjau ulang.

## 9. Perubahan

Pedoman ini dapat diperbarui sewaktu-waktu. Perubahan material diberitahukan melalui Platform.

---

*Bagian tak terpisahkan dari Syarat & Ketentuan TeraLoka. Bukan nasihat hukum.*`;
}

/* ════════════════════════════════════════════════════════════════
   4. LISENSI DATA  (atribusi pihak ketiga + lisensi konten)
   ════════════════════════════════════════════════════════════════ */
export function lisensiDoc(c: LegalConfig): string {
  return `Versi 1.0 — berlaku sejak ${c.tanggalBerlaku}

Dokumen ini menjelaskan kepemilikan, lisensi, dan atribusi atas data serta konten di Platform TeraLoka.

## 1. Lingkup

Mengatur: data dan konten yang kami sediakan (editorial, agregat, antarmuka); konten yang Anda unggah (Konten Pengguna); dan data pihak ketiga yang kami tampilkan dengan atribusi.

## 2. Konten Editorial (BAKABAR)

1. Artikel, ringkasan, dan materi editorial yang diproduksi tim/kontributor TeraLoka dilindungi hak cipta sesuai UU No. 28 Tahun 2014 tentang Hak Cipta.
2. Anda boleh membaca, menautkan, dan membagikan tautan secara wajar untuk keperluan non-komersial dengan mencantumkan sumber "TeraLoka — BAKABAR".
3. Dilarang menyalin utuh, mempublikasikan ulang secara massal, atau menggunakan secara komersial tanpa izin tertulis.
4. Konten kontributor tetap menghormati hak moral pencipta.

## 3. Konten Pengguna (UGC)

1. Anda tetap pemilik konten yang diunggah (foto laporan, teks, listing, dll).
2. Dengan mengunggah, Anda memberi TeraLoka lisensi non-eksklusif, bebas royalti, berlaku selama konten tersedia di Platform, untuk menyimpan, menampilkan, mereproduksi, mengadaptasi format, dan mendistribusikan konten sepanjang diperlukan untuk mengoperasikan, mempromosikan, dan menampilkan Layanan.
3. Lisensi ini berakhir saat konten Anda hapus, kecuali untuk salinan cadangan/teknis dan kewajiban hukum.
4. Untuk laporan publik (BALAPOR), Anda memahami konten dapat ditampilkan ke publik dan diberitakan ulang dalam BAKABAR sesuai Ketentuan Layanan terkait.

## 4. Data Agregat & Statistik

Statistik agregat dan anonim (mis. jumlah laporan per wilayah, tren) adalah milik TeraLoka dan dapat digunakan untuk keperluan editorial, riset, dan peningkatan layanan, tanpa mengungkap Data Pribadi individu.

## 5. Atribusi Data Pihak Ketiga

| Data | Sumber | Catatan Lisensi |
|---|---|---|
| Batas & nama wilayah administrasi | Berbasis Permendagri No. 72 Tahun 2019 | Sesuai lisensi sumber data terbuka. |
| Prakiraan cuaca | BMKG | Data publik, atribusi BMKG. |
| Jadwal salat | Layanan perhitungan waktu salat (metode Kemenag RI) | Atribusi penyedia. |
| Peta dasar | Penyedia peta sumber terbuka (mis. OpenStreetMap dan kontributornya) | Tunduk pada lisensi penyedia peta. |

Atribusi penuh ditampilkan pada antarmuka terkait. Kami menghormati lisensi masing-masing sumber.

## 6. Penggunaan yang Dilarang

Tanpa izin tertulis, Anda dilarang: melakukan scraping/pengambilan data otomatis secara massal; membangun ulang basis data dari konten Platform; menggunakan data/konten untuk tujuan melanggar hukum atau merugikan pengguna lain; menghapus atau menyembunyikan atribusi sumber.

## 7. Permintaan Izin & Kerja Sama Data

Untuk penggunaan komersial, riset, atau kerja sama data (lembaga, media, akademisi), ajukan permohonan melalui ${c.emailKontak}. Kami terbuka untuk kolaborasi yang sejalan dengan misi sipil TeraLoka.

## 8. Perubahan

Lisensi Data ini dapat diperbarui. Perubahan material diberitahukan melalui Platform.

---

*Bagian dari Syarat & Ketentuan TeraLoka. Bukan nasihat hukum.*`;
}

/** Registry opsional bila ingin iterasi terprogram */
export const LEGAL_DOCS = {
  privasi: { title: 'Kebijakan Privasi', build: privasiDoc },
  syarat: { title: 'Syarat & Ketentuan', build: syaratDoc },
  pedoman: { title: 'Pedoman Komunitas', build: pedomanDoc },
  lisensi: { title: 'Lisensi Data', build: lisensiDoc },
} as const;
