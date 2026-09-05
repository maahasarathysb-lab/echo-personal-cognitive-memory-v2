import React, { useState, useEffect, useRef } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { ArrowRight, ArrowUpRight, X, Shield, Lock, FileText, HelpCircle, Github, Linkedin, Mail } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

interface AuthErrorInfo {
  code?: string;
  message: string;
  actionableHint?: string;
}

type SupportModalType = 'security' | 'privacy' | 'terms' | 'faq' | null;

/**
 * Proprietary Abstract ECHO Symbol:
 * Represents "A thought creating an echo through memory":
 * ORIGIN (central cognitive seed) → MEMORY (first harmonic arc) → REFLECTION (counter-resonance) → UNDERSTANDING (outer evolution).
 * Precise, minimal, proprietary, timeless. Works seamlessly at 24px through 88px.
 */
const EchoLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 52 }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center echo-logo-wrapper select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="ECHO cognitive emblem"
    >
      {/* Soft atmospheric ambient glow behind the emblem */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-full bg-teal-500/20 blur-xl echo-glow"
      />

      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id="echoGradient" x1="14" y1="14" x2="50" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="55%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>

        {/* 1. Origin: Thought locus / cognitive singularity */}
        <circle
          cx="32"
          cy="32"
          r="2.6"
          fill="url(#echoGradient)"
          className="echo-origin"
        />

        {/* 2. First Echo: Memory Anchor (Inner Ripple, r = 7.5) */}
        <path
          d="M 26.25 36.82 A 7.5 7.5 0 1 1 26.25 27.18"
          stroke="url(#echoGradient)"
          strokeWidth="1.85"
          strokeLinecap="round"
          className="echo-curve echo-curve-1"
          opacity="0.95"
        />

        {/* 3. Second Echo: Reflection & Dialogue (Middle Counter-Arc, r = 13.5) */}
        <path
          d="M 42.34 23.32 A 13.5 13.5 0 1 1 42.34 40.68"
          stroke="url(#echoGradient)"
          strokeWidth="1.7"
          strokeLinecap="round"
          className="echo-curve echo-curve-2"
          opacity="0.85"
        />

        {/* 4. Third Echo: Connection & Harmonic Continuity (Expanded Arc, r = 19.5) */}
        <path
          d="M 17.06 44.53 A 19.5 19.5 0 1 1 17.06 19.47"
          stroke="url(#echoGradient)"
          strokeWidth="1.55"
          strokeLinecap="round"
          className="echo-curve echo-curve-3"
          opacity="0.7"
        />

        {/* 5. Outer Echo: Understanding & Evolution (Cognitive Horizon, r = 25.5) */}
        <path
          d="M 51.53 15.61 A 25.5 25.5 0 1 1 51.53 48.39"
          stroke="url(#echoGradient)"
          strokeWidth="1.4"
          strokeLinecap="round"
          className="echo-curve echo-curve-4"
          opacity="0.5"
        />
      </svg>
    </div>
  );
};

export const LoginView: React.FC<LoginViewProps> = () => {
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);
  const [activeSupportModal, setActiveSupportModal] = useState<SupportModalType>(null);

  // Desktop subtle cursor proximity tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 720, y: 450 });
  const [isPointerActive, setIsPointerActive] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 1440;
      const y = ((e.clientY - rect.top) / rect.height) * 900;
      setMousePos({ x, y });
      if (!isPointerActive) setIsPointerActive(true);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isPointerActive]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorInfo(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Sign-in failure:', err);
      const authErr = err as { code?: string; message?: string };
      const code = authErr?.code || '';
      const rawMessage = authErr?.message || (err instanceof Error ? err.message : 'Authentication failed');

      if (code === 'auth/unauthorized-domain' || rawMessage.includes('unauthorized-domain')) {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        setErrorInfo({
          code: 'auth/unauthorized-domain',
          message: 'This domain is not authorized in Firebase.',
          actionableHint: `Add "${currentHost}" to Firebase Console -> Authentication -> Settings -> Authorized domains.`,
        });
      } else if (code === 'auth/popup-blocked' || rawMessage.includes('popup-blocked')) {
        setErrorInfo({
          code: 'auth/popup-blocked',
          message: 'Sign-in popup blocked by browser.',
          actionableHint: 'Please allow popups for this site, or open the preview in a new tab.',
        });
      } else if (code === 'auth/popup-closed-by-user' || rawMessage.includes('popup-closed-by-user')) {
        setErrorInfo({
          code: 'auth/popup-closed-by-user',
          message: 'Sign-in was cancelled.',
          actionableHint: 'The Google sign-in window was closed before completing authentication.',
        });
      } else if (code === 'auth/cancelled-popup-request' || rawMessage.includes('cancelled-popup-request')) {
        setErrorInfo({
          code: 'auth/cancelled-popup-request',
          message: 'Multiple sign-in attempts detected.',
          actionableHint: 'Another sign-in popup was already active. Please try again.',
        });
      } else if (code === 'auth/operation-not-allowed' || rawMessage.includes('operation-not-allowed')) {
        setErrorInfo({
          code: 'auth/operation-not-allowed',
          message: 'Google Sign-In is disabled.',
          actionableHint: 'Enable Google provider in Firebase Console -> Authentication -> Sign-in method.',
        });
      } else if (code === 'auth/invalid-api-key' || rawMessage.includes('invalid-api-key')) {
        setErrorInfo({
          code: 'auth/invalid-api-key',
          message: 'Invalid Firebase API Key.',
          actionableHint: 'Please verify the API key configured in firebase-applet-config.json and environment variables.',
        });
      } else if (code === 'auth/network-request-failed' || rawMessage.includes('network-request-failed')) {
        setErrorInfo({
          code: 'auth/network-request-failed',
          message: 'Network connection failed.',
          actionableHint: 'Could not communicate with Google authentication servers. Check your connection and retry.',
        });
      } else {
        setErrorInfo({
          code: code || 'auth/unknown',
          message: rawMessage,
          actionableHint: 'Please check your connection and retry, or check the browser console for details.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      id="login-container"
      className="relative min-h-screen w-full bg-[#07090e] text-[#e5e5e5] flex flex-col justify-between items-center px-4 sm:px-8 py-6 sm:py-8 font-sans overflow-x-hidden selection:bg-teal-500/20 selection:text-teal-200"
    >
      {/* Scoped CSS Keyframes for Coordinated Physics & Atmosphere */}
      <style>{`
        @keyframes echoOriginIn {
          0% { transform: scale(0.2); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes echoCurveIn {
          0% { opacity: 0; stroke-dashoffset: 70; }
          100% { opacity: 1; stroke-dashoffset: 0; }
        }
        @keyframes echoSlowBreathe {
          0%, 100% { transform: scale(1); opacity: 0.96; }
          50% { transform: scale(1.02); opacity: 1; }
        }
        @keyframes echoGlowPulse {
          0%, 100% { opacity: 0.22; transform: scale(1); }
          50% { opacity: 0.36; transform: scale(1.08); }
        }
        @keyframes fieldDriftSlow {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-10px) rotate(0.3deg); }
        }
        @keyframes memoryEchoExpand {
          0% { transform: scale(0.96); opacity: 0.12; }
          50% { transform: scale(1.03); opacity: 0.22; }
          100% { transform: scale(0.96); opacity: 0.12; }
        }
        @keyframes fragmentBreatheA {
          0%, 100% { opacity: 0.15; transform: translateY(0); }
          50% { opacity: 0.28; transform: translateY(-4px); }
        }
        @keyframes fragmentBreatheB {
          0%, 100% { opacity: 0.14; transform: translateY(0); }
          50% { opacity: 0.26; transform: translateY(4px); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .echo-origin {
          transform-origin: 32px 32px;
          animation: echoOriginIn 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .echo-curve-1 {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: echoCurveIn 320ms cubic-bezier(0.16, 1, 0.3, 1) 160ms forwards;
        }
        .echo-curve-2 {
          stroke-dasharray: 90;
          stroke-dashoffset: 90;
          animation: echoCurveIn 340ms cubic-bezier(0.16, 1, 0.3, 1) 320ms forwards;
        }
        .echo-curve-3 {
          stroke-dasharray: 130;
          stroke-dashoffset: 130;
          animation: echoCurveIn 360ms cubic-bezier(0.16, 1, 0.3, 1) 480ms forwards;
        }
        .echo-curve-4 {
          stroke-dasharray: 170;
          stroke-dashoffset: 170;
          animation: echoCurveIn 380ms cubic-bezier(0.16, 1, 0.3, 1) 640ms forwards;
        }
        .echo-logo-wrapper {
          animation: echoSlowBreathe 8s ease-in-out 1.2s infinite;
        }
        .echo-glow {
          animation: echoGlowPulse 8s ease-in-out 1.2s infinite;
        }
        .constellation-drift {
          animation: fieldDriftSlow 28s ease-in-out infinite alternate;
        }
        .echo-central-ripple {
          transform-origin: 50% 50%;
          animation: memoryEchoExpand 14s ease-in-out infinite;
        }
        .frag-a { animation: fragmentBreatheA 12s ease-in-out infinite; }
        .frag-b { animation: fragmentBreatheB 16s ease-in-out 3s infinite; }
        .frag-c { animation: fragmentBreatheA 14s ease-in-out 6s infinite; }
        .frag-d { animation: fragmentBreatheB 18s ease-in-out 2s infinite; }

        /* Coordinated page load entrance sequence */
        .seq-bg { animation: fadeInUp 900ms cubic-bezier(0.16, 1, 0.3, 1) 0ms both; }
        .seq-hero-zone { animation: fadeInUp 750ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both; }
        .seq-auth-zone { animation: fadeInUp 800ms cubic-bezier(0.16, 1, 0.3, 1) 240ms both; }
        .seq-timeline { animation: fadeInUp 850ms cubic-bezier(0.16, 1, 0.3, 1) 400ms both; }

        @media (prefers-reduced-motion: reduce) {
          .echo-origin,
          .echo-curve-1,
          .echo-curve-2,
          .echo-curve-3,
          .echo-curve-4,
          .echo-logo-wrapper,
          .echo-glow,
          .constellation-drift,
          .echo-central-ripple,
          .frag-a,
          .frag-b,
          .frag-c,
          .frag-d,
          .seq-bg,
          .seq-hero-zone,
          .seq-auth-zone,
          .seq-timeline {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>

      {/* Atmospheric Radial Lighting Fields */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_40%_20%,rgba(20,184,166,0.08),rgba(6,182,212,0.02),transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,rgba(20,184,166,0.06),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(10,14,20,0.5),transparent_70%)]"
      />

      {/* ========================================================================= */}
      {/* FULL-SCREEN COGNITIVE UNIVERSE (SVG CONSTELLATION & LIVING MEMORY FIELD) */}
      {/* ========================================================================= */}
      <div
        aria-hidden="true"
        className="seq-bg pointer-events-none absolute inset-0 overflow-hidden select-none"
      >
        <svg
          className="w-full h-full constellation-drift"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="deepBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4.5" />
            </filter>
            <linearGradient id="trailGrad" x1="120" y1="520" x2="1320" y2="340" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.1" />
              <stop offset="35%" stopColor="#2dd4bf" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="axisGrad" x1="100" y1="840" x2="1340" y2="840" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.05" />
              <stop offset="30%" stopColor="#14b8a6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.75" />
              <stop offset="70%" stopColor="#14b8a6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* ------------------------------------------------------------- */}
          {/* CENTRAL ECHO PHENOMENON (Harmonic concentric cognitive ripples) */}
          {/* THOUGHT → MEMORY → CONNECTION → UNDERSTANDING                  */}
          {/* ------------------------------------------------------------- */}
          <g className="echo-central-ripple" opacity="0.8">
            {/* Thought Core */}
            <circle cx="680" cy="430" r="140" fill="none" stroke="#14b8a6" strokeWidth="0.65" strokeDasharray="3 6" opacity="0.22" />
            {/* Memory Arc */}
            <circle cx="680" cy="430" r="230" fill="none" stroke="#2dd4bf" strokeWidth="0.6" strokeDasharray="4 8" opacity="0.18" />
            {/* Connection Arc */}
            <circle cx="680" cy="430" r="330" fill="none" stroke="#06b6d4" strokeWidth="0.55" opacity="0.14" />
            {/* Understanding Arc */}
            <circle cx="680" cy="430" r="440" fill="none" stroke="#14b8a6" strokeWidth="0.45" strokeDasharray="5 10" opacity="0.10" />
          </g>

          {/* ------------------------------------------------------------- */}
          {/* CINEMATIC MEMORY TRAIL                                        */}
          {/* thought → reflection → decision → growth                      */}
          {/* ------------------------------------------------------------- */}
          <path
            d="M 140 520 C 320 380, 480 470, 680 410 C 880 350, 1080 460, 1300 370"
            fill="none"
            stroke="url(#trailGrad)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Subtle secondary harmonic trajectory */}
          <path
            d="M 220 630 C 440 680, 640 580, 880 610 C 1090 640, 1220 530, 1340 560"
            fill="none"
            stroke="#0891b2"
            strokeWidth="0.5"
            strokeDasharray="2 6"
            opacity="0.3"
          />
          <path
            d="M 280 240 C 520 180, 820 280, 1140 210"
            fill="none"
            stroke="#14b8a6"
            strokeWidth="0.5"
            strokeDasharray="4 6"
            opacity="0.25"
          />

          {/* Thin organic cross-connections between distant anchor points */}
          <line x1="220" y1="210" x2="360" y2="380" stroke="#14b8a6" strokeWidth="0.4" opacity="0.25" />
          <line x1="360" y1="380" x2="520" y2="440" stroke="#2dd4bf" strokeWidth="0.4" opacity="0.3" />
          <line x1="520" y1="440" x2="680" y2="410" stroke="#14b8a6" strokeWidth="0.5" opacity="0.4" />
          <line x1="680" y1="410" x2="880" y2="350" stroke="#06b6d4" strokeWidth="0.4" opacity="0.35" />
          <line x1="880" y1="350" x2="1080" y2="460" stroke="#14b8a6" strokeWidth="0.4" opacity="0.3" />
          <line x1="1080" y1="460" x2="1240" y2="280" stroke="#2dd4bf" strokeWidth="0.4" opacity="0.25" />
          <line x1="320" y1="670" x2="480" y2="580" stroke="#14b8a6" strokeWidth="0.4" opacity="0.25" />
          <line x1="480" y1="580" x2="680" y2="610" stroke="#0891b2" strokeWidth="0.4" opacity="0.2" />
          <line x1="680" y1="610" x2="940" y2="600" stroke="#14b8a6" strokeWidth="0.4" opacity="0.25" />
          <line x1="940" y1="600" x2="1220" y2="680" stroke="#06b6d4" strokeWidth="0.4" opacity="0.2" />

          {/* ------------------------------------------------------------- */}
          {/* COGNITIVE DOMAINS (Subtle atmospheric structural anchors)      */}
          {/* THOUGHTS · DECISIONS · GOALS · GROWTH                        */}
          {/* ------------------------------------------------------------- */}
          {/* DOMAIN 1: THOUGHTS (Upper-Left Quad) */}
          <g opacity="0.75">
            <line x1="170" y1="210" x2="220" y2="210" stroke="#14b8a6" strokeWidth="0.7" opacity="0.4" />
            <circle cx="220" cy="210" r="2.2" fill="#2dd4bf" />
            <circle cx="220" cy="210" r="6" fill="none" stroke="#2dd4bf" strokeWidth="0.4" opacity="0.3" />
            <text x="160" y="213" textAnchor="end" fill="#99f6e4" fontSize="9.5" fontFamily="monospace" letterSpacing="0.25em" opacity="0.7">
              THOUGHTS
            </text>
          </g>

          {/* DOMAIN 2: DECISIONS (Lower-Left Quad) */}
          <g opacity="0.75">
            <line x1="240" y1="690" x2="290" y2="690" stroke="#14b8a6" strokeWidth="0.7" opacity="0.4" />
            <circle cx="290" cy="690" r="2.2" fill="#2dd4bf" />
            <circle cx="290" cy="690" r="6" fill="none" stroke="#2dd4bf" strokeWidth="0.4" opacity="0.3" />
            <text x="230" y="693" textAnchor="end" fill="#99f6e4" fontSize="9.5" fontFamily="monospace" letterSpacing="0.25em" opacity="0.7">
              DECISIONS
            </text>
          </g>

          {/* DOMAIN 3: GOALS (Upper-Right Quad) */}
          <g opacity="0.75">
            <circle cx="1220" cy="180" r="2.2" fill="#2dd4bf" />
            <circle cx="1220" cy="180" r="6" fill="none" stroke="#2dd4bf" strokeWidth="0.4" opacity="0.3" />
            <line x1="1220" y1="180" x2="1265" y2="180" stroke="#14b8a6" strokeWidth="0.7" opacity="0.4" />
            <text x="1275" y="183" textAnchor="start" fill="#99f6e4" fontSize="9.5" fontFamily="monospace" letterSpacing="0.25em" opacity="0.7">
              GOALS
            </text>
          </g>

          {/* DOMAIN 4: GROWTH (Lower-Right Quad) */}
          <g opacity="0.75">
            <circle cx="1210" cy="670" r="2.2" fill="#2dd4bf" />
            <circle cx="1210" cy="670" r="6" fill="none" stroke="#2dd4bf" strokeWidth="0.4" opacity="0.3" />
            <line x1="1210" y1="670" x2="1255" y2="670" stroke="#14b8a6" strokeWidth="0.7" opacity="0.4" />
            <text x="1265" y="673" textAnchor="start" fill="#99f6e4" fontSize="9.5" fontFamily="monospace" letterSpacing="0.25em" opacity="0.7">
              GROWTH
            </text>
          </g>

          {/* ------------------------------------------------------------- */}
          {/* FAINT ATMOSPHERIC MEMORY NODES & PARTICLES                   */}
          {/* ------------------------------------------------------------- */}
          <g>
            {/* Distant background particles */}
            <circle cx="110" cy="380" r="1.2" fill="#14b8a6" opacity="0.3" filter="url(#deepBlur)" />
            <circle cx="1340" cy="240" r="1.2" fill="#06b6d4" opacity="0.25" filter="url(#deepBlur)" />
            <circle cx="780" cy="130" r="1.5" fill="#2dd4bf" opacity="0.3" />
            <circle cx="620" cy="740" r="1.4" fill="#14b8a6" opacity="0.25" />
            <circle cx="1380" cy="710" r="1.5" fill="#2dd4bf" opacity="0.25" />

            {/* Midground Connected Anchors */}
            <circle cx="360" cy="380" r="2.2" fill="#14b8a6" opacity="0.65" />
            <circle cx="520" cy="440" r="2" fill="#06b6d4" opacity="0.6" />
            <circle cx="680" cy="410" r="2.6" fill="#2dd4bf" opacity="0.85" filter="url(#softGlow)" />
            <circle cx="680" cy="410" r="8" fill="none" stroke="#2dd4bf" strokeWidth="0.4" opacity="0.3" />
            <circle cx="880" cy="350" r="2.2" fill="#14b8a6" opacity="0.7" />
            <circle cx="1080" cy="460" r="2.4" fill="#06b6d4" opacity="0.65" />
            <circle cx="1240" cy="280" r="2" fill="#2dd4bf" opacity="0.55" />
            <circle cx="480" cy="580" r="2.2" fill="#14b8a6" opacity="0.6" />
            <circle cx="940" cy="600" r="2.1" fill="#06b6d4" opacity="0.55" />

            {/* Subtle Interactive Node Reacting to Cursor Proximity */}
            {isPointerActive && (
              <g opacity="0.5">
                <circle
                  cx={mousePos.x}
                  cy={mousePos.y}
                  r="14"
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="0.4"
                  strokeDasharray="2 4"
                  opacity="0.35"
                />
                <circle
                  cx={mousePos.x}
                  cy={mousePos.y}
                  r="1.8"
                  fill="#2dd4bf"
                  opacity="0.5"
                />
              </g>
            )}
          </g>

          {/* ------------------------------------------------------------- */}
          {/* FAINT MEMORY FRAGMENTS (Fictional, atmospheric, decorative)   */}
          {/* ------------------------------------------------------------- */}
          <g className="font-sans italic text-[11px] select-none pointer-events-none">
            <text x="140" y="340" fill="#cbd5e1" className="frag-a" opacity="0.2">
              &ldquo;I wasn&apos;t sure...&rdquo;
            </text>
            <text x="320" y="775" fill="#cbd5e1" className="frag-b" opacity="0.18">
              &ldquo;I realized...&rdquo;
            </text>
            <text x="1080" y="140" fill="#cbd5e1" className="frag-c" opacity="0.22">
              &ldquo;I keep thinking...&rdquo;
            </text>
            <text x="1150" y="520" fill="#cbd5e1" className="frag-d" opacity="0.19">
              &ldquo;Maybe I should...&rdquo;
            </text>
          </g>
        </svg>
      </div>

      {/* Top Spacer / Subtle Status Pill */}
      <header className="relative z-10 w-full max-w-6xl xl:max-w-7xl flex items-center justify-between py-1 opacity-80">
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono tracking-[0.2em] text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400/90 shadow-[0_0_8px_rgba(45,212,191,0.6)] animate-pulse" />
          <span>COGNITIVE MEMORY SYSTEM</span>
        </div>
        <div className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
          PRIVATE ARCHIVE
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN TWO-ZONE DESKTOP COMPOSITION (BALANCED & VIEWPORT-CONSCIOUS)          */}
      {/* ========================================================================= */}
      <main className="relative z-10 w-full max-w-6xl xl:max-w-7xl my-auto py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">

          {/* ----------------------------------------------------------------- */}
          {/* LEFT ZONE: BRAND IDENTITY · HERO · PHILOSOPHY JOURNEY             */}
          {/* ----------------------------------------------------------------- */}
          <section className="seq-hero-zone lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* 1. Abstract ECHO Symbol (Standalone, Floating, Natural) */}
            <div className="mb-4 flex items-center gap-3.5">
              <EchoLogo size={56} />
              <div className="flex flex-col text-left">
                <span className="text-lg font-semibold tracking-[0.28em] text-neutral-100 uppercase font-sans leading-none">
                  ECHO
                </span>
                <span className="text-[9.5px] uppercase tracking-[0.28em] text-teal-400/90 font-mono font-medium mt-1">
                  Your Personal Cognitive Memory
                </span>
              </div>
            </div>

            {/* 2. Hero Statement (The Emotional Center of Product) */}
            <div className="mt-4 space-y-2 max-w-xl">
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-normal tracking-tight text-neutral-100 leading-[1.16]">
                Your thoughts don&apos;t disappear.
                <br />
                <span className="text-teal-400 font-medium">
                  They evolve.
                </span>
              </h1>
              <p className="text-sm sm:text-base text-neutral-400 leading-relaxed font-normal pt-2 max-w-lg">
                Reflect on the past, understand your decisions, and see how your thinking changes over time.
              </p>
            </div>

            {/* 3. Product Journey Philosophy (Editorial Typography, Not Buttons) */}
            <div className="mt-8 pt-6 border-t border-white/[0.06] w-full max-w-lg">
              <p className="text-[9.5px] uppercase tracking-[0.25em] text-neutral-500 font-mono mb-2.5">
                The Cognitive Journey
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-3 text-[10.5px] sm:text-[11px] font-mono tracking-[0.2em]">
                <span className="text-neutral-300 font-medium">REFLECT</span>
                <span className="text-neutral-600 font-sans select-none" aria-hidden="true">→</span>
                <span className="text-neutral-300 font-medium">REMEMBER</span>
                <span className="text-neutral-600 font-sans select-none" aria-hidden="true">→</span>
                <span className="text-teal-300 font-medium">UNDERSTAND</span>
                <span className="text-neutral-600 font-sans select-none" aria-hidden="true">→</span>
                <span className="text-teal-400 font-semibold">EVOLVE</span>
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* RIGHT ZONE: PRECISION FLOATING AUTHENTICATION SURFACE             */}
          {/* ----------------------------------------------------------------- */}
          <section className="seq-auth-zone lg:col-span-5 flex flex-col items-center lg:items-end w-full">
            <div className="w-full max-w-[400px] bg-[#0c0e14]/85 border border-white/[0.09] rounded-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-md transition-all duration-300 relative">
              {/* Subtle top indicator bar */}
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-400/80" />
                  <span className="text-[11px] font-mono tracking-[0.16em] text-neutral-300 uppercase font-medium">
                    Secure Sign In
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-500">
                  Firebase Auth
                </span>
              </div>

              {/* Actionable Error State Banner if Firebase encounters issues */}
              {errorInfo && (
                <div
                  id="login-error-banner"
                  className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs space-y-1.5 text-left"
                  role="alert"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-rose-200">{errorInfo.message}</span>
                    {errorInfo.code && (
                      <span className="font-mono text-[9.5px] bg-rose-900/60 text-rose-300 px-1.5 py-0.5 rounded shrink-0">
                        {errorInfo.code}
                      </span>
                    )}
                  </div>
                  {errorInfo.actionableHint && (
                    <p className="text-rose-300/80 text-[11px] leading-relaxed">
                      {errorInfo.actionableHint}
                    </p>
                  )}
                </div>
              )}

              {/* Primary Action: Continue with Google */}
              <button
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
                aria-label="Continue with Google authentication"
                className="w-full h-[54px] px-4 bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.04] text-neutral-100 font-medium rounded-xl border border-white/[0.12] hover:border-teal-500/40 shadow-[0_2px_12px_rgba(0,0,0,0.35)] hover:shadow-[0_4px_20px_rgba(20,184,166,0.16)] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090e]"
              >
                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"
                      role="status"
                      aria-label="Loading"
                    />
                    <span className="text-sm font-medium text-neutral-300">Authenticating...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="text-sm font-medium tracking-wide">Continue with Google</span>
                    <ArrowRight
                      className="w-4 h-4 text-neutral-500 group-hover:text-teal-300 group-hover:translate-x-0.5 transition-all duration-200 ml-auto"
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>

              {/* Private by Design Trust Statement */}
              <div className="mt-5 pt-4 border-t border-white/[0.06] text-center space-y-1.5">
                <p className="text-[10px] font-mono tracking-[0.22em] text-teal-400 uppercase font-semibold">
                  PRIVATE BY DESIGN
                </p>
                <p className="text-[11px] sm:text-[11.5px] text-neutral-400 leading-relaxed font-normal">
                  Server-verified identity · Owner-isolated memory · Secure AI processing
                </p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* LOWER TEMPORAL LAYER: MEMORY TIMELINE & PHILOSOPHICAL CLOSING STATEMENT   */}
      {/* ========================================================================= */}
      <div className="seq-timeline relative z-10 w-full max-w-6xl xl:max-w-7xl pt-4 pb-2 flex flex-col items-center gap-3 select-none">
        {/* Subtle Visual Timeline: PAST ────────── PRESENT [NOW] ────────── FUTURE */}
        <div className="w-full max-w-3xl flex items-center justify-between text-[9.5px] sm:text-[10px] font-mono tracking-[0.24em] text-neutral-500 px-4">
          <span className="text-neutral-500 font-medium">PAST</span>

          <div className="flex-1 mx-4 sm:mx-6 flex items-center justify-between relative">
            <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-teal-500/25 to-transparent" />
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 z-10" />
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500/50 z-10" />

            {/* Central NOW Anchor */}
            <div className="z-10 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-950/60 border border-teal-500/40 text-teal-300 text-[9px] tracking-widest shadow-[0_0_10px_rgba(20,184,166,0.25)]">
              <span className="w-1 h-1 rounded-full bg-teal-400 animate-ping" />
              <span>NOW</span>
            </div>

            <span className="w-1.5 h-1.5 rounded-full bg-teal-500/50 z-10" />
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 z-10" />
          </div>

          <span className="text-neutral-500 font-medium">FUTURE</span>
        </div>

        {/* Final Subtle Statement */}
        <p className="text-[11px] text-neutral-400/90 font-mono tracking-wide">
          A private timeline of how you think.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 3. FOOTER TOP DIVIDER & RESPONSIVE 5-COLUMN / COMPACT MOBILE FOOTER      */}
      {/* ========================================================================= */}
      <footer className="relative z-10 w-full border-t border-white/[0.07] mt-10 pt-8 sm:pt-10 lg:pt-11 pb-7 sm:pb-8 select-none">
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-12">
          
          {/* ───────────────────────────────────────────────────────────────── */}
          {/* DESKTOP 5-COLUMN COMPOSITION (>= 1024px)                          */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-6 xl:gap-8 pb-8">
            
            {/* COLUMN 1 — ECHO BRAND */}
            <div className="lg:col-span-4 flex flex-col items-start pr-0 lg:pr-6 space-y-3">
              <div className="flex items-center gap-3.5">
                <EchoLogo size={46} />
                <div className="flex flex-col">
                  <span className="text-[17px] font-semibold tracking-[0.24em] text-neutral-100 uppercase font-sans leading-none">
                    ECHO
                  </span>
                  <span className="text-[13.5px] sm:text-[14px] text-neutral-300 font-medium mt-1">
                    Your Personal Cognitive Memory
                  </span>
                </div>
              </div>
              <p className="text-[13.5px] sm:text-[14px] text-neutral-400 leading-relaxed max-w-sm pt-0.5">
                A private timeline of how you think.
              </p>
            </div>

            {/* COLUMN 2 — PRODUCT */}
            <div className="lg:col-span-2 flex flex-col space-y-3">
              <span className="text-[11px] font-mono tracking-[0.22em] text-teal-400 uppercase font-medium">
                PRODUCT
              </span>
              <ul className="space-y-2 text-[14px] sm:text-[14.5px] text-neutral-400">
                <li className="hover:text-neutral-200 transition-colors">Reflect</li>
                <li className="hover:text-neutral-200 transition-colors">Memory</li>
                <li className="hover:text-neutral-200 transition-colors">Ask Your Past Self</li>
                <li className="hover:text-neutral-200 transition-colors">Decisions</li>
                <li className="hover:text-neutral-200 transition-colors">Thought Evolution</li>
                <li className="hover:text-neutral-200 transition-colors">ECHO Insights</li>
              </ul>
            </div>

            {/* COLUMN 3 — SUPPORT */}
            <div className="lg:col-span-2 flex flex-col space-y-3">
              <span className="text-[11px] font-mono tracking-[0.22em] text-teal-400 uppercase font-medium">
                SUPPORT
              </span>
              <ul className="space-y-2 text-[14px] sm:text-[14.5px] text-neutral-400">
                <li>
                  <button
                    onClick={() => setActiveSupportModal('security')}
                    className="hover:text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    Security
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSupportModal('privacy')}
                    className="hover:text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    Privacy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSupportModal('terms')}
                    className="hover:text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    Terms
                  </button>
                </li>
                <li>
                  <a
                    href="mailto:maahasarathysb@gmail.com"
                    className="hover:text-neutral-200 transition-colors inline-block"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => setActiveSupportModal('faq')}
                    className="hover:text-neutral-200 transition-colors text-left cursor-pointer"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            {/* COLUMN 4 — CONNECT */}
            <div className="lg:col-span-2 flex flex-col space-y-3">
              <span className="text-[11px] font-mono tracking-[0.22em] text-teal-400 uppercase font-medium">
                CONNECT
              </span>
              <ul className="space-y-2.5 text-[14px] sm:text-[14.5px]">
                <li>
                  <a
                    href="https://github.com/maahasarathysb-lab/echo-personal-cognitive-memory-v2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-neutral-400 hover:text-teal-300 transition-colors group"
                    aria-label="ECHO GitHub repository"
                  >
                    <Github className="w-4 h-4 text-neutral-400 group-hover:text-teal-300 transition-colors flex-shrink-0" />
                    <span>GitHub</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-teal-300 transition-colors" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/maahasarathy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-neutral-400 hover:text-teal-300 transition-colors group"
                    aria-label="LinkedIn profile"
                  >
                    <Linkedin className="w-4 h-4 text-neutral-400 group-hover:text-teal-300 transition-colors flex-shrink-0" />
                    <span>LinkedIn</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-teal-300 transition-colors" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=maahasarathysb@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-neutral-400 hover:text-teal-300 transition-colors group"
                    aria-label="Email / Contact"
                  >
                    <Mail className="w-4 h-4 text-neutral-400 group-hover:text-teal-300 transition-colors flex-shrink-0" />
                    <span>Email / Contact</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-teal-300 transition-colors" />
                  </a>
                </li>
              </ul>
            </div>

            {/* COLUMN 5 — BUILT WITH (With subtle vertical divider on left) */}
            <div className="lg:col-span-2 flex flex-col space-y-4 lg:pl-6 xl:pl-8 lg:border-l lg:border-white/[0.08]">
              <div>
                <span className="text-[11px] font-mono tracking-[0.22em] text-teal-400 uppercase font-medium block mb-2">
                  BUILT WITH
                </span>
                <div className="text-[14px] sm:text-[14.5px] text-neutral-200 font-medium">Google Cloud</div>
                <div className="text-[13px] sm:text-[13.5px] text-neutral-400 mt-0.5">Gemini · Cloud Run</div>
              </div>

              <div className="pt-3.5 border-t border-white/[0.06]">
                <span className="text-[11px] font-mono tracking-[0.22em] text-teal-400 uppercase font-medium block mb-1.5">
                  BUILT FOR
                </span>
                <div className="text-[14px] sm:text-[14.5px] text-neutral-200 font-medium">Hack2skill</div>
                <div className="text-[13px] sm:text-[13.5px] text-neutral-400 mt-0.5">Gen AI Academy</div>
              </div>
            </div>

          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* MOBILE & TABLET COMPOSITION (< 1024px)                            */}
          {/* Specifically compact, grouped layout avoiding excessive height   */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div className="lg:hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-x-10 md:gap-y-6">
              
              {/* MOBILE BRAND */}
              <div className="flex flex-col items-start space-y-1.5 md:col-span-2">
                <div className="flex items-center gap-3">
                  <EchoLogo size={36} />
                  <div className="flex flex-col">
                    <span className="text-[16px] font-semibold tracking-[0.24em] text-neutral-100 uppercase font-sans leading-none">
                      ECHO
                    </span>
                    <span className="text-[13px] text-neutral-300 font-medium mt-1">
                      Your Personal Cognitive Memory
                    </span>
                  </div>
                </div>
                <p className="text-[13px] text-neutral-400 pt-0.5">
                  A private timeline of how you think.
                </p>
              </div>

              {/* MOBILE PRODUCT (Compact Grouped Links) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono tracking-[0.22em] text-teal-400 uppercase font-medium block">
                  PRODUCT
                </span>
                <div className="text-[13.5px] text-neutral-400 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="hover:text-neutral-200 transition-colors">Reflect</span>
                    <span className="text-neutral-600">·</span>
                    <span className="hover:text-neutral-200 transition-colors">Memory</span>
                  </div>
                  <div>
                    <span className="hover:text-neutral-200 transition-colors">Ask Your Past Self</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="hover:text-neutral-200 transition-colors">Decisions</span>
                    <span className="text-neutral-600">·</span>
                    <span className="hover:text-neutral-200 transition-colors">Thought Evolution</span>
                  </div>
                  <div>
                    <span className="hover:text-neutral-200 transition-colors">ECHO Insights</span>
                  </div>
                </div>
              </div>

              {/* MOBILE SUPPORT (Compact Inline Grouping) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono tracking-[0.22em] text-teal-400 uppercase font-medium block">
                  SUPPORT
                </span>
                <div className="text-[13.5px] text-neutral-400 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveSupportModal('security')}
                      className="hover:text-neutral-200 transition-colors text-left cursor-pointer"
                    >
                      Security
                    </button>
                    <span className="text-neutral-600">·</span>
                    <button
                      onClick={() => setActiveSupportModal('privacy')}
                      className="hover:text-neutral-200 transition-colors text-left cursor-pointer"
                    >
                      Privacy
                    </button>
                    <span className="text-neutral-600">·</span>
                    <button
                      onClick={() => setActiveSupportModal('terms')}
                      className="hover:text-neutral-200 transition-colors text-left cursor-pointer"
                    >
                      Terms
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href="mailto:maahasarathysb@gmail.com"
                      className="hover:text-neutral-200 transition-colors"
                    >
                      Contact
                    </a>
                    <span className="text-neutral-600">·</span>
                    <button
                      onClick={() => setActiveSupportModal('faq')}
                      className="hover:text-neutral-200 transition-colors text-left cursor-pointer"
                    >
                      FAQ
                    </button>
                  </div>
                </div>
              </div>

              {/* MOBILE CONNECT (Horizontal Row with wrapping) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono tracking-[0.22em] text-teal-400 uppercase font-medium block">
                  CONNECT
                </span>
                <div className="flex items-center gap-2.5 flex-wrap text-[13.5px]">
                  <a
                    href="https://github.com/maahasarathysb-lab/echo-personal-cognitive-memory-v2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-neutral-400 hover:text-teal-300 transition-colors group"
                    aria-label="ECHO GitHub repository"
                  >
                    <Github className="w-3.5 h-3.5 text-neutral-400 group-hover:text-teal-300 transition-colors flex-shrink-0" />
                    <span>GitHub</span>
                    <ArrowUpRight className="w-3 h-3 text-neutral-500 group-hover:text-teal-300 transition-colors" />
                  </a>
                  <span className="text-neutral-600">·</span>
                  <a
                    href="https://www.linkedin.com/in/maahasarathy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-neutral-400 hover:text-teal-300 transition-colors group"
                    aria-label="LinkedIn profile"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-neutral-400 group-hover:text-teal-300 transition-colors flex-shrink-0" />
                    <span>LinkedIn</span>
                    <ArrowUpRight className="w-3 h-3 text-neutral-500 group-hover:text-teal-300 transition-colors" />
                  </a>
                  <span className="text-neutral-600">·</span>
                  <a
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=maahasarathysb@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-neutral-400 hover:text-teal-300 transition-colors group"
                    aria-label="Email / Contact"
                  >
                    <Mail className="w-3.5 h-3.5 text-neutral-400 group-hover:text-teal-300 transition-colors flex-shrink-0" />
                    <span>Email / Contact</span>
                    <ArrowUpRight className="w-3 h-3 text-neutral-500 group-hover:text-teal-300 transition-colors" />
                  </a>
                </div>
              </div>

              {/* MOBILE BUILT WITH & BUILT FOR */}
              <div className="space-y-2.5">
                <div>
                  <span className="text-[11px] font-mono tracking-[0.22em] text-teal-400 uppercase font-medium block mb-0.5">
                    BUILT WITH
                  </span>
                  <div className="text-[13.5px] text-neutral-300 flex items-center gap-1.5 flex-wrap">
                    <span>Google Cloud</span>
                    <span className="text-neutral-600">·</span>
                    <span>Gemini</span>
                    <span className="text-neutral-600">·</span>
                    <span>Cloud Run</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-mono tracking-[0.22em] text-teal-400 uppercase font-medium block mb-0.5">
                    BUILT FOR
                  </span>
                  <div className="text-[13.5px] text-neutral-300">
                    Hack2skill Gen AI Academy
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* FOOTER BOTTOM ROW                                                 */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div className="w-full border-t border-white/[0.06] pt-5 mt-6 sm:mt-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] sm:text-[13px] font-mono tracking-wider text-neutral-500">
            <div>
              <span className="hidden sm:inline">&copy; 2026 ECHO. All rights reserved.</span>
              <span className="sm:hidden">&copy; 2026 ECHO</span>
            </div>
            <div className="text-teal-400/90 font-medium tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
              <span>PRIVATE · OWNER-ISOLATED</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Support Details Modal (Clean Information Dialogs without inventing external pages) */}
      {activeSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0b0e15] border border-white/[0.1] rounded-2xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl text-left relative">
            <button
              onClick={() => setActiveSupportModal(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
            {activeSupportModal === 'security' && (
              <>
                <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span>Security Architecture</span>
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  All reflections, memory anchors, and cognitive insights are cryptographically isolated within your private user path under Firestore security rules.
                </p>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Only your verified Firebase Google UID can read or write to your personal interactions. Cross-user data leakage is prevented by strict server-side rules.
                </p>
              </>
            )}
            {activeSupportModal === 'privacy' && (
              <>
                <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-teal-400" />
                  <span>Privacy Commitment</span>
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  ECHO is designed as a personal, owner-isolated cognitive sanctuary. We do not sell, rent, or broker your thoughts.
                </p>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Reflections are never used for public model training. Your personal cognitive timeline remains exclusively accessible to you.
                </p>
              </>
            )}
            {activeSupportModal === 'terms' && (
              <>
                <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>Terms of Service</span>
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  ECHO provides private memory synthesis and cognitive reflection tools for personal developmental use.
                </p>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  All intellectual property in the thoughts, journals, and reflections you record remains 100% your own.
                </p>
              </>
            )}
            {activeSupportModal === 'faq' && (
              <>
                <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-teal-400" />
                  <span>Frequently Asked Questions</span>
                </h3>
                <div className="space-y-2.5 text-xs text-neutral-300">
                  <div>
                    <strong className="text-neutral-200 block">How does ECHO remember my thinking?</strong>
                    <span>ECHO indexes your past reflections to synthesize trajectories, trace shifts in reasoning, and reveal latent patterns.</span>
                  </div>
                  <div>
                    <strong className="text-neutral-200 block">Is my data secure?</strong>
                    <span>Yes. Everything is stored under authenticated user boundaries with strict access control.</span>
                  </div>
                </div>
              </>
            )}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveSupportModal(null)}
                className="px-4 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-neutral-200 border border-white/[0.08] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
