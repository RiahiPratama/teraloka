import { ChevronDown } from "lucide-react";

const FAQ = [
  ["Berapa tarif BALAJU?", "Tarif dihitung dari jarak: ada tarif dasar plus biaya per kilometer. Contoh di Ternate, di bawah 1 km sekitar Rp11.000 dan jarak 5 km sekitar Rp18.100. Tarif final selalu tampil di app sebelum kamu menekan pesan."],
  ["Kenapa harganya bisa berbeda dari aplikasi besar?", "Driver menerima tarif perjalanan secara utuh, dan fee aplikasi (sekitar 8%) ditampilkan terpisah — bukan dipotong dari penghasilan driver. Tidak ada lonjakan harga mendadak saat ramai."],
  ["Apakah saya bisa memilih driver?", "Ya. Kamu bisa melihat dan memilih driver yang menjemput, bukan dipasangkan secara paksa."],
  ["Apakah driver BALAJU aman?", "Driver BALAJU adalah warga lokal Maluku Utara. Saat ini pendaftaran driver dilakukan dan didata langsung oleh tim. Fitur keselamatan dalam aplikasi sedang kami kembangkan bertahap."],
  ["Wilayah mana saja yang dilayani?", "Saat ini BALAJU aktif di Ternate. Tidore, Sofifi, dan kota lain di Maluku Utara menyusul setelah layanan di Ternate matang."],
  ["Pesannya lewat aplikasi atau WhatsApp?", "Pemesanan utama lewat aplikasi BALAJU yang ringan. WhatsApp tersedia untuk bantuan dan pertanyaan."],
  ["Bagaimana cara menjadi driver?", "Hubungi kami lewat WhatsApp untuk mendaftar. Pendaftaran gratis, penghasilan utuh, dan jadwal fleksibel tanpa target harian."],
] as const;

export function FaqSection() {
  return (
    <section id="faq" className="py-12">
      <div className="mx-auto max-w-3xl px-5">
        <div className="bl-reveal text-center">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--bl-forest)]">FAQ</h2>
          <p className="mt-2 text-3xl font-black text-[var(--bl-forest-d)] lg:text-4xl">Pertanyaan yang sering muncul.</p>
        </div>

        <div className="bl-reveal bl-shadow-soft mt-8 overflow-hidden rounded-[24px] border border-[var(--bl-line)] bg-white">
          {FAQ.map(([q, a], i) => (
            <details key={q} className={`bl-faq ${i > 0 ? "border-t border-[var(--bl-line)]" : ""}`}>
              <summary className="flex items-center justify-between gap-4 px-6 py-4 text-[15px] font-bold text-[var(--bl-forest-d)] transition hover:bg-[var(--bl-cream)]">
                {q}
                <ChevronDown className="bl-faq-chev h-5 w-5 shrink-0 text-[var(--bl-forest)]" />
              </summary>
              <p className="-mt-1 px-6 pb-5 text-sm leading-relaxed text-[var(--bl-muted)]">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
