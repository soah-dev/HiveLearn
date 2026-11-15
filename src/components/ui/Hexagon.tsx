import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Path of a pointy-top hexagon with softened corners, in a 100×100 box. */
function roundedHexPath(cx: number, cy: number, r: number, corner: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (-90 + 60 * i);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  });
  const t = corner / r; // a regular hexagon's edge length equals its circumradius
  const f = (n: number) => n.toFixed(2);
  let d = '';
  for (let i = 0; i < 6; i++) {
    const prev = pts[(i + 5) % 6];
    const cur = pts[i];
    const next = pts[(i + 1) % 6];
    d += `${i === 0 ? 'M' : 'L'}${f(cur[0] + (prev[0] - cur[0]) * t)} ${f(cur[1] + (prev[1] - cur[1]) * t)}`;
    d += `Q${f(cur[0])} ${f(cur[1])} ${f(cur[0] + (next[0] - cur[0]) * t)} ${f(cur[1] + (next[1] - cur[1]) * t)}`;
  }
  return `${d}Z`;
}

export const HEX_PATH = roundedHexPath(50, 50, 48, 9);

export type HexTone = 'honey' | 'soft' | 'muted' | 'outline' | 'ink' | 'good' | 'warn' | 'bad' | 'info';

const tones: Record<HexTone, { shape: string; content: string }> = {
  honey: { shape: 'fill-honey', content: 'text-honey-ink' },
  soft: { shape: 'fill-honey-soft', content: 'text-honey-text' },
  muted: { shape: 'fill-muted', content: 'text-ink-muted' },
  outline: { shape: 'fill-transparent stroke-line-strong [stroke-width:3]', content: 'text-ink-subtle' },
  ink: { shape: 'fill-ink', content: 'text-canvas' },
  good: { shape: 'fill-good-soft', content: 'text-good-text' },
  warn: { shape: 'fill-warn-soft', content: 'text-warn-text' },
  bad: { shape: 'fill-bad-soft', content: 'text-bad-text' },
  info: { shape: 'fill-info-soft', content: 'text-info-text' },
};

interface HexagonProps {
  /** Box size in px. The hexagon is as tall as the box and ~87% as wide. */
  size?: number;
  tone?: HexTone;
  className?: string;
  children?: ReactNode;
}

/** The brand shape: a honeycomb cell that frames an icon, number or initial. */
export default function Hexagon({ size = 40, tone = 'soft', className, children }: HexagonProps) {
  const t = tones[tone];
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', t.content, className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={HEX_PATH} className={t.shape} />
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}
