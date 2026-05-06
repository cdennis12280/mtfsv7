import React from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KPIBar } from './components/KPIBar';
import { OnboardingCoach } from './components/OnboardingCoach';
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
  const { result } = useMTFSStore();
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

  return (
    <div className="space-y-5">
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
  const { advancedPanelsOpen, setAdvancedPanelOpen } = useMTFSStore();
  return (
    <div className="space-y-5">
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
  const { advancedPanelsOpen, setAdvancedPanelOpen } = useMTFSStore();
  return (
    <div className="space-y-5">
      <SavingsProgramme />
      <details
        open={!!advancedPanelsOpen.savingsAdvanced}
        onToggle={(e) => setAdvancedPanelOpen('savingsAdvanced', (e.currentTarget as HTMLDetailsElement).open)}
        className="rounded-xl border border-[rgba(99,179,237,0.12)] bg-[rgba(10,17,32,0.55)] p-3"
      >
        <summary className="cursor-pointer text-[11px] font-semibold text-[#8ca0c0]">Advanced Modelling</summary>
        <div className="pt-3">
          <EnhancementPanel />
        </div>
      </details>
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
  const { activeTab, accessibilityPreset, densityMode, result, uiWarnings, setUiWarnings } = useMTFSStore();

  React.useEffect(() => {
    const warnings: Array<{ id: string; severity: 'warning' | 'critical'; message: string; targetTab: string }> = [];
    if (result.structuralDeficitFlag) warnings.push({ id: 'structural', severity: 'critical', message: 'Structural deficit detected. Prioritise recurring savings.', targetTab: 'savings' });
    if (result.reservesToNetBudget < 5 || result.yearReservesExhausted) warnings.push({ id: 'reserves', severity: 'warning', message: 'Reserves resilience is weak. Review reserves strategy.', targetTab: 'reserves' });
    if (result.savingsAsBudgetPct > 8) warnings.push({ id: 'savings-risk', severity: 'warning', message: 'Savings burden/delivery risk is elevated.', targetTab: 'savings' });
    setUiWarnings(warnings);
  }, [result.structuralDeficitFlag, result.reservesToNetBudget, result.yearReservesExhausted, result.savingsAsBudgetPct, setUiWarnings]);

  return (
    <div className={`app-shell preset-${accessibilityPreset} density-${densityMode} flex h-screen overflow-hidden`} style={{ background: '#080c14' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="sticky top-0 z-20 bg-[#080c14]">
          <Header />
          <KPIBar />
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
        </div>
        <main id="main-workspace" className="workspace-scroll flex-1 overflow-y-auto p-5 fade-in" key={activeTab}>
          <div className="app-content-frame">
            {PANELS[activeTab] ?? <SummaryPanel />}
          </div>
        </main>
      </div>
      <OnboardingCoach />
    </div>
  );
}
