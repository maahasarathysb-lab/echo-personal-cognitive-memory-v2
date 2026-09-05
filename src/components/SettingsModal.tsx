import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  User as UserIcon,
  Shield,
  Palette,
  HelpCircle,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  Github,
  Linkedin,
  Mail,
  Loader2,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { EchoLogo } from './EchoLogo';

export type SettingsTab = 'account' | 'privacy' | 'preferences' | 'about';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  user: User;
  interactionsCount: number;
  onDeleteAllReflections?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'account',
  user,
  interactionsCount,
  onDeleteAllReflections,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => {
    return localStorage.getItem('echo_reduce_motion') === 'true';
  });

  // Sync initial tab when reopened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setConfirmDeleteOpen(false);
      setDeleteSuccess(false);
    }
  }, [isOpen, initialTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (confirmDeleteOpen) {
          setConfirmDeleteOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmDeleteOpen, onClose]);

  // Toggle reduce motion
  const handleToggleReduceMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    localStorage.setItem('echo_reduce_motion', String(next));
    if (next) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  };

  const handleDeleteAll = async () => {
    if (!onDeleteAllReflections) return;
    try {
      setIsDeleting(true);
      await onDeleteAllReflections();
      setDeleteSuccess(true);
      setConfirmDeleteOpen(false);
    } catch (err) {
      console.error('Failed to delete all reflections:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const userInitial = user.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'account', label: 'Account', icon: UserIcon },
    { id: 'privacy', label: 'Memory & Privacy', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'about', label: 'Help & About', icon: HelpCircle },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-xl bg-[#090b11] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-white/[0.06] bg-[#07090e]">
          <div className="flex items-center gap-2.5">
            <EchoLogo size={22} />
            <span className="text-xs font-semibold tracking-wider text-neutral-100 uppercase font-sans">
              ECHO Settings
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-2.5 border-b border-white/[0.05] bg-[#080a0f] overflow-x-auto custom-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors whitespace-nowrap cursor-pointer border-b-2 -mb-px ${
                  isActive
                    ? 'text-teal-300 border-teal-400 bg-white/[0.03]'
                    : 'text-neutral-400 hover:text-neutral-200 border-transparent hover:bg-white/[0.02]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar text-neutral-300 text-sm">
          {/* TAB 1: ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono tracking-widest text-teal-400 uppercase font-medium mb-1">
                  ACCOUNT
                </h3>
                <p className="text-xs text-neutral-400">
                  Your ECHO cognitive workspace is securely bound to your verified Google account.
                </p>
              </div>

              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google profile'}
                    referrerPolicy="no-referrer"
                    className="w-13 h-13 rounded-full border border-white/[0.1] object-cover shrink-0"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center text-lg font-medium shrink-0">
                    {userInitial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-neutral-100 truncate">
                    {user.displayName || 'Google User'}
                  </div>
                  <div className="text-xs font-mono text-neutral-400 truncate mt-0.5">
                    {user.email || 'No email associated'}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="inline-flex items-center gap-1 text-[11px] font-mono text-teal-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>Google Verified</span>
                    </div>
                    <span className="text-neutral-600 text-xs">·</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-300">
                      GOOGLE ACCOUNT
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04] text-xs font-mono">
                  <span className="text-neutral-400">Authenticated Identity</span>
                  <span className="text-neutral-200 truncate max-w-[240px]">{user.displayName || 'Google Account'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04] text-xs font-mono">
                  <span className="text-neutral-400">Account Email</span>
                  <span className="text-neutral-200 truncate max-w-[240px]">{user.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04] text-xs font-mono">
                  <span className="text-neutral-400">Authentication Provider</span>
                  <span className="text-neutral-200">Google (Firebase Auth)</span>
                </div>
                <div className="py-2 border-b border-white/[0.04] text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-neutral-400">Ownership Boundary</span>
                    <span className="text-teal-400">Owner-isolated</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Your reflections are accessible only to your authenticated account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEMORY & PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono tracking-widest text-teal-400 uppercase font-medium mb-1">
                  MEMORY & PRIVACY
                </h3>
                <p className="text-xs text-neutral-400">
                  Your memories are private and owner-isolated.
                </p>
              </div>

              {/* Storage Stats */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono tracking-wider text-neutral-400 uppercase">
                    YOUR REFLECTIONS
                  </div>
                  <div className="text-2xl font-semibold text-neutral-100 mt-1">
                    {interactionsCount} <span className="text-xs font-normal text-neutral-400 font-mono">reflections stored</span>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/25 text-[11px] font-mono text-teal-300">
                  OWNER-ISOLATED
                </div>
              </div>

              {/* Privacy Notice Card */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs text-neutral-400">
                <div className="flex items-center gap-2 text-neutral-200 font-medium">
                  <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Your memories are private and owner-isolated.</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-400 pl-6">
                  Only your authenticated Google identity has permission to read or query your reflections. Gemini cognitive processing grounds queries exclusively within your stored reflections.
                </p>
              </div>

              {/* Delete All Section */}
              <div className="p-4 rounded-xl bg-rose-500/[0.04] border border-rose-500/20 space-y-3">
                <div>
                  <div className="text-xs font-mono font-medium text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All Reflections</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Permanently wipe your entire reflection archive. This cannot be undone.
                  </p>
                </div>

                {deleteSuccess ? (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>All saved reflections were permanently deleted.</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium tracking-wide transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All Reflections...</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono tracking-widest text-teal-400 uppercase font-medium mb-1">
                  PREFERENCES
                </h3>
                <p className="text-xs text-neutral-400">
                  Visual and interaction settings for your reflective environment.
                </p>
              </div>

              {/* Appearance Setting */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-200">Appearance</div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    ECHO Cognitive Dark (Default)
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1 max-w-md">
                    Near-black charcoal palette with cyan accents optimized for focused reflection.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-neutral-300 shrink-0">
                  DARK
                </span>
              </div>

              {/* Reduce Motion Setting */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-neutral-200">Reduce Motion</div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    Minimizes visual ripples and interface transitions.
                  </div>
                </div>
                <button
                  onClick={handleToggleReduceMotion}
                  role="switch"
                  aria-checked={reduceMotion}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    reduceMotion ? 'bg-teal-500' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      reduceMotion ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ABOUT */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono tracking-widest text-teal-400 uppercase font-medium mb-1">
                  ABOUT
                </h3>
                <p className="text-xs text-neutral-400">
                  About the ECHO Personal Cognitive Memory platform.
                </p>
              </div>

              {/* Brand Card */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <EchoLogo size={32} />
                    <div>
                      <div className="text-base font-semibold tracking-wider text-neutral-100 uppercase font-sans">
                        ECHO
                      </div>
                      <div className="text-xs text-neutral-300">
                        Your Personal Cognitive Memory
                      </div>
                    </div>
                  </div>
                  {/* Subtle version indicator */}
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-neutral-400">
                    ECHO v2.0
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  A private timeline of how you think. ECHO empowers you to reflect deeply, replay critical decisions, track longitudinal thought evolution, and query your past mindset.
                </p>
                <div className="pt-2 border-t border-white/[0.04] text-[11px] font-mono text-teal-400">
                  Built with Google Cloud · Gemini · Cloud Run
                </div>
              </div>

              {/* External Links */}
              <div className="space-y-2">
                <a
                  href="https://github.com/maahasarathysb-lab/echo-personal-cognitive-memory-v2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-teal-500/30 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Github className="w-4 h-4 text-neutral-400 group-hover:text-teal-300" />
                    <span className="text-xs font-medium text-neutral-300 group-hover:text-neutral-100">GitHub Repository</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-teal-300" />
                </a>

                <a
                  href="https://www.linkedin.com/in/maahasarathy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-teal-500/30 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Linkedin className="w-4 h-4 text-neutral-400 group-hover:text-teal-300" />
                    <span className="text-xs font-medium text-neutral-300 group-hover:text-neutral-100">LinkedIn</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-teal-300" />
                </a>

                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=maahasarathysb@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-teal-500/30 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-neutral-400 group-hover:text-teal-300" />
                    <span className="text-xs font-medium text-neutral-300 group-hover:text-neutral-100">Email Contact (Gmail Compose)</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-teal-300" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-white/[0.05] bg-[#07090e] flex items-center justify-between text-xs font-mono text-neutral-500">
          <span>&copy; 2026 ECHO</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* CONFIRMATION DIALOG FOR DELETE ALL REFLECTIONS */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-md bg-[#0e1017] border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-semibold text-neutral-100">
                Delete all reflections?
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                This permanently deletes your saved reflections and cannot be undone.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                disabled={isDeleting}
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteAll}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete All</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
