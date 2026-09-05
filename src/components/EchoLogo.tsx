import React from 'react';

interface EchoLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * Proprietary Abstract ECHO Symbol:
 * Origin (central cognitive seed) → Memory (first harmonic arc) →
 * Reflection (counter-resonance) → Understanding (outer evolution).
 */
export const EchoLogo: React.FC<EchoLogoProps> = ({
  className = '',
  size = 36,
  glow = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="ECHO cognitive emblem"
    >
      {glow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 rounded-full bg-teal-500/20 blur-lg"
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="echoLogoGrad" x1="14" y1="14" x2="50" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="55%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>

        {/* 1. Origin: Thought locus */}
        <circle cx="32" cy="32" r="2.6" fill="url(#echoLogoGrad)" />

        {/* 2. First Echo: Memory Anchor (Inner Ripple) */}
        <path
          d="M 26.25 36.82 A 7.5 7.5 0 1 1 26.25 27.18"
          stroke="url(#echoLogoGrad)"
          strokeWidth="1.85"
          strokeLinecap="round"
          opacity="0.95"
        />

        {/* 3. Second Echo: Reflection & Dialogue */}
        <path
          d="M 42.34 23.32 A 13.5 13.5 0 1 1 42.34 40.68"
          stroke="url(#echoLogoGrad)"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* 4. Third Echo: Connection & Harmonic Continuity */}
        <path
          d="M 17.06 44.53 A 19.5 19.5 0 1 1 17.06 19.47"
          stroke="url(#echoLogoGrad)"
          strokeWidth="1.55"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* 5. Outer Echo: Understanding & Evolution */}
        <path
          d="M 51.53 15.61 A 25.5 25.5 0 1 1 51.53 48.39"
          stroke="url(#echoLogoGrad)"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </div>
  );
};
