import { CheckCircle2, Circle } from 'lucide-react';
import { useMTFSStore } from '../store/mtfsStore';
import { checklistComplete } from '../utils/uiUx';

const labels = {
  demoDataLoaded: 'Demo data loaded',
  baselineLocked: 'Baseline locked',
  scenariosReady: 'Scenarios ready',
  validationRun: 'Validation run',
  packFrozen: 'Pack frozen',
  exportTested: 'Export tested',
  figuresReconciled: 'Figures reconciled',
} as const;

export function RehearsalChecklist() {
  const { rehearsalChecklist, toggleRehearsalChecklistItem } = useMTFSStore();
  const complete = checklistComplete(rehearsalChecklist);
  return (
    <section id="rehearsal-checklist" className="rounded-xl border border-[rgba(99,179,237,0.14)] bg-[rgba(10,17,32,0.72)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Rehearsal checklist</p>
          <p className="mt-1 text-[11px] text-[#8ca0c0]">{complete ? 'Ready for the room.' : 'Complete before presenting or exporting.'}</p>
        </div>
        <span className={`rounded border px-2 py-1 text-[10px] font-semibold ${complete ? 'border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.08)] text-[#10b981]' : 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] text-[#f59e0b]'}`}>
          {Object.values(rehearsalChecklist).filter(Boolean).length}/7
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => {
          const checked = rehearsalChecklist[key];
          return (
            <button
              key={key}
              onClick={() => toggleRehearsalChecklistItem(key)}
              className="flex items-center gap-2 rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(99,179,237,0.04)] px-2 py-2 text-left text-[10px] text-[#c8d7ee]"
            >
              {checked ? <CheckCircle2 size={13} className="text-[#10b981]" /> : <Circle size={13} className="text-[#4a6080]" />}
              {labels[key]}
            </button>
          );
        })}
      </div>
    </section>
  );
}

