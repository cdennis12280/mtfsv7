import { AlertTriangle, CheckCircle2, Clock, Printer, RotateCcw, Users } from 'lucide-react';
import { validateModel } from '../engine/validation';
import { useMTFSStore } from '../store/mtfsStore';
import { buildWorkflowSteps, ROLE_PRESETS, saveStateLabel } from '../utils/uiUx';

const statusColor = {
  complete: '#10b981',
  warning: '#f59e0b',
  blocked: '#ef4444',
  not_started: '#64748b',
};

export function JourneyHeader() {
  const {
    activeTab,
    authorityConfig,
    baseline,
    assumptions,
    result,
    savingsProposals,
    scenarios,
    snapshots,
    workflowState,
    rolePreset,
    saveState,
    meetingMode,
    printPreviewMode,
    setMeetingMode,
    setPrintPreviewMode,
    resetWorkflowUiState,
  } = useMTFSStore();
  const validation = validateModel({ authorityConfig, baseline, assumptions, result, savingsProposals, scenarios, snapshots, workflowState });
  const steps = buildWorkflowSteps({
    validation,
    authorityName: authorityConfig.authorityName,
    baselineLocked: workflowState.baselineLocked,
    assumptionsFrozen: workflowState.assumptionsFrozen,
    savingsProposals,
    scenarios,
    snapshots,
    result,
    exports: workflowState.governanceExports,
  });
  const current = steps.find((step) => step.tab === activeTab) ?? steps[0];
  const next = steps.find((step) => step.status === 'blocked' || step.status === 'warning' || step.status === 'not_started') ?? current;
  const preset = ROLE_PRESETS[rolePreset];
  const color = statusColor[current.status];

  return (
    <section className="journey-header mb-4 rounded-xl border border-[rgba(99,179,237,0.14)] bg-[rgba(10,17,32,0.72)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded border border-[rgba(99,179,237,0.18)] bg-[rgba(99,179,237,0.06)] px-2 py-1 text-[10px] font-semibold text-[#c8d7ee]">
              <Users size={11} /> {preset.label} journey
            </span>
            <span className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold" style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
              {current.status === 'complete' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
              {current.label}: {current.status.replace('_', ' ')}
            </span>
            <span className="rounded border border-[rgba(99,179,237,0.16)] px-2 py-1 text-[10px] font-semibold text-[#8ca0c0]">
              {saveStateLabel(saveState)}
            </span>
            {meetingMode && <span className="rounded border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.08)] px-2 py-1 text-[10px] font-semibold text-[#10b981]">Meeting mode</span>}
          </div>
          <p className="mt-2 text-[12px] font-semibold text-[#f0f4ff]">{preset.primaryAction}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#8ca0c0]">{preset.tone} Next best action: <span className="text-[#dbeafe]">{next.detail}</span></p>
          {current.blocker && <p className="mt-1 text-[10px] text-[#f59e0b]">Blocker: {current.blocker}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMeetingMode(!meetingMode)} className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.1)] px-3 py-2 text-[10px] font-semibold text-[#93c5fd]">
            <Clock size={12} /> {meetingMode ? 'Exit meeting mode' : 'Meeting mode'}
          </button>
          <button onClick={() => setPrintPreviewMode(printPreviewMode === 'none' ? 'governance_evidence' : 'none')} className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(99,179,237,0.22)] bg-[rgba(99,179,237,0.06)] px-3 py-2 text-[10px] font-semibold text-[#8ca0c0]">
            <Printer size={12} /> {printPreviewMode === 'none' ? 'Print preview' : 'Close preview'}
          </button>
          <button onClick={resetWorkflowUiState} className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] px-3 py-2 text-[10px] font-semibold text-[#f59e0b]">
            <RotateCcw size={12} /> Reset flow
          </button>
        </div>
      </div>
    </section>
  );
}

