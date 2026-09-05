import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Shield, Sparkles, Brain, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

interface AuthErrorInfo {
  code?: string;
  message: string;
  actionableHint?: string;
}

export const LoginView: React.FC<LoginViewProps> = () => {
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(null);

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
    <div id="login-container" className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col justify-center items-center px-4 py-12 font-sans">
      <div className="w-full max-w-md bg-[#111111] border border-[#222222] rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-teal-500 mb-4 shadow-sm">
            <span className="text-[#0a0a0a] font-bold text-base uppercase">E</span>
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white mb-2">
            ECHO
          </h1>
          <p className="text-xs uppercase tracking-widest text-teal-400 font-medium mb-3">
            Your Personal Cognitive Memory
          </p>
          <p className="text-xs text-[#888888] leading-relaxed italic">
            &ldquo;The starter app remembers what you said. ECHO understands how your thoughts evolve.&rdquo;
          </p>
        </div>

        {/* Security Highlights */}
        <div className="bg-[#1a1a1a] border border-[#222222] rounded-xl p-4 mb-6 text-xs text-[#cccccc] space-y-2">
          <div className="flex items-center gap-2 text-white font-medium">
            <Shield className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Secure Baseline Security</span>
          </div>
          <p className="text-[#888888] pl-6 leading-normal">
            Server-verified Firebase ID tokens, cryptographic authorization, and isolated Cloud Firestore per-user partitions.
          </p>
        </div>

        {/* Error Alert */}
        {errorInfo && (
          <div id="login-error-banner" className="mb-6 p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs space-y-1.5 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-rose-200">{errorInfo.message}</span>
              {errorInfo.code && (
                <span className="font-mono text-[10px] bg-rose-900/50 text-rose-300 px-1.5 py-0.5 rounded shrink-0">
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

        {/* Action Button */}
        <button
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-[#1a1a1a] border border-[#333333] hover:bg-[#222222] text-white font-medium rounded-xl transition duration-150 flex items-center justify-center gap-3 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <span>Authenticating...</span>
            </div>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Continue with Google</span>
              <ArrowRight className="w-4 h-4 text-[#666666] ml-auto" />
            </>
          )}
        </button>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-[#222222] text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#555555]">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Powered by Gemini Multi-Model Fallback Ladder</span>
          </div>
        </div>
      </div>
    </div>
  );
};
