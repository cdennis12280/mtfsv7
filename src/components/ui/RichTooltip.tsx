import { Info } from 'lucide-react';
import clsx from 'clsx';

interface RichTooltipProps {
  content: string;
  className?: string;
}

export function RichTooltip({ content, className }: RichTooltipProps) {
  return (
    <span className={clsx('tooltip inline-flex items-center', className)}>
      <span
        className="inline-flex items-center justify-center text-[#4a6080] hover:text-[#8ca0c0] transition-colors"
        aria-label="More information"
      >
        <Info size={11} />
      </span>
      <span className="tooltip-content" role="tooltip">
        {content}
      </span>
    </span>
  );
}
