import { describe, it, expect } from 'vitest';
import { cleanTopic, lessonNotes, normalizeLessonContent, parseLessonBlocks, repairLatexEscapes, splitBold, MAX_TOPIC_LENGTH } from '@/lib/lesson';
import { buildLessonPrompt } from '@/lib/lesson-generation';
import { buildGenerationPrompt } from '@/lib/question-generation';
import { suggestedTopics } from '@/lib/study-topics';
import { GRADES, SUBJECTS } from '@/lib/subjects';

const lesson = {
  summary: 'A fraction names part of a whole.',
  sections: [{ heading: 'What is a fraction?', body: 'A fraction has two numbers.\n\n- The top is the **numerator**\n- The bottom is the **denominator**' }],
  keyTerms: [{ term: 'Numerator', definition: 'The top number.' }],
  examples: [{ prompt: 'What is half of 8?', steps: ['Split 8 into 2 equal groups.'], answer: '4' }],
  takeaways: ['The denominator can never be zero.'],
};

describe('cleanTopic', () => {
  it('collapses whitespace, capitalizes and caps the length', () => {
    expect(cleanTopic('  the   water\ncycle ')).toBe('The water cycle');
    expect(cleanTopic('x'.repeat(200))).toHaveLength(MAX_TOPIC_LENGTH);
  });
  it('returns an empty string for anything that is not usable text', () => {
    expect(cleanTopic('   ')).toBe('');
    expect(cleanTopic(42)).toBe('');
    expect(cleanTopic(undefined)).toBe('');
  });
});

describe('normalizeLessonContent', () => {
  it('keeps a well-formed lesson and trims its text', () => {
    expect(normalizeLessonContent({ ...lesson, summary: `  ${lesson.summary}  ` })).toEqual(lesson);
  });
  it('drops malformed entries instead of failing the whole lesson', () => {
    const content = normalizeLessonContent({
      summary: 'S',
      sections: [{ heading: 'H', body: 'B' }, { heading: 'No body' }, 'nonsense', null],
      keyTerms: [{ term: 'T' }, { term: 'T', definition: 'D' }],
      examples: [{ prompt: 'P', steps: ['one', '', 7], answer: 'A' }, { prompt: 'No answer', steps: [] }],
      takeaways: ['keep', '  ', 3],
    });
    expect(content?.sections).toEqual([{ heading: 'H', body: 'B' }]);
    expect(content?.keyTerms).toEqual([{ term: 'T', definition: 'D' }]);
    expect(content?.examples).toEqual([{ prompt: 'P', steps: ['one'], answer: 'A' }]);
    expect(content?.takeaways).toEqual(['keep']);
  });
  it('tolerates missing optional parts', () => {
    expect(normalizeLessonContent({ summary: 'S', sections: [{ heading: 'H', body: 'B' }] }))
      .toEqual({ summary: 'S', sections: [{ heading: 'H', body: 'B' }], keyTerms: [], examples: [], takeaways: [] });
  });
  it('rejects content that is not a usable lesson', () => {
    expect(normalizeLessonContent(null)).toBeNull();
    expect(normalizeLessonContent('a lesson')).toBeNull();
    expect(normalizeLessonContent({ ...lesson, summary: '' })).toBeNull();
    expect(normalizeLessonContent({ ...lesson, sections: [] })).toBeNull();
  });
  it('restores LaTeX that JSON parsing turned into control characters', () => {
    // What JSON.parse yields when the model writes "\frac" with a single backslash
    const fromModel = JSON.parse('{"summary":"Half is $\\frac{1}{2}$.","sections":[{"heading":"H","body":"$2 \\times 3$ and $a \\neq b$"}]}');
    expect(fromModel.summary).toContain('\f');
    const content = normalizeLessonContent(fromModel);
    expect(content?.summary).toBe('Half is $\\frac{1}{2}$.');
    expect(content?.sections[0].body).toBe('$2 \\times 3$ and $a \\neq b$');
  });
});

describe('repairLatexEscapes', () => {
  it('repairs every command a JSON escape can swallow', () => {
    expect(repairLatexEscapes('$\frac{1}{2}$ $\beta$ $\theta$ $\rightarrow$ $\nu$')).toBe('$\\frac{1}{2}$ $\\beta$ $\\theta$ $\\rightarrow$ $\\nu$');
  });
  it('leaves correct LaTeX and real line breaks alone', () => {
    const body = 'First $\\frac{1}{2}$ line.\n\nnext paragraph\n- a list item';
    expect(repairLatexEscapes(body)).toBe(body);
  });
});

describe('lesson text', () => {
  it('splits a body into paragraphs and bullet lists', () => {
    expect(parseLessonBlocks('First.\n\nSecond.\n- one\n- two\n\n* three\nLast.')).toEqual([
      { type: 'paragraph', text: 'First.' },
      { type: 'paragraph', text: 'Second.' },
      { type: 'list', items: ['one', 'two', 'three'] },
      { type: 'paragraph', text: 'Last.' },
    ]);
  });
  it('does not mistake bold text or negative numbers for bullets', () => {
    expect(parseLessonBlocks('**Note** this.\n-5 is negative.')).toEqual([
      { type: 'paragraph', text: '**Note** this.' },
      { type: 'paragraph', text: '-5 is negative.' },
    ]);
  });
  it('splits bold markers and leaves unmatched ones alone', () => {
    expect(splitBold('The **numerator** is on top.')).toEqual([
      { text: 'The ', bold: false },
      { text: 'numerator', bold: true },
      { text: ' is on top.', bold: false },
    ]);
    expect(splitBold('$2 * 3$ and 2 ** 3')).toEqual([{ text: '$2 * 3$ and 2 ** 3', bold: false }]);
  });
});

describe('prompts', () => {
  it('lesson prompt names the grade, subject label and topic', () => {
    const prompt = buildLessonPrompt({ grade: 4, subject: 'computer_science', topic: 'Loops' });
    expect(prompt).toContain('grade 4 student');
    expect(prompt).toContain('Subject: Computer Science');
    expect(prompt).toContain('Topic: "Loops"');
  });
  it('lesson notes carry every part of the lesson', () => {
    const notes = lessonNotes(lesson);
    for (const text of [lesson.summary, 'What is a fraction?', 'Numerator: The top number.', 'What is half of 8? Answer: 4', 'The denominator can never be zero.']) {
      expect(notes).toContain(text);
    }
  });
  it('question prompt includes the lesson only when notes are given', () => {
    const params = { grade: 4, subject: 'Math', topic: 'Fractions', difficulty: 'easy', numQuestions: 5, questionTypes: ['multiple_choice'] };
    expect(buildGenerationPrompt(params)).not.toContain('LESSON');
    expect(buildGenerationPrompt({ ...params, lessonNotes: lessonNotes(lesson) })).toContain(`--- LESSON ---\n${lesson.summary}`);
  });
});

describe('suggestedTopics', () => {
  it('offers distinct ideas for every subject at every grade', () => {
    for (const { value } of SUBJECTS) {
      for (const grade of GRADES) {
        const ideas = suggestedTopics(value, grade);
        expect(ideas.length, `${value} grade ${grade}`).toBeGreaterThanOrEqual(6);
        expect(new Set(ideas).size).toBe(ideas.length);
        expect(ideas.every(idea => idea.length <= MAX_TOPIC_LENGTH)).toBe(true);
      }
    }
  });
  it('returns nothing for an unknown subject', () => {
    expect(suggestedTopics('underwater_basket_weaving', 5)).toEqual([]);
  });
});
