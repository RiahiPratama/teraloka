"use client";

// components/balaju/public/BalajuLanding.tsx
// Composer landing BALAJU. Pola per-section (mirror BALAPOR).
// Client: import CSS sekali, wrapper .bl-landing (scope token warna), + reveal observer global.
// Render di dalam shell TeraLoka (nav & footer global dari (public)/layout.tsx).
import { useEffect } from "react";
import "./balaju-landing.css";
import { HeroSection } from "./hero-section";
import { PilarSection } from "./pilar-section";
import { CaraPesanSection } from "./cara-pesan-section";
import { TransparansiSection } from "./transparansi-section";
import { LayananSection } from "./layanan-section";
import { DriverSection } from "./driver-section";
import { LokalSection } from "./lokal-section";
import { FaqSection } from "./faq-section";
import { CtaSection } from "./cta-section";

export default function BalajuLanding() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("on");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -70px 0px" }
    );
    document.querySelectorAll(".bl-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="bl-landing overflow-x-hidden selection:bg-[var(--bl-forest-15)] selection:text-[var(--bl-forest-d)]">
      <HeroSection />
      <PilarSection />
      <CaraPesanSection />
      <TransparansiSection />
      <LayananSection />
      <DriverSection />
      <LokalSection />
      <FaqSection />
      <CtaSection />
    </div>
  );
}
