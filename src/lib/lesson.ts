/**
 * A study lesson's content: the shape Gemini is asked for, what is stored in
 * `StudyLesson.content`, and what the lesson page renders. Nothing here touches
 * the server, so client components can import it.
 */

export type LessonSection = { heading: string; body: string };
export type LessonTerm = { term: string; definition: string };
export type LessonExample = { prompt: string; steps: string[]; answer: string };

export type LessonContent = {
  /** What the topic is and why it matters, in a sentence or two. */
  summary: string;
  sections: LessonSection[];
  keyTerms: LessonTerm[];
  examples: LessonExample[];
  takeaways: string[];
};

export const MAX_TOPIC_LENGTH = 80;

/** Tidy a topic typed by a student: single spaces, capped length, leading capital. */
export function cleanTopic(value: unknown): string {
  if (typeof value !== 'string') return '';
  const topic = value.replace(/\s+/g, ' ').trim().slice(0, MAX_TOPIC_LENGTH).trim();
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

const CONTROL_TO_LATEX: Record<string, string> = { '\f': '\\f', '\b': '\\b', '\t': '\\t', '\r': '\\r' };

/**
 * Gemini's JSON mode writes LaTeX with a single backslash, so "\frac" is parsed
 * as a form feed followed by "rac" (likewise \times, \beta, \rightarrow, \neq).
 * Lesson text never uses those control characters on purpose, so turn them back
 * into the start of the command. A newline is only repaired inside $...$, where
 * it cannot be a real line break.
 */
export function repairLatexEscapes(value: string): string {
  return value
    .replace(/[\f\b\t\r](?=[a-zA-Z])/g, c => CONTROL_TO_LATEX[c])
    .replace(/\$[^$]*\$/g, math => math.replace(/\n(?=[a-z])/g, '\\n'));
}

const text = (v: unknown): string => (typeof v === 'string' ? repairLatexEscapes(v).trim() : '');
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

/**
 * Validate and tidy lesson content coming from the model or the database.
 * Malformed or empty entries are dropped; returns null when what is left is
 * not a usable lesson (no summary or no sections).
 */
export function normalizeLessonContent(raw: unknown): LessonContent | null {
  const r = record(raw);

  const summary = text(r.summary);
  const sections = list(r.sections)
    .map(s => ({ heading: text(record(s).heading), body: text(record(s).body) }))
    .filter(s => s.heading && s.body)
    .slice(0, 6);
  if (!summary || sections.length === 0) return null;

  const keyTerms = list(r.keyTerms)
    .map(t => ({ term: text(record(t).term), definition: text(record(t).definition) }))
    .filter(t => t.term && t.definition)
    .slice(0, 8);
  const examples = list(r.examples)
    .map(e => ({
      prompt: text(record(e).prompt),
      steps: list(record(e).steps).map(text).filter(Boolean).slice(0, 8),
      answer: text(record(e).answer),
    }))
    .filter(e => e.prompt && e.answer)
    .slice(0, 4);
  const takeaways = list(r.takeaways).map(text).filter(Boolean).slice(0, 6);

  return { summary, sections, keyTerms, examples, takeaways };
}

/** The lesson as plain text, for prompts whose questions must stay within what it taught. */
export function lessonNotes(content: LessonContent): string {
  return [
    content.summary,
    ...content.sections.map(s => `${s.heading}\n${s.body}`),
    content.keyTerms.length > 0 && `Key words:\n${content.keyTerms.map(t => `- ${t.term}: ${t.definition}`).join('\n')}`,
    content.examples.length > 0 && `Worked examples:\n${content.examples.map(e => `- ${e.prompt} Answer: ${e.answer}`).join('\n')}`,
    content.takeaways.length > 0 && `Remember:\n${content.takeaways.map(t => `- ${t}`).join('\n')}`,
  ].filter(Boolean).join('\n\n');
}

export type LessonBlock = { type: 'paragraph'; text: string } | { type: 'list'; items: string[] };

/** Split a section body into paragraphs (one per line) and runs of "- " bullets. */
export function parseLessonBlocks(body: string): LessonBlock[] {
  const blocks: LessonBlock[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const last = blocks[blocks.length - 1];
    if (!bullet) blocks.push({ type: 'paragraph', text: line });
    else if (last?.type === 'list') last.items.push(bullet[1]);
    else blocks.push({ type: 'list', items: [bullet[1]] });
  }
  return blocks;
}

/** Split text on **bold** markers, the only inline markup lessons use besides $math$. */
export function splitBold(value: string): Array<{ text: string; bold: boolean }> {
  return value
    .split(/\*\*([^*]+)\*\*/)
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter(part => part.text);
}
