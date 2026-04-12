import Link from 'next/link';

export default function AdminFinancialPage() {
  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>
      <h1 className="mt-2 text-xl font-bold">financial</h1>
      <p className="mt-2 text-sm text-gray-500">Coming in next FASE.</p>
    </div>
  );
}
