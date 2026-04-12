export const metadata = {
  title: 'PPOB — Bayar Tagihan | TeraLoka',
};

const PPOB_SERVICES = [
  { emoji: '📱', label: 'Pulsa & Data', status: 'soon' },
  { emoji: '⚡', label: 'Listrik PLN', status: 'soon' },
  { emoji: '💧', label: 'PDAM', status: 'soon' },
  { emoji: '🏥', label: 'BPJS', status: 'soon' },
  { emoji: '📺', label: 'TV Kabel', status: 'soon' },
  { emoji: '🎮', label: 'Voucher Game', status: 'soon' },
];

export default function BillsPage() {
  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">PPOB</h1>
      <p className="text-sm text-gray-500">Bayar tagihan & beli pulsa</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {PPOB_SERVICES.map((svc) => (
          <div key={svc.label} className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-2xl">{svc.emoji}</p>
            <p className="mt-1 text-xs font-medium">{svc.label}</p>
            <span className="mt-1 inline-block rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] text-yellow-700">
              Segera
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium">ℹ️ Powered by Mobilepulsa</p>
        <p className="mt-1 text-xs">PPOB akan aktif menjelang launch. Semua tagihan bisa dibayar langsung dari TeraLoka.</p>
      </div>
    </div>
  );
}
