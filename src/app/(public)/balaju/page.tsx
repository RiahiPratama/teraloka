// app/balaju/page.tsx  (atau route lain yang kamu pilih untuk LANDING — lihat catatan)
import type { Metadata } from "next";
import BalajuLanding from "@/components/balaju/public/BalajuLanding";

export const metadata: Metadata = {
  title: "BALAJU — Ojek Lokal Maluku Utara | Harga Jujur, Driver Utuh",
  description:
    "Ojek dan antar barang lokal Maluku Utara. Harga transparan tanpa biaya tersembunyi — driver menerima tarif penuh, fee aplikasi ditampilkan terpisah. Aktif di Ternate.",
  openGraph: {
    title: "BALAJU — Ojek Lokal Maluku Utara",
    description:
      "Harga transparan, driver dibayar penuh. Mobilitas lokal TeraLoka untuk warga Maluku Utara.",
    type: "website",
  },
};

export default function BalajuLandingPage() {
  return <BalajuLanding />;
}
