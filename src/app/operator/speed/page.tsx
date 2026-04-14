'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * OPERATOR MINI-APP — Speed Boat
 * PWA simple: [+1] [+2] [+3] [-1] untuk walk-in
 * [🚀 LEPAS TALI] untuk departure
 * 
 * Offline-first: IndexedDB buffer → sync saat online
 */

export default function OperatorSpeedPage() {
  const { user, isLoading: loading } = useAuth();
  const [passengerCount, setPassengerCount] = useState(0);
  const [capacity] = useState(12);
  const [status, setStatus] = useState<'idle' | 'queuing' | 'boarding'>('idle');
  const [syncing, setSyncing] = useState(false);

  const updateCount = async (delta: number) => {
    const newCount = Math.max(0, Math.min(capacity, passengerCount + delta));
    setPassengerCount(newCount);
    setStatus(newCount > 0 ? 'boarding' : 'queuing');

    // Sync to server (with offline buffer fallback)
    try {
      // TODO: actual API call + IndexedDB fallback
    } catch {
      // Queue for offline sync
      bufferOfflineAction({ type: 'update_count', delta, timestamp: Date.now() });
    }
  };

  const handleDepart = async () => {
    if (passengerCount === 0) return;
    if (!confirm(`Berangkat dengan ${passengerCount} penumpang?`)) return;

    try {
      // TODO: actual API call
      setPassengerCount(0);
      setStatus('idle');
      alert('🚀 Lepas tali! Selamat jalan.');
    } catch {
      alert('Gagal. Coba lagi.');
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><p>Memuat...</p></div>;
  }

  const percentage = Math.round((passengerCount / capacity) * 100);

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold">🚤 Operator Speed</h1>
      <p className="text-sm text-gray-500">Mini-app pengelolaan antrian</p>

      {/* Status indicator */}
      <div className={`mt-4 rounded-xl p-4 text-center ${
        status === 'boarding' ? 'bg-green-50' : status === 'queuing' ? 'bg-blue-50' : 'bg-gray-50'
      }`}>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {status === 'boarding' ? '🟢 BOARDING' : status === 'queuing' ? '🔵 ANTRI' : '⚪ IDLE'}
        </p>
      </div>

      {/* Passenger count display */}
      <div className="mt-6 text-center">
        <p className="text-6xl font-bold">{passengerCount}</p>
        <p className="text-sm text-gray-500">dari {capacity} kursi</p>

        {/* Progress bar */}
        <div className="mx-auto mt-3 h-4 w-48 rounded-full bg-gray-200">
          <div
            className={`h-4 rounded-full transition-all ${
              percentage >= 100 ? 'bg-red-500' :
              percentage >= 75 ? 'bg-yellow-500' :
              'bg-[#1B6B4A]'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Control buttons */}
      <div className="mt-8 grid grid-cols-4 gap-3">
        <button
          onClick={() => updateCount(-1)}
          disabled={passengerCount === 0}
          className="rounded-xl bg-red-100 py-4 text-lg font-bold text-red-700 active:bg-red-200 disabled:opacity-30"
        >
          -1
        </button>
        <button
          onClick={() => updateCount(1)}
          disabled={passengerCount >= capacity}
          className="rounded-xl bg-green-100 py-4 text-lg font-bold text-green-700 active:bg-green-200 disabled:opacity-30"
        >
          +1
        </button>
        <button
          onClick={() => updateCount(2)}
          disabled={passengerCount + 2 > capacity}
          className="rounded-xl bg-green-100 py-4 text-lg font-bold text-green-700 active:bg-green-200 disabled:opacity-30"
        >
          +2
        </button>
        <button
          onClick={() => updateCount(3)}
          disabled={passengerCount + 3 > capacity}
          className="rounded-xl bg-green-100 py-4 text-lg font-bold text-green-700 active:bg-green-200 disabled:opacity-30"
        >
          +3
        </button>
      </div>

      {/* Depart button */}
      <button
        onClick={handleDepart}
        disabled={passengerCount === 0}
        className="mt-6 w-full rounded-xl bg-[#E8963A] py-4 text-lg font-bold text-white active:bg-[#d4832e] disabled:opacity-30"
      >
        🚀 LEPAS TALI
      </button>

      {/* Offline indicator */}
      <div className="mt-4 text-center text-xs text-gray-400">
        {syncing ? '🔄 Syncing...' : typeof window !== 'undefined' && !navigator?.onLine ? '🔴 Offline — data tersimpan lokal' : '🟢 Online'}
      </div>
    </div>
  );
}

// ============================================================
// Offline buffer (IndexedDB placeholder)
// ============================================================
function bufferOfflineAction(action: { type: string; delta?: number; timestamp: number }) {
  try {
    const buffer = JSON.parse(localStorage.getItem('operator_buffer') || '[]');
    buffer.push(action);
    localStorage.setItem('operator_buffer', JSON.stringify(buffer));
  } catch {}
}
