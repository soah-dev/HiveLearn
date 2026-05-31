'use client';

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
}

const LATEX_CMD_REGEX = /\\(?:frac|times|div|sqrt|pm|mp|cdot|ldots|sum|prod|int|infty|pi|theta|alpha|beta|gamma|delta|sigma|omega|log|ln|sin|cos|tan|lim|leq|geq|neq|approx|left|right|text|mathrm|mathbf|binom|over)\b/;

// Auto-wrap raw LaTeX (no $ delimiters) by detecting where math starts
function autoWrapMath(text: string): string {
  if (text.includes('$')) return text;
  if (!LATEX_CMD_REGEX.test(text)) return text;

  const match = text.match(LATEX_CMD_REGEX);
  if (!match || match.index === undefined) return text;

  let mathStart = match.index;

  // Walk backwards to include digits, spaces, parens that are part of the expression
  // e.g. "3 \times" → include the "3 "
  while (mathStart > 0 && /[\d\s()+\-*/.,=]/.test(text[mathStart - 1])) {
    mathStart--;
  }
  // Don't start with trailing whitespace from the prefix
  const trimOffset = text.substring(mathStart).search(/\S/);
  if (trimOffset > 0) mathStart += trimOffset;

  const prefix = text.substring(0, mathStart);
  const mathPart = text.substring(mathStart);

  return prefix + '$' + mathPart + '$';
}

export default function MathText({ text, className }: MathTextProps) {
  const html = useMemo(() => {
    const processed = autoWrapMath(text);
    // Split on $...$ patterns (inline math)
    // Require non-whitespace after opening $ and before closing $ to avoid matching currency like "$5 and $3"
    const parts = processed.split(/(\$\S[^$]*\S\$|\$\S\$)/g);
    return parts
      .map(part => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const tex = part.slice(1, -1);
          try {
            return katex.renderToString(tex, {
              throwOnError: false,
              displayMode: false,
            });
          } catch {
            return part;
          }
        }
        // Escape HTML in non-math parts
        return part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      })
      .join('');
  }, [text]);

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
