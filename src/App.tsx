import React from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KPIBar } from './components/KPIBar';
import { WorkflowRail } from './components/WorkflowRail';
import { OnboardingCoach } from './components/OnboardingCoach';
import { CfoDemoMode } from './components/CfoDemoMode';
import { JourneyHeader } from './components/JourneyHeader';
import { PrintPreviewPanel } from './components/PrintPreviewPanel';
import { RehearsalChecklist } from './components/RehearsalChecklist';
import { SourceBadge } from './components/SourceBadge';
import { OverviewPanel } from './components/panels/OverviewPanel';
import { BaselineEditor } from './components/panels/BaselineEditor';
import { ReservesAnalysis } from './components/panels/ReservesAnalysis';
import { NamedReservesManager } from './components/panels/NamedReservesManager';
import { SavingsProgramme } from './components/panels/SavingsProgramme';
import { HighValuePanel } from './components/panels/HighValuePanel';
import { EnhancementPanel } from './components/panels/EnhancementPanel';
import { ScenarioPlanning } from './components/panels/ScenarioPlanning';
import { TechnicalDetail } from './components/panels/TechnicalDetail';
import { Section151Panel } from './components/panels/Section151Panel';
import { GovernancePanel } from './components/panels/GovernancePanel';
import { RiskAssessment } from './components/panels/RiskAssessment';
import { useMTFSStore } from './store/mtfsStore';
import './index.css';

class PanelErrorBoundary extends React.Component<
  { children: React.ReactNode; activeTab: string; onRecover: () => void },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidUpdate(prevProps: { activeTab: string }) {
    if (prevProps.activeTab !== this.props.activeTab && this.state.hasError) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="rounded-xl border border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)] p-5">
        <p className="text-[13px] font-semibold text-[#fecaca]">This page hit a rendering issue.</p>
        <p className="mt-2 text-[11px] text-[#fca5a5]">{this.state.message || 'No error message was reported.'}</p>
        <button
          onClick={() => {
            this.setState({ hasError: false, message: '' });
            this.props.onRecover();
          }}
          className="mt-4 rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] px-3 py-2 text-[11px] font-semibold text-[#fecaca]"
        >
          Return to Summary
        </button>
      </div>
    );
  }
}

function fmtK(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000) return `${sign}£${(abs / 1_000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`;
  return `${sign}£${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`;
}

function ReservesPanel() {
  const [tab, setTab] = React.useState<'analysis' | 'named'>('analysis');
  return (
    <div className="space-y-0">
      <div className="flex gap-0.5 border-b border-[rgba(99,179,237,0.08)] mb-4">
        {[
          { id: 'analysis' as const, label: 'Reserves Analysis' },
          { id: 'named' as const, label: 'Named Reserves' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[11px] font-medium border-b-2 transition-all ${
              tab === t.id
                ? 'text-[#3b82f6] border-[#3b82f6]'
                : 'text-[#4a6080] border-transparent hover:text-[#8ca0c0]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'analysis' ? <ReservesAnalysis /> : <NamedReservesManager />}
    </div>
  );
}

function SummaryPanel() {
  const {
    result,
    authorityConfig,
    scenarios,
    savingsProposals,
    snapshots,
    workflowState,
    runEndToEndValidation,
    setActiveTab,
    setActiveRole,
    freezeAssumptionsForPack,
  } = useMTFSStore();
  const positionLabel = result.totalGap <= 0 ? 'Balanced plan' : result.structuralDeficitFlag ? 'Structural shortfall' : 'Manageable shortfall';
  const positionColor = result.totalGap <= 0 ? '#10b981' : result.structuralDeficitFlag ? '#ef4444' : '#f59e0b';
  const nextAction = result.structuralDeficitFlag
    ? { label: 'Build recurring savings plan', tab: 'savings' }
    : result.reservesToNetBudget < 5 || result.yearReservesExhausted
      ? { label: 'Review reserves recovery', tab: 'reserves' }
      : scenarios.length === 0
        ? { label: 'Create option scenarios', tab: 'scenarios' }
        : { label: 'Run governance readiness', tab: 'governance' };
  const readiness = workflowState.lastValidation;
  const blockers = readiness?.blockers ?? [];
  const warnings = readiness?.warnings ?? [];
  const roleJourneys = [
    {
      title: 'Head of Finance',
      copy: 'Clean data, lock the baseline, stress savings, and produce a defendable options pack.',
      action: 'Open finance workflow',
      run: () => {
        setActiveRole('finance');
        setActiveTab('baseline');
      },
    },
    {
      title: 'Councillor',
      copy: 'See the current position, trade-offs, resident-facing impact, and questions to ask.',
      action: 'Open member view',
      run: () => {
        setActiveRole('members');
        setActiveTab('summary');
      },
    },
    {
      title: 'S151 Officer',
      copy: 'Check robustness, reserves adequacy, s.114 triggers, caveats, and evidence for assurance.',
      action: 'Open assurance',
      run: () => {
        setActiveRole('finance');
        setActiveTab('governance');
      },
    },
  ];
  const traceRows = [
    {
      label: 'Funding Shortfall',
      input: 'Total expenditure less total funding, by year',
      formula: 'raw gap = expenditure - funding',
      result: result.totalGap <= 0 ? 'No cumulative shortfall' : fmtK(result.totalGap),
      impact: result.structuralDeficitFlag ? 'Drives recurring savings and S151 risk' : 'Sets scale of mitigation needed',
    },
    {
      label: 'Structural Gap',
      input: 'Raw gap adjusted for one-off savings and non-recurring lines',
      formula: 'structural gap = raw gap + one-off savings - non-recurring costs',
      result: fmtK(result.totalStructuralGap),
      impact: 'Separates recurring problem from timing items',
    },
    {
      label: 'Reserves Drawdown',
      input: 'Planned reserves use capped by annual shortfall',
      formula: 'drawdown = min(raw gap, planned reserves use)',
      result: result.yearReservesExhausted ? `Exhausted ${result.yearReservesExhausted}` : `${result.reservesToNetBudget.toFixed(1)}% of funding`,
      impact: 'Determines resilience and adequacy status',
    },
    {
      label: 'Savings Requirement',
      input: 'Remaining five-year positive gaps',
      formula: 'required saving = positive five-year gap / 5',
      result: fmtK(result.requiredSavingsToBalance),
      impact: savingsProposals.length > 0 ? `${savingsProposals.length} proposals tested` : 'Policy target only until proposals are entered',
    },
  ];
  const actionCards = [
    result.structuralDeficitFlag
      ? { id: 'structural', label: 'Structural deficit present', targetTab: 'savings' }
      : null,
    result.reservesToNetBudget < 5 || result.yearReservesExhausted
      ? { id: 'reserves', label: 'Reserves resilience risk', targetTab: 'reserves' }
      : null,
    result.savingsAsBudgetPct > 8
      ? { id: 'delivery', label: 'Savings delivery risk warning', targetTab: 'savings' }
      : null,
  ].filter(Boolean) as Array<{ id: string; label: string; targetTab: string }>;
  const workflowSteps = [
    { label: 'Data Ready', done: authorityConfig.authorityName && authorityConfig.authorityName !== 'Example Unitary Authority' },
    { label: 'Baseline Locked', done: workflowState.baselineLocked },
    { label: 'Savings Built', done: result.requiredSavingsToBalance <= 0 || result.savingsAsBudgetPct <= 8 },
    { label: 'Reserves Checked', done: !result.yearReservesExhausted && result.reservesToNetBudget >= 5 },
    { label: 'Options Compared', done: scenarios.length > 0 },
    { label: 'Pack Exported', done: workflowState.governanceExports.s151Pack > 0 || workflowState.governanceExports.memberBrief > 0 },
  ];
  const checklist = [
    { label: 'Authority metadata confirmed', ok: workflowSteps[0].done, tab: 'baseline' },
    { label: 'Baseline locked', ok: workflowSteps[1].done, tab: 'baseline' },
    { label: 'At least one scenario saved', ok: workflowSteps[4].done, tab: 'scenarios' },
    { label: 'Governance pack exported', ok: workflowSteps[5].done, tab: 'governance' },
  ];

  return (
    <div className="space-y-5">
      <div className="boardroom-summary rounded-xl border border-[rgba(99,179,237,0.16)] bg-[linear-gradient(180deg,rgba(13,20,33,0.96),rgba(8,12,20,0.96))] p-4">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Current Position</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <h1 className="heading-display text-[28px] font-bold leading-tight" style={{ color: positionColor }}>{positionLabel}</h1>
              <span className="mb-1 rounded-full border px-2 py-1 text-[10px] font-semibold" style={{ borderColor: `${positionColor}55`, color: positionColor, background: `${positionColor}12` }}>
                Risk {result.overallRiskScore.toFixed(0)}/100
              </span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-[#8ca0c0] max-w-3xl">
              {authorityConfig.authorityName} has {result.totalGap <= 0 ? 'no cumulative five-year shortfall under the current assumptions' : `a ${fmtK(result.totalGap)} cumulative five-year shortfall`} with
              {' '}Year 5 reserves at {fmtK(result.years[4]?.totalClosingReserves ?? 0)}. The next decision is to {nextAction.label.toLowerCase()}.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['5-year shortfall', result.totalGap <= 0 ? 'Balanced' : fmtK(result.totalGap), result.totalGap <= 0 ? '#10b981' : '#ef4444', workflowState.currentWorkingSet?.kind === 'snapshot' ? 'Snapshot' : 'Manual'],
              ['Annual action', fmtK(result.requiredSavingsToBalance), '#f59e0b', workflowState.assumptionsFrozen ? 'Frozen Pack' : 'Manual'],
              ['Safety buffer', result.yearReservesExhausted ?? `${result.reservesToNetBudget.toFixed(1)}%`, result.yearReservesExhausted ? '#ef4444' : '#10b981', 'Manual'],
              ['Scenarios', `${scenarios.length}`, scenarios.length > 0 ? '#10b981' : '#f59e0b', scenarios.length > 0 ? 'Scenario' : 'Default'],
            ].map(([label, value, color, source]) => (
              <div key={label} className="rounded-lg border p-3" style={{ borderColor: `${color}35`, background: `${color}0c` }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">{label}</p>
                  <SourceBadge source={source as 'Imported' | 'Manual' | 'Default' | 'Scenario' | 'Snapshot' | 'Frozen Pack'} />
                </div>
                <p className="mono mt-1 text-[15px] font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setActiveTab(nextAction.tab)} className="rounded-lg border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.14)] px-3 py-2 text-[11px] font-semibold text-[#93c5fd]">
            {nextAction.label}
          </button>
          <button onClick={() => freezeAssumptionsForPack(`pack-${new Date().toISOString().slice(0, 10)}`)} className="rounded-lg border border-[rgba(16,185,129,0.32)] bg-[rgba(16,185,129,0.1)] px-3 py-2 text-[11px] font-semibold text-[#10b981]">
            Freeze for decision pack
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {roleJourneys.map((role) => (
          <button key={role.title} onClick={role.run} className="text-left rounded-xl border border-[rgba(99,179,237,0.14)] bg-[rgba(10,17,32,0.72)] p-3 hover:border-[rgba(99,179,237,0.32)]">
            <p className="text-[12px] font-semibold text-[#f0f4ff]">{role.title}</p>
            <p className="mt-1 min-h-[42px] text-[11px] leading-relaxed text-[#8ca0c0]">{role.copy}</p>
            <p className="mt-2 text-[10px] font-semibold text-[#60a5fa]">{role.action}</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-[rgba(99,179,237,0.18)] bg-[rgba(10,17,32,0.7)] p-3">
        <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0] mb-2">Guided Workflow</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {workflowSteps.map((s) => (
            <div key={s.label} className={`px-2 py-1.5 rounded border text-[10px] ${s.done ? 'border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.1)] text-[#10b981]' : 'border-[rgba(99,179,237,0.2)] bg-[rgba(99,179,237,0.05)] text-[#8ca0c0]'}`}>
              {s.label}
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-[rgba(99,179,237,0.18)] bg-[rgba(10,17,32,0.7)] p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Readiness Checklist</p>
          <button
            onClick={() => runEndToEndValidation()}
            className="px-2 py-1 rounded text-[10px] border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.12)] text-[#3b82f6]"
          >
            Run End-to-End Validation
          </button>
        </div>
        <div className="space-y-1">
          {checklist.map((c) => (
            <button key={c.label} onClick={() => setActiveTab(c.tab)} className="w-full text-left text-[11px] flex items-center justify-between px-2 py-1 rounded hover:bg-[rgba(99,179,237,0.06)]">
              <span className="text-[#c9d6ef]">{c.label}</span>
              <span className={c.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}>{c.ok ? 'Ready' : 'Missing'}</span>
            </button>
          ))}
          {workflowState.lastValidation && (
            <p className="text-[10px] text-[#4a6080] pt-1">
              Last validation: {new Date(workflowState.lastValidation.timestamp).toLocaleString('en-GB')} · blockers {workflowState.lastValidation.blockers.length} · warnings {workflowState.lastValidation.warnings.length}
            </p>
          )}
        </div>
      </div>
      {readiness && (
        <div className="rounded-lg border border-[rgba(99,179,237,0.18)] bg-[rgba(10,17,32,0.7)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0]">Governance Readiness Gate</p>
            <span className={`text-[10px] font-bold ${blockers.length ? 'text-[#ef4444]' : warnings.length ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
              {blockers.length ? `${blockers.length} blocker(s)` : warnings.length ? `${warnings.length} warning(s)` : 'Ready'}
            </span>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <div className="rounded border border-[rgba(99,179,237,0.1)] bg-[rgba(8,12,20,0.45)] p-2">
              <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Blockers</p>
              <p className="mt-1 text-[11px] text-[#c9d6ef]">{blockers.length ? blockers.join(' ') : 'None'}</p>
            </div>
            <div className="rounded border border-[rgba(99,179,237,0.1)] bg-[rgba(8,12,20,0.45)] p-2">
              <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Warnings</p>
              <p className="mt-1 text-[11px] text-[#c9d6ef]">{warnings.length ? warnings.join(' ') : 'None'}</p>
            </div>
            <div className="rounded border border-[rgba(99,179,237,0.1)] bg-[rgba(8,12,20,0.45)] p-2">
              <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">Evidence</p>
              <p className="mt-1 text-[11px] text-[#c9d6ef]">{snapshots.length} snapshot(s), {scenarios.length} scenario(s), exports {workflowState.governanceExports.memberBrief + workflowState.governanceExports.s151Pack}</p>
            </div>
          </div>
        </div>
      )}
      {actionCards.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {actionCards.map((card) => (
            <button
              key={card.id}
              onClick={() => useMTFSStore.getState().setActiveTab(card.targetTab)}
              className="text-left rounded-lg border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] px-3 py-2 text-[11px] text-[#f0f4ff]"
            >
              {card.label}
            </button>
          ))}
        </div>
      )}
      <OverviewPanel />
      <div id="calculation-trace" className="rounded-xl border border-[rgba(99,179,237,0.16)] bg-[rgba(10,17,32,0.72)] p-3 scroll-mt-32">
        <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0] mb-2">Calculation Trace</p>
        <div className="grid gap-2 lg:grid-cols-4">
          {traceRows.map((row) => (
            <div key={row.label} className="rounded-lg border border-[rgba(99,179,237,0.1)] bg-[rgba(8,12,20,0.55)] p-3">
              <p className="text-[12px] font-semibold text-[#f0f4ff]">{row.label}</p>
              <p className="mt-1 text-[10px] text-[#4a6080]">{row.input}</p>
              <p className="mt-2 mono text-[10px] text-[#8ca0c0]">{row.formula}</p>
              <p className="mt-2 mono text-[13px] font-bold text-[#93c5fd]">{row.result}</p>
              <p className="mt-1 text-[10px] text-[#8ca0c0]">{row.impact}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-[rgba(99,179,237,0.18)] bg-[rgba(10,17,32,0.7)] p-3">
        <p className="text-[10px] uppercase tracking-widest text-[#8ca0c0] mb-2">Monthly Operating Cadence</p>
        <ul className="text-[11px] text-[#8ca0c0] space-y-1">
          <li>1. Refresh baseline and authority assumptions.</li>
          <li>2. Re-run scenarios and weighted option matrix.</li>
          <li>3. Regenerate Member Brief and S151 Pack.</li>
        </ul>
      </div>
      <details className="rounded-xl border border-[rgba(99,179,237,0.12)] bg-[rgba(10,17,32,0.55)] p-3">
        <summary className="cursor-pointer text-[11px] font-semibold text-[#8ca0c0]">Risk Detail</summary>
        <div className="pt-3">
          <RiskAssessment />
        </div>
      </details>
    </div>
  );
}

function BaselineCompositePanel() {
  const { advancedPanelsOpen, setAdvancedPanelOpen, workflowState, lockBaseline, unlockBaseline } = useMTFSStore();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        {workflowState.baselineLocked ? (
          <button onClick={unlockBaseline} className="px-2 py-1 rounded text-[10px] border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] text-[#ef4444]">
            Unlock Baseline
          </button>
        ) : (
          <button onClick={lockBaseline} className="px-2 py-1 rounded text-[10px] border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] text-[#10b981]">
            Lock Baseline
          </button>
        )}
      </div>
      <BaselineEditor />
      <details
        open={!!advancedPanelsOpen.baselineAdvanced}
        onToggle={(e) => setAdvancedPanelOpen('baselineAdvanced', (e.currentTarget as HTMLDetailsElement).open)}
        className="rounded-xl border border-[rgba(99,179,237,0.12)] bg-[rgba(10,17,32,0.55)] p-3"
      >
        <summary className="cursor-pointer text-[11px] font-semibold text-[#8ca0c0]">Advanced Modelling</summary>
        <div className="pt-3 space-y-4">
          <EnhancementPanel />
          <div className="border-t border-[rgba(99,179,237,0.08)] pt-4">
            <HighValuePanel />
          </div>
        </div>
      </details>
    </div>
  );
}

function SavingsCompositePanel() {
  return (
    <div className="space-y-5">
      <SavingsProgramme />
    </div>
  );
}

function GovernanceCompositePanel() {
  return (
    <div className="space-y-5">
      <GovernancePanel />
      <div className="border-t border-[rgba(99,179,237,0.08)] pt-4">
        <Section151Panel />
      </div>
      <details className="rounded-xl border border-[rgba(99,179,237,0.12)] bg-[rgba(10,17,32,0.55)] p-3">
        <summary className="cursor-pointer text-[11px] font-semibold text-[#8ca0c0]">Technical Drill-Down</summary>
        <div className="pt-3">
          <TechnicalDetail />
        </div>
      </details>
    </div>
  );
}

const PANELS: Record<string, React.ReactNode> = {
  summary: <SummaryPanel />,
  baseline: <BaselineCompositePanel />,
  savings: <SavingsCompositePanel />,
  reserves: <ReservesPanel />,
  scenarios: <ScenarioPlanning />,
  governance: <GovernanceCompositePanel />,
};

export default function App() {
  const { activeTab, accessibilityPreset, densityMode, result, uiWarnings, setUiWarnings, workflowState, freezeAssumptionsForPack, unfreezeAssumptions, cfoDemo, setActiveTab } = useMTFSStore();

  React.useEffect(() => {
    const warnings: Array<{ id: string; severity: 'warning' | 'critical'; message: string; targetTab: string }> = [];
    if (result.structuralDeficitFlag) warnings.push({ id: 'structural', severity: 'critical', message: 'Structural deficit detected. Prioritise recurring savings.', targetTab: 'savings' });
    if (result.reservesToNetBudget < 5 || result.yearReservesExhausted) warnings.push({ id: 'reserves', severity: 'warning', message: 'Reserves resilience is weak. Review reserves strategy.', targetTab: 'reserves' });
    if (result.savingsAsBudgetPct > 8) warnings.push({ id: 'savings-risk', severity: 'warning', message: 'Savings burden/delivery risk is elevated.', targetTab: 'savings' });
    setUiWarnings(warnings);
  }, [result.structuralDeficitFlag, result.reservesToNetBudget, result.yearReservesExhausted, result.savingsAsBudgetPct, setUiWarnings]);

  return (
    <div className={`app-shell preset-${accessibilityPreset} density-${densityMode} flex h-screen overflow-hidden`} style={{ background: '#080c14' }}>
      {!cfoDemo.enabled && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!cfoDemo.enabled && <div className="sticky top-0 z-20 bg-[#080c14]">
          <Header />
          <KPIBar />
          <WorkflowRail />
          {(workflowState.currentWorkingSet || workflowState.assumptionsFrozen) && (
            <div className="px-5 py-2 border-b border-[rgba(99,179,237,0.08)] bg-[rgba(10,17,32,0.92)] flex flex-wrap items-center gap-2">
              {workflowState.currentWorkingSet && (
                <span className="text-[10px] text-[#8ca0c0]">
                  Working set: <span className="text-[#dbeafe] font-semibold">{workflowState.currentWorkingSet.kind} · {workflowState.currentWorkingSet.name}</span> · {new Date(workflowState.currentWorkingSet.timestamp).toLocaleString('en-GB')}
                </span>
              )}
              {workflowState.assumptionsFrozen ? (
                <button onClick={unfreezeAssumptions} className="px-2 py-1 rounded text-[10px] border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.12)] text-[#ef4444]">
                  Unfreeze Pack ({workflowState.frozenLabel ?? 'locked'})
                </button>
              ) : (
                <button onClick={() => freezeAssumptionsForPack(`pack-${new Date().toISOString().slice(0, 10)}`)} className="px-2 py-1 rounded text-[10px] border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] text-[#10b981]">
                  Freeze assumptions for pack
                </button>
              )}
            </div>
          )}
          {uiWarnings.length > 0 && (
            <div className="px-5 py-2 border-b border-[rgba(99,179,237,0.08)] bg-[rgba(10,17,32,0.92)] flex flex-wrap gap-2">
              {uiWarnings.map((w) => (
                <button
                  key={w.id}
                  onClick={() => useMTFSStore.getState().setActiveTab(w.targetTab)}
                  className={`text-[10px] px-2 py-1 rounded border ${
                    w.severity === 'critical'
                      ? 'text-[#ef4444] border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.08)]'
                      : 'text-[#f59e0b] border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)]'
                  }`}
                >
                  {w.message}
                </button>
              ))}
            </div>
          )}
        </div>}
        <main id="main-workspace" className="workspace-scroll flex-1 overflow-y-auto p-5 fade-in" key={activeTab}>
          <div className="app-content-frame">
            {cfoDemo.enabled ? <CfoDemoMode /> : (
              <>
                <JourneyHeader />
                <PrintPreviewPanel />
                {(activeTab === 'summary' || activeTab === 'governance') && <div className="mb-4"><RehearsalChecklist /></div>}
                <PanelErrorBoundary activeTab={activeTab} onRecover={() => setActiveTab('summary')}>
                  {PANELS[activeTab] ?? <SummaryPanel />}
                </PanelErrorBoundary>
              </>
            )}
          </div>
        </main>
      </div>
      {!cfoDemo.enabled && <OnboardingCoach />}
    </div>
  );
}
