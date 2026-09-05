import React, { useState, useRef, useEffect } from 'react';
import { User, signOut, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  Settings,
  Shield,
  Palette,
  HelpCircle,
  ArrowLeftRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { SettingsModal, SettingsTab } from './SettingsModal';

interface ProfileDropdownProps {
  user: User;
  interactionsCount: number;
  onDeleteAllReflections?: () => Promise<void>;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  user,
  interactionsCount,
  onDeleteAllReflections,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('account');
  const [isSwitching, setIsSwitching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  const handleSignOut = async () => {
    try {
      setDropdownOpen(false);
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      setIsSwitching(true);
      setDropdownOpen(false);
      // Prompt Google account selection with custom parameters
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const authErr = err as { code?: string };
      if (
        authErr?.code !== 'auth/popup-closed-by-user' &&
        authErr?.code !== 'auth/cancelled-popup-request'
      ) {
        console.error('Switch account failure:', err);
      }
    } finally {
      setIsSwitching(false);
    }
  };

  const openSettingsWithTab = (tab: SettingsTab) => {
    setActiveSettingsTab(tab);
    setDropdownOpen(false);
    setSettingsModalOpen(true);
  };

  const userInitial = user.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative" ref={containerRef}>
      {/* Top-Right Avatar Button */}
      <button
        id="profile-avatar-trigger"
        onClick={() => setDropdownOpen((prev) => !prev)}
        aria-label="User profile menu"
        aria-expanded={dropdownOpen}
        className={`flex items-center gap-1.5 p-0.5 rounded-full transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${
          dropdownOpen
            ? 'ring-2 ring-teal-400/60 shadow-[0_0_12px_rgba(45,212,191,0.25)]'
            : 'hover:ring-2 hover:ring-teal-500/40'
        }`}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'User profile'}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full border border-white/[0.12] object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center text-xs font-semibold shadow-inner">
            {userInitial}
          </div>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {dropdownOpen && (
        <div
          id="profile-dropdown-menu"
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-[#090b11] border border-white/[0.08] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] z-50 overflow-hidden select-none"
        >
          {/* USER INFO HEADER */}
          <div className="p-4 border-b border-white/[0.06] bg-[#07090e]/90">
            <div className="flex items-start gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-white/[0.12] object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center text-sm font-semibold shrink-0">
                  {userInitial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-100 truncate">
                  {user.displayName || 'Google User'}
                </div>
                <div className="text-xs text-neutral-400 font-mono truncate mt-0.5">
                  {user.email || 'No email associated'}
                </div>
                
                {/* Security / Identity Indicator: Google Verified */}
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-neutral-400 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Google Verified</span>
                </div>

                {/* Google Account Badge */}
                <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-[10px] font-mono text-teal-300 tracking-wider">
                  <span className="w-1 h-1 rounded-full bg-teal-400" />
                  <span>GOOGLE ACCOUNT</span>
                </div>
              </div>
            </div>
          </div>

          {/* MENU ITEMS */}
          <div className="p-1.5 space-y-0.5">
            {/* Settings */}
            <button
              id="profile-menu-settings"
              role="menuitem"
              onClick={() => openSettingsWithTab('account')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none rounded-xl transition-colors cursor-pointer text-left group"
            >
              <Settings className="w-4 h-4 text-neutral-400 group-hover:text-teal-300 transition-colors" />
              <span>Settings</span>
            </button>

            {/* Privacy & Memory */}
            <button
              id="profile-menu-privacy"
              role="menuitem"
              onClick={() => openSettingsWithTab('privacy')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none rounded-xl transition-colors cursor-pointer text-left group"
            >
              <Shield className="w-4 h-4 text-neutral-400 group-hover:text-teal-300 transition-colors" />
              <span>Privacy & Memory</span>
            </button>

            {/* Appearance */}
            <button
              id="profile-menu-appearance"
              role="menuitem"
              onClick={() => openSettingsWithTab('preferences')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none rounded-xl transition-colors cursor-pointer text-left group"
            >
              <Palette className="w-4 h-4 text-neutral-400 group-hover:text-teal-300 transition-colors" />
              <span>Appearance</span>
            </button>

            {/* Help & About */}
            <button
              id="profile-menu-about"
              role="menuitem"
              onClick={() => openSettingsWithTab('about')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none rounded-xl transition-colors cursor-pointer text-left group"
            >
              <HelpCircle className="w-4 h-4 text-neutral-400 group-hover:text-teal-300 transition-colors" />
              <span>Help & About</span>
            </button>
          </div>

          {/* DIVIDER */}
          <div className="h-px bg-white/[0.06] my-1" />

          {/* SWITCH GOOGLE ACCOUNT */}
          <div className="p-1.5">
            <button
              id="profile-menu-switch-account"
              role="menuitem"
              onClick={handleSwitchAccount}
              disabled={isSwitching}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-teal-200 hover:bg-teal-500/10 focus-visible:bg-teal-500/10 focus-visible:outline-none rounded-xl transition-colors cursor-pointer text-left group"
            >
              <ArrowLeftRight className="w-4 h-4 text-neutral-400 group-hover:text-teal-300 transition-colors" />
              <span>Switch Google Account</span>
            </button>
          </div>

          {/* DIVIDER */}
          <div className="h-px bg-white/[0.06] my-1" />

          {/* SIGN OUT */}
          <div className="p-1.5">
            <button
              id="profile-menu-signout"
              role="menuitem"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-rose-300 hover:bg-rose-500/10 focus-visible:bg-rose-500/10 focus-visible:outline-none rounded-xl transition-colors cursor-pointer text-left group"
            >
              <LogOut className="w-4 h-4 text-neutral-500 group-hover:text-rose-400 transition-colors" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        initialTab={activeSettingsTab}
        user={user}
        interactionsCount={interactionsCount}
        onDeleteAllReflections={onDeleteAllReflections}
      />
    </div>
  );
};
