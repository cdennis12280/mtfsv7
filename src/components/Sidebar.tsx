import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Sliders, PanelLeftClose, PanelLeftOpen, TrendingUp, TrendingDown } from 'lucide-react';
import { useMTFSStore } from '../store/mtfsStore';
import type { Assumptions, YearProfile5 } from '../types/financial';

type YearKey = 'y1' | 'y2' | 'y3' | 'y4' | 'y5';
const YEAR_KEYS: YearKey[] = ['y1', 'y2', 'y3', 'y4', 'y5'];
const YEAR_LABELS: Record<YearKey, string> = { y1: 'Y1', y2: 'Y2', y3: 'Y3', y4: 'Y4', y5: 'Y5' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        title={`${open ? 'Collapse' : 'Expand'} ${title}`}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[rgba(99,179,237,0.05)]"
      >
        <span className="text-[11px] font-semibold tracking-widest uppercase text-[#8ca0c0]">{title}</span>
        {open ? <ChevronDown size={12} className="text-[#4a6080]" /> : <ChevronRight size={12} className="text-[#4a6080]" />}
      </button>
      {open && <div className="px-3 pt-1">{children}</div>}
    </div>
  );
}

function YearGridRow({
  label,
  unit,
  profile,
  mode,
  onChange,
}: {
  label: string;
  unit: string;
  profile: YearProfile5;
  mode: 'quick_y1' | 'five_year';
  onChange: (year: YearKey, value: number) => void;
}) {
  const copyAcross = () => YEAR_KEYS.forEach((k) => onChange(k, profile.y1));
  const reset = () => YEAR_KEYS.forEach((k) => onChange(k, 0));
  const applyAll = (value: number) => YEAR_KEYS.forEach((k) => onChange(k, value));
  const hasRiskyPct = unit === '%' && YEAR_KEYS.some((k) => profile[k] < -10 || profile[k] > 100);
  const hasRiskyMoney = unit === '£k' && YEAR_KEYS.some((k) => profile[k] < 0);

  return (
    <div className="border border-[rgba(99,179,237,0.12)] rounded-lg p-2 bg-[rgba(15,23,42,0.55)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#c9d6ef] font-semibold">{label}</span>
        <div className="flex gap-1">
          <button
            onClick={copyAcross}
            title={`Copy ${label} Year 1 value across Years 2–5`}
            className="text-[9px] px-1.5 py-0.5 rounded border border-[rgba(99,179,237,0.25)] text-[#8ca0c0]"
          >
            Copy Y1
          </button>
          <button
            onClick={reset}
            title={`Reset ${label} values for Years 1–5 to zero`}
            className="text-[9px] px-1.5 py-0.5 rounded border border-[rgba(239,68,68,0.25)] text-[#ef9a9a]"
          >
            Reset
          </button>
        </div>
      </div>
      <label className="mb-2 block text-[9px] text-[#4a6080]">
        {mode === 'quick_y1' ? 'Quick edit Year 1' : 'Bulk edit all years'}
        <input
          type="number"
          value={profile.y1}
          onChange={(e) => mode === 'quick_y1' ? onChange('y1', Number(e.target.value) || 0) : applyAll(Number(e.target.value) || 0)}
          className="mt-0.5 w-full bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-1.5 py-1 text-[10px] text-[#f0f4ff]"
        />
      </label>
      <div className={`grid grid-cols-5 gap-1 ${mode === 'quick_y1' ? 'hidden' : ''}`}>
        {YEAR_KEYS.map((k) => (
          <label key={k} className="text-[9px] text-[#4a6080]">
            <span className="block mb-0.5">{YEAR_LABELS[k]}</span>
            <div className="relative">
              <input
                type="number"
                value={profile[k]}
                onChange={(e) => onChange(k, Number(e.target.value) || 0)}
                title={`${label} ${YEAR_LABELS[k]} (${unit})`}
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-1.5 py-1 text-[10px] text-[#f0f4ff]"
              />
              <span className="absolute right-1 top-1 text-[8px] text-[#4a6080]">{unit}</span>
            </div>
          </label>
        ))}
      </div>
      {(hasRiskyPct || hasRiskyMoney) && (
        <p className="mt-1.5 text-[9px] text-[#f59e0b]">
          Review value range before using this assumption in governance outputs.
        </p>
      )}
    </div>
  );
}

function updateProfile(
  assumptions: Assumptions,
  section: 'funding' | 'expenditure' | 'policy',
  field: string,
  year: YearKey,
  value: number
): Assumptions {
  const next = structuredClone(assumptions) as Assumptions;
  const bucket = next[section] as unknown as Record<string, unknown>;
  const rawCurrent = bucket[field] as YearProfile5 | number;
  const current = typeof rawCurrent === 'number'
    ? { y1: rawCurrent, y2: rawCurrent, y3: rawCurrent, y4: rawCurrent, y5: rawCurrent }
    : rawCurrent;
  bucket[field] = { ...current, [year]: value } as YearProfile5;
  return next;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    assumptions,
    setAssumptions,
    resetToDefaults,
    applyPreset,
    updatePolicy,
    updateAdvanced,
    authorityConfig,
    setAuthorityConfig,
    assumptionEditMode,
    setAssumptionEditMode,
  } = useMTFSStore();
  const toProfile = (value: YearProfile5 | number): YearProfile5 =>
    typeof value === 'number' ? { y1: value, y2: value, y3: value, y4: value, y5: value } : value;

  const reviewFlags = useMemo(() => Object.values((assumptions as unknown as { metadata?: { requiresReview?: Record<string, { requiresReview: boolean }> } })?.metadata?.requiresReview ?? {}).filter((x) => x.requiresReview).length, [assumptions]);

  if (collapsed) {
    return (
      <aside id="assumption-engine-sidebar" className="shrink-0 h-screen overflow-y-auto bg-[#0a1120] border-r border-[rgba(99,179,237,0.08)] w-16">
        <div className="px-2 py-3 flex flex-col items-center gap-3">
          <button
            onClick={() => setCollapsed(false)}
            title="Expand Assumption Engine"
            className="p-1.5 rounded-md border border-[rgba(99,179,237,0.16)] text-[#8ca0c0]"
          >
            <PanelLeftOpen size={12} />
          </button>
          <Sliders size={12} className="text-[#8ca0c0]" />
        </div>
      </aside>
    );
  }

  return (
    <aside id="assumption-engine-sidebar" className="shrink-0 h-screen overflow-y-auto bg-[#0a1120] border-r border-[rgba(99,179,237,0.08)] w-80">
      <div className="px-3 py-3 border-b border-[rgba(99,179,237,0.08)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#3b82f6] flex items-center justify-center"><Sliders size={12} className="text-white" /></div>
            <span className="text-[13px] font-bold text-[#f0f4ff]">Assumption Engine</span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse Assumption Engine"
            className="p-1.5 rounded-md border border-[rgba(99,179,237,0.16)] text-[#8ca0c0]"
          >
            <PanelLeftClose size={12} />
          </button>
        </div>
        <p className="text-[10px] text-[#4a6080] mt-1">Year 1–5 granular assumptions</p>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-[rgba(99,179,237,0.12)] bg-[#080c14] p-0.5">
          {[
            { id: 'quick_y1' as const, label: 'Quick Y1' },
            { id: 'five_year' as const, label: 'Five-year' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setAssumptionEditMode(mode.id)}
              className={`rounded-md px-2 py-1.5 text-[10px] font-semibold ${assumptionEditMode === mode.id ? 'bg-[#3b82f6] text-white' : 'text-[#4a6080] hover:text-[#8ca0c0]'}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="rounded border border-[rgba(59,130,246,0.28)] bg-[rgba(59,130,246,0.1)] px-1.5 py-0.5 text-[9px] font-semibold text-[#60a5fa]">Live</span>
          <span className="rounded border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.08)] px-1.5 py-0.5 text-[9px] font-semibold text-[#10b981]">Manual</span>
          <span className="rounded border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] px-1.5 py-0.5 text-[9px] font-semibold text-[#f59e0b]">Review imports</span>
        </div>
        {reviewFlags > 0 && <p className="text-[10px] text-[#f59e0b] mt-1">{reviewFlags} imported assumptions require review</p>}
      </div>

      <div className="px-3 py-3 border-b border-[rgba(99,179,237,0.06)] grid grid-cols-2 gap-1.5">
        <button
          onClick={() => applyPreset('optimistic')}
          title="Apply optimistic assumptions across key Year 1–5 drivers"
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10px] font-semibold"
        >
          <TrendingUp size={10} />Optimistic
        </button>
        <button
          onClick={() => applyPreset('pessimistic')}
          title="Apply pessimistic assumptions across key Year 1–5 drivers"
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-[10px] font-semibold"
        >
          <TrendingDown size={10} />Pessimistic
        </button>
      </div>

      <div className="p-2 space-y-2">
        <Section title="Authority Metadata">
          <div className="space-y-2">
            <label title="Local authority name used in reports and exports." className="text-[10px] text-[#4a6080] block">
              Authority Name
              <input
                type="text"
                value={authorityConfig.authorityName}
                onChange={(e) => setAuthorityConfig({ authorityName: e.target.value })}
                className="w-full mt-1 bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-2 py-1 text-[10px] text-[#f0f4ff]"
              />
            </label>
            <label title="Section 151 Officer name shown in governance outputs." className="text-[10px] text-[#4a6080] block">
              Section 151 Officer
              <input
                type="text"
                value={authorityConfig.section151Officer}
                onChange={(e) => setAuthorityConfig({ section151Officer: e.target.value })}
                className="w-full mt-1 bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-2 py-1 text-[10px] text-[#f0f4ff]"
              />
            </label>
            <label title="Chief Executive name for governance pack context." className="text-[10px] text-[#4a6080] block">
              Chief Executive
              <input
                type="text"
                value={authorityConfig.chiefExecutive}
                onChange={(e) => setAuthorityConfig({ chiefExecutive: e.target.value })}
                className="w-full mt-1 bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-2 py-1 text-[10px] text-[#f0f4ff]"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label title="Authority type used for context in reports." className="text-[10px] text-[#4a6080] block">
                Authority Type
                <input
                  type="text"
                  value={authorityConfig.authorityType}
                  onChange={(e) => setAuthorityConfig({ authorityType: e.target.value })}
                  className="w-full mt-1 bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-2 py-1 text-[10px] text-[#f0f4ff]"
                />
              </label>
              <label title="MTFS reporting period shown in packs (e.g. 2026/27-2030/31)." className="text-[10px] text-[#4a6080] block">
                Reporting Period
                <input
                  type="text"
                  value={authorityConfig.reportingPeriod}
                  onChange={(e) => setAuthorityConfig({ reportingPeriod: e.target.value })}
                  className="w-full mt-1 bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-2 py-1 text-[10px] text-[#f0f4ff]"
                />
              </label>
            </div>
          </div>
        </Section>

        <Section title="Funding Assumptions">
          <div className="space-y-2">
            <YearGridRow mode={assumptionEditMode} label="Council Tax Increase" unit="%" profile={toProfile(assumptions.funding.councilTaxIncrease)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'funding', 'councilTaxIncrease', y, v), 'Funding profile updated')} />
            <YearGridRow mode={assumptionEditMode} label="Business Rates Growth" unit="%" profile={toProfile(assumptions.funding.businessRatesGrowth)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'funding', 'businessRatesGrowth', y, v), 'Funding profile updated')} />
            <YearGridRow mode={assumptionEditMode} label="Grant Variation" unit="%" profile={toProfile(assumptions.funding.grantVariation)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'funding', 'grantVariation', y, v), 'Funding profile updated')} />
            <YearGridRow mode={assumptionEditMode} label="Fees & Charges Elasticity" unit="%" profile={toProfile(assumptions.funding.feesChargesElasticity)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'funding', 'feesChargesElasticity', y, v), 'Funding profile updated')} />
          </div>
        </Section>

        <Section title="Expenditure Assumptions">
          <div className="space-y-2">
            <YearGridRow mode={assumptionEditMode} label="Pay Award" unit="%" profile={toProfile(assumptions.expenditure.payAward)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'expenditure', 'payAward', y, v), 'Expenditure profile updated')} />
            <YearGridRow mode={assumptionEditMode} label="Non-Pay Inflation" unit="%" profile={toProfile(assumptions.expenditure.nonPayInflation)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'expenditure', 'nonPayInflation', y, v), 'Expenditure profile updated')} />
            <YearGridRow mode={assumptionEditMode} label="ASC Demand Growth" unit="%" profile={toProfile(assumptions.expenditure.ascDemandGrowth)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'expenditure', 'ascDemandGrowth', y, v), 'Expenditure profile updated')} />
            <YearGridRow mode={assumptionEditMode} label="CSC Demand Growth" unit="%" profile={toProfile(assumptions.expenditure.cscDemandGrowth)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'expenditure', 'cscDemandGrowth', y, v), 'Expenditure profile updated')} />
            <YearGridRow mode={assumptionEditMode} label="Savings Delivery" unit="%" profile={toProfile(assumptions.expenditure.savingsDeliveryRisk)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'expenditure', 'savingsDeliveryRisk', y, v), 'Expenditure profile updated')} />
          </div>
        </Section>

        <Section title="Policy Levers">
          <div className="space-y-2">
            <YearGridRow mode={assumptionEditMode} label="Annual Savings Target" unit="£k" profile={toProfile(assumptions.policy.annualSavingsTarget)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'policy', 'annualSavingsTarget', y, v), 'Policy profile updated')} />
            <YearGridRow mode={assumptionEditMode} label="Reserves Usage" unit="£k" profile={toProfile(assumptions.policy.reservesUsage)} onChange={(y, v) => setAssumptions(updateProfile(assumptions, 'policy', 'reservesUsage', y, v), 'Policy profile updated')} />
            <label title="Protect social care spend within policy levers." className="flex items-center justify-between text-[10px] text-[#8ca0c0] p-2 border border-[rgba(99,179,237,0.12)] rounded-lg">
              Social Care Protection
              <input type="checkbox" checked={assumptions.policy.socialCareProtection} onChange={(e) => updatePolicy('socialCareProtection', e.target.checked)} />
            </label>
          </div>
        </Section>

        <Section title="Advanced Controls">
          <div className="space-y-2">
            <label title="Show values in real terms using the deflator rate." className="flex items-center justify-between text-[10px] text-[#8ca0c0] p-2 border border-[rgba(99,179,237,0.12)] rounded-lg">
              Real Terms Mode
              <input type="checkbox" checked={assumptions.advanced.realTermsToggle} onChange={(e) => updateAdvanced('realTermsToggle', e.target.checked)} />
            </label>
            <label title="Annual inflation deflator applied when Real Terms Mode is enabled." className="text-[10px] text-[#4a6080] block">
              Deflator Rate (%)
              <input type="number" className="w-full mt-1 bg-[#080c14] border border-[rgba(99,179,237,0.16)] rounded px-2 py-1 text-[10px] text-[#f0f4ff]" value={assumptions.advanced.inflationRate} onChange={(e) => updateAdvanced('inflationRate', Number(e.target.value) || 0)} />
            </label>
          </div>
        </Section>
      </div>

      <div className="px-3 py-3 border-t border-[rgba(99,179,237,0.08)]">
        <button
          onClick={resetToDefaults}
          title="Reset all assumptions back to default model values"
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-[#ef4444] text-[10px] font-semibold"
        >
          <RotateCcw size={10} />Reset Defaults
        </button>
      </div>
    </aside>
  );
}
