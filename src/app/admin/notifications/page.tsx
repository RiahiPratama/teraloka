import Link from 'next/link';
import WaMonitoringPanel from '@/components/admin/notifications/WaMonitoringPanel';

export default function AdminNotificationsPage() {
  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>
      <div className="mt-3">
        <WaMonitoringPanel />
      </div>
    </div>
  );
}
