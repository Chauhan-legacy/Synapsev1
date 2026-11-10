import React, { useMemo } from 'react';
import katex from 'katex';

interface MathFormulaProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({
  formula,
  displayMode = false,
  className = '',
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(formula, {
        displayMode,
        throwOnError: false,
      });
    } catch (e) {
      console.error('KaTeX rendering error:', e);
      return `<code class="text-rose-600">${formula}</code>`;
    }
  }, [formula, displayMode]);

  return (
    <span
      className={`katex-render ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
