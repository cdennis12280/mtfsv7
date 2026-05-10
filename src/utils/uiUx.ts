import type { ModelSnapshot, MTFSResult, SavingsProposal, Scenario } from '../types/financial';
import type { ValidationSummary } from '../engine/validation';

export type RolePreset = 'cfo' | 'head_of_finance' | 's151' | 'councillor';
export type AssumptionEditMode = 'quick_y1' | 'five_year';
export type SaveState = 'saved' | 'unsaved' | 'baseline_locked' | 'pack_frozen' | 'scenario_loaded';
export type PrintPreviewMode = 'none' | 'cfo_brief' | 's151_pack' | 'member_brief' | 'scenario_pack' | 'governance_evidence';
export type WorkflowStatus = 'complete' | 'warning' | 'blocked' | 'not_started';

export interface RehearsalChecklist {
  demoDataLoaded: boolean;
  baselineLocked: boolean;
  scenariosReady: boolean;
  validationRun: boolean;
  packFrozen: boolean;
  exportTested: boolean;
  figuresReconciled: boolean;
}

export interface WorkflowStepStatus {
  id: string;
  label: string;
  tab: string;
  anchor: string;
  status: WorkflowStatus;
  detail: string;
  blocker?: string;
}

export interface KpiTraceRow {
  id: string;
  label: string;
  source: string;
  formula: string;
  y1: string;
  y5: string;
  drivers: string;
  impact: string;
  provenance: string;
}

export const ROLE_PRESETS: Record<RolePreset, { label: string; audience: 'finance' | 'members'; defaultTab: string; tabs: string[]; tone: string; primaryAction: string }> = {
  cfo: {
    label: 'CFO / S151 Officer',
    audience: 'finance',
    defaultTab: 'summary',
    tabs: ['summary', 'reserves', 'scenarios', 'governance'],
    tone: 'Decision summary, statutory assurance, risk, reserves, options and export readiness.',
    primaryAction: 'Review the recommendation, confirm S151 assurance caveats and freeze the decision pack.',
  },
  head_of_finance: {
    label: 'Head of Finance',
    audience: 'finance',
    defaultTab: 'baseline',
    tabs: ['summary', 'baseline', 'savings', 'reserves', 'scenarios', 'governance'],
    tone: 'Data quality, modelling controls, reconciliation and deliverability.',
    primaryAction: 'Resolve blockers and prepare evidence for governance.',
  },
  s151: {
    label: 'CFO / S151 Officer',
    audience: 'finance',
    defaultTab: 'governance',
    tabs: ['summary', 'baseline', 'reserves', 'scenarios', 'governance'],
    tone: 'Compatibility view for older saved sessions. Use the combined CFO/S151 journey for new demos.',
    primaryAction: 'Run readiness checks and confirm assurance caveats.',
  },
  councillor: {
    label: 'Councillor',
    audience: 'members',
    defaultTab: 'summary',
    tabs: ['summary', 'scenarios', 'governance'],
    tone: 'Plain-English position, trade-offs, resident impact and questions.',
    primaryAction: 'Compare options and read the member brief.',
  },
};

export function saveStateLabel(state: SaveState) {
  return {
    saved: 'Saved',
    unsaved: 'Unsaved changes',
    baseline_locked: 'Baseline locked',
    pack_frozen: 'Pack frozen',
    scenario_loaded: 'Scenario loaded',
  }[state];
}

export function sourceBadgeTone(source: string) {
  if (source === 'Imported') return '#60a5fa';
  if (source === 'Manual') return '#10b981';
  if (source === 'Default') return '#f59e0b';
  if (source === 'Scenario') return '#8b5cf6';
  if (source === 'Snapshot') return '#06b6d4';
  return '#f0f4ff';
}

function fmtK(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  return `${sign}£${abs >= 1000 ? `${(abs / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

export function buildWorkflowSteps(input: {
  validation: ValidationSummary;
  authorityName: string;
  baselineLocked: boolean;
  assumptionsFrozen: boolean;
  savingsProposals: SavingsProposal[];
  scenarios: Scenario[];
  snapshots: ModelSnapshot[];
  result: MTFSResult;
  exports: { memberBrief: number; s151Pack: number; dataCsv: number };
}): WorkflowStepStatus[] {
  const issueFor = (area: string) => input.validation.issues.find((issue) => issue.area === area && issue.severity === 'blocker') ?? input.validation.issues.find((issue) => issue.area === area && issue.severity === 'warning');
  const status = (done: boolean, area: string, notStarted = false): WorkflowStatus => {
    const issue = issueFor(area);
    if (issue?.severity === 'blocker') return 'blocked';
    if (issue?.severity === 'warning') return done ? 'warning' : 'blocked';
    if (done) return 'complete';
    return notStarted ? 'not_started' : 'warning';
  };
  const setupDone = input.authorityName !== 'Example Unitary Authority';
  const savingsDone = input.savingsProposals.length > 0 || input.result.requiredSavingsToBalance <= 0;
  const reservesDone = !input.result.yearReservesExhausted && input.result.reservesToNetBudget >= 5;
  const scenariosDone = input.scenarios.length > 0;
  const governanceDone = input.exports.memberBrief > 0 || input.exports.s151Pack > 0;
  return [
    { id: 'setup', label: 'Setup', tab: 'baseline', anchor: 'authority-metadata', status: status(setupDone, 'setup'), detail: setupDone ? 'Authority confirmed' : 'Confirm authority metadata', blocker: issueFor('setup')?.message },
    { id: 'baseline', label: 'Baseline', tab: 'baseline', anchor: 'baseline-core', status: status(input.baselineLocked, 'baseline'), detail: input.baselineLocked ? 'Locked for modelling' : 'Review and lock baseline', blocker: issueFor('baseline')?.message },
    { id: 'assumptions', label: 'Assumptions', tab: 'baseline', anchor: 'assumption-engine-sidebar', status: input.assumptionsFrozen ? 'complete' : 'warning', detail: input.assumptionsFrozen ? 'Frozen for pack' : 'Live editable assumptions' },
    { id: 'savings', label: 'Savings', tab: 'savings', anchor: 'savings-programme', status: status(savingsDone, 'savings', input.savingsProposals.length === 0), detail: input.savingsProposals.length > 0 ? `${input.savingsProposals.length} proposals` : 'No proposal-level plan', blocker: issueFor('savings')?.message },
    { id: 'reserves', label: 'Reserves', tab: 'reserves', anchor: 'reserves-analysis', status: status(reservesDone, 'reserves'), detail: input.result.yearReservesExhausted ? `Exhausted ${input.result.yearReservesExhausted}` : `${input.result.reservesToNetBudget.toFixed(1)}% of funding`, blocker: issueFor('reserves')?.message },
    { id: 'scenarios', label: 'Scenarios', tab: 'scenarios', anchor: 'scenario-executive-view', status: status(scenariosDone, 'scenarios', input.scenarios.length === 0), detail: scenariosDone ? `${input.scenarios.length} saved` : 'Create options', blocker: issueFor('scenarios')?.message },
    { id: 'governance', label: 'Governance', tab: 'governance', anchor: 'governance-readiness', status: status(governanceDone, 'governance', !governanceDone), detail: governanceDone ? 'Export tested' : 'Freeze and export pack', blocker: issueFor('governance')?.message },
  ];
}

export function buildKpiTraceRows(result: MTFSResult, provenance: string): KpiTraceRow[] {
  const y1 = result.years[0];
  const y5 = result.years[4];
  return [
    {
      id: 'gap',
      label: '5-year MTFS gap',
      source: 'Funding, expenditure, savings and reserves outputs',
      formula: 'sum(net gap by year)',
      y1: fmtK(y1?.netGap ?? 0),
      y5: fmtK(y5?.netGap ?? 0),
      drivers: 'Funding change, pay pressure, demand growth, savings and reserve drawdown.',
      impact: result.totalGap > 0 ? 'Sets the scale of action needed before the plan is balanced.' : 'Shows the current plan is balanced under selected assumptions.',
      provenance,
    },
    {
      id: 'reserves',
      label: 'Reserves status',
      source: 'Opening reserves, planned drawdown, minimum threshold',
      formula: 'closing reserves / total funding',
      y1: fmtK(y1?.totalClosingReserves ?? 0),
      y5: fmtK(y5?.totalClosingReserves ?? 0),
      drivers: 'Opening reserves, named reserve plans, drawdowns and rebuild contributions.',
      impact: result.yearReservesExhausted ? `Reserves exhaust in ${result.yearReservesExhausted}.` : 'Supports S151 judgement on financial resilience.',
      provenance,
    },
    {
      id: 'savings',
      label: 'Required annual savings',
      source: 'Remaining positive gaps after mitigations',
      formula: 'positive 5-year gap / 5',
      y1: fmtK(result.requiredSavingsToBalance),
      y5: fmtK(result.requiredSavingsToBalance),
      drivers: 'Structural gap, savings delivery profile and one-off mitigations.',
      impact: 'Frames the recurring delivery ask for services and members.',
      provenance,
    },
    {
      id: 'ct',
      label: 'Council tax equivalent',
      source: 'Year 1 shortfall and council tax baseline',
      formula: 'year 1 gap / council tax income',
      y1: `${result.councilTaxEquivalent.toFixed(1)}%`,
      y5: 'Context only',
      drivers: 'Year 1 gap, council tax base and modelled funding assumptions.',
      impact: 'Provides a simple scale reference; it is not a recommendation to raise tax.',
      provenance,
    },
  ];
}

export function defaultRehearsalChecklist(): RehearsalChecklist {
  return {
    demoDataLoaded: false,
    baselineLocked: false,
    scenariosReady: false,
    validationRun: false,
    packFrozen: false,
    exportTested: false,
    figuresReconciled: false,
  };
}

export function checklistComplete(checklist: RehearsalChecklist) {
  return Object.values(checklist).every(Boolean);
}

export function scenarioExecutiveSummary(scenario: Scenario, current: MTFSResult) {
  const gapDelta = scenario.result.totalGap - current.totalGap;
  const reservesDelta = (scenario.result.years[4]?.totalClosingReserves ?? 0) - (current.years[4]?.totalClosingReserves ?? 0);
  const direction = gapDelta <= 0 ? 'improves' : 'worsens';
  return `${scenario.name} ${direction} the five-year gap by ${fmtK(Math.abs(gapDelta))} and moves Year 5 reserves by ${fmtK(reservesDelta)}.`;
}
