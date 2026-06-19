'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function Navbar() {
  const { user, signOut, loading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return null;

  const homeHref = user?.role === 'parent' ? '/parent/dashboard' : user?.role === 'child' ? '/child/dashboard' : '/';

  const parentLinks = [
    { href: '/parent/dashboard', label: 'Dashboard' },
    { href: '/parent/create', label: 'Create' },
    { href: '/parent/analytics', label: 'Reports' },
    { href: '/parent/leaderboard', label: 'Leaderboard' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/settings', label: 'Settings' },
  ];

  const childLinks = [
    { href: '/child/dashboard', label: 'Dashboard' },
    { href: '/child/practice', label: 'Practice' },
    { href: '/child/sat', label: 'SAT Prep' },
    { href: '/child/badges', label: 'Badges' },
    { href: '/child/leaderboard', label: 'Leaderboard' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/settings', label: 'Settings' },
  ];

  const links = user?.role === 'parent' ? parentLinks : user?.role === 'child' ? childLinks : [];

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href={homeHref} className="text-xl font-extrabold gradient-text tracking-tight">
          HiveExcel
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
          {user && links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {user && (
            <>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 hidden sm:inline">{user.name}</span>
              <button onClick={signOut} className="text-sm font-medium text-red-500 hover:text-red-600 hidden sm:inline transition-colors">Sign Out</button>
            </>
          )}

          {/* Mobile hamburger */}
          {user && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="sm:hidden p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && user && (
        <div className="sm:hidden mt-3 pb-2 border-t border-gray-200/50 dark:border-gray-700/50 pt-3 animate-slide-up">
          <div className="flex flex-col gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => { signOut(); setMenuOpen(false); }}
              className="text-left text-sm font-medium text-red-500 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
