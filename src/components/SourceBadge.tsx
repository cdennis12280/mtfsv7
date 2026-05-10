import { sourceBadgeTone } from '../utils/uiUx';

export function SourceBadge({ source }: { source: 'Imported' | 'Manual' | 'Default' | 'Scenario' | 'Snapshot' | 'Frozen Pack' }) {
  const color = sourceBadgeTone(source);
  return (
    <span
      className="inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
      style={{ color, borderColor: `${color}40`, background: `${color}12` }}
    >
      {source}
    </span>
  );
}

