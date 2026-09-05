import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { LoginView } from './components/LoginView';
import { JournalDashboard } from './components/JournalDashboard';
import { Brain, Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authInitializing, setAuthInitializing] = useState(true);

  useEffect(() => {
    // Avoid auth initialization races: wait until Firebase Auth restores session
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  // Strict loading state while Firebase Auth resolves cached credentials/tokens
  if (authInitializing) {
    return (
      <div id="auth-loading-screen" className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="w-12 h-12 rounded-xl bg-[#111111] border border-[#222222] flex items-center justify-center shadow-lg">
          <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center">
            <span className="text-[#0a0a0a] font-bold text-xs uppercase">E</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#888888]">
          <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
          <span>Restoring secure session...</span>
        </div>
      </div>
    );
  }

  // Not authenticated: render clean Google sign-in screen
  if (!user) {
    return <LoginView />;
  }

  // Authenticated: strictly scoped to authoritative user
  return <JournalDashboard user={user} />;
}
