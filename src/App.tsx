import React from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KPIBar } from './components/KPIBar';
import { OnboardingCoach } from './components/OnboardingCoach';
import { OverviewPanel } from './components/panels/OverviewPanel';
import { BaselineEditor } from './components/panels/BaselineEditor';
import { GapAnalysis } from './components/panels/GapAnalysis';
import { ReservesAnalysis } from './components/panels/ReservesAnalysis';
import { NamedReservesManager } from './components/panels/NamedReservesManager';
import { SavingsProgramme } from './components/panels/SavingsProgramme';
import { RiskAssessment } from './components/panels/RiskAssessment';
import { HighValuePanel } from './components/panels/HighValuePanel';
import { EnhancementPanel } from './components/panels/EnhancementPanel';
import { ScenarioPlanning } from './components/panels/ScenarioPlanning';
import { InsightsPanel } from './components/panels/InsightsPanel';
import { TechnicalDetail } from './components/panels/TechnicalDetail';
import { Section151Panel } from './components/panels/Section151Panel';
import { GovernancePanel } from './components/panels/GovernancePanel';
import { useMTFSStore } from './store/mtfsStore';
import './index.css';

const TOOLTIP_MAP: Array<{ match: RegExp; tip: string }> = [
  { match: /council tax/i, tip: 'Council Tax assumptions drive core recurring funding and compound annually.' },
  { match: /business rates/i, tip: 'Business Rates growth reflects retained local tax yield and national reset risk.' },
  { match: /grant/i, tip: 'Grant assumptions should reflect certainty, expiry, and known government announcements.' },
  { match: /fees|charges|income/i, tip: 'Fees and charges can offset pressures but may depend on demand and affordability.' },
  { match: /pay award|pay/i, tip: 'Pay assumptions materially affect cost growth and should align with workforce planning.' },
  { match: /non-pay|inflation/i, tip: 'Inflation assumptions affect contracted services, utilities, and supplies.' },
  { match: /asc|adult social care/i, tip: 'Adult Social Care demand and unit costs are major medium-term pressure drivers.' },
  { match: /csc|children/i, tip: 'Children’s services demand can be volatile and should be stress-tested.' },
  { match: /savings/i, tip: 'Savings values should reflect deliverability, phasing, and recurring vs one-off effects.' },
  { match: /reserve/i, tip: 'Reserves are a one-off buffer and should not be used to fund structural deficits long-term.' },
  { match: /risk/i, tip: 'Risk metrics combine gap exposure, reserves adequacy, volatility, demand, and delivery risk.' },
  { match: /scenario/i, tip: 'Scenarios capture assumption sets to compare outcomes and support member decision-making.' },
  { match: /reset to defaults/i, tip: 'Resets assumptions and baseline demo data back to the default model state.' },
  { match: /export|report|governance/i, tip: 'Exports produce governance-ready narrative outputs for committee reporting.' },
];

function inferTooltipText(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  for (const rule of TOOLTIP_MAP) {
    if (rule.match.test(text)) return rule.tip;
  }
  return `${text}: change or select this to update the MTFS model output.`;
}

function findAssociatedLabel(el: HTMLElement): string {
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    if (el.labels && el.labels.length > 0) return el.labels[0].textContent?.trim() ?? '';
    const nearbyLabel = el.closest('div')?.querySelector('label');
    if (nearbyLabel?.textContent) return nearbyLabel.textContent.trim();
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.placeholder) return el.placeholder.trim();
    }
  }
  return el.textContent?.trim() ?? '';
}

function annotateTooltipElement(el: HTMLElement) {
  if (el.getAttribute('title')) return;
  const explicitTip = el.dataset.tip;
  if (explicitTip) {
    el.setAttribute('title', explicitTip);
    return;
  }
  const source = findAssociatedLabel(el);
  const tip = inferTooltipText(source);
  if (tip) el.setAttribute('title', tip);
}

function annotateTooltips(root: ParentNode) {
  const candidates = root.querySelectorAll<HTMLElement>('button,input,select,textarea');
  candidates.forEach((el) => annotateTooltipElement(el));
}

// Reserves panel — combines depletion charts + named reserves manager
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

const PANELS: Record<string, React.ReactNode> = {
  overview: <OverviewPanel />,
  baseline: <BaselineEditor />,
  gap: <GapAnalysis />,
  reserves: <ReservesPanel />,
  savings: <SavingsProgramme />,
  risk: <RiskAssessment />,
  highvalue: <HighValuePanel />,
  enhancement: <EnhancementPanel />,
  scenarios: <ScenarioPlanning />,
  insights: <InsightsPanel />,
  technical: <TechnicalDetail />,
  section151: <Section151Panel />,
  governance: <GovernancePanel />,
};

export default function App() {
  const { activeTab, accessibilityPreset, densityMode } = useMTFSStore();

  React.useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    annotateTooltips(root);
    let rafId = 0;
    const pending = new Set<HTMLElement>();
    const flush = () => {
      rafId = 0;
      pending.forEach((node) => annotateTooltips(node));
      pending.clear();
    };
    const queueNode = (node: Node) => {
      if (node instanceof HTMLElement) pending.add(node);
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(queueNode);
      }
      if (pending.size === 0) return;
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(flush);
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      pending.clear();
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className={`app-shell preset-${accessibilityPreset} density-${densityMode} flex h-screen overflow-hidden`} style={{ background: '#080c14' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="sticky top-0 z-20 bg-[#080c14]">
          <Header />
          <KPIBar />
        </div>
        <main id="main-workspace" className="flex-1 overflow-y-auto p-5 fade-in" key={activeTab}>
          {PANELS[activeTab] ?? <OverviewPanel />}
        </main>
      </div>
      <OnboardingCoach />
    </div>
  );
}
