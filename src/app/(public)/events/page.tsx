export const metadata = {
  title: 'Tiket Event — Festival & Acara | TeraLoka',
};

export default function EventsPage() {
  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">Tiket Event</h1>
      <p className="text-sm text-gray-500">Festival, konser, seminar di Maluku Utara</p>

      <div className="mt-6 rounded-xl bg-gray-50 p-8 text-center">
        <p className="text-3xl">🎫</p>
        <p className="mt-2 text-sm text-gray-500">Event pertama segera hadir!</p>
        <p className="mt-1 text-xs text-gray-400">E-ticket dengan QR code untuk masuk.</p>
      </div>

      <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
        <p className="font-medium">📢 Punya event?</p>
        <p className="mt-1 text-xs">Hubungi admin TeraLoka untuk listing event kamu. Gratis!</p>
      </div>
    </div>
  );
}
