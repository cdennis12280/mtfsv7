import React from 'react';
import { BookOpen, ExternalLink, Info, ShieldCheck } from 'lucide-react';

interface PanelGuideItem {
  name: string;
  purpose: string;
  keyOutputs: string;
  keyInputs: string;
}

const PANEL_GUIDE: PanelGuideItem[] = [
  {
    name: 'Overview',
    purpose: 'Executive summary of the medium-term position with year-by-year RAG narrative and trend charts.',
    keyOutputs: '5-year gap summary, risk score, do-nothing comparison, funding/expenditure trajectories.',
    keyInputs: 'Uses all assumptions, baseline values, savings programme and reserves settings.',
  },
  {
    name: 'Baseline',
    purpose: 'Core budget baseline editor for all starting funding and expenditure values.',
    keyOutputs: 'Base-year model starting point used by every forecast year.',
    keyInputs: 'Funding lines, cost lines, custom service lines, and baseline configuration controls.',
  },
  {
    name: 'Gap Analysis',
    purpose: 'Detailed visual diagnosis of annual budget gaps and primary year-5 gap drivers.',
    keyOutputs: 'Gross vs net gap by year, reserves impact, major pressure/funding contributors.',
    keyInputs: 'Directly reflects assumption changes and savings delivery effects.',
  },
  {
    name: 'Reserves',
    purpose: 'Two-tab reserves area for aggregate reserves analysis and named reserves schedule management.',
    keyOutputs: 'Reserves depletion path, threshold warnings, earmarked/general reserve position.',
    keyInputs: 'General/earmarked opening balances, threshold, planned usage, named reserve plans.',
  },
  {
    name: 'Savings Programme',
    purpose: 'Programme management for savings proposals including phasing, risk and ownership.',
    keyOutputs: 'Recurring vs one-off delivery profile and contribution to gap closure.',
    keyInputs: 'Proposal value, delivery year, yearly phasing, achievement rate, RAG and owner.',
  },
  {
    name: 'Risk & Resilience',
    purpose: 'Risk posture dashboard including resilience indicators and stress/benchmark overlays.',
    keyOutputs: 'Overall risk score, red/amber/green warnings, resilience signals and simulation context.',
    keyInputs: 'Gap trajectory, reserves adequacy, volatility assumptions, peer benchmark and stress settings.',
  },
  {
    name: 'High Value',
    purpose: 'Advanced high-impact modelling modules for tax base, grants, ASC demand, capital and reserves policy.',
    keyOutputs: 'Refined projections replacing simplified assumptions where enabled.',
    keyInputs: 'Council tax base config, grant schedule, ASC cohorts, capital financing, reserves methodology.',
  },
  {
    name: 'Enhancement',
    purpose: 'Optional enhancement modules for workforce, contracts, invest-to-save, income and treasury controls.',
    keyOutputs: 'Additional pressure/income effects and treasury/MRP indicators.',
    keyInputs: 'NJC pay spine rows, contract clauses, invest-to-save plans, income lines, treasury settings.',
  },
  {
    name: 'Scenarios',
    purpose: 'Save and compare scenario configurations and model snapshots over time.',
    keyOutputs: 'Named scenarios and snapshots for option comparison and governance evidence.',
    keyInputs: 'Current assumptions/baseline/savings/reserves and authority metadata at save time.',
  },
  {
    name: 'Insights',
    purpose: 'Narrative insight feed translating model outputs into decision-focused messages.',
    keyOutputs: 'Critical, warning and contextual insights for officers and elected members.',
    keyInputs: 'Computed model outputs and risk flags.',
  },
  {
    name: 'Technical Detail',
    purpose: 'Finance-detail breakdown including year-level components and diagnostics.',
    keyOutputs: 'Technical line-by-line values supporting auditability and challenge.',
    keyInputs: 'All model internals for each year and component.',
  },
  {
    name: 'S151 Assurance',
    purpose: 'Assurance-oriented checks and framing for Section 151 governance scrutiny.',
    keyOutputs: 'Assurance indicators and statutory-style commentary support.',
    keyInputs: 'Reserves sustainability, recurring balance, delivery and risk evidence.',
  },
  {
    name: 'Governance',
    purpose: 'Committee/reporting support view for communicating position, actions and risks.',
    keyOutputs: 'Governance-ready summaries and export-oriented narratives.',
    keyInputs: 'Whole-model outcome and authority report metadata.',
  },
];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[rgba(99,179,237,0.18)] bg-[rgba(10,17,32,0.82)] p-5">
      <h2 className="text-[16px] font-bold text-[#f0f4ff] tracking-tight mb-3">{title}</h2>
      <div className="text-[12px] leading-relaxed text-[#8ca0c0]">{children}</div>
    </section>
  );
}

export function HelpGuide() {
  const openMainApp = () => {
    const url = `${window.location.pathname}${window.location.search}`;
    window.location.href = url;
  };

  const printGuide = () => window.print();

  return (
    <div className="min-h-screen bg-[#080c14] text-[#f0f4ff]">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        <header className="rounded-2xl border border-[rgba(99,179,237,0.22)] bg-gradient-to-br from-[#0b1426] via-[#101a2e] to-[#0b1426] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-[#3b82f6]" />
                <p className="text-[11px] uppercase tracking-widest text-[#8ca0c0] font-semibold">User Instruction Manual</p>
              </div>
              <h1 className="heading-display text-[26px] font-bold text-[#f0f4ff] mt-2">MTFS Financial Resilience Studio Help Guide</h1>
              <p className="text-[12px] text-[#8ca0c0] mt-2 max-w-4xl">
                Comprehensive reference guide for every area of the app, including controls, data fields, outputs, workflow,
                assumptions, accessibility options, governance usage and snapshot handling.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openMainApp}
                className="px-3 py-2 rounded-lg border border-[rgba(99,179,237,0.2)] bg-[rgba(59,130,246,0.15)] text-[11px] font-semibold text-[#dbeafe] hover:bg-[rgba(59,130,246,0.22)]"
              >
                Back To App
              </button>
              <button
                onClick={printGuide}
                className="px-3 py-2 rounded-lg border border-[rgba(99,179,237,0.2)] bg-[rgba(16,185,129,0.15)] text-[11px] font-semibold text-[#d1fae5] hover:bg-[rgba(16,185,129,0.22)]"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </header>

        <SectionCard title="1. Purpose And Scope">
          <p>
            The MTFS Financial Resilience Studio app models a five-year medium-term financial strategy position and helps officers and elected members
            understand the projected budget gap, structural sustainability, reserves resilience and delivery risk under different assumptions.
          </p>
          <p className="mt-2">
            Primary use cases are: budget strategy development, options appraisal, member briefing, section 151 challenge and governance reporting.
          </p>
          <p className="mt-2">
            Unit convention: all model values are in <span className="mono">£000s</span> unless a field explicitly states percentage or another unit.
          </p>
        </SectionCard>

        <SectionCard title="2. Application Layout">
          <div className="space-y-2">
            <p><span className="text-[#f0f4ff] font-semibold">Left Sidebar:</span> assumption engine and authority metadata controls.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Top Header:</span> app navigation tabs plus strategic/technical, audience and density display modes.</p>
            <p><span className="text-[#f0f4ff] font-semibold">KPI Bar:</span> headline metrics (gap, risk, reserves and key warning flags).</p>
            <p><span className="text-[#f0f4ff] font-semibold">Main Panel:</span> active workspace selected from the tab bar.</p>
          </div>
        </SectionCard>

        <SectionCard title="3. Sidebar Controls (Assumption Engine)">
          <div className="space-y-2">
            <p><span className="text-[#f0f4ff] font-semibold">Authority Config:</span> authority name, S151 officer, chief executive, authority type and reporting period for report identity.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Quick Presets:</span> optimistic/pessimistic one-click assumptions for rapid scenario stress.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Funding Sliders:</span> council tax increase, business rates growth, grant variation, fees and charges elasticity.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Expenditure Sliders:</span> pay award, non-pay inflation, ASC demand, CSC demand, savings delivery risk.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Policy Levers:</span> annual savings target, planned reserves usage, social care protection toggle.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Advanced:</span> real-terms toggle and deflator rate.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Accessibility:</span> default, large text, high contrast and dyslexia-friendly presets.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Reset To Defaults:</span> restores the demonstration model setup.</p>
          </div>
        </SectionCard>

        <SectionCard title="4. Header Modes And Navigation">
          <div className="space-y-2">
            <p><span className="text-[#f0f4ff] font-semibold">Strategic View:</span> limits visible tabs to leadership-level decision pages.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Technical View:</span> exposes full detailed working panels for finance teams.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Audience Mode:</span> switches language framing between finance-professional and elected-member style.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Density Mode:</span> comfort/compact/presentation display spacing.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Tab Navigation:</span> selects the active modelling panel.</p>
          </div>
        </SectionCard>

        <SectionCard title="5. Full Panel Reference">
          <div className="overflow-x-auto rounded-xl border border-[rgba(99,179,237,0.16)]">
            <table className="premium-table min-w-[920px] text-[11px]">
              <thead>
                <tr>
                  <th className="text-left text-[#8ca0c0] font-semibold">Panel</th>
                  <th className="text-left text-[#8ca0c0] font-semibold">Purpose</th>
                  <th className="text-left text-[#8ca0c0] font-semibold">Key Outputs</th>
                  <th className="text-left text-[#8ca0c0] font-semibold">Key Inputs</th>
                </tr>
              </thead>
              <tbody>
                {PANEL_GUIDE.map((item) => (
                  <tr key={item.name}>
                    <td className="text-[#f0f4ff] font-semibold">{item.name}</td>
                    <td className="text-[#8ca0c0]">{item.purpose}</td>
                    <td className="text-[#8ca0c0]">{item.keyOutputs}</td>
                    <td className="text-[#8ca0c0]">{item.keyInputs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="6. Data Model And Key Entities">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[rgba(99,179,237,0.15)] bg-[#0a1120] p-3">
              <p className="text-[#f0f4ff] text-[12px] font-semibold">Baseline Data</p>
              <p className="mt-1">Starting values for funding, spending, reserves and optional module configurations. Baseline is the model foundation.</p>
            </div>
            <div className="rounded-xl border border-[rgba(99,179,237,0.15)] bg-[#0a1120] p-3">
              <p className="text-[#f0f4ff] text-[12px] font-semibold">Assumptions</p>
              <p className="mt-1">Funding, expenditure, policy and advanced controls controlling annual movement and presentation logic.</p>
            </div>
            <div className="rounded-xl border border-[rgba(99,179,237,0.15)] bg-[#0a1120] p-3">
              <p className="text-[#f0f4ff] text-[12px] font-semibold">Savings Proposals</p>
              <p className="mt-1">Named interventions with delivery year, phasing and achievement rate to model deliverability and recurring effect.</p>
            </div>
            <div className="rounded-xl border border-[rgba(99,179,237,0.15)] bg-[#0a1120] p-3">
              <p className="text-[#f0f4ff] text-[12px] font-semibold">Named Reserves</p>
              <p className="mt-1">Specific reserve pots with opening balances, contributions, drawdowns and minimum balances by year.</p>
            </div>
            <div className="rounded-xl border border-[rgba(99,179,237,0.15)] bg-[#0a1120] p-3">
              <p className="text-[#f0f4ff] text-[12px] font-semibold">Scenarios And Snapshots</p>
              <p className="mt-1">Saved states used to compare options or pause/resume model development over time.</p>
            </div>
            <div className="rounded-xl border border-[rgba(99,179,237,0.15)] bg-[#0a1120] p-3">
              <p className="text-[#f0f4ff] text-[12px] font-semibold">Audit And History</p>
              <p className="mt-1">Model-run audit entries and assumptions history for traceability and challenge.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="7. Snapshot And Scenario Workflow">
          <div className="space-y-2">
            <p>Use snapshots to preserve full model state for later continuation, comparison and governance evidence.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Save Snapshot:</span> captures assumptions, baseline, proposals, reserves and metadata.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Export JSON/XLSX:</span> create portable snapshot files for transfer/backup/versioning.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Import JSON/XLSX:</span> load a previously exported snapshot to resume editing.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Load Snapshot:</span> rehydrates the model from stored state and immediately recalculates outputs.</p>
            <p><span className="text-[#f0f4ff] font-semibold">Scenarios:</span> maintain named option sets for committee-ready comparison packs.</p>
          </div>
        </SectionCard>

        <SectionCard title="8. How Calculations Behave (Conceptual)">
          <div className="space-y-2">
            <p>Each forecast year computes funding streams and expenditure pressures from base values plus assumptions and enabled advanced modules.</p>
            <p>Gross gap is funding minus expenditure before mitigation. Net gap reflects mitigations such as delivered savings and planned reserves usage.</p>
            <p>Structural gap distinguishes recurring imbalance from one-off effects, supporting sustainability assessment.</p>
            <p>Reserves balances roll forward each year using opening balances, contributions and drawdowns, then test against threshold/minimum constraints.</p>
            <p>Risk score and warnings derive from combined indicators such as deficits, reserve adequacy, volatility and delivery realism.</p>
          </div>
        </SectionCard>

        <SectionCard title="9. Tooltips, Accessibility And Communication">
          <div className="space-y-2">
            <p>Most interactive elements expose tooltips with contextual finance explanation to support less technical users.</p>
            <p>Audience mode is designed to reframe output for elected members without changing the underlying numbers.</p>
            <p>Accessibility presets adjust readability and contrast for inclusive usage in workshops, committees and public-facing sessions.</p>
            <p>Use presentation density for projected displays and committee room walkthroughs.</p>
          </div>
        </SectionCard>

        <SectionCard title="10. Governance And Assurance Use">
          <div className="space-y-2">
            <p>Recommended monthly cycle: update baseline and assumptions, run scenarios, review risk/reserves, save snapshot, generate governance narrative.</p>
            <p>For budget setting, compare do-nothing baseline, preferred plan and adverse stress variants before sign-off.</p>
            <p>For S151 assurance, focus on structural balance trajectory, reserves floor compliance, savings deliverability and volatility sensitivity.</p>
          </div>
        </SectionCard>

        <SectionCard title="11. Practical Operating Notes">
          <div className="space-y-2">
            <p>Figures shown as <span className="mono">£k</span>/<span className="mono">£m</span> are display formatting only; calculations use base numeric values in thousands.</p>
            <p>Some optional modules override simplified assumptions when enabled, so keep module toggles explicit during reporting.</p>
            <p>Use consistent naming conventions for proposals, reserves and scenarios to improve traceability.</p>
            <p>Retain exported snapshot files (JSON/XLSX) in a controlled folder structure for audit continuity.</p>
          </div>
        </SectionCard>

        <SectionCard title="12. In-App Help Access">
          <div className="flex flex-wrap items-center gap-2">
            <Info size={14} className="text-[#3b82f6]" />
            <p>
              This guide opens via the header <span className="mono">Help Guide</span> button and runs in a separate window
              so users can read instructions alongside the modelling workspace.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ShieldCheck size={14} className="text-[#10b981]" />
            <p>Keep this guide version-aligned with future feature updates to ensure governance users rely on accurate process guidance.</p>
          </div>
          <div className="mt-4">
            <a
              href={`${window.location.pathname}${window.location.search}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#93c5fd] hover:text-[#bfdbfe]"
            >
              Return to live model <ExternalLink size={12} />
            </a>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
