'use client';

import { useState } from 'react';
import Link from 'next/link';

const parentSteps = [
  {
    number: 1,
    title: 'Create Your Account',
    description: 'Sign up with email or Google and choose the Parent role. It only takes a minute.',
    icon: '👤',
  },
  {
    number: 2,
    title: 'Invite Your Child',
    description: 'Generate an invite code and share it with your child. They sign up with their own account and enter the code to link up.',
    icon: '🔗',
  },
  {
    number: 3,
    title: 'Create Assignments',
    description: 'Pick a subject, topic, grade level, and difficulty. Tailored questions are generated instantly — review and edit before assigning.',
    icon: '📝',
  },
  {
    number: 4,
    title: 'Review Results',
    description: 'Assignments are automatically reviewed with scores and explanations, or you can grade them yourself with personal feedback.',
    icon: '✅',
  },
  {
    number: 5,
    title: 'Track Progress',
    description: 'View analytics dashboards with score trends, subject breakdowns, and streaks to see how your child is improving over time.',
    icon: '📊',
  },
];

const childSteps = [
  {
    number: 1,
    title: 'Join with an Invite Code',
    description: 'Sign up with your own account, then enter the invite code your parent shared to link your accounts.',
    icon: '🎟️',
  },
  {
    number: 2,
    title: 'View Your Assignments',
    description: 'Your dashboard shows all pending assignments with the subject, difficulty, and whether they are timed.',
    icon: '📋',
  },
  {
    number: 3,
    title: 'Complete the Quiz',
    description: 'Answer each question at your own pace — or race the clock on timed quizzes. You can save progress and come back later.',
    icon: '✏️',
  },
  {
    number: 4,
    title: 'Get Your Results',
    description: 'See your score, read detailed explanations for each question, and learn from any mistakes right away.',
    icon: '🎯',
  },
  {
    number: 5,
    title: 'Earn Points & Badges',
    description: 'Every assignment earns you points. Build streaks, unlock badges, and climb the family leaderboard.',
    icon: '🏆',
  },
];

export default function HowItWorksPage() {
  const [tab, setTab] = useState<'parent' | 'child'>('parent');
  const steps = tab === 'parent' ? parentSteps : childSteps;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-950 dark:via-indigo-950 dark:to-purple-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-purple-300/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-300/20 dark:bg-indigo-600/10 rounded-full blur-3xl animate-float-slow" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12 animate-slide-up">
          <Link href="/" className="text-4xl font-extrabold gradient-text tracking-tight">
            HiveExcel
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">
            How It Works
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Get started in minutes — here&apos;s what to expect.
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex justify-center mb-10 animate-slide-up">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl p-1.5 border border-white/50 dark:border-gray-700/50 inline-flex gap-1">
            <button
              onClick={() => setTab('parent')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'parent'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              For Parents
            </button>
            <button
              onClick={() => setTab('child')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'child'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              For Students
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div
              key={`${tab}-${step.number}`}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/50 dark:border-gray-700/50 shadow-lg flex items-start gap-5 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
            >
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-2xl flex items-center justify-center text-2xl">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                    Step {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 animate-slide-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
