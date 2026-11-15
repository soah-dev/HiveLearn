import { ReactNode } from 'react';
import { ChartColumn, Flame, LucideIcon, Sparkles } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { HEX_PATH } from '@/components/ui/Hexagon';

const points: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Sparkles, title: 'Assignments in minutes', text: 'Pick a subject and level. Questions are written for you to review and edit.' },
  { icon: Flame, title: 'Practice that sticks', text: 'Streaks, points and badges reward showing up every day.' },
  { icon: ChartColumn, title: 'Progress you can see', text: 'Scores by subject and week, so you know where to help.' },
];

/**
 * Frame for signed-out screens (sign in, onboarding, invites): a brand panel
 * beside the form on desktop, just the logo above it on phones. The panel is
 * always dark, so its colours are fixed rather than theme tokens.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="relative hidden overflow-hidden bg-[#1C1814] text-[#F5F0E6] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="honeycomb absolute inset-0" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1C1814] via-[#1C1814]/90 to-[#1C1814]/20" aria-hidden="true" />

        <Logo size="md" onDark className="relative" />

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            Homework that builds a <span className="text-[#F5B50A]">habit</span>.
          </h2>
          <ul className="mt-10 space-y-6">
            {points.map(p => (
              <li key={p.title} className="flex gap-4">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center text-[#1C1814]">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
                    <path d={HEX_PATH} fill="#F5B50A" />
                  </svg>
                  <p.icon className="relative h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#B9AF9E]">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-[#958B7A]">For parents and the students they cheer on.</p>
      </div>

      <div className="flex min-h-screen flex-col">
        <div className="p-5 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-4 sm:px-8 lg:p-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
