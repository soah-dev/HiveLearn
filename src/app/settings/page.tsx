'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Invite {
  id: string;
  inviteCode: string;
  status: string;
  child: { id: string; name: string | null; email: string } | null;
}

export default function SettingsPage() {
  const { user, token, loading, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (token && user?.role === 'parent') {
      apiFetch('/api/parent/invite', token)
        .then(data => setInvites(data.invites || []))
        .catch(() => {});
    }
  }, [user, token, loading, router]);

  const generateInvite = async () => {
    setGenerating(true);
    try {
      await apiFetch('/api/parent/invite', token, { method: 'POST' });
      // Refresh invites
      const invitesData = await apiFetch('/api/parent/invite', token);
      setInvites(invitesData.invites || []);
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  if (loading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

        {/* Profile */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            {user?.image ? (
              <img src={user.image} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-2xl font-semibold">
                {(user?.name || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-lg">{user?.name}</p>
              <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
              <span className="inline-block mt-1 px-3 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium capitalize">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Dark Mode */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dark Mode</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Toggle dark/light theme</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-14 h-7 rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow ${darkMode ? 'translate-x-7' : ''}`} />
            </button>
          </div>
        </div>

        {/* Linked Accounts (Parent only) */}
        {user?.role === 'parent' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Linked Children</h2>
              <button
                onClick={generateInvite}
                disabled={generating}
                className="text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
              >
                {generating ? 'Generating...' : '+ New Invite'}
              </button>
            </div>
            {invites.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No invites created yet.</p>
            ) : (
              <div className="space-y-3">
                {invites.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <span className="font-mono font-medium text-gray-900 dark:text-white">{inv.inviteCode}</span>
                      {inv.child ? (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Linked to {inv.child.name || inv.child.email}</p>
                      ) : (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">Pending</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      inv.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sign Out */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <button
            onClick={async () => { await signOut(); router.push('/'); }}
            className="w-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-3 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </main>
    </>
  );
}
