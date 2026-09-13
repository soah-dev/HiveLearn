import katex from 'katex';

/**
 * Turn a string containing inline $...$ LaTeX into safe HTML: math segments
 * are rendered with KaTeX, everything else is HTML-escaped. Raw LaTeX with no
 * delimiters is auto-wrapped when a known command is detected.
 */

const LATEX_CMD_REGEX = /\\(?:frac|times|div|sqrt|pm|mp|cdot|ldots|sum|prod|int|infty|pi|theta|alpha|beta|gamma|delta|sigma|omega|log|ln|sin|cos|tan|lim|leq|geq|neq|approx|left|right|text|mathrm|mathbf|binom|over|angle|circ|degree)\b/;

// Split on $...$ (inline math). Require non-whitespace right after the opening
// and right before the closing $ so currency like "$5 and $3" isn't treated as math.
const MATH_SEGMENT_REGEX = /(\$\S[^$]*\S\$|\$\S\$)/g;

export function autoWrapMath(text: string): string {
  if (text.includes('$')) return text;
  if (!LATEX_CMD_REGEX.test(text)) return text;

  const match = text.match(LATEX_CMD_REGEX);
  if (!match || match.index === undefined) return text;

  let mathStart = match.index;
  // Walk backwards to include digits, spaces, parens that are part of the expression
  while (mathStart > 0 && /[\d\s()+\-*/.,=]/.test(text[mathStart - 1])) {
    mathStart--;
  }
  const trimOffset = text.substring(mathStart).search(/\S/);
  if (trimOffset > 0) mathStart += trimOffset;

  return text.substring(0, mathStart) + '$' + text.substring(mathStart) + '$';
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderMathHtml(text: string): string {
  const processed = autoWrapMath(text ?? '');
  return processed
    .split(MATH_SEGMENT_REGEX)
    .map(part => {
      if (part.length >= 3 && part.startsWith('$') && part.endsWith('$')) {
        try {
          return katex.renderToString(part.slice(1, -1), { throwOnError: false, displayMode: false });
        } catch {
          return escapeHtml(part);
        }
      }
      return escapeHtml(part);
    })
    .join('');
}
