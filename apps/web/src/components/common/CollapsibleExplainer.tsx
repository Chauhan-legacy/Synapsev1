import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleExplainerProps {
  title?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const CollapsibleExplainer: React.FC<CollapsibleExplainerProps> = ({
  title = 'What am I looking at?',
  children,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="surface-subtle border rounded-md p-3 my-3 text-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left font-medium text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <span>{title}</span>
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t text-secondary space-y-2 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
};
