'use client';

import { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { renderMathHtml } from '@/lib/math-html';

interface MathTextProps {
  text: string;
  className?: string;
}

/** Renders text with inline $...$ LaTeX via KaTeX. Non-math text is HTML-escaped. */
export default function MathText({ text, className }: MathTextProps) {
  const html = useMemo(() => renderMathHtml(text), [text]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
