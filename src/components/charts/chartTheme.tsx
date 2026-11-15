import { ReactNode } from 'react';

/**
 * Shared look for every Recharts chart, drawn from the design tokens so charts
 * follow light/dark automatically.
 *
 * The three series colours are validated as a set (colour-blind-safe for all
 * pairs, >= 3:1 on the card surface) in both themes. Don't add a fourth by eye:
 * fold extra series into "Other" or split into separate charts.
 */
export const series = {
  1: 'rgb(var(--chart-1))',
  2: 'rgb(var(--chart-2))',
  3: 'rgb(var(--chart-3))',
} as const;

export const surface = 'rgb(var(--surface))';

/** Axis text and rules are recessive: muted ink, hairline, no tick marks. */
export const axisProps = {
  tick: { fontSize: 12, fill: 'rgb(var(--ink-subtle))' },
  tickLine: false,
  axisLine: { stroke: 'rgb(var(--line-strong))' },
} as const;

/** Solid horizontal hairlines only. */
export const gridProps = {
  stroke: 'rgb(var(--line))',
  vertical: false,
} as const;

/** Hover wash behind a bar. */
export const barCursor = { fill: 'rgb(var(--muted))' };
/** Crosshair for line charts. */
export const lineCursor = { stroke: 'rgb(var(--line-strong))', strokeWidth: 1 };

/** Line-chart dot: >= 8px with a surface ring so it stays legible on the line. */
export const dotProps = (color: string) => ({ r: 4, fill: color, stroke: surface, strokeWidth: 2 });
export const activeDotProps = (color: string) => ({ r: 6, fill: color, stroke: surface, strokeWidth: 2 });

/** Legend labels wear text colour; the swatch beside them carries the series colour. */
export const legendFormatter = (value: ReactNode) => <span className="text-sm text-ink-muted">{value}</span>;

interface TooltipEntry {
  name?: string | number;
  value?: string | number | ReadonlyArray<string | number>;
  color?: string;
}

interface ChartTooltipProps {
  // Filled in by Recharts when it clones the element passed to <Tooltip content>
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: string | number;
  /** Appended to each value, e.g. "%". */
  unit?: string;
  /** Compact or otherwise reformat each value. */
  formatValue?: (value: number | string) => ReactNode;
  /** Override the heading (defaults to the hovered category). */
  formatLabel?: (label: string | number) => ReactNode;
}

/** Themed tooltip: the value leads, the series name follows, keyed by a short stroke. */
export function ChartTooltip({ active, payload, label, unit = '', formatValue, formatLabel }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-pop">
      {label !== undefined && label !== '' && (
        <p className="mb-1 text-xs text-ink-muted">{formatLabel ? formatLabel(label) : label}</p>
      )}
      {payload.map((item, i) => (
        <p key={i} className="flex items-center gap-2 text-sm">
          <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="font-semibold tabular-nums text-ink">
            {formatValue && !Array.isArray(item.value) ? formatValue(item.value as number | string) : String(item.value)}{unit}
          </span>
          <span className="text-ink-muted">{item.name}</span>
        </p>
      ))}
    </div>
  );
}
