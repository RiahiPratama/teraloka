'use client';

import { useState } from 'react';
import { HandHeart } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface UpdateAamiinButtonProps {
  updateId: string;
  initialCount: number;
}

export default function UpdateAamiinButton({ updateId, initialCount }: UpdateAamiinButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [pressed, setPressed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);

  async function handleAamiin() {
    if (loading) return;

    // Optimistic increment
    setLoading(true);
    setPressed(true);
    setCount(c => c + 1);
    setAnimate(true);
    setTimeout(() => setAnimate(false), 600);

    try {
      const res = await fetch(`${API}/funding/updates/${updateId}/aamiin`, {
        method: 'POST',
      });
      const json = await res.json();

      if (json.success && json.data) {
        // Sync with server
        setCount(json.data.aamiin_count);
      } else {
        // Rollback
        setCount(c => c - 1);
        setPressed(false);
      }
    } catch {
      setCount(c => c - 1);
      setPressed(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleAamiin}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
        pressed
          ? 'bg-pink-50 border-pink-200 text-[#BE185D]'
          : 'bg-white border-gray-200 text-gray-600 hover:border-pink-200 hover:bg-pink-50 hover:text-[#BE185D]'
      } disabled:opacity-70`}
      aria-label="Aamiin"
    >
      <HandHeart
        size={14}
        strokeWidth={2.2}
        className={`transition-transform ${animate ? 'scale-125' : 'scale-100'} ${pressed ? 'text-[#EC4899]' : ''}`}
        fill={pressed ? '#EC4899' : 'none'}
      />
      <span>Aamiin</span>
      {count > 0 && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
          pressed ? 'bg-pink-100 text-[#BE185D]' : 'bg-gray-100 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
