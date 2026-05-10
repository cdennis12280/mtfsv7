import { CheckCircle, Circle, XCircle } from 'lucide-react';
import { useMTFSStore } from '../store/mtfsStore';
import { validateModel } from '../engine/validation';
import { buildWorkflowSteps } from '../utils/uiUx';

export function WorkflowRail() {
  const {
    authorityConfig,
    baseline,
    assumptions,
    savingsProposals,
    scenarios,
    snapshots,
    workflowState,
    result,
    setActiveTab,
    setActiveSectionAnchor,
  } = useMTFSStore();
  const validation = validateModel({
    authorityConfig,
    baseline,
    assumptions,
    result,
    savingsProposals,
    scenarios,
    snapshots,
    workflowState,
  });

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

  const dataQualityScore = validation.modelConfidenceScore;

  return (
    <div className="workflow-rail border-b border-[rgba(99,179,237,0.08)] bg-[rgba(8,12,20,0.96)] px-5 py-2">
      <div className="flex items-center gap-2 overflow-x-auto">
        <div className="shrink-0 pr-2 border-r border-[rgba(99,179,237,0.12)]">
          <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Data quality</p>
          <p className={`mono text-[12px] font-bold ${dataQualityScore >= 80 ? 'text-[#10b981]' : dataQualityScore >= 60 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
            {dataQualityScore}/100
          </p>
        </div>
        {steps.map((step) => {
          const color = step.status === 'blocked' ? '#ef4444' : step.status === 'complete' ? '#10b981' : step.status === 'warning' ? '#f59e0b' : '#64748b';
          const Icon = step.status === 'blocked' ? XCircle : step.status === 'complete' ? CheckCircle : Circle;
          return (
            <button
              key={step.id}
              onClick={() => {
                setActiveTab(step.tab);
                setActiveSectionAnchor(step.anchor);
              }}
              className="workflow-step shrink-0 text-left rounded-lg border px-2.5 py-1.5 min-w-[118px]"
              style={{ borderColor: `${color}35`, background: `${color}0f` }}
              title={`${step.label}: ${step.detail}${step.blocker ? ` (${step.blocker})` : ''}`}
            >
              <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color }}>
                <Icon size={11} />
                {step.label}
              </span>
              <span className="block text-[9px] text-[#8ca0c0] truncate mt-0.5">{step.detail}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
