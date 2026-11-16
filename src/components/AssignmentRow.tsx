import Link from 'next/link';
import { ReactNode } from 'react';
import { ChevronRight, Flag } from 'lucide-react';
import { subjectLabel } from '@/lib/subjects';
import SubjectIcon from '@/components/ui/SubjectIcon';
import DifficultyMeter from '@/components/ui/DifficultyMeter';
import Pill, { Score, Tone } from '@/components/ui/Pill';

interface AssignmentRowProps {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  status: string;
  score?: number | null;
  numQuestions: number;
  timeLimitMin?: number | null;
  createdAt: string;
  childName?: string;
  role: 'parent' | 'child';
  flaggedCount?: number;
  /** A button shown after the row's link (e.g. Auto-review). */
  action?: ReactNode;
}

// Tone follows what the viewer has to do: brand = in motion, warn = waiting on you
const statusPills: Record<'parent' | 'child', Record<string, { label: string; tone: Tone }>> = {
  parent: {
    pending: { label: 'Not started', tone: 'neutral' },
    in_progress: { label: 'In progress', tone: 'brand' },
    submitted: { label: 'Needs review', tone: 'warn' },
    reviewed: { label: 'Reviewed', tone: 'good' },
  },
  child: {
    pending: { label: 'Not started', tone: 'neutral' },
    in_progress: { label: 'In progress', tone: 'brand' },
    submitted: { label: 'Submitted', tone: 'info' },
    reviewed: { label: 'Reviewed', tone: 'good' },
  },
};

/** One assignment as a list row. Use inside a ListCard. */
export default function AssignmentRow({
  id, subject, topic, difficulty, status, score, numQuestions, timeLimitMin, createdAt, childName, role, flaggedCount, action,
}: AssignmentRowProps) {
  const href = role === 'parent' ? `/parent/assignment/${id}` : `/child/assignment/${id}`;
  const pill = statusPills[role][status] ?? { label: status.replace(/_/g, ' '), tone: 'neutral' as Tone };
  const hasScore = score !== null && score !== undefined;

  const pills = (
    <>
      {flaggedCount !== undefined && flaggedCount > 0 && (
        <Pill tone="warn"><Flag className="h-3 w-3" aria-hidden="true" />{flaggedCount}<span className="sr-only"> flagged</span></Pill>
      )}
      {!hasScore && <Pill tone={pill.tone}>{pill.label}</Pill>}
    </>
  );

  return (
    <li className="flex items-center gap-2 pr-3 sm:pr-4">
      <Link href={href} className="group flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-4 transition-colors sm:pl-5">
        <SubjectIcon subject={subject} />
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold text-ink group-hover:underline sm:truncate">
            {subjectLabel(subject)}{topic ? <span className="font-normal text-ink-muted"> · {topic}</span> : null}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
            {childName && <span className="font-medium text-ink">{childName}</span>}
            <span>{numQuestions} questions</span>
            <DifficultyMeter difficulty={difficulty} />
            {timeLimitMin ? <span>{timeLimitMin} min</span> : null}
            <span className="text-ink-subtle">{new Date(createdAt).toLocaleDateString()}</span>
          </p>
          {/* Phones: status sits under the details so the title keeps its width */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 empty:hidden sm:hidden">{pills}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-2 sm:flex">{pills}</span>
          {hasScore && <Score value={score} className="text-base" />}
          {!action && <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden="true" />}
        </div>
      </Link>
      {action}
    </li>
  );
}
