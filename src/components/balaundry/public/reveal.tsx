'use client';

// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Reveal-on-scroll (IntersectionObserver). Port mockup .reveal.
// PATH: src/components/balaundry/public/reveal.tsx
// 🛡️ 1 IO per elemen, disconnect setelah masuk view. NO scroll-listener,
//   NO browser storage. delay 1|2|3 → class .d1/.d2/.d3 (stagger CSS).
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  delay?: 1 | 2 | 3;
  className?: string;
}

export function Reveal({ children, delay, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { setInView(true); io.disconnect(); break; }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const d = delay ? ` d${delay}` : '';
  return (
    <div ref={ref} className={`reveal${d}${inView ? ' in' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
