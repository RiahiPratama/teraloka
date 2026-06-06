// src/components/auth/PinInput.tsx (NEW)
// Target: ~/teraloka/src/components/auth/PinInput.tsx
//
// 6-box PIN input, masked (dot), mirror pola OTP yang udah ada.
// Reusable: dipakai buat "Buat PIN" + "Ulangi PIN" (dan step-up nanti).

'use client';

import { useRef } from 'react';

export default function PinInput({
  value,
  onChange,
  autoFocus = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(val: string, idx: number) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      const next = [...value];
      next[idx - 1] = '';
      onChange(next);
      refs.current[idx - 1]?.focus();
    }
  }

  return (
    <div className="flex justify-center gap-2">
      {value.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            refs.current[idx] = el;
          }}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          value={digit}
          autoFocus={autoFocus && idx === 0}
          onChange={(e) => handleChange(e.target.value, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          className="h-14 w-11 rounded-xl border border-gray-200 text-center text-xl font-semibold outline-none transition-colors focus:border-[#1B6B4A]"
        />
      ))}
    </div>
  );
}
