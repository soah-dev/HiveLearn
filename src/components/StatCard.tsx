interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  gradient?: string;
}

const defaultGradients = ['stat-gradient-purple', 'stat-gradient-green', 'stat-gradient-amber', 'stat-gradient-rose', 'stat-gradient-teal', 'stat-gradient-blue'];
let gradientIndex = 0;

export default function StatCard({ title, value, subtitle, icon, gradient }: StatCardProps) {
  const bg = gradient || defaultGradients[gradientIndex++ % defaultGradients.length];

  return (
    <div className={`${bg} rounded-2xl p-5 card-hover border border-white/50 dark:border-white/10 animate-slide-up`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <span className="text-4xl animate-float-slow">{icon}</span>}
      </div>
    </div>
  );
}
