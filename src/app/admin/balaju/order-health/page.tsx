// ═══════════════════════════════════════════════════════════════
// BALAJU — Order Health (sub-page Command Center)
// Path: /admin/balaju/order-health
// Route guard: admin/balaju/layout.tsx (auth + role) — sama spt sibling pages.
// Host tipis: render OrderHealthPanel (OTAK + fetch ada di panel).
// GREP MARKER: BALAJU_ORDER_HEALTH_PAGE_V1
// ═══════════════════════════════════════════════════════════════
import Link from 'next/link';
import OrderHealthPanel from '@/components/admin/balaju/OrderHealthPanel';

export default function AdminBalajuOrderHealthPage() {
  return (
    <div className="px-4 py-4 sm:px-6">
      <Link href="/admin/balaju" className="text-sm text-[#1B6B4A]">← Command Center BALAJU</Link>
      <div className="mt-3">
        <OrderHealthPanel />
      </div>
    </div>
  );
}
