import React from 'react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import {
  Shield, BookOpen, CheckSquare, AlertTriangle, FileText,
  Scale, BarChart3, Clock
} from 'lucide-react';

function fmtK(v: number) {
  const abs = Math.abs(v);
  return `£${abs >= 1000 ? `${(abs / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

interface AssuranceItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'compliant' | 'risk' | 'critical' | 'neutral';
  evidence: string;
}

function AssuranceItem({ icon, title, description, status, evidence }: AssuranceItemProps) {
  const colors = {
    compliant: { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.2)', icon: '#10b981', badge: 'COMPLIANT', badgeBg: 'rgba(16,185,129,0.15)' },
    risk: { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', icon: '#f59e0b', badge: 'AT RISK', badgeBg: 'rgba(245,158,11,0.15)' },
    critical: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)', icon: '#ef4444', badge: 'ACTION REQUIRED', badgeBg: 'rgba(239,68,68,0.15)' },
    neutral: { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.2)', icon: '#3b82f6', badge: 'MONITORED', badgeBg: 'rgba(59,130,246,0.15)' },
  };
  const c = colors[status];
  return (
    <div className="rounded-xl p-4" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.badgeBg }}>
          <span style={{ color: c.icon }}>{icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[12px] font-semibold text-[#f0f4ff]">{title}</h4>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: c.badgeBg, color: c.icon }}
            >
              {c.badge}
            </span>
          </div>
          <p className="text-[11px] text-[#8ca0c0] leading-relaxed mb-2">{description}</p>
          <div className="flex items-start gap-1.5 pt-2 border-t" style={{ borderColor: c.border }}>
            <BookOpen size={10} style={{ color: c.icon }} className="mt-0.5 shrink-0" />
            <p className="text-[10px]" style={{ color: c.icon }}><span className="font-semibold">Evidence: </span>{evidence}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Section151Panel() {
  const { result, assumptions } = useMTFSStore();
  const {
    totalGap, yearReservesExhausted, reservesToNetBudget,
    structuralDeficitFlag, savingsAsBudgetPct, overallRiskScore
  } = result;

  const isBalanced = totalGap <= 0;
  const reservesOk = !yearReservesExhausted && reservesToNetBudget >= 5;
  const savingsRealistic = savingsAsBudgetPct <= 8;
  const riskAcceptable = overallRiskScore < 65;

  const assuranceItems: AssuranceItemProps[] = [
    {
      icon: <Scale size={16} />,
      title: 'Budget Robustness (s.25 LGA 2003)',
      description: isBalanced
        ? 'The MTFS demonstrates a balanced budget position across the planning horizon. Recurring income meets recurring expenditure under current assumptions.'
        : structuralDeficitFlag
          ? 'A structural deficit has been identified. The Section 151 Officer would be required to flag this in the budget report under s.25 of the Local Government Act 2003. Immediate corrective action is required.'
          : 'A budget gap exists but is not classified as structural under current assumptions. The S151 Officer should document mitigation measures in the statutory report.',
      status: isBalanced ? 'compliant' : structuralDeficitFlag ? 'critical' : 'risk',
      evidence: `5-year cumulative gap: ${isBalanced ? 'nil' : fmtK(totalGap)}. Structural deficit flag: ${structuralDeficitFlag ? 'YES' : 'NO'}.`,
    },
    {
      icon: <Shield size={16} />,
      title: 'Reserves Adequacy (s.26 LGA 2003)',
      description: reservesOk
        ? 'Reserves are maintained at or above the minimum prudent threshold across the MTFS period. The S151 Officer can provide assurance that reserves are adequate for the level of risk being carried.'
        : yearReservesExhausted
          ? `Reserves are projected to be exhausted by ${yearReservesExhausted}. This represents an unsustainable position. The S151 Officer would be unable to provide a positive assurance statement.`
          : `Reserves fall below the minimum threshold, representing a reserves-to-budget ratio of ${reservesToNetBudget.toFixed(1)}% against a recommended minimum of 5–10%.`,
      status: reservesOk ? 'compliant' : yearReservesExhausted ? 'critical' : 'risk',
      evidence: `Closing reserves Y5: ${fmtK(result.years[4]?.totalClosingReserves ?? 0)}. Reserves/budget ratio: ${reservesToNetBudget.toFixed(1)}%. Exhaustion year: ${yearReservesExhausted ?? 'N/A'}.`,
    },
    {
      icon: <BarChart3 size={16} />,
      title: 'Sustainability of Financial Plans',
      description: savingsRealistic
        ? 'The savings programme represents a realistic proportion of total expenditure. Delivery risk is within acceptable parameters for a medium-term financial strategy.'
        : `The savings target of ${savingsAsBudgetPct.toFixed(1)}% of expenditure exceeds the benchmark threshold of 8%. The S151 Officer should commission a feasibility assessment of the savings programme before presenting the MTFS to Full Council.`,
      status: savingsRealistic ? 'compliant' : 'risk',
      evidence: `Required savings: ${fmtK(result.requiredSavingsToBalance)}/yr. Savings as % of expenditure: ${savingsAsBudgetPct.toFixed(1)}%. Delivery risk adjustment: ${100 - assumptions.expenditure.savingsDeliveryRisk}%.`,
    },
    {
      icon: <AlertTriangle size={16} />,
      title: 'Risk-Based Decision Making',
      description: riskAcceptable
        ? 'The multi-factor risk assessment indicates an overall risk score within acceptable parameters. The MTFS plan carries manageable financial risk, subject to the assumptions in the Assumption Engine.'
        : `The overall risk score of ${overallRiskScore.toFixed(0)}/100 is classified as HIGH. The S151 Officer should not present this MTFS as a balanced plan without further scenario testing and risk mitigation documentation.`,
      status: riskAcceptable ? (overallRiskScore < 45 ? 'compliant' : 'neutral') : 'critical',
      evidence: `Overall risk score: ${overallRiskScore.toFixed(0)}/100 (${overallRiskScore >= 65 ? 'HIGH' : overallRiskScore >= 45 ? 'MEDIUM' : 'LOW'}). Key drivers: reserves adequacy, gap size, demand pressure.`,
    },
    {
      icon: <FileText size={16} />,
      title: 'Transparency & Governance',
      description: 'All assumptions are documented in the Assumption Engine with single-source-of-truth governance. The model uses deterministic, driver-based logic that is fully auditable. Methodology is CIPFA-aligned.',
      status: 'compliant',
      evidence: 'Driver-based model. Assumption version control. Scenario log. CIPFA methodology. All calculations reproducible.',
    },
  ];

  const allCompliant = assuranceItems.every((i) => i.status === 'compliant' || i.status === 'neutral');

  return (
    <div className="space-y-4">
      {/* S151 Header */}
      <div className="rounded-xl p-5 bg-gradient-to-br from-[#0f1f3d] to-[#0d1421] border border-[rgba(59,130,246,0.25)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] flex items-center justify-center">
            <Shield size={20} className="text-[#3b82f6]" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#f0f4ff]">Section 151 Financial Assurance</h3>
            <p className="text-[11px] text-[#8ca0c0]">Local Government Act 2003 — Statutory Financial Stewardship</p>
          </div>
          <div className="ml-auto">
            <span
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${
                allCompliant
                  ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.3)]'
                  : 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.3)]'
              }`}
            >
              {allCompliant ? 'ASSURANCE PROVIDED' : 'QUALIFIED ASSURANCE'}
            </span>
          </div>
        </div>
        <p className="text-[12px] text-[#8ca0c0] leading-relaxed">
          The Section 151 Officer has a statutory duty under s.114 of the Local Government Finance Act 1988 to report to the authority
          if it appears that unlawful expenditure is being incurred or the authority is likely to be unable to set a balanced budget.
          This tool supports the Section 151 Officer's financial assurance responsibilities by providing evidence-based analysis of the
          authority's medium-term financial sustainability.
        </p>
      </div>

      {/* Assurance items */}
      <div className="space-y-3">
        {assuranceItems.map((item, i) => (
          <AssuranceItem key={i} {...item} />
        ))}
      </div>

      {/* Methodology note */}
      <Card>
        <CardHeader>
          <CardTitle>Model Methodology & Limitations</CardTitle>
        </CardHeader>
        <div className="space-y-3 text-[11px] text-[#8ca0c0] leading-relaxed">
          <div className="flex items-start gap-2">
            <CheckSquare size={12} className="text-[#3b82f6] mt-0.5 shrink-0" />
            <p><span className="text-[#f0f4ff] font-semibold">Driver-based modelling:</span> Expenditure is calculated using component-level drivers (base + pay + inflation + demand − savings), not arithmetic aggregation. This provides transparency about the sources of financial pressure.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckSquare size={12} className="text-[#3b82f6] mt-0.5 shrink-0" />
            <p><span className="text-[#f0f4ff] font-semibold">CIPFA alignment:</span> The model follows CIPFA best practice guidance on medium-term financial planning, including explicit treatment of recurring vs non-recurring items and reserves strategy.</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckSquare size={12} className="text-[#3b82f6] mt-0.5 shrink-0" />
            <p><span className="text-[#f0f4ff] font-semibold">Deterministic logic:</span> All calculations are rule-based and fully auditable. There is no black-box AI in the financial calculations — all outputs are directly traceable to inputs.</p>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={12} className="text-[#4a6080] mt-0.5 shrink-0" />
            <p><span className="text-[#4a6080] font-semibold">Model version:</span> MTFS DSS v7.0 · Baseline year: {new Date().getFullYear()} · Planning horizon: {new Date().getFullYear()}–{new Date().getFullYear() + 4}</p>
          </div>
        </div>
      </Card>

      {/* Assumptions log */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assumptions Log</CardTitle>
          <span className="text-[9px] text-[#4a6080]">Generated {new Date().toLocaleString('en-GB')}</span>
        </CardHeader>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[11px]">
          {[
            ['Council Tax Increase', `${assumptions.funding.councilTaxIncrease.toFixed(2)}% p.a.`],
            ['Business Rates Growth', `${assumptions.funding.businessRatesGrowth.toFixed(1)}% p.a.`],
            ['Grant Variation', `${assumptions.funding.grantVariation > 0 ? '+' : ''}${assumptions.funding.grantVariation.toFixed(1)}% p.a.`],
            ['Fees & Charges Growth', `${assumptions.funding.feesChargesElasticity.toFixed(1)}% p.a.`],
            ['Pay Award', `${assumptions.expenditure.payAward.toFixed(1)}% p.a.`],
            ['Non-Pay Inflation', `${assumptions.expenditure.nonPayInflation.toFixed(1)}% p.a.`],
            ['ASC Demand Growth', `${assumptions.expenditure.ascDemandGrowth.toFixed(1)}% p.a.`],
            ['CSC Demand Growth', `${assumptions.expenditure.cscDemandGrowth.toFixed(1)}% p.a.`],
            ['Savings Delivery Risk', `${assumptions.expenditure.savingsDeliveryRisk.toFixed(0)}% achievement`],
            ['Annual Savings Target', fmtK(assumptions.policy.annualSavingsTarget)],
            ['Planned Reserves Use', fmtK(assumptions.policy.reservesUsage)],
            ['Real Terms Mode', assumptions.advanced.realTermsToggle ? `Yes (deflator: ${assumptions.advanced.inflationRate}%)` : 'No (nominal)'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-[rgba(99,179,237,0.04)]">
              <span className="text-[#4a6080]">{label}</span>
              <span className="mono font-semibold text-[#8ca0c0]">{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
