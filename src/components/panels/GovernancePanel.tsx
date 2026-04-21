import React from 'react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Database, BookOpen, AlertCircle, Download, FileText } from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import type { MTFSResult, Assumptions, BaselineData, SavingsProposal, AuthorityConfig } from '../../types/financial';
import {
  exportCommitteeReportPdf,
  exportOnePageMemberBriefPdf,
  exportPremiumBriefPdf,
} from '../../utils/governancePdf';

function fmtK(v: number) {
  const abs = Math.abs(v);
  return `GBP ${abs >= 1000 ? `${(abs / 1000).toFixed(1)}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

function getStrategicPriorities(authorityConfig: AuthorityConfig): string[] {
  return [
    authorityConfig.strategicPriority1,
    authorityConfig.strategicPriority2,
    authorityConfig.strategicPriority3,
  ].map((p) => (p || '').trim()).filter(Boolean);
}

function buildPriorityLinks(result: MTFSResult, authorityConfig: AuthorityConfig): string[] {
  const priorities = getStrategicPriorities(authorityConfig);
  if (priorities.length === 0) return [];
  return priorities.map((p, idx) => {
    const hook = idx === 0
      ? `Maintain service continuity while addressing ${fmtK(result.requiredSavingsToBalance)} annual action.`
      : idx === 1
        ? `Use recurring savings and income growth to support sustainable investment choices.`
        : `Protect resilience by sustaining prudent reserves and avoiding one-off fixes for structural gaps.`;
    return `${p}: ${hook}`;
  });
}

function buildNarrativeReport(
  result: MTFSResult,
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[],
  authorityConfig: AuthorityConfig
): string {
  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const lines: string[] = [
    '===============================================================================',
    `  MEDIUM-TERM FINANCIAL STRATEGY  -  REPORT TO FULL COUNCIL`,
    `  ${authorityConfig.authorityName.toUpperCase()}`,
    '===============================================================================',
    '',
    `  Report Date:       ${now}`,
    `  Reporting Period:  ${authorityConfig.reportingPeriod}`,
    `  Authority Type:    ${authorityConfig.authorityType}`,
    `  Section 151 Officer: ${authorityConfig.section151Officer}`,
    `  Chief Executive:   ${authorityConfig.chiefExecutive}`,
    `  Model Version:     MTFS DSS v7.0  -  CIPFA-aligned, driver-based`,
    '',
    '-------------------------------------------------------------------------------',
    '  EXECUTIVE SUMMARY',
    '-------------------------------------------------------------------------------',
    '',
  ];

  if (result.totalGap <= 0) {
    lines.push(
      "  Under current assumptions, the authority's Medium-Term Financial Strategy is in",
      '  balance across the five-year planning horizon. Recurring expenditure does not exceed',
      '  recurring funding under the assumptions presented in this report.',
      '',
      '  The Section 151 Officer can provide positive assurance that the budget is robust',
      '  and reserves are adequate, subject to the assumptions and limitations noted herein.'
    );
  } else {
    lines.push(
      `  This report presents the authority's Medium-Term Financial Strategy for the period`,
      `  ${authorityConfig.reportingPeriod}. The strategy identifies a five-year cumulative`,
      `  budget gap of ${fmtK(result.totalGap)}, of which ${fmtK(result.totalStructuralGap)} is`,
      `  structural in nature  -  representing a recurring imbalance between income and expenditure.`,
      '',
      `  The gap is driven primarily by demand-led pressures in Adult Social Care and Children's`,
      `  Social Care, pay pressures in excess of council tax and grant growth, and real-terms`,
      `  reductions in central government funding.`,
      '',
      `  To balance the MTFS, the authority must deliver average annual savings of`,
      `  ${fmtK(result.requiredSavingsToBalance)} across the planning period.`
    );
  }

  lines.push(
    '',
    '-------------------------------------------------------------------------------',
    '  SECTION 1: HEADLINE FINANCIAL INDICATORS',
    '-------------------------------------------------------------------------------',
    '',
    `  5-Year Cumulative Gap:         ${fmtK(result.totalGap)}`,
    `  Structural Gap (recurring):    ${fmtK(result.totalStructuralGap)}`,
    `  Year Reserves Exhausted:       ${result.yearReservesExhausted ?? 'Not exhausted within horizon'}`,
    `  Reserves/Budget Ratio (Y5):    ${result.reservesToNetBudget.toFixed(1)}%`,
    `  Required Annual Savings:       ${fmtK(result.requiredSavingsToBalance)}`,
    `  Savings as % of Expenditure:   ${result.savingsAsBudgetPct.toFixed(1)}%`,
    `  CT Equivalent (Year 1 gap):    ${result.councilTaxEquivalent.toFixed(2)}%`,
    `  Overall Risk Score:            ${result.overallRiskScore.toFixed(0)}/100 (${result.overallRiskScore >= 65 ? 'HIGH' : result.overallRiskScore >= 45 ? 'MEDIUM' : 'LOW'})`,
    `  Structural Deficit Flag:       ${result.structuralDeficitFlag ? 'YES  -  action required' : 'No'}`,
    '',
    '-------------------------------------------------------------------------------',
    '  SECTION 2: YEAR-BY-YEAR FINANCIAL SUMMARY (GBP 000s)',
    '-------------------------------------------------------------------------------',
    '',
    `  ${'Year'.padEnd(12)} ${'Funding'.padStart(10)} ${'Expenditure'.padStart(12)} ${'Gap'.padStart(10)} ${'Reserves'.padStart(11)}`,
    `  ${'-'.repeat(57)}`,
  );

  result.years.forEach((y) => {
    const gap = y.rawGap > 0 ? `+${fmtK(y.rawGap)}` : fmtK(y.rawGap);
    lines.push(
      `  ${y.label.padEnd(12)} ${fmtK(y.totalFunding).padStart(10)} ${fmtK(y.totalExpenditure).padStart(12)} ${gap.padStart(10)} ${fmtK(y.totalClosingReserves).padStart(11)}`
    );
  });

  lines.push(
    '',
    '-------------------------------------------------------------------------------',
    '  SECTION 3: KEY ASSUMPTIONS',
    '-------------------------------------------------------------------------------',
    '',
    '  Funding Assumptions',
    `    Council Tax Increase:    ${assumptions.funding.councilTaxIncrease}% per annum`,
    `    Business Rates Growth:   ${assumptions.funding.businessRatesGrowth}% per annum`,
    `    Grant Variation:         ${assumptions.funding.grantVariation > 0 ? '+' : ''}${assumptions.funding.grantVariation}% per annum`,
    `    Fees & Charges Growth:   ${assumptions.funding.feesChargesElasticity}% per annum`,
    '',
    '  Expenditure Assumptions',
    `    Pay Award:               ${assumptions.expenditure.payAward}% per annum`,
    `    Non-Pay Inflation:       ${assumptions.expenditure.nonPayInflation}% per annum`,
    `    ASC Demand Growth:       ${assumptions.expenditure.ascDemandGrowth}% per annum`,
    `    CSC Demand Growth:       ${assumptions.expenditure.cscDemandGrowth}% per annum`,
    `    Savings Delivery Risk:   ${assumptions.expenditure.savingsDeliveryRisk}% achievement rate`,
    '',
    '  Policy Levers',
    `    Annual Savings Target:   ${fmtK(assumptions.policy.annualSavingsTarget)} per annum (policy lever)`,
    `    Planned Reserves Use:    ${fmtK(assumptions.policy.reservesUsage)} per annum`,
    `    Social Care Protection:  ${assumptions.policy.socialCareProtection ? 'Yes  -  ring-fenced' : 'Not applied'}`,
    '',
    `  Savings Programme:         ${savingsProposals.length} proposals entered`,
    `  Custom Service Lines:      ${baseline.customServiceLines.length} additional lines`,
    `  Named Reserves:            ${baseline.namedReserves.length} named reserves`,
  );

  const priorityLinks = buildPriorityLinks(result, authorityConfig);
  if (priorityLinks.length > 0) {
    lines.push(
      '',
      '-------------------------------------------------------------------------------',
      '  SECTION 3A: STRATEGIC PRIORITY ALIGNMENT',
      '-------------------------------------------------------------------------------',
      '',
    );
    priorityLinks.forEach((l, i) => lines.push(`  ${i + 1}. ${l}`));
  }

  if (savingsProposals.length > 0) {
    lines.push(
      '',
      '-------------------------------------------------------------------------------',
      '  SECTION 4: SAVINGS PROGRAMME SUMMARY',
      '-------------------------------------------------------------------------------',
      '',
      `  ${'Proposal'.padEnd(30)} ${'Category'.padEnd(20)} ${'Gross'.padStart(8)} ${'RAG'.padStart(6)} ${'Type'.padStart(10)}`,
      `  ${'-'.repeat(76)}`,
    );
    savingsProposals.forEach((p) => {
      lines.push(
        `  ${(p.name || 'Unnamed').substring(0, 29).padEnd(30)} ${p.category.padEnd(20)} ${fmtK(p.grossValue).padStart(8)} ${p.ragStatus.toUpperCase().padStart(6)} ${(p.isRecurring ? 'Recurring' : 'One-off').padStart(10)}`
      );
    });
  }

  lines.push(
    '',
    '-------------------------------------------------------------------------------',
    '  SECTION 5: RISK ASSESSMENT',
    '-------------------------------------------------------------------------------',
    '',
  );

  result.riskFactors.forEach((f) => {
    lines.push(`  ${f.name.padEnd(28)} Score: ${f.score}/100  Level: ${f.level.toUpperCase()}`);
    lines.push(`    ${f.description}`);
    lines.push('');
  });

  lines.push(
    '-------------------------------------------------------------------------------',
    '  SECTION 6: INSIGHTS AND RECOMMENDED ACTIONS',
    '-------------------------------------------------------------------------------',
    '',
  );

  result.insights.forEach((insight, i) => {
    lines.push(`  ${i + 1}. [${insight.type.toUpperCase()}] ${insight.title}`);
    lines.push(`     ${insight.body}`);
    if (insight.action) lines.push(`     -> Action: ${insight.action}`);
    lines.push('');
  });

  lines.push(
    '-------------------------------------------------------------------------------',
    '  SECTION 7: SECTION 151 OFFICER STATUTORY STATEMENT',
    '-------------------------------------------------------------------------------',
    '',
    `  In accordance with Section 25 of the Local Government Act 2003, the Section 151`,
    `  Officer, ${authorityConfig.section151Officer}, has considered the robustness of the`,
    '  estimates and the adequacy of the proposed financial reserves.',
    '',
  );

  if (result.totalGap <= 0 && !result.yearReservesExhausted && result.reservesToNetBudget >= 5) {
    lines.push(
      '  ASSURANCE: The Section 151 Officer provides POSITIVE assurance that:',
      '    (a) The budget estimates are robust under current assumptions;',
      '    (b) The proposed level of reserves is adequate for the level of risk;',
      '    (c) The financial plan is sustainable over the MTFS period.',
    );
  } else {
    lines.push(
      '  ASSURANCE: The Section 151 Officer provides QUALIFIED assurance. The following',
      '  matters require the attention of Full Council before approval:',
      '',
    );
    if (result.totalGap > 0) lines.push(`    - Budget gap of ${fmtK(result.totalGap)} must be addressed through a credible mitigation plan`);
    if (result.yearReservesExhausted) lines.push(`    - Reserves are projected to be exhausted by ${result.yearReservesExhausted}  -  this is unsustainable`);
    if (result.reservesToNetBudget < 5) lines.push(`    - Reserves-to-budget ratio of ${result.reservesToNetBudget.toFixed(1)}% is below the recommended minimum`);
    if (result.structuralDeficitFlag) lines.push('    - Structural deficit identified  -  recurring savings must be found');
  }

  lines.push(
    '',
    '-------------------------------------------------------------------------------',
    '  METHODOLOGY AND DATA SOURCES',
    '-------------------------------------------------------------------------------',
    '',
    '  This report is produced using the MTFS Decision Support System v7.0.',
    '  Methodology: Driver-based expenditure modelling (CIPFA-aligned).',
    '  Figures: GBP 000s (nominal unless real terms toggle is active).',
    '  Calculations: Deterministic, rule-based  -  fully auditable.',
    '',
    "  IMPORTANT: Baseline figures should be verified against the authority's",
    '  approved accounts before use in statutory reporting. The model does not',
    '  constitute legal or professional financial advice.',
    '',
    `  Generated: ${now}`,
    `  MTFS DSS v7.0 - ${authorityConfig.authorityName}`,
    '===============================================================================',
  );

  return lines.join('\n');
}

function buildOnePageMemberBrief(
  result: MTFSResult,
  authorityConfig: AuthorityConfig
): string {
  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const y1 = result.years[0];
  const y5 = result.years[4];
  const lines = [
    `${authorityConfig.authorityName} — One-Page MTFS Member Brief`,
    `Date: ${now}  |  Period: ${authorityConfig.reportingPeriod}`,
    '',
    '1) Headline position',
    `- 5-year cumulative gap: ${fmtK(result.totalGap)}`,
    `- Structural gap: ${fmtK(result.totalStructuralGap)}`,
    `- Overall risk: ${result.overallRiskScore.toFixed(0)}/100`,
    `- Reserves exhausted by: ${result.yearReservesExhausted ?? 'Not exhausted in period'}`,
    '',
    '2) Why this matters',
    `- Year 1 gap: ${fmtK(y1?.rawGap ?? 0)} (${result.councilTaxEquivalent.toFixed(1)}% council-tax equivalent)`,
    `- Year 5 closing reserves: ${fmtK(y5?.totalClosingReserves ?? 0)}`,
    `- Average annual action required: ${fmtK(result.requiredSavingsToBalance)}`,
    '',
    '3) Strategic priorities linkage',
    ...buildPriorityLinks(result, authorityConfig).map((p) => `- ${p}`),
    '',
    '4) Key risks to watch',
    ...result.riskFactors
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => `- ${r.name}: ${r.score}/100 (${r.level})`),
    '',
    '5) Immediate member decisions required',
    '- Confirm risk appetite and prudent reserves threshold.',
    '- Approve a credible recurring savings / income delivery plan.',
    '- Require quarterly MTFS monitoring and mitigation updates.',
    '',
    '6) S151 assurance indicator',
    `- ${result.s114Triggered ? 'AT RISK: heightened statutory concern indicators triggered.' : 'No immediate statutory trigger under current tests.'}`,
  ];
  return lines.join('\n');
}

function buildPremiumMarkdownReport(
  result: MTFSResult,
  assumptions: Assumptions,
  authorityConfig: AuthorityConfig
): string {
  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return [
    `# ${authorityConfig.authorityName} — MTFS Premium Brief`,
    '',
    `**Date:** ${now}  `,
    `**Period:** ${authorityConfig.reportingPeriod}  `,
    `**S151 Officer:** ${authorityConfig.section151Officer}`,
    '',
    '## Headline Position',
    `- 5-year gap: **${fmtK(result.totalGap)}**`,
    `- Structural gap: **${fmtK(result.totalStructuralGap)}**`,
    `- Risk score: **${result.overallRiskScore.toFixed(0)}/100**`,
    `- Reserves exhausted by: **${result.yearReservesExhausted ?? 'Not exhausted'}**`,
    '',
    '## Key Assumptions',
    `- Council tax increase: ${assumptions.funding.councilTaxIncrease.toFixed(2)}%`,
    `- Pay award: ${assumptions.expenditure.payAward.toFixed(1)}%`,
    `- ASC demand growth: ${assumptions.expenditure.ascDemandGrowth.toFixed(1)}%`,
    `- Savings delivery risk: ${assumptions.expenditure.savingsDeliveryRisk.toFixed(0)}%`,
    '',
    '## Strategic Priority Alignment',
    ...buildPriorityLinks(result, authorityConfig).map((p) => `- ${p}`),
    '',
    '## Action Summary',
    `- Required annual action: **${fmtK(result.requiredSavingsToBalance)}**`,
    `- Council-tax equivalent (Y1): **${result.councilTaxEquivalent.toFixed(1)}%**`,
    `- s114 trigger assessment: **${result.s114Triggered ? 'At risk' : 'No immediate trigger'}**`,
    '',
  ].join('\n');
}

export function GovernancePanel() {
  const { result, assumptions, baseline, savingsProposals, authorityConfig } = useMTFSStore();

  const handleFullExport = () => {
    exportCommitteeReportPdf(result, assumptions, baseline, savingsProposals, authorityConfig);
  };

  const handleCsvExport = () => {
    const headers = ['Year', 'Funding', 'Expenditure', 'RawGap', 'StructuralGap', 'DeliveredSavings', 'TotalClosingReserves', 'StructuralDeficit', 'ReservesBelowThreshold'];
    const rows = result.years.map((y) => [
      y.label,
      y.totalFunding.toFixed(0),
      y.totalExpenditure.toFixed(0),
      y.rawGap.toFixed(0),
      y.structuralGap.toFixed(0),
      y.deliveredSavings.toFixed(0),
      y.totalClosingReserves.toFixed(0),
      y.structuralDeficit ? 'YES' : 'NO',
      y.reservesBelowThreshold ? 'YES' : 'NO',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MTFS_Data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOnePageBriefExport = () => {
    exportOnePageMemberBriefPdf(result, authorityConfig);
  };

  const handlePremiumMarkdownExport = () => {
    exportPremiumBriefPdf(result, assumptions, baseline, savingsProposals, authorityConfig);
  };

  return (
    <div className="space-y-4">
      {/* Export actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleFullExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] transition-colors"
        >
          <FileText size={13} />
          Export Committee Report PDF
        </button>
        <button
          onClick={handleCsvExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[11px] font-semibold hover:bg-[rgba(16,185,129,0.15)] transition-colors"
        >
          <Download size={13} />
          Export Data CSV
        </button>
        <button
          onClick={handleOnePageBriefExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] text-[#f59e0b] text-[11px] font-semibold hover:bg-[rgba(245,158,11,0.18)] transition-colors"
        >
          <FileText size={13} />
          Export One-Page Member Brief PDF
        </button>
        <button
          onClick={handlePremiumMarkdownExport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(139,92,246,0.14)] border border-[rgba(139,92,246,0.36)] text-[#a78bfa] text-[11px] font-semibold hover:bg-[rgba(139,92,246,0.22)] transition-colors"
        >
          <FileText size={13} />
          Export Premium Brief PDF
        </button>
        <span className="text-[10px] text-[#4a6080]">
          Report branded for: <span className="text-[#8ca0c0] font-semibold">{authorityConfig.authorityName}</span>
        </span>
      </div>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <Database size={14} className="text-[#4a6080]" />
        </CardHeader>
        <div className="space-y-2">
          {[
            { source: 'Baseline Data', type: 'User Input', desc: `Core budget figures entered via Baseline Editor. ${baseline.customServiceLines.length} custom service line(s) defined.`, ok: true },
            { source: 'Savings Programme', type: 'User Input', desc: `${savingsProposals.length > 0 ? `${savingsProposals.length} proposals entered in Savings Programme builder` : 'Using policy lever target  -  no individual proposals entered'}.`, ok: savingsProposals.length > 0 },
            { source: 'Named Reserves', type: 'User Input', desc: `${baseline.namedReserves.length > 0 ? `${baseline.namedReserves.length} named reserve(s) defined` : 'Using flat general fund / earmarked split from Baseline Editor'}.`, ok: baseline.namedReserves.length > 0 },
            { source: 'CIPFA Methodology', type: 'Framework', desc: 'Driver-based expenditure modelling. Savings with delivery risk and time-lag ramp. Deterministic logic.', ok: true },
            { source: 'LGA 2003 s.25/26', type: 'Statutory', desc: 'Sustainability tests aligned to budget robustness and reserves adequacy statutory duties.', ok: true },
          ].map((ds, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(99,179,237,0.03)] border border-[rgba(99,179,237,0.08)]">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ds.ok ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold text-[#f0f4ff]">{ds.source}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] font-semibold">{ds.type}</span>
                </div>
                <p className="text-[10px] text-[#4a6080] leading-relaxed">{ds.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Methodology</CardTitle>
          <BookOpen size={14} className="text-[#4a6080]" />
        </CardHeader>
        <div className="space-y-3 text-[11px] text-[#8ca0c0] leading-relaxed">
          {[
            ['Driver-based modelling', 'Expenditure = Base + Pay Inflation + Non-Pay Inflation + ASC Demand + CSC Demand + Custom Lines - Savings'],
            ['Savings delivery', 'Adjusted by per-proposal achievement rate and time-lag ramp (60% Year 1, increasing to 100%). Programme overrides policy lever when proposals exist.'],
            ['Structural gap', 'Calculated by removing one-off savings and non-recurring expenditure lines from the raw gap, isolating the recurring imbalance.'],
            ['Named reserves', 'Each reserve tracked individually with contributions and drawdowns per year. Gap drawdown applied from GF first, then earmarked.'],
            ['Risk scoring', '5 weighted factors (0-100 each): Reserves Adequacy (30%), Gap Exposure (25%), Funding Volatility (20%), Demand Pressure (15%), Savings Risk (10%).'],
            ['Real terms mode', 'Deflates nominal figures using (1 + inflation rate)^-year. Reports remain in nominal terms by default (MTFS convention).'],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] mt-1.5 shrink-0" />
              <p><span className="text-[#f0f4ff] font-semibold">{title}: </span>{desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Limitations */}
      <Card>
        <CardHeader>
          <CardTitle>Model Limitations</CardTitle>
          <AlertCircle size={14} className="text-[#f59e0b]" />
        </CardHeader>
        <div className="space-y-1.5">
          {[
            "Baseline figures must be verified against the authority's approved accounts and most recent MTFS before statutory reporting.",
            'Savings interactions and interdependencies between proposals are not modelled  -  complex programmes require manual adjustment.',
            'Demand growth is modelled as a uniform annual rate  -  actual demand may be step-change in nature (e.g. SEND placements, looked-after children).',
            'The model does not account for in-year monitoring variances, supplementary estimates, or virements.',
            'Capital financing, MRP and treasury indicators are modelled, but should be calibrated with authority treasury strategy and prudential indicators.',
            'The Section 151 Officer must exercise professional judgement over all outputs. This tool provides decision support, not decision replacement.',
          ].map((lim, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px] text-[#4a6080]">
              <span className="text-[#f59e0b] shrink-0">!</span>
              <p>{lim}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Assumptions log */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assumptions Log</CardTitle>
          <span className="text-[9px] text-[#4a6080]">Generated {new Date().toLocaleString('en-GB')}</span>
        </CardHeader>
        <div className="grid grid-cols-2 gap-y-2 text-[10px]">
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
            ['Policy Savings Target', fmtK(assumptions.policy.annualSavingsTarget)],
            ['Savings Proposals', `${savingsProposals.length} entered`],
            ['Named Reserves', `${baseline.namedReserves.length} defined`],
            ['Custom Service Lines', `${baseline.customServiceLines.length} defined`],
            ['Real Terms Mode', assumptions.advanced.realTermsToggle ? `Yes (${assumptions.advanced.inflationRate}%)` : 'No'],
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
