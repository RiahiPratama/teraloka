import Link from 'next/link';

export default function AdminAnalyticsPage() {
  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>
      <h1 className="mt-2 text-xl font-bold">📊 Analytics</h1>
      <p className="text-sm text-gray-500">PostHog integration</p>
      <div className="mt-6 rounded-xl bg-gray-50 p-8 text-center">
        <p className="text-3xl">📊</p>
        <p className="mt-2 text-sm text-gray-500">PostHog dashboard embed akan aktif setelah launch.</p>
        <p className="mt-1 text-xs text-gray-400">Tracking: active users, top pages, flywheel conversion.</p>
      </div>
    </div>
  );
}
