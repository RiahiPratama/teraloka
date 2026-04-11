import Link from 'next/link';
import { getPortQueue } from '@/lib/engine/booking-engine';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = { params: Promise<{ port: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { port } = await params;
  return {
    title: `Antrian Speed di ${port.replace(/-/g, ' ')} | BAPASIAR`,
  };
}

export default async function PortQueuePage({ params }: Props) {
  const { port: portSlug } = await params;

  let portData: any = null;
  try {
    portData = await getPortQueue(portSlug);
  } catch {}

  if (!portData) notFound();

  const { port, queue } = portData;

  return (
    <div className="px-4 py-4">
      <Link href="/speed" className="text-sm text-[#1B6B4A]">← Semua Pelabuhan</Link>

      <div className="mt-3">
        <h1 className="text-xl font-bold">🚤 {port.name}</h1>
        <p className="text-sm text-gray-500">{port.city?.name}</p>
      </div>

      {/* Live queue */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Antrian Saat Ini</h2>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            🔴 LIVE
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="mt-3 rounded-xl bg-gray-50 p-8 text-center">
            <p className="text-3xl">🚤</p>
            <p className="mt-2 text-sm text-gray-500">Tidak ada speed yang antri saat ini.</p>
            <p className="mt-1 text-xs text-gray-400">Cek lagi nanti atau datang langsung ke pelabuhan.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {queue.map((entry: any, index: number) => {
              const capacity = entry.operator?.capacity || 12;
              const filled = entry.passenger_count || 0;
              const percentage = Math.round((filled / capacity) * 100);
              const isFirst = index === 0;

              return (
                <div
                  key={entry.id}
                  className={`rounded-xl border p-4 ${
                    isFirst ? 'border-[#1B6B4A] bg-green-50' : 'border-gray-200'
                  }`}
                >
                  {isFirst && (
                    <span className="mb-2 inline-block rounded bg-[#1B6B4A] px-2 py-0.5 text-xs font-bold text-white">
                      BERIKUTNYA
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {entry.operator?.boat_name || `Speed #${entry.queue_position}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        → {entry.route?.destination?.name || 'Tujuan'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {filled}<span className="text-sm text-gray-400">/{capacity}</span>
                      </p>
                      <p className="text-xs text-gray-500">penumpang</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        percentage >= 100 ? 'bg-red-500' :
                        percentage >= 75 ? 'bg-yellow-500' :
                        'bg-[#1B6B4A]'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <p className="mt-1 text-xs text-gray-400">
                    {percentage >= 100 ? '🚀 Siap berangkat!' :
                     percentage >= 75 ? '⏳ Hampir penuh' :
                     `${capacity - filled} kursi tersisa`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Refresh hint */}
      <p className="mt-4 text-center text-xs text-gray-400">
        Halaman ini update otomatis. Tarik ke bawah untuk refresh.
      </p>
    </div>
  );
}
