type Accent = 'purple' | 'green' | 'amber' | 'rose' | 'teal' | 'blue';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  /** Background accent. Defaults to a stable colour derived from the title. */
  accent?: Accent;
}

const accents: Accent[] = ['purple', 'green', 'amber', 'rose', 'teal', 'blue'];

// Derive the accent from the title so a given stat always gets the same
// colour, regardless of render order or how many times the page re-renders.
const accentFor = (title: string): Accent => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return accents[hash % accents.length];
};

export default function StatCard({ title, value, subtitle, icon, accent }: StatCardProps) {
  const bg = `stat-gradient-${accent || accentFor(title)}`;

  return (
    <div className={`${bg} rounded-2xl p-4 sm:p-5 card-hover border border-white/50 dark:border-white/10 animate-slide-up`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-1 tabular-nums break-words">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <span className="text-3xl sm:text-4xl animate-float-slow flex-shrink-0" aria-hidden="true">{icon}</span>}
      </div>
    </div>
  );
}
