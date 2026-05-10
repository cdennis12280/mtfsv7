import { X } from 'lucide-react';
import { validateModel } from '../engine/validation';
import { useMTFSStore } from '../store/mtfsStore';

function fmtK(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  return `${sign}£${abs >= 1000 ? `${(abs / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

export function PrintPreviewPanel() {
  const {
    printPreviewMode,
    setPrintPreviewMode,
    authorityConfig,
    baseline,
    assumptions,
    result,
    savingsProposals,
    scenarios,
    snapshots,
    workflowState,
  } = useMTFSStore();
  if (printPreviewMode === 'none') return null;
  const validation = validateModel({ authorityConfig, baseline, assumptions, result, savingsProposals, scenarios, snapshots, workflowState });
  const title = {
    cfo_brief: 'CFO Brief',
    s151_pack: 'S151 Assurance Pack',
    member_brief: 'Member Brief',
    scenario_pack: 'Scenario Pack',
    governance_evidence: 'Governance Evidence Summary',
    none: '',
  }[printPreviewMode];

  return (
    <section id="print-preview-panel" className="mb-4 rounded-xl border border-[rgba(99,179,237,0.18)] bg-[#f8fafc] p-5 text-[#0f172a] print:bg-white print:text-black">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Print preview</p>
          <h2 className="mt-1 text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{authorityConfig.authorityName} · {authorityConfig.reportingPeriod}</p>
        </div>
        <button onClick={() => setPrintPreviewMode('none')} className="print:hidden rounded border border-slate-300 px-2 py-1 text-xs text-slate-600"><X size={13} /></button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          ['5-year gap', result.totalGap <= 0 ? 'Balanced' : fmtK(result.totalGap)],
          ['Annual savings', fmtK(result.requiredSavingsToBalance)],
          ['Y5 reserves', fmtK(result.years[4]?.totalClosingReserves ?? 0)],
          ['Model confidence', `${validation.modelConfidenceScore}/100`],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-slate-200 bg-white p-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold">Decision Narrative</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            The current MTFS model shows {result.totalGap <= 0 ? 'a balanced position' : `a ${fmtK(result.totalGap)} five-year shortfall`} with
            Year 5 reserves of {fmtK(result.years[4]?.totalClosingReserves ?? 0)}. The pack should focus on recurring balance, reserves resilience and deliverability.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold">Readiness Evidence</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>Baseline locked: {workflowState.baselineLocked ? 'Yes' : 'No'}</li>
            <li>Pack frozen: {workflowState.assumptionsFrozen ? 'Yes' : 'No'}</li>
            <li>Scenarios saved: {scenarios.length}</li>
            <li>Validation blockers: {validation.blockers.length}</li>
            <li>Validation warnings: {validation.warnings.length}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

