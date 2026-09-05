import React from 'react';

interface CognitiveAtmosphereProps {
  className?: string;
}

/**
 * Atmospheric background representing a quiet field of connected thoughts:
 * Subtle radial gradients, barely visible memory-node particles, faint connecting lines,
 * and delicate optical depth without distracting motion.
 */
export const CognitiveAtmosphere: React.FC<CognitiveAtmosphereProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
    >
      {/* Subtle Depth Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_20%_15%,rgba(20,184,166,0.05),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_75%,rgba(6,182,212,0.03),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(12,16,24,0.4),transparent_80%)]" />

      {/* Quiet Constellation Field */}
      <svg
        className="w-full h-full opacity-40"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="atmoLineGrad" x1="200" y1="150" x2="1200" y2="750" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Faint Memory Trajectories */}
        <path
          d="M 120 220 C 340 180, 560 310, 780 240 C 1000 170, 1180 280, 1360 210"
          fill="none"
          stroke="url(#atmoLineGrad)"
          strokeWidth="0.8"
          strokeDasharray="4 6"
        />
        <path
          d="M 180 680 C 420 620, 680 710, 940 640 C 1140 580, 1280 660, 1380 610"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="0.6"
          strokeDasharray="3 8"
          opacity="0.15"
        />

        {/* Quiet Filaments */}
        <line x1="260" y1="200" x2="390" y2="340" stroke="#14b8a6" strokeWidth="0.5" opacity="0.16" />
        <line x1="390" y1="340" x2="580" y2="380" stroke="#2dd4bf" strokeWidth="0.5" opacity="0.18" />
        <line x1="780" y1="240" x2="920" y2="380" stroke="#06b6d4" strokeWidth="0.5" opacity="0.16" />
        <line x1="920" y1="380" x2="1140" y2="440" stroke="#14b8a6" strokeWidth="0.5" opacity="0.14" />
        <line x1="440" y1="630" x2="620" y2="540" stroke="#14b8a6" strokeWidth="0.5" opacity="0.14" />
        <line x1="620" y1="540" x2="880" y2="590" stroke="#0891b2" strokeWidth="0.5" opacity="0.16" />

        {/* Resting Memory Nodes */}
        <circle cx="260" cy="200" r="1.8" fill="#2dd4bf" opacity="0.4" />
        <circle cx="390" cy="340" r="2.2" fill="#14b8a6" opacity="0.5" />
        <circle cx="580" cy="380" r="1.8" fill="#06b6d4" opacity="0.4" />
        <circle cx="780" cy="240" r="2.4" fill="#2dd4bf" opacity="0.6" />
        <circle cx="780" cy="240" r="7" fill="none" stroke="#2dd4bf" strokeWidth="0.4" opacity="0.2" />
        <circle cx="920" cy="380" r="1.9" fill="#14b8a6" opacity="0.45" />
        <circle cx="1140" cy="440" r="2.2" fill="#2dd4bf" opacity="0.4" />
        <circle cx="1280" cy="240" r="1.6" fill="#0891b2" opacity="0.35" />
        <circle cx="440" cy="630" r="2.0" fill="#14b8a6" opacity="0.4" />
        <circle cx="620" cy="540" r="2.2" fill="#2dd4bf" opacity="0.5" />
        <circle cx="880" cy="590" r="2.0" fill="#06b6d4" opacity="0.4" />
      </svg>
    </div>
  );
};
