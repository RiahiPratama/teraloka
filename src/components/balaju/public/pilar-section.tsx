import { Scale, MapPin, UserCheck, Heart } from "lucide-react";

export function PilarSection() {
  return (
    <section id="kenapa" className="py-12">
      <div className="mx-auto max-w-6xl px-5">
        <div className="bl-reveal max-w-2xl">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--bl-forest)]">Kenapa BALAJU</h2>
          <p className="mt-3 text-4xl font-black leading-tight text-[var(--bl-forest-d)] lg:text-5xl">Adil buat semua pihak.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {([
            [Scale, "var(--bl-forest)", "var(--bl-forest-10)", "Tarif adil", "Harga jelas sebelum pesan. Tanpa lonjakan mendadak saat ramai."],
            [MapPin, "var(--bl-toska)", "var(--bl-toska-10)", "Driver lokal", "Diantar warga Maluku Utara sendiri — yang kenal jalan dan kampungnya."],
            [UserCheck, "var(--bl-forest)", "var(--bl-forest-10)", "Pilih driver", "Lihat dan pilih driver yang menjemputmu, bukan dipasangkan paksa."],
            [Heart, "var(--bl-amber)", "var(--bl-amber-15)", "Dukung driver lokal", "Tarif penuh kembali ke driver. Ekonomi tetap berputar di daerah."],
          ] as const).map(([Icon, fg, bg, title, desc], i) => (
            <div key={title} className="bl-reveal bl-shadow-soft group rounded-[22px] border border-[var(--bl-line)] bg-white p-7 transition hover:-translate-y-1 hover:[box-shadow:0_30px_64px_-30px_rgba(15,71,50,.42)]" style={{ transitionDelay: `${i * 70}ms` }}>
              <span className="grid h-[52px] w-[52px] place-items-center rounded-2xl transition" style={{ background: bg, color: fg }}>
                <Icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-xl font-extrabold text-[var(--bl-forest-d)]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--bl-muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
