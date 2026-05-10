'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Child {
  id: string;
  name: string | null;
  email: string;
  grade: number | null;
  image: string | null;
}

interface LinkedParent {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export default function SettingsPage() {
  const { user, token, getToken, loading, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([]);
  const [editingGrade, setEditingGrade] = useState<Record<string, number>>({});
  const [savingGrade, setSavingGrade] = useState<string | null>(null);
  const [gradeSaved, setGradeSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (token && user?.role === 'parent') {
      apiFetch('/api/parent/children', getToken)
        .then(data => {
          const kids = data.children || [];
          setChildren(kids);
          const grades: Record<string, number> = {};
          for (const c of kids) grades[c.id] = c.grade ?? 1;
          setEditingGrade(grades);
        })
        .catch(() => {});
    }
    if (token && user?.role === 'child') {
      apiFetch('/api/child/parents', getToken)
        .then(data => setLinkedParents(data.parents || []))
        .catch(() => {});
    }
  }, [user, token, loading, router]);

  const saveGrade = async (childId: string) => {
    setSavingGrade(childId);
    try {
      await apiFetch('/api/parent/children', getToken, {
        method: 'PATCH',
        body: JSON.stringify({ childId, grade: editingGrade[childId] }),
      });
      setChildren(prev => prev.map(c => c.id === childId ? { ...c, grade: editingGrade[childId] } : c));
      setGradeSaved(childId);
      setTimeout(() => setGradeSaved(null), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save grade');
    }
    setSavingGrade(null);
  };

  if (loading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const childGrade = (user as { grade?: number | null })?.grade;

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-8 animate-slide-up">Settings</h1>

        {/* Profile */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 mb-6 card-hover animate-slide-up">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            {user?.image ? (
              <img src={user.image} alt="" className="w-16 h-16 rounded-full ring-3 ring-indigo-200 dark:ring-indigo-800 shadow-md" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                {(user?.name || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-lg">{user?.name}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{user?.email}</p>
              <div className="flex gap-2 mt-2">
                <span className="inline-block px-3 py-0.5 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold capitalize">
                  {user?.role}
                </span>
                {user?.role === 'child' && (
                  <span className="inline-block px-3 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                    {childGrade ? `Grade ${childGrade}` : 'Grade not set'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Linked Parents (Child only) */}
        {user?.role === 'child' && linkedParents.length > 0 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 mb-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Linked Parents</h2>
            <div className="space-y-3">
              {linkedParents.map(parent => (
                <div key={parent.id} className="flex items-center gap-3">
                  {parent.image ? (
                    <img src={parent.image} alt="" className="w-9 h-9 rounded-full ring-2 ring-indigo-200 dark:ring-indigo-800" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(parent.name || 'P')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{parent.name || 'Parent'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{parent.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Children grade management (Parent only) */}
        {user?.role === 'parent' && children.length > 0 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 mb-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Children&apos;s Grade Levels</h2>
            <div className="space-y-4">
              {children.map(child => (
                <div key={child.id} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(child.name || 'C')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{child.name || child.email}</p>
                  </div>
                  <select
                    value={editingGrade[child.id] ?? child.grade ?? 1}
                    onChange={e => setEditingGrade(prev => ({ ...prev, [child.id]: Number(e.target.value) }))}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                  <button
                    onClick={() => saveGrade(child.id)}
                    disabled={savingGrade === child.id}
                    className="text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1.5 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    {savingGrade === child.id ? '...' : gradeSaved === child.id ? 'Saved!' : 'Save'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dark Mode */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Dark Mode</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Toggle dark/light theme</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-14 h-7 rounded-full transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-md ${darkMode ? 'translate-x-7' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <button
            onClick={async () => { await signOut(); router.push('/'); }}
            className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-3.5 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all border border-red-200/50 dark:border-red-800/50"
          >
            Sign Out
          </button>
        </div>
      </main>
    </>
  );
}
