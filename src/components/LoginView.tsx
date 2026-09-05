import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Shield, Sparkles, Brain, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Sign-in failure:', err);
      const message = err instanceof Error ? err.message : 'Authentication failed';
      if (message.includes('popup-closed-by-user')) {
        setError('Sign-in cancelled. Please try again.');
      } else {
        setError('Unable to authenticate with Google. Please check your connection and retry.');
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
        {error && (
          <div id="login-error-banner" className="mb-6 p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
            <span>{error}</span>
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
