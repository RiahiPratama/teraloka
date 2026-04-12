'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

/**
 * Operator Dashboard — insights, ranking, badge progress, revenue
 */

export default function OperatorDashboard() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalPassengers: 0,
    currentStreak: 0,
    longestStreak: 0,
    estimatedCommission: 0,
    badges: [] as string[],
  });

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><p>Memuat...</p></div>;
  }

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold">🚤 Dashboard Operator</h1>
      <p className="text-sm text-gray-500">Performa & insights</p>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/operator/speed"
          className="rounded-xl bg-[#1B6B4A] p-4 text-center text-white active:bg-[#155a3e]"
        >
          <p className="text-2xl">🚤</p>
          <p className="mt-1 text-sm font-medium">Mulai Antri</p>
        </Link>
        <Link
          href="/operator/claims"
          className="rounded-xl bg-[#E8963A] p-4 text-center text-white active:bg-[#d4832e]"
        >
          <p className="text-2xl">📋</p>
          <p className="mt-1 text-sm font-medium">Seat Claims</p>
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-2xl font-bold">{stats.totalTrips}</p>
          <p className="text-xs text-gray-500">Total Trip</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-2xl font-bold">{stats.totalPassengers}</p>
          <p className="text-xs text-gray-500">Total Penumpang</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-2xl font-bold">🔥 {stats.currentStreak}</p>
          <p className="text-xs text-gray-500">Streak Hari</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-2xl font-bold">🏆 {stats.longestStreak}</p>
          <p className="text-xs text-gray-500">Streak Terpanjang</p>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-4">
        <h2 className="text-sm font-semibold">Badge</h2>
        <div className="mt-2 flex gap-2">
          {stats.badges.length === 0 ? (
            <p className="text-xs text-gray-400">Belum ada badge. Mulai antri untuk unlock!</p>
          ) : (
            stats.badges.map((badge) => (
              <span key={badge} className="rounded-lg bg-yellow-100 px-3 py-1.5 text-sm">
                {badge}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Streak milestones */}
      <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm">
        <p className="font-medium text-blue-700">🎯 Streak Milestones</p>
        <div className="mt-2 space-y-1 text-xs text-blue-600">
          <p>7 hari → 🥉 Bronze Operator</p>
          <p>30 hari → 🥈 Silver Operator</p>
          <p>90 hari → 🥇 Gold Operator</p>
          <p>365 hari → 💎 Diamond Operator</p>
        </div>
      </div>

      {/* Settlement history */}
      <div className="mt-4">
        <h2 className="text-sm font-semibold">Riwayat Settlement</h2>
        <div className="mt-2 rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-xs text-gray-400">Settlement mingguan akan muncul di sini</p>
        </div>
      </div>
    </div>
  );
}
