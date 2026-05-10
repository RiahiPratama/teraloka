'use client';

/**
 * TeraLoka — Maluku Utara SVG Background
 * Bridge Sprint Day 12 evening polish (10 Mei 2026)
 * ------------------------------------------------------------
 * Decorative SVG silhouette Maluku Utara untuk hero LP BALAPOR.
 *
 * Replace decorative random dotted bg → actual MalUt outline + city dots.
 *
 * Geographic representation (simplified):
 *   - Halmahera (main island, K-shape)
 *   - Ternate (small circle island, west of Halmahera)
 *   - Tidore (small circle, south of Ternate)
 *   - Morotai (north of Halmahera)
 *   - Bacan (south of Halmahera)
 *
 * City dots (10 kabupaten/kota) dengan subtle pulse animation.
 *
 * Style: Low opacity (0.15-0.25) untuk backdrop, gak compete dengan text.
 */

interface MalukuUtaraSvgBgProps {
  className?: string;
  style?: React.CSSProperties;
}

export function MalukuUtaraSvgBg({ className, style }: MalukuUtaraSvgBgProps) {
  return (
    <svg
      viewBox="0 0 800 600"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.85,
        pointerEvents: 'none',
        ...style,
      }}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Dot pattern fill untuk ocean ambient */}
        <pattern
          id="oceanDots"
          x="0"
          y="0"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="0.6" fill="rgba(149, 211, 186, 0.18)" />
        </pattern>

        {/* Gradient untuk Halmahera */}
        <linearGradient id="halmaheraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(27, 107, 74, 0.28)" />
          <stop offset="100%" stopColor="rgba(27, 107, 74, 0.12)" />
        </linearGradient>

        {/* Gradient untuk small islands */}
        <linearGradient id="islandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(149, 211, 186, 0.30)" />
          <stop offset="100%" stopColor="rgba(149, 211, 186, 0.15)" />
        </linearGradient>
      </defs>

      {/* Ocean dot pattern background */}
      <rect width="100%" height="100%" fill="url(#oceanDots)" />

      {/* === MOROTAI (north) === */}
      <path
        d="M 540 80 
           Q 555 75, 575 82 
           L 590 95
           Q 600 110, 595 130
           L 580 145
           Q 565 150, 548 142
           L 535 125
           Q 528 108, 535 92
           Z"
        fill="url(#islandGrad)"
        stroke="rgba(149, 211, 186, 0.4)"
        strokeWidth="1.5"
        strokeDasharray="3,2"
      />

      {/* === HALMAHERA (main island, K-shape) === */}
      {/* North arm */}
      <path
        d="M 480 180 
           Q 490 170, 510 175
           L 530 195
           Q 540 220, 535 250
           L 520 270
           Q 505 275, 490 270
           L 475 250
           Q 470 220, 475 195
           Z"
        fill="url(#halmaheraGrad)"
        stroke="rgba(27, 107, 74, 0.5)"
        strokeWidth="1.5"
        strokeDasharray="4,2"
      />

      {/* East arm */}
      <path
        d="M 530 280
           Q 555 285, 580 300
           L 595 325
           Q 600 355, 590 380
           L 570 395
           Q 545 395, 525 380
           L 515 360
           Q 510 320, 525 290
           Z"
        fill="url(#halmaheraGrad)"
        stroke="rgba(27, 107, 74, 0.5)"
        strokeWidth="1.5"
        strokeDasharray="4,2"
      />

      {/* South arm */}
      <path
        d="M 470 290
           Q 480 320, 485 360
           L 480 400
           Q 470 430, 450 445
           L 425 450
           Q 405 445, 395 425
           L 395 395
           Q 410 360, 435 330
           Q 455 310, 470 295
           Z"
        fill="url(#halmaheraGrad)"
        stroke="rgba(27, 107, 74, 0.5)"
        strokeWidth="1.5"
        strokeDasharray="4,2"
      />

      {/* West arm */}
      <path
        d="M 460 220
           Q 445 230, 425 240
           L 405 255
           Q 395 270, 400 290
           L 415 305
           Q 440 305, 460 290
           L 470 270
           Q 470 245, 465 225
           Z"
        fill="url(#halmaheraGrad)"
        stroke="rgba(27, 107, 74, 0.5)"
        strokeWidth="1.5"
        strokeDasharray="4,2"
      />

      {/* === TERNATE (small island west of Halmahera) === */}
      <circle
        cx="350"
        cy="280"
        r="18"
        fill="url(#islandGrad)"
        stroke="rgba(149, 211, 186, 0.5)"
        strokeWidth="1.5"
        strokeDasharray="3,2"
      />

      {/* === TIDORE (small island south of Ternate) === */}
      <circle
        cx="362"
        cy="320"
        r="14"
        fill="url(#islandGrad)"
        stroke="rgba(149, 211, 186, 0.5)"
        strokeWidth="1.5"
        strokeDasharray="3,2"
      />

      {/* === HIRI (tiny island north of Ternate) === */}
      <circle
        cx="345"
        cy="258"
        r="6"
        fill="url(#islandGrad)"
        stroke="rgba(149, 211, 186, 0.4)"
        strokeWidth="1"
        strokeDasharray="2,1"
      />

      {/* === MAKIAN (south of Tidore) === */}
      <circle
        cx="370"
        cy="365"
        r="10"
        fill="url(#islandGrad)"
        stroke="rgba(149, 211, 186, 0.4)"
        strokeWidth="1.5"
        strokeDasharray="2,1"
      />

      {/* === KAYOA group === */}
      <ellipse
        cx="395"
        cy="395"
        rx="9"
        ry="14"
        fill="url(#islandGrad)"
        stroke="rgba(149, 211, 186, 0.4)"
        strokeWidth="1.5"
        strokeDasharray="2,1"
      />

      {/* === BACAN (south island, big) === */}
      <path
        d="M 380 440
           Q 410 430, 445 445
           L 470 465
           Q 475 490, 460 510
           L 430 520
           Q 400 518, 380 505
           L 365 480
           Q 365 455, 378 442
           Z"
        fill="url(#islandGrad)"
        stroke="rgba(149, 211, 186, 0.45)"
        strokeWidth="1.5"
        strokeDasharray="3,2"
      />

      {/* === SULA group (far south, small chain) === */}
      <ellipse cx="220" cy="520" rx="14" ry="6" fill="url(#islandGrad)" opacity="0.7" />
      <ellipse cx="195" cy="535" rx="10" ry="5" fill="url(#islandGrad)" opacity="0.6" />
      <ellipse cx="170" cy="540" rx="8" ry="4" fill="url(#islandGrad)" opacity="0.5" />

      {/* === CITY DOTS (pulsing markers di city centers) === */}
      {/* Ternate (capital functional) */}
      <CityDot cx={350} cy={280} label="Ternate" delay={0} />
      {/* Sofifi (capital provincial, on Halmahera) */}
      <CityDot cx={490} cy={320} label="Sofifi" delay={0.4} />
      {/* Tidore */}
      <CityDot cx={362} cy={320} label="Tidore" delay={0.8} />
      {/* Tobelo (Halmahera Utara) */}
      <CityDot cx={510} cy={210} label="Tobelo" delay={1.2} />
      {/* Daruba (Morotai) */}
      <CityDot cx={565} cy={110} label="Daruba" delay={1.6} />
      {/* Labuha (Bacan) */}
      <CityDot cx={420} cy={478} label="Labuha" delay={2.0} />
      {/* Sanana (Sula) */}
      <CityDot cx={210} cy={520} label="Sanana" delay={2.4} />

      <style>{`
        @keyframes cityPulse {
          0%, 100% {
            r: 3;
            opacity: 0.9;
          }
          50% {
            r: 5;
            opacity: 0.6;
          }
        }
        @keyframes cityRing {
          0% {
            r: 3;
            opacity: 0.6;
          }
          100% {
            r: 14;
            opacity: 0;
          }
        }
      `}</style>
    </svg>
  );
}

// ─── City Dot (pulsing marker) ────────────────────────────────

function CityDot({
  cx,
  cy,
  label,
  delay = 0,
}: {
  cx: number;
  cy: number;
  label: string;
  delay?: number;
}) {
  return (
    <g>
      {/* Outer pulse ring */}
      <circle
        cx={cx}
        cy={cy}
        fill="rgba(239, 68, 68, 0.4)"
        style={{
          animation: `cityRing 2s ease-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <title>{label}</title>
      </circle>
      {/* Center dot */}
      <circle
        cx={cx}
        cy={cy}
        r="3"
        fill="#EF4444"
        style={{
          animation: `cityPulse 2s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      />
    </g>
  );
}
