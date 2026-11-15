'use client';

import { ReactNode, useState } from 'react';
import { ChartColumn, Table } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ChartCardProps {
  title: string;
  /** One line under the title naming what is plotted (stands in for a single-series legend). */
  subtitle?: string;
  /** The same data as rows, so every value is readable without hovering. */
  table?: { columns: string[]; rows: Array<Array<string | number>> };
  /** Shown instead of the chart when there is nothing to plot. */
  empty?: string | false;
  className?: string;
  children: ReactNode;
}

/** Frame for a chart: title, the plot, and a switch to view the numbers as a table. */
export default function ChartCard({ title, subtitle, table, empty, className, children }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <Card className={className}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
        </div>
        {table && !empty && (
          <Button
            variant="ghost"
            size="sm"
            className="no-print -mr-2 -mt-1 shrink-0"
            aria-pressed={showTable}
            onClick={() => setShowTable(v => !v)}
            icon={showTable ? <ChartColumn className="h-4 w-4" aria-hidden="true" /> : <Table className="h-4 w-4" aria-hidden="true" />}
          >
            {showTable ? 'Chart' : 'Table'}
          </Button>
        )}
      </div>

      {empty ? (
        <p className="py-10 text-center text-sm text-ink-muted">{empty}</p>
      ) : showTable && table ? (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                {table.columns.map((c, i) => <th key={c} className={`py-2 ${i > 0 ? 'pl-4 text-right' : ''}`}>{c}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {table.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td key={i} className={`py-2 ${i > 0 ? 'pl-4 text-right tabular-nums text-ink' : 'text-ink-muted'}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
