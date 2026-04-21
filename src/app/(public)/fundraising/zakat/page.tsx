import ZakatCalculator from './_components/ZakatCalculator';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Kalkulator Zakat | BADONASI · TeraLoka',
  description: 'Hitung zakat fitrah, maal, atau penghasilan sesuai syariah.',
};

type ZakatConfig = {
  harga_beras_per_kg: number;
  harga_emas_per_gram: number;
};

const DEFAULT_CONFIG: ZakatConfig = {
  harga_beras_per_kg: 15000,
  harga_emas_per_gram: 1500000,
};

export default async function ZakatPage() {
  const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

  let config: ZakatConfig = DEFAULT_CONFIG;
  let updatedAt: string | null = null;

  try {
    // Fetch simple zakat helper (typed object)
    const helperRes = await fetch(`${API}/config/zakat`, {
      next: { revalidate: 3600 }, // cache 1 jam, otomatis update setelah admin edit
    });
    const helperJson = await helperRes.json();
    if (helperJson.success && helperJson.data) {
      config = {
        harga_beras_per_kg: Number(helperJson.data.harga_beras_per_kg) || DEFAULT_CONFIG.harga_beras_per_kg,
        harga_emas_per_gram: Number(helperJson.data.harga_emas_per_gram) || DEFAULT_CONFIG.harga_emas_per_gram,
      };
    }

    // Fetch full config list to get updated_at (most recent)
    const fullRes = await fetch(`${API}/config?category=zakat`, {
      next: { revalidate: 3600 },
    });
    const fullJson = await fullRes.json();
    if (fullJson.success && Array.isArray(fullJson.data) && fullJson.data.length > 0) {
      const timestamps = fullJson.data
        .map((c: any) => c.updated_at)
        .filter(Boolean)
        .sort()
        .reverse();
      updatedAt = timestamps[0] ?? null;
    }
  } catch {
    // fallback to defaults
  }

  return <ZakatCalculator config={config} updatedAt={updatedAt} />;
}
