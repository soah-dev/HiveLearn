import { describe, it, expect } from 'vitest';
import { renderMathHtml, autoWrapMath } from '@/lib/math-html';

const katexed = (html: string) => html.includes('class="katex"');
// KaTeX keeps the TeX source in an accessibility <annotation>; ignore it when checking visible output
const visible = (html: string) => html.replace(/<annotation[\s\S]*?<\/annotation>/g, '');

describe('renderMathHtml', () => {
  it('renders the exact strings from the generated-question screenshot', () => {
    const samples = [
      'Solve the quadratic equation $2x^2 - 5x - 3 = 0$ for $x$.',
      '$x = -\\frac{1}{2}$ or $x = 3$',
      'In a right-angled triangle $ABC$ where $\\angle B = 90^\\circ$, the hypotenuse $AC = 12\\text{ cm}$.',
      '$6\\sqrt{3}\\text{ cm}$',
      '$4\\text{ cm}$',
    ];
    for (const s of samples) {
      const html = renderMathHtml(s);
      expect(katexed(html), s).toBe(true);
      expect(visible(html), s).not.toContain('\\frac');
      expect(visible(html), s).not.toContain('\\text');
      expect(visible(html), s).not.toContain('$');
    }
  });

  it('renders two separate math segments in one string', () => {
    const html = renderMathHtml('$x = -\\frac{1}{2}$ or $x = 3$');
    expect(html.match(/class="katex"/g)?.length).toBe(2);
    expect(html).toContain(' or ');
  });

  it('leaves currency alone and escapes HTML', () => {
    const html = renderMathHtml('It costs $5 and $3 <b>total</b>');
    expect(katexed(html)).toBe(false);
    expect(html).toContain('&lt;b&gt;');
  });

  it('auto-wraps bare LaTeX commands', () => {
    expect(autoWrapMath('Simplify 3 \\times 4')).toBe('Simplify $3 \\times 4$');
    expect(katexed(renderMathHtml('Simplify 3 \\times 4'))).toBe(true);
    expect(autoWrapMath('no math here')).toBe('no math here');
  });

  it('does not throw on malformed LaTeX', () => {
    expect(() => renderMathHtml('$\\frac{1$')).not.toThrow();
  });
});
