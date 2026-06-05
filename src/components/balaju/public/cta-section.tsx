import { Navigation, UserPlus } from "lucide-react";
import { ORDER_URL, DRIVER_URL } from "./balaju-links";

export function CtaSection() {
  return (
    <section className="px-5 pb-20 pt-4">
      <div className="mx-auto max-w-6xl">
        <div className="bl-mesh relative overflow-hidden rounded-[34px] border border-[var(--bl-line)] bg-[var(--bl-cream)] px-6 py-16 lg:px-16">
          <div className="relative z-10 flex flex-col items-center justify-between gap-10 lg:flex-row">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl font-black leading-[0.98] text-[var(--bl-forest-d)] lg:text-6xl">Siap <span className="bl-grad">BALAJU?</span></h2>
              <p className="mt-4 max-w-lg text-lg text-[var(--bl-muted)]">Pesan ojek lokal dengan harga jujur — atau gabung jadi driver dan dapat penghasilan utuh.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <a href={ORDER_URL} className="bl-shadow-lift inline-flex items-center justify-center gap-2 rounded-full bg-[var(--bl-forest)] px-9 py-5 text-lg font-bold text-white transition hover:bg-[var(--bl-forest-d)] active:scale-95">
                <Navigation className="h-5 w-5" /> Pesan Sekarang
              </a>
              <a href={DRIVER_URL} className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[var(--bl-forest-25)] bg-white px-9 py-5 text-lg font-bold text-[var(--bl-forest-d)] transition hover:border-[var(--bl-forest)]">
                <UserPlus className="h-5 w-5" /> Daftar Driver
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
