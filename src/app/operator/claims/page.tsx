'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Operator: Manage seat claims
 * [✅ NAIK] / [❌ TIDAK ADA] per digital passenger
 * WAJIB resolve semua sebelum LEPAS TALI
 */

interface Claim {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  status: 'active' | 'boarded' | 'expired';
  created_at: string;
}

export default function OperatorClaimsPage() {
  const { user } = useAuth();
  const [claims] = useState<Claim[]>([]);

  const handleConfirm = async (claimId: string, action: 'boarded' | 'no_show') => {
    try {
      await fetch('/api/v1/speed/claims', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claimId, action }),
      });
      // TODO: refresh claims list
    } catch {
      alert('Gagal. Coba lagi.');
    }
  };

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold">📋 Seat Claims</h1>
      <p className="text-sm text-gray-500">Confirm penumpang digital sebelum berangkat</p>

      {claims.length === 0 ? (
        <div className="mt-6 rounded-xl bg-gray-50 p-8 text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-2 text-sm text-gray-500">Belum ada seat claim digital.</p>
          <p className="mt-1 text-xs text-gray-400">Claim akan muncul saat penumpang book via app.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {claims.map((claim) => (
            <div key={claim.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{claim.passenger_name}</p>
                  <p className="text-xs text-gray-500">{claim.passenger_phone}</p>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs ${
                  claim.status === 'active' ? 'bg-blue-100 text-blue-700' :
                  claim.status === 'boarded' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {claim.status}
                </span>
              </div>

              {claim.status === 'active' && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleConfirm(claim.id, 'boarded')}
                    className="flex-1 rounded-lg bg-green-500 py-2.5 text-sm font-medium text-white active:bg-green-600"
                  >
                    ✅ NAIK
                  </button>
                  <button
                    onClick={() => handleConfirm(claim.id, 'no_show')}
                    className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white active:bg-red-600"
                  >
                    ❌ TIDAK ADA
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
