-- PRE-LAUNCH: Seed Data
-- Jalankan di Supabase SQL Editor setelah semua migration selesai
-- Data contoh untuk demo & testing

-- ============================================================
-- TICKER ITEMS (news ticker berjalan)
-- ============================================================
INSERT INTO public.ticker_items (priority, text, link, source_type, is_active) VALUES
  ('transport', '🚤 Speed Bastiong → Sofifi beroperasi normal', '/speed/bastiong', 'transport', true),
  ('transport', '🚢 Kapal KM Nuku rute Bastiong → Bacan → Obi berangkat besok', '/ship', 'transport', true),
  ('promo', '🎉 Selamat datang di TeraLoka! Super App Maluku Utara', '/', 'manual', true),
  ('promo', '🏘️ Cari kos di Ternate? Cek BAKOS sekarang!', '/kos', 'manual', true),
  ('transport', '⛴️ Ferry Ternate-Sofifi beroperasi normal', '/ferry', 'transport', true),
  ('kemanusiaan', '💚 BASUMBANG: Bantu sesama warga Maluku Utara', '/fundraising', 'manual', true);

-- ============================================================
-- SAMPLE ARTICLES (BAKABAR)
-- ============================================================
INSERT INTO content.articles (title, slug, excerpt, body, category, status, source, published_at, city_id, is_ticker) VALUES
  (
    'TeraLoka Resmi Hadir untuk Warga Maluku Utara',
    'teraloka-resmi-hadir-maluku-utara',
    'Platform super app pertama khusus untuk Maluku Utara kini bisa diakses oleh seluruh warga.',
    '<p>TeraLoka, platform digital pertama yang dirancang khusus untuk kebutuhan warga Maluku Utara, resmi diluncurkan hari ini.</p><p>Dengan tagline "Semua yang kamu butuhkan di Maluku Utara, ADA di sini", TeraLoka menghadirkan 13 layanan dalam satu aplikasi — mulai dari informasi speed boat real-time, pencarian kos, marketplace jasa, hingga galang dana kemanusiaan.</p><p>"Kami membangun TeraLoka dari nol dengan memahami bagaimana warga Maluku Utara sebenarnya hidup dan beraktivitas sehari-hari," ujar pendiri TeraLoka.</p><p>Aplikasi ini bisa diakses langsung melalui browser HP tanpa perlu download dari Play Store.</p>',
    'berita',
    'published',
    'original',
    now(),
    (SELECT id FROM public.cities WHERE slug = 'ternate'),
    true
  ),
  (
    'Cuaca Maluku Utara Hari Ini: Cerah Berawan, Aman untuk Pelayaran',
    'cuaca-maluku-utara-cerah-berawan',
    'BMKG memprediksi cuaca di perairan Maluku Utara aman untuk pelayaran hari ini.',
    '<p>Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) Stasiun Ternate melaporkan kondisi cuaca di wilayah perairan Maluku Utara dalam kondisi cerah berawan.</p><p>Kecepatan angin berkisar 5-10 knot dengan tinggi gelombang 0.5-1 meter. Kondisi ini aman untuk semua jenis pelayaran termasuk speed boat antar pulau.</p><p>Warga yang hendak menyeberang disarankan tetap memantau perkembangan cuaca melalui TeraLoka.</p>',
    'transportasi',
    'published',
    'original',
    now(),
    (SELECT id FROM public.cities WHERE slug = 'ternate'),
    false
  ),
  (
    'Tips Cari Kos Murah di Ternate untuk Mahasiswa Baru',
    'tips-cari-kos-murah-ternate-mahasiswa',
    'Panduan lengkap mencari kos terjangkau di sekitar kampus Ternate.',
    '<p>Bagi mahasiswa baru yang hendak kuliah di Ternate, mencari kos yang sesuai budget bisa jadi tantangan. Berikut tips dari TeraLoka:</p><p><strong>1. Tentukan Budget</strong><br>Kos di Ternate berkisar Rp 400k-2 juta per bulan. Untuk mahasiswa, range Rp 500-800k sudah bisa dapat kamar layak.</p><p><strong>2. Pilih Lokasi Strategis</strong><br>Dekat kampus UNKHAIR atau UMMU bisa hemat ongkos transport harian.</p><p><strong>3. Cek Fasilitas</strong><br>Pastikan cek KM dalam/luar, AC, WiFi, dan aturan jam malam.</p><p><strong>4. Gunakan BAKOS di TeraLoka</strong><br>Bandingkan harga dan fasilitas kos langsung dari HP kamu.</p>',
    'pendidikan',
    'published',
    'original',
    now(),
    (SELECT id FROM public.cities WHERE slug = 'ternate'),
    false
  ),
  (
    'Jadwal Speed Boat Ternate-Tidore: Panduan Lengkap 2026',
    'jadwal-speed-boat-ternate-tidore-2026',
    'Semua yang perlu kamu tahu tentang speed boat rute Ternate-Tidore.',
    '<p>Rute Ternate-Tidore adalah rute speed boat tersibuk di Maluku Utara. Berikut panduan lengkapnya:</p><p><strong>Pelabuhan Keberangkatan:</strong> Bastiong (Ternate)</p><p><strong>Pelabuhan Tujuan:</strong> Rum (Tidore)</p><p><strong>Harga:</strong> Rp 15.000/orang</p><p><strong>Waktu Tempuh:</strong> ~15 menit</p><p><strong>Jam Operasi:</strong> 06.00 - 18.00 WIT</p><p><strong>Sistem:</strong> Antrian (bukan jadwal tetap). Speed berangkat kalau sudah penuh.</p><p>Pantau antrian real-time di TeraLoka BAPASIAR!</p>',
    'transportasi',
    'published',
    'original',
    now(),
    (SELECT id FROM public.cities WHERE slug = 'ternate'),
    false
  ),
  (
    'BASUMBANG: Cara Baru Bantu Sesama di Maluku Utara',
    'basumbang-cara-baru-bantu-sesama',
    'TeraLoka luncurkan fitur galang dana kemanusiaan khusus warga Maluku Utara.',
    '<p>BASUMBANG adalah fitur galang dana di TeraLoka yang dikhususkan untuk kebutuhan kemanusiaan warga Maluku Utara.</p><p><strong>Yang membuat BASUMBANG berbeda:</strong></p><p>• 100% donasi sampai ke penerima — tidak dipotong sepeser pun<br>• Rekening terpisah khusus kemanusiaan<br>• Transfer bank langsung (tanpa gateway fee)<br>• Laporan penggunaan dana transparan dan publik<br>• Verifikasi ketat oleh tim TeraLoka</p><p>BASUMBANG hanya menerima campaign kemanusiaan: kesehatan, bencana, duka, anak yatim, lansia, dan hunian darurat.</p>',
    'sosial',
    'published',
    'original',
    now(),
    (SELECT id FROM public.cities WHERE slug = 'ternate'),
    true
  );

-- ============================================================
-- SHIP ROUTES (Kapal Lokal)
-- ============================================================
INSERT INTO transport.ship_routes (name, origin_port_id, stops, base_price_bed, base_price_cabin, commission_rate, frequency) VALUES
  (
    'Bastiong → Bacan → Obi',
    (SELECT id FROM transport.ports WHERE slug = 'bastiong'),
    '[{"port_name": "Bacan", "order": 1}, {"port_name": "Obi", "order": 2}]',
    200000, 500000, 0.10, 'Hampir tiap hari'
  ),
  (
    'Bastiong → Kayoa',
    (SELECT id FROM transport.ports WHERE slug = 'bastiong'),
    '[{"port_name": "Kayoa", "order": 1}]',
    200000, null, 0.10, '3x seminggu'
  ),
  (
    'Dufa-Dufa → Morotai → Loloda',
    (SELECT id FROM transport.ports WHERE slug = 'dufa-dufa'),
    '[{"port_name": "Morotai", "order": 1}, {"port_name": "Loloda", "order": 2}]',
    250000, 600000, 0.10, '2x seminggu'
  );
