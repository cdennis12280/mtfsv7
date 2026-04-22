import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Assumptions, AuthorityConfig, BaselineData, MTFSResult, SavingsProposal } from '../types/financial';
import { runCalculations } from '../engine/calculations';

const PAGE_MARGIN = 36;
const PAGE_BOTTOM = 42;
const MODEL_VERSION = 'MTFS DSS v7.0';

function fmtK(v: number) {
  const abs = Math.abs(v);
  return `GBP ${abs >= 1000 ? `${(abs / 1000).toFixed(1)}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

function sanitize(input: string) {
  return (input || 'authority').replace(/[^a-zA-Z0-9]+/g, '_');
}

function riskBand(score: number) {
  if (score >= 75) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function ensureSpace(doc: jsPDF, y: number, need: number) {
  const h = doc.internal.pageSize.getHeight();
  if (y + need <= h - PAGE_BOTTOM) return y;
  doc.addPage();
  return PAGE_MARGIN;
}

function writeSectionTitle(doc: jsPDF, y: number, title: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(title, PAGE_MARGIN, y);
  doc.setDrawColor(203, 213, 225);
  doc.line(PAGE_MARGIN, y + 4, doc.internal.pageSize.getWidth() - PAGE_MARGIN, y + 4);
  return y + 16;
}

function writeParagraph(doc: jsPDF, y: number, text: string, size = 9.5) {
  const width = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(30, 41, 59);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, PAGE_MARGIN, y);
  return y + lines.length * (size + 2);
}

function writeCallout(doc: jsPDF, y: number, title: string, text: string, theme: 'slate' | 'amber' | 'blue' = 'slate') {
  const width = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  const palette = theme === 'amber'
    ? { fill: [255, 247, 237], stroke: [251, 191, 36], title: [146, 64, 14] }
    : theme === 'blue'
      ? { fill: [239, 246, 255], stroke: [59, 130, 246], title: [30, 64, 175] }
      : { fill: [241, 245, 249], stroke: [148, 163, 184], title: [30, 41, 59] };
  const lines = doc.splitTextToSize(text, width - 16);
  const height = Math.max(44, 26 + lines.length * 11);
  doc.setFillColor(palette.fill[0], palette.fill[1], palette.fill[2]);
  doc.setDrawColor(palette.stroke[0], palette.stroke[1], palette.stroke[2]);
  doc.roundedRect(PAGE_MARGIN, y, width, height, 6, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(palette.title[0], palette.title[1], palette.title[2]);
  doc.text(title, PAGE_MARGIN + 8, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(lines, PAGE_MARGIN + 8, y + 28);
  return y + height + 10;
}

function drawCompactTrendBars(
  doc: jsPDF,
  y: number,
  title: string,
  labels: string[],
  values: number[],
  color: [number, number, number]
) {
  const width = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  const height = 82;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(title, PAGE_MARGIN, y);
  const chartTop = y + 10;
  const chartHeight = 56;
  const barAreaWidth = width - 8;
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const gap = 8;
  const barW = (barAreaWidth - gap * (values.length - 1)) / values.length;
  values.forEach((v, idx) => {
    const x = PAGE_MARGIN + idx * (barW + gap);
    const h = (Math.abs(v) / maxAbs) * chartHeight;
    const y0 = chartTop + chartHeight - h;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.setDrawColor(203, 213, 225);
    doc.rect(x, y0, barW, h, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(71, 85, 105);
    doc.text(labels[idx], x + barW / 2, chartTop + chartHeight + 10, { align: 'center' });
  });
  doc.setDrawColor(203, 213, 225);
  doc.line(PAGE_MARGIN, chartTop + chartHeight, PAGE_MARGIN + width, chartTop + chartHeight);
  return y + height;
}

interface ComparatorScenario {
  name: 'Base' | 'Optimistic' | 'Stress';
  result: MTFSResult;
  confidence: string;
  note: string;
}

function buildComparatorScenarios(
  result: MTFSResult,
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[]
): ComparatorScenario[] {
  const optimistic: Assumptions = {
    ...assumptions,
    funding: {
      ...assumptions.funding,
      councilTaxIncrease: assumptions.funding.councilTaxIncrease + 0.5,
      businessRatesGrowth: assumptions.funding.businessRatesGrowth + 0.6,
      grantVariation: assumptions.funding.grantVariation + 0.8,
    },
    expenditure: {
      ...assumptions.expenditure,
      payAward: Math.max(0, assumptions.expenditure.payAward - 0.6),
      nonPayInflation: Math.max(0, assumptions.expenditure.nonPayInflation - 0.6),
      savingsDeliveryRisk: Math.min(100, assumptions.expenditure.savingsDeliveryRisk + 8),
    },
  };
  const stress: Assumptions = {
    ...assumptions,
    funding: {
      ...assumptions.funding,
      councilTaxIncrease: Math.max(0, assumptions.funding.councilTaxIncrease - 0.75),
      businessRatesGrowth: assumptions.funding.businessRatesGrowth - 1.0,
      grantVariation: assumptions.funding.grantVariation - 1.0,
    },
    expenditure: {
      ...assumptions.expenditure,
      payAward: assumptions.expenditure.payAward + 1.0,
      nonPayInflation: assumptions.expenditure.nonPayInflation + 1.0,
      ascDemandGrowth: assumptions.expenditure.ascDemandGrowth + 1.5,
      savingsDeliveryRisk: Math.max(30, assumptions.expenditure.savingsDeliveryRisk - 12),
    },
  };
  return [
    { name: 'Base', result, confidence: 'Central planning assumption set', note: 'Primary planning case used for formal budget strategy.' },
    { name: 'Optimistic', result: runCalculations(optimistic, baseline, savingsProposals), confidence: 'Improved delivery/funding case', note: 'Used to test upside and delivery headroom.' },
    { name: 'Stress', result: runCalculations(stress, baseline, savingsProposals), confidence: 'Downside stress case', note: 'Used for resilience and contingency planning.' },
  ];
}

function finalY(doc: jsPDF, fallback: number) {
  const maybe = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  return maybe.lastAutoTable?.finalY ?? fallback;
}

function addFooter(doc: jsPDF, authorityName: string, generatedAt: Date) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    const w = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`MTFS Governance Export · ${authorityName || 'Local Authority'} · ${MODEL_VERSION}`, PAGE_MARGIN, h - 18);
    doc.text(`Generated ${generatedAt.toLocaleString('en-GB')}`, PAGE_MARGIN, h - 8);
    doc.text(`Page ${i} of ${pages}`, w - PAGE_MARGIN, h - 18, { align: 'right' });
  }
}

export function exportCommitteeReportPdf(
  result: MTFSResult,
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[],
  authorityConfig: AuthorityConfig
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const now = new Date();
  const scenarioRows = buildComparatorScenarios(result, assumptions, baseline, savingsProposals);
  const baseScenario = scenarioRows[0].result;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 142, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('MTFS Committee Report', PAGE_MARGIN, 64);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Governance-grade financial strategy and assurance brief', PAGE_MARGIN, 88);

  doc.setTextColor(15, 23, 42);
  let y = 174;
  y = writeSectionTitle(doc, y, 'Authority Context');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 9, cellPadding: 4.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 170 } },
    body: [
      ['Authority', authorityConfig.authorityName || 'Local Authority'],
      ['Reporting Period', authorityConfig.reportingPeriod || `${now.getFullYear()}/${String(now.getFullYear() + 1).slice(2)} - ${now.getFullYear() + 4}/${String(now.getFullYear() + 5).slice(2)}`],
      ['Section 151 Officer', authorityConfig.section151Officer || 'Not specified'],
      ['Chief Executive', authorityConfig.chiefExecutive || 'Not specified'],
      ['Generated', now.toLocaleString('en-GB')],
    ],
  });
  y = finalY(doc, y) + 12;

  y = writeSectionTitle(doc, y, 'Executive Summary');
  const summary = result.totalGap <= 0
    ? `Model outputs indicate a balanced MTFS across the planning period. Overall risk score is ${result.overallRiskScore.toFixed(0)}/100 (${riskBand(result.overallRiskScore)}). Focus should shift to delivery assurance and reserve resilience.`
    : `Model outputs indicate a five-year gap of ${fmtK(result.totalGap)}, with a structural component of ${fmtK(result.totalStructuralGap)}. Annual corrective action equivalent to ${fmtK(result.requiredSavingsToBalance)} is required to restore sustainable balance.`;
  y = writeParagraph(doc, y, summary);
  y += 6;
  y = writeParagraph(
    doc,
    y,
    `Headline risks include reserves position (${result.yearReservesExhausted ? `exhausted by ${result.yearReservesExhausted}` : 'not exhausted in period'}) and overall risk score ${result.overallRiskScore.toFixed(0)}/100. Section 151 statutory risk trigger: ${result.s114Triggered ? 'At risk' : 'No immediate trigger'}.`
  );
  y += 6;
  y = writeCallout(
    doc,
    y,
    'Decision Required',
    result.totalGap <= 0
      ? 'Approve the recommended monitoring cadence and reserve protection controls. No immediate corrective savings decision is required under current assumptions.'
      : `Approve a recurring mitigation package equivalent to ${fmtK(result.requiredSavingsToBalance)} per annum and confirm contingency triggers if delivery falls below plan.`,
    result.totalGap <= 0 ? 'blue' : 'amber'
  );

  y += 10;
  y = ensureSpace(doc, y, 220);
  y = writeSectionTitle(doc, y, 'Decision Dashboard');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 9, cellPadding: 4.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 220 } },
    body: [
      ['5-Year Cumulative Gap', fmtK(result.totalGap)],
      ['Structural Gap', fmtK(result.totalStructuralGap)],
      ['Required Annual Savings', fmtK(result.requiredSavingsToBalance)],
      ['Council Tax Equivalent (Year 1)', `${result.councilTaxEquivalent.toFixed(2)}%`],
      ['Overall Risk Score', `${result.overallRiskScore.toFixed(0)}/100 (${riskBand(result.overallRiskScore)})`],
      ['Reserves-to-Budget (Year 5)', `${result.reservesToNetBudget.toFixed(1)}%`],
      ['Year Reserves Exhausted', result.yearReservesExhausted ?? 'Not exhausted in period'],
      ['s.114 Trigger Assessment', result.s114Triggered ? `At risk (${result.s114Reasons.join('; ') || 'see risk section'})` : 'No immediate trigger'],
    ],
  });
  y = finalY(doc, y) + 10;

  y = ensureSpace(doc, y, 120);
  y = drawCompactTrendBars(
    doc,
    y,
    'Yearly Raw Gap Trend (compact)',
    result.years.map((r) => `Y${r.year}`),
    result.years.map((r) => r.rawGap),
    [239, 68, 68]
  );
  y += 6;
  y = drawCompactTrendBars(
    doc,
    y,
    'Closing Reserves Trend (compact)',
    result.years.map((r) => `Y${r.year}`),
    result.years.map((r) => r.totalClosingReserves),
    [59, 130, 246]
  );
  y += 8;

  y = ensureSpace(doc, y, 210);
  y = writeSectionTitle(doc, y, 'Scenario Comparator (Base / Optimistic / Stress)');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    head: [['Scenario', '5-Year Gap', 'Delta vs Base', 'Risk Score', 'Y5 Reserves', 'Confidence Note']],
    body: scenarioRows.map((s) => [
      s.name,
      fmtK(s.result.totalGap),
      s.name === 'Base' ? '—' : fmtK(s.result.totalGap - baseScenario.totalGap),
      `${s.result.overallRiskScore.toFixed(0)}/100`,
      fmtK(s.result.years[4]?.totalClosingReserves ?? 0),
      `${s.confidence}: ${s.note}`,
    ]),
  });
  y = finalY(doc, y) + 10;

  y = ensureSpace(doc, y, 260);
  y = writeSectionTitle(doc, y, 'Year-by-Year Financial Position (GBP 000s)');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.2, cellPadding: 3.6 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    head: [['Year', 'Funding', 'Expenditure', 'Raw Gap', 'Structural Gap', 'Delivered Savings', 'Closing Reserves', 'Flags']],
    body: result.years.map((row) => [
      row.label,
      fmtK(row.totalFunding),
      fmtK(row.totalExpenditure),
      fmtK(row.rawGap),
      fmtK(row.structuralGap),
      fmtK(row.deliveredSavings),
      fmtK(row.totalClosingReserves),
      [
        row.structuralDeficit ? 'Structural deficit' : null,
        row.reservesBelowThreshold ? 'Below threshold' : null,
        row.unrealisticSavings ? 'Savings risk' : null,
      ].filter(Boolean).join(', ') || 'None',
    ]),
  });
  y = finalY(doc, y) + 10;

  y = ensureSpace(doc, y, 220);
  y = writeSectionTitle(doc, y, 'Assumptions and Programme Inputs');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.7, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 220 } },
    body: [
      ['Council Tax Increase', `${assumptions.funding.councilTaxIncrease.toFixed(2)}%`],
      ['Business Rates Growth', `${assumptions.funding.businessRatesGrowth.toFixed(2)}%`],
      ['Grant Variation', `${assumptions.funding.grantVariation.toFixed(2)}%`],
      ['Fees & Charges Growth', `${assumptions.funding.feesChargesElasticity.toFixed(2)}%`],
      ['Pay Award', `${assumptions.expenditure.payAward.toFixed(2)}%`],
      ['Non-Pay Inflation', `${assumptions.expenditure.nonPayInflation.toFixed(2)}%`],
      ['ASC Demand Growth', `${assumptions.expenditure.ascDemandGrowth.toFixed(2)}%`],
      ['CSC Demand Growth', `${assumptions.expenditure.cscDemandGrowth.toFixed(2)}%`],
      ['Savings Delivery Risk', `${assumptions.expenditure.savingsDeliveryRisk.toFixed(1)}%`],
      ['Savings Proposals', `${savingsProposals.length}`],
      ['Custom Service Lines', `${baseline.customServiceLines.length}`],
      ['Named Reserves', `${baseline.namedReserves.length}`],
    ],
  });
  y = finalY(doc, y) + 10;

  y = ensureSpace(doc, y, 220);
  y = writeSectionTitle(doc, y, 'Risk Factors and Insights');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.4, cellPadding: 3.8 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    head: [['Risk Factor', 'Score', 'Level', 'Weight', 'Description']],
    body: result.riskFactors.map((f) => [
      f.name,
      `${f.score}/100`,
      f.level.toUpperCase(),
      `${(f.weight * 100).toFixed(0)}%`,
      f.description,
    ]),
  });
  y = finalY(doc, y) + 8;

  y = ensureSpace(doc, y, 180);
  y = writeSectionTitle(doc, y, 'Legal and Compliance Mapping');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.3, cellPadding: 3.8 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    head: [['Framework Reference', 'Check', 'Current Position']],
    body: [
      ['Local Government Act 2003 s25', 'Robustness of estimates', result.totalGap <= 0 ? 'Improved; balanced plan modelled' : `Gap remains (${fmtK(result.totalGap)})`],
      ['Local Government Act 2003 s25', 'Adequacy of reserves', result.reservesToNetBudget >= 5 ? `Within reference range (${result.reservesToNetBudget.toFixed(1)}%)` : `Below reference (${result.reservesToNetBudget.toFixed(1)}%)`],
      ['Section 114 risk trigger', 'Statutory distress indicators', result.s114Triggered ? `At risk (${result.s114Reasons.join('; ') || 'see narrative'})` : 'No immediate trigger under current assumptions'],
      ['CIPFA Prudential Code', 'Authorised/Operational boundary tests', result.treasuryBreaches.length > 0 ? result.treasuryBreaches.join('; ') : 'No treasury indicator breach flagged'],
    ],
  });
  y = finalY(doc, y) + 10;

  const topInsights = result.insights.slice(0, 8);
  if (topInsights.length > 0) {
    y = ensureSpace(doc, y, 120);
    y = writeSectionTitle(doc, y, 'Key Insights and Recommended Actions');
    topInsights.forEach((insight, idx) => {
      y = ensureSpace(doc, y, 42);
      y = writeParagraph(
        doc,
        y,
        `${idx + 1}. [${insight.type.toUpperCase()}] ${insight.title}: ${insight.body}${insight.action ? ` Action: ${insight.action}` : ''}`,
        8.8
      );
      y += 2;
    });
  }

  doc.addPage();
  let sy = PAGE_MARGIN;
  sy = writeSectionTitle(doc, sy, 'Section 151 Statutory Assurance Statement');
  const assurance = result.totalGap <= 0 && !result.yearReservesExhausted && result.reservesToNetBudget >= 5
    ? 'Positive assurance can be provided, subject to normal quarterly monitoring and delivery controls.'
    : 'Qualified assurance is advised: the authority should consider further mitigations before approval.';
  sy = writeParagraph(
    doc,
    sy,
    `In accordance with Section 25 of the Local Government Act 2003, the Section 151 Officer (${authorityConfig.section151Officer || 'Not specified'}) has reviewed estimate robustness and reserve adequacy. ${assurance}`
  );
  sy += 10;
  const qualificationPoints: string[] = [];
  if (result.totalGap > 0) qualificationPoints.push(`Budget gap remains at ${fmtK(result.totalGap)} over five years.`);
  if (result.yearReservesExhausted) qualificationPoints.push(`Reserves are projected to be exhausted by ${result.yearReservesExhausted}.`);
  if (result.reservesToNetBudget < 5) qualificationPoints.push(`Reserves-to-budget ratio (${result.reservesToNetBudget.toFixed(1)}%) is below prudent reference level.`);
  if (result.structuralDeficitFlag) qualificationPoints.push('Structural deficit remains and requires recurring mitigations.');
  if (qualificationPoints.length === 0) qualificationPoints.push('No material qualification points flagged under current assumptions.');
  qualificationPoints.forEach((point, idx) => {
    sy = ensureSpace(doc, sy, 28);
    sy = writeParagraph(doc, sy, `${idx + 1}. ${point}`, 9);
  });

  doc.addPage();
  let ay = PAGE_MARGIN;
  ay = writeSectionTitle(doc, ay, 'Appendix: Methodology, Glossary and Data Notes');
  ay = writeParagraph(doc, ay, 'Methodology summary: deterministic, driver-based forecasting with explicit treatment of recurring vs one-off measures and reserve adequacy checks.', 9);
  ay += 4;
  autoTable(doc, {
    startY: ay,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.2, cellPadding: 3.6 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    head: [['Glossary Term', 'Definition']],
    body: [
      ['Structural gap', 'Recurring shortfall after removing one-off items.'],
      ['Council tax equivalent', 'Year 1 shortfall expressed as % of Year 1 council tax income.'],
      ['Reserves-to-budget ratio', 'Year 5 closing reserves as a percentage of Year 5 funding.'],
      ['s.114 trigger indicator', 'Composite warning based on reserve exhaustion, persistent deficits and risk score.'],
    ],
  });
  ay = finalY(doc, ay) + 8;
  ay = ensureSpace(doc, ay, 180);
  autoTable(doc, {
    startY: ay,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.2, cellPadding: 3.6 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    head: [['Data Definition', 'Current Value / Source']],
    body: [
      ['Assumption set', `${MODEL_VERSION} / Generated ${now.toLocaleString('en-GB')}`],
      ['Savings proposals', `${savingsProposals.length} lines`],
      ['Named reserves', `${baseline.namedReserves.length} lines`],
      ['Custom service lines', `${baseline.customServiceLines.length} lines`],
      ['Assurance wording', assurance],
      ['Audit trail excerpt', result.insights.slice(0, 2).map((i) => i.title).join(' | ') || 'No flagged insight excerpt'],
    ],
  });
  ay = finalY(doc, ay) + 8;
  ay = writeParagraph(
    doc,
    ay,
    'Limitations and assurance: model outputs support decision-making and do not replace Section 151 professional judgement. Calibration against authority accounts and treasury strategy is required before statutory sign-off.',
    8.8
  );

  addFooter(doc, authorityConfig.authorityName, now);
  doc.save(`MTFS_Committee_Report_${sanitize(authorityConfig.authorityName)}_${now.toISOString().slice(0, 10)}.pdf`);
}

export function exportOnePageMemberBriefPdf(
  result: MTFSResult,
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[],
  authorityConfig: AuthorityConfig
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const now = new Date();
  const y1 = result.years[0];
  const y5 = result.years[4];
  const scenarioRows = buildComparatorScenarios(result, assumptions, baseline, savingsProposals);
  const baseScenario = scenarioRows[0].result;

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 94, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('One-Page MTFS Member Brief', PAGE_MARGIN, 48);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${authorityConfig.authorityName} · ${authorityConfig.reportingPeriod} · ${now.toLocaleDateString('en-GB')}`, PAGE_MARGIN, 68);

  let y = 122;
  doc.setTextColor(15, 23, 42);
  y = writeSectionTitle(doc, y, 'At-a-Glance Position');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 9.2, cellPadding: 4.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 230 } },
    body: [
      ['5-Year Gap', fmtK(result.totalGap)],
      ['Structural Gap', fmtK(result.totalStructuralGap)],
      ['Overall Risk', `${result.overallRiskScore.toFixed(0)}/100 (${riskBand(result.overallRiskScore)})`],
      ['Reserves Exhausted By', result.yearReservesExhausted ?? 'Not exhausted in period'],
      ['Year 1 Gap', fmtK(y1?.rawGap ?? 0)],
      ['Year 5 Closing Reserves', fmtK(y5?.totalClosingReserves ?? 0)],
      ['Average Annual Action Required', fmtK(result.requiredSavingsToBalance)],
      ['Council Tax Equivalent (Y1)', `${result.councilTaxEquivalent.toFixed(1)}%`],
      ['s.114 Trigger Indicator', result.s114Triggered ? 'At risk' : 'No immediate trigger'],
    ],
  });
  y = finalY(doc, y) + 8;
  y = writeCallout(
    doc,
    y,
    'What Members Need To Know',
    result.totalGap <= 0
      ? 'The current plan is modelled as balanced over five years. Focus now shifts to delivery discipline, reserve protection, and ongoing monitoring.'
      : `The current plan still shows a ${fmtK(result.totalGap)} five-year gap. Members need to agree recurring actions and a contingency trigger if delivery slips.`,
    result.totalGap <= 0 ? 'blue' : 'amber'
  );

  y = ensureSpace(doc, y, 140);
  y = writeSectionTitle(doc, y, 'Top 3 Risks for Members');
  const topRisks = [...result.riskFactors].sort((a, b) => b.score - a.score).slice(0, 3);
  topRisks.forEach((r, idx) => {
    y = writeParagraph(doc, y, `${idx + 1}. ${r.name} - ${r.score}/100 (${r.level.toUpperCase()}): ${r.description}`, 9);
    y += 2;
  });

  y += 4;
  y = ensureSpace(doc, y, 140);
  y = writeSectionTitle(doc, y, 'Scenario Snapshot');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.3, cellPadding: 3.6 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    head: [['Case', '5yr Gap', 'Delta vs Base', 'Y5 Reserves', 'Confidence']],
    body: scenarioRows.map((s) => [
      s.name,
      fmtK(s.result.totalGap),
      s.name === 'Base' ? '—' : fmtK(s.result.totalGap - baseScenario.totalGap),
      fmtK(s.result.years[4]?.totalClosingReserves ?? 0),
      s.confidence,
    ]),
  });
  y = finalY(doc, y) + 6;

  y = ensureSpace(doc, y, 125);
  y = writeSectionTitle(doc, y, 'Immediate Decisions Requested');
  [
    'Confirm risk appetite and prudent reserves threshold for the MTFS period (Section 25 reserve adequacy).',
    'Approve recurring savings and income plan aligned to required annual action.',
    'Require quarterly delivery tracking with escalation for amber/red risks and statutory trigger monitoring (s.114).',
  ].forEach((item, idx) => {
    y = writeParagraph(doc, y, `${idx + 1}. ${item}`, 9);
  });
  y += 4;
  y = writeParagraph(
    doc,
    y,
    `Plain-English legal context: Section 151 assurance currently reads "${result.totalGap <= 0 && !result.yearReservesExhausted ? 'positive with monitoring' : 'qualified - further mitigation required'}".`,
    8.7
  );

  addFooter(doc, authorityConfig.authorityName, now);
  doc.save(`MTFS_One_Page_Brief_${sanitize(authorityConfig.authorityName)}_${now.toISOString().slice(0, 10)}.pdf`);
}

export function exportPremiumBriefPdf(
  result: MTFSResult,
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[],
  authorityConfig: AuthorityConfig
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const now = new Date();
  const scenarioRows = buildComparatorScenarios(result, assumptions, baseline, savingsProposals);
  const baseScenario = scenarioRows[0].result;
  const priorities = [authorityConfig.strategicPriority1, authorityConfig.strategicPriority2, authorityConfig.strategicPriority3]
    .map((p) => (p || '').trim())
    .filter(Boolean);

  doc.setFillColor(76, 29, 149);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 132, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('MTFS Premium Brief', PAGE_MARGIN, 62);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${authorityConfig.authorityName} · ${authorityConfig.reportingPeriod} · ${now.toLocaleDateString('en-GB')}`, PAGE_MARGIN, 84);
  doc.text('Enhanced briefing pack for leadership, cabinet and committee review', PAGE_MARGIN, 100);
  doc.setTextColor(15, 23, 42);

  let y = 162;
  y = writeSectionTitle(doc, y, 'Strategic Position');
  y = writeParagraph(
    doc,
    y,
    `The authority is modelled with a five-year gap of ${fmtK(result.totalGap)} and structural gap ${fmtK(result.totalStructuralGap)}. Overall risk is ${result.overallRiskScore.toFixed(0)}/100 (${riskBand(result.overallRiskScore)}). ${result.s114Triggered ? 'Statutory trigger indicators suggest elevated concern that should be explicitly addressed in governance decisions.' : 'No immediate statutory trigger is indicated under current assumptions.'}`
  );
  y += 6;
  y = writeCallout(
    doc,
    y,
    'Leadership Summary',
    result.totalGap <= 0
      ? 'Current plan indicates affordability with manageable risk. Priority is execution quality, reserve discipline, and transparency of delivery.'
      : `Residual affordability pressure remains. Leadership focus should be on recurring mitigations, decision sequencing, and explicit contingency governance.`,
    result.totalGap <= 0 ? 'blue' : 'amber'
  );

  y += 6;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 9, cellPadding: 4.2 },
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold' },
    head: [['Domain', 'Current Position', 'Commentary']],
    body: [
      ['Affordability', fmtK(result.totalGap), result.totalGap <= 0 ? 'Balanced profile under current assumptions.' : 'Residual gap requires recurring mitigation.'],
      ['Resilience', `${result.reservesToNetBudget.toFixed(1)}% reserves/budget`, result.yearReservesExhausted ? `Reserves exhausted by ${result.yearReservesExhausted}.` : 'Reserves remain positive through horizon.'],
      ['Deliverability', `${savingsProposals.length} programme lines`, savingsProposals.length > 0 ? 'Proposal-level plan exists; delivery assurance required.' : 'No proposal-level programme loaded.'],
      ['Risk', `${result.overallRiskScore.toFixed(0)}/100`, `Primary risk band is ${riskBand(result.overallRiskScore)}.`],
    ],
  });
  y = finalY(doc, y) + 10;

  y = ensureSpace(doc, y, 210);
  y = writeSectionTitle(doc, y, 'Scenario Comparator with Delta View');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.3, cellPadding: 3.8 },
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold' },
    head: [['Scenario', '5yr Gap', 'Delta vs Base', 'Risk', 'Y5 Reserves', 'Confidence / Use']],
    body: scenarioRows.map((s) => [
      s.name,
      fmtK(s.result.totalGap),
      s.name === 'Base' ? '—' : fmtK(s.result.totalGap - baseScenario.totalGap),
      `${s.result.overallRiskScore.toFixed(0)}/100`,
      fmtK(s.result.years[4]?.totalClosingReserves ?? 0),
      `${s.confidence}; ${s.note}`,
    ]),
  });
  y = finalY(doc, y) + 8;

  y = ensureSpace(doc, y, 110);
  y = drawCompactTrendBars(
    doc,
    y,
    'Compact Visual: 5-Year Raw Gap Profile',
    result.years.map((r) => `Y${r.year}`),
    result.years.map((r) => r.rawGap),
    [124, 58, 237]
  );
  y += 8;

  y = ensureSpace(doc, y, 220);
  y = writeSectionTitle(doc, y, 'Assumptions and Model Inputs');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.6, cellPadding: 3.8 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    head: [['Driver', 'Value', 'Implication']],
    body: [
      ['Council Tax Increase', `${assumptions.funding.councilTaxIncrease.toFixed(2)}%`, 'Core recurrent funding uplift.'],
      ['Business Rates Growth', `${assumptions.funding.businessRatesGrowth.toFixed(2)}%`, 'Locally retained business-rate trajectory.'],
      ['Pay Award', `${assumptions.expenditure.payAward.toFixed(2)}%`, 'Main workforce cost pressure.'],
      ['ASC Demand Growth', `${assumptions.expenditure.ascDemandGrowth.toFixed(2)}%`, 'Demand-led spending growth in social care.'],
      ['Savings Delivery Risk', `${assumptions.expenditure.savingsDeliveryRisk.toFixed(1)}%`, 'Programme delivery haircut in forecasts.'],
      ['Named Reserves', `${baseline.namedReserves.length}`, 'Granularity of reserve tracking.'],
      ['Custom Service Lines', `${baseline.customServiceLines.length}`, 'Service disaggregation depth.'],
    ],
  });
  y = finalY(doc, y) + 10;

  y = ensureSpace(doc, y, 165);
  y = writeSectionTitle(doc, y, 'Governance / Legal Mapping');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.2, cellPadding: 3.6 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    head: [['Reference', 'Test', 'Position']],
    body: [
      ['LGA 2003 s25', 'Estimate robustness', result.totalGap <= 0 ? 'Balanced central case' : `Residual shortfall ${fmtK(result.totalGap)}`],
      ['LGA 2003 s25', 'Reserve adequacy', result.reservesToNetBudget >= 5 ? `Within reference ${result.reservesToNetBudget.toFixed(1)}%` : `Below reference ${result.reservesToNetBudget.toFixed(1)}%`],
      ['Section 114', 'Trigger indicators', result.s114Triggered ? `At risk (${result.s114Reasons.join('; ') || 'see risk section'})` : 'No immediate trigger'],
      ['CIPFA Prudential Code', 'Treasury indicators', result.treasuryBreaches.length > 0 ? result.treasuryBreaches.join('; ') : 'No indicator breach flagged'],
    ],
  });
  y = finalY(doc, y) + 8;

  y = ensureSpace(doc, y, 200);
  y = writeSectionTitle(doc, y, 'Yearly Outlook');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.3, cellPadding: 3.4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    head: [['Year', 'Funding', 'Expenditure', 'Raw Gap', 'Net Gap', 'Closing Reserves']],
    body: result.years.map((yr) => [
      yr.label,
      fmtK(yr.totalFunding),
      fmtK(yr.totalExpenditure),
      fmtK(yr.rawGap),
      fmtK(yr.netGap),
      fmtK(yr.totalClosingReserves),
    ]),
  });
  y = finalY(doc, y) + 10;

  if (priorities.length > 0) {
    y = ensureSpace(doc, y, 120);
    y = writeSectionTitle(doc, y, 'Strategic Priority Alignment');
    priorities.forEach((p, idx) => {
      y = writeParagraph(
        doc,
        y,
        `${idx + 1}. ${p}: ${idx === 0 ? 'Protect priority services while maintaining affordability.' : idx === 1 ? 'Use recurring actions to support medium-term sustainability.' : 'Maintain resilience through prudent reserve strategy and risk controls.'}`,
        9
      );
      y += 1;
    });
  }

  const topSavings = [...savingsProposals]
    .sort((a, b) => b.grossValue - a.grossValue)
    .slice(0, 10);
  if (topSavings.length > 0) {
    y = ensureSpace(doc, y, 180);
    y = writeSectionTitle(doc, y, 'Top Savings Proposals (by Gross Value)');
    autoTable(doc, {
      startY: y,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: { fontSize: 8.2, cellPadding: 3.6 },
      headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold' },
      head: [['Proposal', 'Category', 'Gross Value', 'RAG', 'Recurring', 'Owner']],
      body: topSavings.map((s) => [
        s.name || 'Unnamed',
        s.category,
        fmtK(s.grossValue),
        s.ragStatus.toUpperCase(),
        s.isRecurring ? 'Yes' : 'No',
        s.responsibleOfficer || 'Not set',
      ]),
    });
    y = finalY(doc, y) + 8;
  }

  y = ensureSpace(doc, y, 150);
  y = writeSectionTitle(doc, y, 'Assurance and Next Actions');
  [
    `Section 151 position: ${result.totalGap <= 0 && !result.yearReservesExhausted ? 'Positive with monitoring' : 'Qualified - additional mitigation required'}.`,
    `Required annual action currently modelled at ${fmtK(result.requiredSavingsToBalance)}.`,
    'Recommended governance cadence: monthly finance review, quarterly member update, and explicit mitigation tracking for amber/red delivery risks.',
  ].forEach((line) => {
    y = writeParagraph(doc, y, `- ${line}`, 9);
  });

  doc.addPage();
  let annY = PAGE_MARGIN;
  annY = writeSectionTitle(doc, annY, 'Annex: Methodology, Definitions and Audit Context');
  annY = writeParagraph(doc, annY, 'Methodology: deterministic, driver-based MTFS model aligned to CIPFA planning principles, with transparent reserve and risk diagnostics.', 9);
  annY += 4;
  autoTable(doc, {
    startY: annY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.1, cellPadding: 3.4 },
    headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold' },
    head: [['Glossary', 'Definition']],
    body: [
      ['Raw gap', 'Difference between expenditure and funding before netting effects.'],
      ['Net gap', 'Residual gap after reserves drawdown.'],
      ['Structural gap', 'Recurring imbalance after one-off adjustments.'],
      ['Savings delivery risk', 'Assumed achievable proportion of planned savings.'],
    ],
  });
  annY = finalY(doc, annY) + 8;
  autoTable(doc, {
    startY: annY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.1, cellPadding: 3.4 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    head: [['Data Definition', 'Current Value']],
    body: [
      ['Model version', MODEL_VERSION],
      ['Generated', now.toLocaleString('en-GB')],
      ['Savings proposals', `${savingsProposals.length}`],
      ['Named reserves', `${baseline.namedReserves.length}`],
      ['Audit excerpt', result.insights.slice(0, 2).map((i) => i.title).join(' | ') || 'No audit excerpt available'],
    ],
  });
  annY = finalY(doc, annY) + 8;
  annY = writeParagraph(
    doc,
    annY,
    'Assurance and limitations wording: outputs are decision support and do not replace statutory officer judgement; formal reporting requires calibration to authority accounts and treasury strategy.',
    8.7
  );

  addFooter(doc, authorityConfig.authorityName, now);
  doc.save(`MTFS_Premium_Brief_${sanitize(authorityConfig.authorityName)}_${now.toISOString().slice(0, 10)}.pdf`);
}
