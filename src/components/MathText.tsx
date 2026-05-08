'use client';

import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
}

export default function MathText({ text, className }: MathTextProps) {
  const html = useMemo(() => {
    // Split on $...$ patterns (inline math)
    const parts = text.split(/(\$[^$]+\$)/g);
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
