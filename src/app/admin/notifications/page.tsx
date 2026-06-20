'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { MessageSquare, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import WaMonitoringPanel from '@/components/admin/notifications/WaMonitoringPanel';
import WahaControlPanel from '@/components/admin/notifications/WahaControlPanel';

type Tab = 'monitoring' | 'control';

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<Tab>('monitoring');

  return (
    <div className="px-4 py-4">
      <Link href="/admin" className="text-sm text-[#1B6B4A]">← Command Center</Link>

      {/* Sub-tabs — underline idiom (rata kiri, garis bawah 2px pada tab aktif, idiom tab ADS).
          Tab aktif = hijau WhatsApp (#25D366) = identitas brand modul WA. */}
      <div className="mt-3 flex items-center gap-5 border-b border-border">
        <SubTab
          active={tab === 'monitoring'}
          onClick={() => setTab('monitoring')}
          icon={<MessageSquare size={14} />}
          label="Monitoring"
        />
        <SubTab
          active={tab === 'control'}
          onClick={() => setTab('control')}
          icon={<Radio size={14} />}
          label="Kontrol WAHA"
        />
      </div>

      {/* Conditional render → tab non-aktif UNMOUNT (interval auto-clear, no background pileup) */}
      <div className="mt-3">
        {tab === 'monitoring' ? <WaMonitoringPanel /> : <WahaControlPanel />}
      </div>
    </div>
  );
}

function SubTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-1 py-2.5 -mb-px border-b-2 text-[13px] font-bold transition-colors',
        active
          ? 'border-[#25D366] text-[#25D366]'
          : 'border-transparent text-text-muted hover:text-text',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
