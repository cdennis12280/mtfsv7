import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, RotateCcw, Zap, TrendingUp, TrendingDown,
  Sliders, DollarSign, Settings2, Lock, Building2
} from 'lucide-react';
import { useMTFSStore } from '../store/mtfsStore';
import { SliderControl, NumberInput, Toggle } from './ui/SliderControl';
import { RichTooltip } from './ui/RichTooltip';

// ── Authority Config section (Item 22) ────────────────────────────────────────
function AuthorityConfigSection() {
  const { authorityConfig, setAuthorityConfig } = useMTFSStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        title="Configure authority identity and reporting metadata."
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[rgba(99,179,237,0.05)] transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Building2 size={13} className="text-[#10b981] opacity-80" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#8ca0c0] group-hover:text-[#f0f4ff] transition-colors">
            Authority Config
          </span>
          <RichTooltip content="Sets authority identity used in report headers, governance exports, and statutory narratives." />
        </div>
        {open ? <ChevronDown size={12} className="text-[#4a6080]" /> : <ChevronRight size={12} className="text-[#4a6080]" />}
      </button>
      {open && (
        <div className="px-3 pt-1 pb-2 space-y-2">
          {[
            { label: 'Authority Name', key: 'authorityName' as const, placeholder: 'e.g. Example Unitary Authority' },
            { label: 'S151 Officer', key: 'section151Officer' as const, placeholder: 'e.g. Director of Finance' },
            { label: 'Chief Executive', key: 'chiefExecutive' as const, placeholder: 'e.g. Chief Executive' },
            { label: 'Authority Type', key: 'authorityType' as const, placeholder: 'e.g. Unitary Authority' },
            { label: 'Reporting Period', key: 'reportingPeriod' as const, placeholder: 'e.g. 2025/26 – 2029/30' },
            { label: 'Population', key: 'population' as const, placeholder: 'e.g. 320000' },
            { label: 'Strategic Priority 1', key: 'strategicPriority1' as const, placeholder: 'e.g. Protect vulnerable residents' },
            { label: 'Strategic Priority 2', key: 'strategicPriority2' as const, placeholder: 'e.g. Inclusive local growth' },
            { label: 'Strategic Priority 3', key: 'strategicPriority3' as const, placeholder: 'e.g. Neighbourhood and climate resilience' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] text-[#4a6080] block mb-1">{label}</label>
              <input
                type={key === 'population' ? 'number' : 'text'}
                value={authorityConfig[key]}
                placeholder={placeholder}
                onChange={(e) => setAuthorityConfig({ [key]: key === 'population' ? Number(e.target.value) || 0 : e.target.value })}
                title={`${label}: used in report branding and governance exports.`}
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.1)] rounded-lg px-2 py-1.5 text-[11px] text-[#f0f4ff] outline-none focus:border-[rgba(59,130,246,0.4)] placeholder:text-[#4a6080]"
              />
            </div>
          ))}
          {authorityConfig.authorityName && (
            <div className="mt-2 p-2 rounded-lg bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)]">
              <p className="text-[9px] text-[#10b981] font-semibold">{authorityConfig.authorityName}</p>
              <p className="text-[9px] text-[#4a6080] mt-0.5">S151: {authorityConfig.section151Officer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accent?: string;
  tooltip?: string;
}

function Section({ title, icon, defaultOpen = true, children, accent = '#3b82f6', tooltip }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        title={`Expand ${title} assumptions`}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[rgba(99,179,237,0.05)] transition-colors group"
      >
        <div className="flex items-center gap-2">
          <span style={{ color: accent }} className="opacity-80">{icon}</span>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#8ca0c0] group-hover:text-[#f0f4ff] transition-colors">
            {title}
          </span>
          {tooltip && <RichTooltip content={tooltip} />}
        </div>
        {open
          ? <ChevronDown size={12} className="text-[#4a6080]" />
          : <ChevronRight size={12} className="text-[#4a6080]" />
        }
      </button>
      {open && (
        <div className="px-3 pt-1 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const {
    assumptions,
    updateFunding,
    updateExpenditure,
    updatePolicy,
    updateAdvanced,
    resetToDefaults,
    applyPreset,
    accessibilityPreset,
    setAccessibilityPreset,
  } = useMTFSStore();

  return (
    <aside className="w-72 shrink-0 h-screen overflow-y-auto bg-[#0a1120] border-r border-[rgba(99,179,237,0.08)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[rgba(99,179,237,0.08)]">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md bg-[#3b82f6] flex items-center justify-center">
            <Sliders size={12} className="text-white" />
          </div>
          <span className="text-[13px] font-bold text-[#f0f4ff] tracking-tight">Assumption Engine</span>
        </div>
        <p className="text-[10px] text-[#4a6080] leading-relaxed">
          Adjust assumptions to model MTFS scenarios in real time
        </p>
      </div>

      {/* Quick Presets */}
      <div className="px-3 py-3 border-b border-[rgba(99,179,237,0.06)]">
        <div className="flex items-center gap-1 mb-2">
          <p className="text-[10px] text-[#4a6080] uppercase tracking-widest font-semibold">Quick Presets</p>
          <RichTooltip content="Instantly apply optimistic or pessimistic assumption sets for fast comparison." />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => applyPreset('optimistic')}
            title="Applies stronger funding and lower pressure assumptions."
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10px] font-semibold hover:bg-[rgba(16,185,129,0.15)] transition-colors"
          >
            <TrendingUp size={10} />
            Optimistic
          </button>
          <button
            onClick={() => applyPreset('pessimistic')}
            title="Applies weaker funding and higher pressure assumptions."
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-[10px] font-semibold hover:bg-[rgba(239,68,68,0.15)] transition-colors"
          >
            <TrendingDown size={10} />
            Pessimistic
          </button>
        </div>
      </div>

      {/* Assumption Sections */}
      <div className="flex-1 py-2">

        <AuthorityConfigSection />

        <div className="mx-3 h-px bg-[rgba(99,179,237,0.06)] mb-2" />

        <Section title="Funding" icon={<DollarSign size={13} />} accent="#3b82f6" tooltip="Core recurring income assumptions across council tax, business rates, grants and charges.">
          <SliderControl
            label="Council Tax Increase"
            value={assumptions.funding.councilTaxIncrease}
            min={0} max={10} step={0.01}
            tooltip="Annual council tax percentage increase. Maximum 4.99% without referendum (2.99% core + 2% ASC precept under current referendum principles)."
            onChange={(v) => updateFunding('councilTaxIncrease', v)}
          />
          <SliderControl
            label="Business Rates Growth"
            value={assumptions.funding.businessRatesGrowth}
            min={-5} max={8} step={0.1}
            tooltip="Retained business rates growth assumption. Subject to reset from future fair funding reviews."
            onChange={(v) => updateFunding('businessRatesGrowth', v)}
          />
          <SliderControl
            label="Grant Variation"
            value={assumptions.funding.grantVariation}
            min={-10} max={5} step={0.1}
            tooltip="Year-on-year change in core central government grants. Negative values reflect real-terms grant reductions."
            colorClass={assumptions.funding.grantVariation < 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}
            onChange={(v) => updateFunding('grantVariation', v)}
          />
          <SliderControl
            label="Fees & Charges Elasticity"
            value={assumptions.funding.feesChargesElasticity}
            min={-2} max={10} step={0.1}
            tooltip="Annual growth in fees and charges income. Reflects pricing decisions and volume demand changes."
            onChange={(v) => updateFunding('feesChargesElasticity', v)}
          />
        </Section>

        <div className="mx-3 h-px bg-[rgba(99,179,237,0.06)] mb-2" />

        <Section title="Expenditure" icon={<TrendingDown size={13} />} accent="#f59e0b" defaultOpen tooltip="Cost pressures that drive medium-term spending growth.">
          <SliderControl
            label="Pay Award"
            value={assumptions.expenditure.payAward}
            min={0} max={10} step={0.1}
            tooltip="Assumed annual pay settlement for all staff. Pay typically represents 50–60% of total expenditure in local government."
            colorClass="text-[#f59e0b]"
            onChange={(v) => updateExpenditure('payAward', v)}
          />
          <SliderControl
            label="Non-Pay Inflation"
            value={assumptions.expenditure.nonPayInflation}
            min={0} max={12} step={0.1}
            tooltip="General inflation on non-pay costs: energy, contracts, supplies. Linked to CPI/RPI."
            colorClass="text-[#f59e0b]"
            onChange={(v) => updateExpenditure('nonPayInflation', v)}
          />
          <SliderControl
            label="ASC Demand Growth"
            value={assumptions.expenditure.ascDemandGrowth}
            min={0} max={15} step={0.1}
            tooltip="Adult Social Care demand growth. Driven by demographic pressures (ageing population) and increasing complexity of need."
            colorClass="text-[#f59e0b]"
            onChange={(v) => updateExpenditure('ascDemandGrowth', v)}
          />
          <SliderControl
            label="CSC Demand Growth"
            value={assumptions.expenditure.cscDemandGrowth}
            min={0} max={15} step={0.1}
            tooltip="Children's Social Care demand growth. Driven by referral rates, looked after children numbers, and SEND pressures."
            colorClass="text-[#f59e0b]"
            onChange={(v) => updateExpenditure('cscDemandGrowth', v)}
          />
          <SliderControl
            label="Savings Delivery Risk"
            value={assumptions.expenditure.savingsDeliveryRisk}
            min={30} max={100} step={1}
            unit="%"
            tooltip="Percentage of targeted savings that will actually be delivered. 100% assumes full delivery; lower values apply an achievement risk adjustment."
            colorClass={assumptions.expenditure.savingsDeliveryRisk < 75 ? 'text-[#ef4444]' : 'text-[#10b981]'}
            format={(v) => `${v.toFixed(0)}%`}
            onChange={(v) => updateExpenditure('savingsDeliveryRisk', v)}
          />
        </Section>

        <div className="mx-3 h-px bg-[rgba(99,179,237,0.06)] mb-2" />

        <Section title="Policy Levers" icon={<Zap size={13} />} accent="#8b5cf6" defaultOpen tooltip="Mitigation controls such as savings targets and reserves usage strategy.">
          <NumberInput
            label="Annual Savings Target"
            value={assumptions.policy.annualSavingsTarget}
            step={100}
            prefix="£"
            suffix="k/yr"
            tooltip="The gross savings target the authority is seeking to deliver each year. Subject to delivery risk adjustment."
            onChange={(v) => updatePolicy('annualSavingsTarget', v)}
          />
          <NumberInput
            label="Planned Reserves Use"
            value={assumptions.policy.reservesUsage}
            step={100}
            prefix="£"
            suffix="k/yr"
            tooltip="Planned annual drawdown from reserves to contribute to budget gap mitigation. Zero is recommended for structural gaps."
            onChange={(v) => updatePolicy('reservesUsage', v)}
          />
          <Toggle
            label="Protect Social Care"
            value={assumptions.policy.socialCareProtection}
            tooltip="Ring-fence adult social care funding, preventing cuts to ASC services as a savings option."
            onChange={(v) => updatePolicy('socialCareProtection', v)}
          />
        </Section>

        <div className="mx-3 h-px bg-[rgba(99,179,237,0.06)] mb-2" />

        <Section title="Advanced" icon={<Settings2 size={13} />} accent="#06b6d4" defaultOpen={false} tooltip="Advanced modelling options including real-terms presentation.">
          <Toggle
            label="Real Terms Mode"
            value={assumptions.advanced.realTermsToggle}
            tooltip="When enabled, all figures are deflated to base-year real terms using the inflation rate below."
            onChange={(v) => updateAdvanced('realTermsToggle', v)}
          />
          {assumptions.advanced.realTermsToggle && (
            <SliderControl
              label="Deflator Rate"
              value={assumptions.advanced.inflationRate}
              min={0} max={10} step={0.1}
              tooltip="The inflation rate used to convert nominal figures to real terms."
              colorClass="text-[#06b6d4]"
              onChange={(v) => updateAdvanced('inflationRate', v)}
            />
          )}
        </Section>

        <div className="mx-3 h-px bg-[rgba(99,179,237,0.06)] mb-2" />

        <Section title="Accessibility" icon={<Settings2 size={13} />} accent="#10b981" defaultOpen={false} tooltip="Readability presets for presentation and inclusive access.">
          <p className="text-[10px] text-[#4a6080] mb-2">Reading and presentation preset</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              ['default', 'Default'],
              ['large-text', 'Large Text'],
              ['high-contrast', 'High Contrast'],
              ['dyslexia-friendly', 'Dyslexia'],
            ] as const).map(([preset, label]) => (
              <button
                key={preset}
                onClick={() => setAccessibilityPreset(preset)}
                title={`Set accessibility preset: ${label}`}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-semibold transition-colors ${
                  accessibilityPreset === preset
                    ? 'bg-[rgba(16,185,129,0.15)] border-[rgba(16,185,129,0.4)] text-[#10b981]'
                    : 'bg-[rgba(99,179,237,0.05)] border-[rgba(99,179,237,0.12)] text-[#8ca0c0] hover:text-[#f0f4ff]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      {/* Footer actions */}
      <div className="px-3 py-3 border-t border-[rgba(99,179,237,0.08)]">
        <button
          onClick={resetToDefaults}
          title="Reset all assumptions and baseline values to default demo settings."
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[rgba(99,179,237,0.05)] border border-[rgba(99,179,237,0.12)] text-[#8ca0c0] text-[11px] font-medium hover:text-[#f0f4ff] hover:border-[rgba(99,179,237,0.25)] transition-all"
        >
          <RotateCcw size={11} />
          Reset to Defaults
        </button>
        <div className="flex items-center gap-1 mt-2 justify-center">
          <Lock size={9} className="text-[#4a6080]" />
          <span className="text-[9px] text-[#4a6080]">CIPFA-aligned · Deterministic model</span>
        </div>
      </div>
    </aside>
  );
}
