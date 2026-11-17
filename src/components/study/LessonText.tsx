import { Fragment } from 'react';
import { cn } from '@/lib/cn';
import { parseLessonBlocks, splitBold } from '@/lib/lesson';
import MathText from '@/components/MathText';

/** One run of lesson text with **bold** key words and inline $math$. */
export function LessonInline({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((part, i) =>
        part.bold ? (
          <strong key={i} className="font-semibold text-ink"><MathText text={part.text} /></strong>
        ) : (
          <Fragment key={i}><MathText text={part.text} /></Fragment>
        )
      )}
    </>
  );
}

/** A lesson section's body: paragraphs and bullet lists at a comfortable reading size. */
export default function LessonText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('space-y-3 text-[15px] leading-relaxed text-ink sm:text-base sm:leading-relaxed', className)}>
      {parseLessonBlocks(text).map((block, i) =>
        block.type === 'paragraph' ? (
          <p key={i}><LessonInline text={block.text} /></p>
        ) : (
          <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-ink-subtle">
            {block.items.map((item, j) => <li key={j}><LessonInline text={item} /></li>)}
          </ul>
        )
      )}
    </div>
  );
}
