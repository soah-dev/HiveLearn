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

export default function SettingsPage() {
  const { user, token, loading, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [editingGrade, setEditingGrade] = useState<Record<string, number>>({});
  const [savingGrade, setSavingGrade] = useState<string | null>(null);
  const [gradeSaved, setGradeSaved] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (token && user?.role === 'parent') {
      apiFetch('/api/parent/children', token)
        .then(data => {
          const kids = data.children || [];
          setChildren(kids);
          const grades: Record<string, number> = {};
          for (const c of kids) grades[c.id] = c.grade ?? 1;
          setEditingGrade(grades);
        })
        .catch(() => {});
    }
  }, [user, token, loading, router]);

  const saveGrade = async (childId: string) => {
    setSavingGrade(childId);
    try {
      await apiFetch('/api/parent/children', token, {
        method: 'PATCH',
        body: JSON.stringify({ childId, grade: editingGrade[childId] }),
      });
      setChildren(prev => prev.map(c => c.id === childId ? { ...c, grade: editingGrade[childId] } : c));
      setGradeSaved(childId);
      setTimeout(() => setGradeSaved(null), 2000);
    } catch (err) {
      console.error(err);
    }
    setSavingGrade(null);
  };

  if (loading) return <><Navbar /><div className="p-8"><LoadingSpinner size="lg" /></div></>;

  const childGrade = (user as { grade?: number | null })?.grade;

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
              {user?.role === 'child' && (
                <span className="inline-block mt-1 ml-2 px-3 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                  {childGrade ? `Grade ${childGrade}` : 'Grade not set'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Children grade management (Parent only) */}
        {user?.role === 'parent' && children.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Children&apos;s Grade Levels</h2>
            <div className="space-y-4">
              {children.map(child => (
                <div key={child.id} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-sm flex-shrink-0">
                    {(child.name || 'C')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{child.name || child.email}</p>
                  </div>
                  <select
                    value={editingGrade[child.id] ?? child.grade ?? 1}
                    onChange={e => setEditingGrade(prev => ({ ...prev, [child.id]: Number(e.target.value) }))}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                  <button
                    onClick={() => saveGrade(child.id)}
                    disabled={savingGrade === child.id}
                    className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {savingGrade === child.id ? '...' : gradeSaved === child.id ? 'Saved!' : 'Save'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
