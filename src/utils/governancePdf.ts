import { jsPDF } from 'jspdf';
import autoTable, { type Styles } from 'jspdf-autotable';
import type { Assumptions, AuthorityConfig, BaselineData, MTFSResult, SavingsProposal, YearProfile5 } from '../types/financial';
import { runCalculations } from '../engine/calculations';

const PAGE_MARGIN = 36;
const PAGE_BOTTOM = 42;
const MODEL_VERSION = 'MTFS DSS v7.0';

function fmtK(v: number) {
  const abs = Math.abs(v);
  return `£${abs >= 1000 ? `${(abs / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

function fmtChartValue(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  return `${sign}£${abs >= 1000 ? `${(abs / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

function fmtPct(v: number, dp = 1) {
  return `${v.toFixed(dp)}%`;
}

function y1(v: YearProfile5 | number): number {
  if (typeof v === 'number') return v;
  return Number(v?.y1 ?? 0);
}

function boolText(v: boolean) {
  return v ? 'Yes' : 'No';
}

function metricText(value: unknown): string {
  if (typeof value === 'number') return fmtK(value);
  if (typeof value === 'boolean') return boolText(value);
  if (typeof value === 'string') return value || '—';
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) {
      return value.map((item) => (typeof item === 'number' ? fmtK(item) : String(item))).join(' | ');
    }
    return `Array(${value.length})`;
  }
  return String(value);
}

function flattenPrimitiveObject(
  value: unknown,
  prefix: string,
  rows: Array<[string, string]>
) {
  if (!value || typeof value !== 'object') {
    if (prefix) rows.push([prefix, metricText(value)]);
    return;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) {
      rows.push([prefix, metricText(value)]);
      return;
    }
    rows.push([prefix, `Array(${value.length})`]);
    return;
  }

  Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) {
        if (v.length === 0) {
          rows.push([key, '[]']);
        } else if (v.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) {
          rows.push([key, metricText(v)]);
        } else {
          rows.push([`${key}.count`, String(v.length)]);
        }
      } else {
        flattenPrimitiveObject(v, key, rows);
      }
      return;
    }
    rows.push([key, metricText(v)]);
  });
}

function sanitize(input: string) {
  return (input || 'authority').replace(/[^a-zA-Z0-9]+/g, '_');
}

function resolveReportDate(authorityConfig: AuthorityConfig, fallback: Date): Date {
  if (!authorityConfig.reportDate) return fallback;
  const parsed = new Date(authorityConfig.reportDate);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
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

    // Explicit financial value label for governance readability.
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    const labelY = Math.max(chartTop + 8, y0 - 3);
    doc.text(fmtChartValue(v), x + barW / 2, labelY, { align: 'center' });
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
      councilTaxIncrease: y1(assumptions.funding.councilTaxIncrease) + 0.5,
      businessRatesGrowth: y1(assumptions.funding.businessRatesGrowth) + 0.6,
      grantVariation: y1(assumptions.funding.grantVariation) + 0.8,
    },
    expenditure: {
      ...assumptions.expenditure,
      payAward: Math.max(0, y1(assumptions.expenditure.payAward) - 0.6),
      nonPayInflation: Math.max(0, y1(assumptions.expenditure.nonPayInflation) - 0.6),
      savingsDeliveryRisk: Math.min(100, y1(assumptions.expenditure.savingsDeliveryRisk) + 8),
    },
  };
  const stress: Assumptions = {
    ...assumptions,
    funding: {
      ...assumptions.funding,
      councilTaxIncrease: Math.max(0, y1(assumptions.funding.councilTaxIncrease) - 0.75),
      businessRatesGrowth: y1(assumptions.funding.businessRatesGrowth) - 1.0,
      grantVariation: y1(assumptions.funding.grantVariation) - 1.0,
    },
    expenditure: {
      ...assumptions.expenditure,
      payAward: y1(assumptions.expenditure.payAward) + 1.0,
      nonPayInflation: y1(assumptions.expenditure.nonPayInflation) + 1.0,
      ascDemandGrowth: y1(assumptions.expenditure.ascDemandGrowth) + 1.5,
      savingsDeliveryRisk: Math.max(30, y1(assumptions.expenditure.savingsDeliveryRisk) - 12),
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

interface PremiumTableOptions {
  startY: number;
  head?: string[][];
  body: Array<Array<string | number>>;
  columnStyles?: Record<string, Partial<Styles>>;
  fontSize?: number;
}

function renderPremiumTable(doc: jsPDF, options: PremiumTableOptions) {
  autoTable(doc, {
    startY: options.startY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    head: options.head,
    body: options.body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: options.fontSize ?? 8.6,
      cellPadding: 4.1,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.6,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: 'bold',
      lineColor: [15, 23, 42],
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: options.columnStyles,
  });
  return finalY(doc, options.startY);
}

interface KpiCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'amber' | 'red' | 'green';
}

function drawKpiCards(doc: jsPDF, y: number, cards: KpiCard[]) {
  const width = doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2;
  const gap = 10;
  const cardW = (width - gap * 3) / 4;
  const cardH = 76;
  const palette: Record<KpiCard['tone'], { fill: [number, number, number]; stroke: [number, number, number]; value: [number, number, number] }> = {
    blue: { fill: [239, 246, 255], stroke: [147, 197, 253], value: [30, 64, 175] },
    amber: { fill: [255, 247, 237], stroke: [253, 186, 116], value: [154, 52, 18] },
    red: { fill: [254, 242, 242], stroke: [252, 165, 165], value: [153, 27, 27] },
    green: { fill: [240, 253, 244], stroke: [134, 239, 172], value: [21, 128, 61] },
  };

  cards.slice(0, 4).forEach((card, idx) => {
    const x = PAGE_MARGIN + idx * (cardW + gap);
    const c = palette[card.tone];
    doc.setFillColor(c.fill[0], c.fill[1], c.fill[2]);
    doc.setDrawColor(c.stroke[0], c.stroke[1], c.stroke[2]);
    doc.roundedRect(x, y, cardW, cardH, 8, 8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(card.label, x + 10, y + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(c.value[0], c.value[1], c.value[2]);
    doc.text(card.value, x + 10, y + 37);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const hintLines = doc.splitTextToSize(card.hint, cardW - 20);
    doc.text(hintLines, x + 10, y + 53);
  });
  return y + cardH + 12;
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
  const reportDate = resolveReportDate(authorityConfig, now);
  const scenarioRows = buildComparatorScenarios(result, assumptions, baseline, savingsProposals);
  const baseScenario = scenarioRows[0].result;
  const reportPeriod = authorityConfig.reportingPeriod
    || `${now.getFullYear()}/${String(now.getFullYear() + 1).slice(2)} - ${now.getFullYear() + 4}/${String(now.getFullYear() + 5).slice(2)}`;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 158, 'F');
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 158, pageW, 8, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('FORMAL COMMITTEE PAPER', PAGE_MARGIN, 34);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('MTFS Committee Report', PAGE_MARGIN, 68);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text('Governance-grade financial strategy, risk and assurance pack', PAGE_MARGIN, 88);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`${authorityConfig.authorityName || 'Local Authority'} | ${reportPeriod}`, PAGE_MARGIN, 108);
  doc.text(`Report date: ${reportDate.toLocaleDateString('en-GB')}`, pageW - PAGE_MARGIN, 56, { align: 'right' });
  doc.text(`Generated: ${now.toLocaleString('en-GB')}`, pageW - PAGE_MARGIN, 72, { align: 'right' });
  doc.text(`Model: ${MODEL_VERSION}`, pageW - PAGE_MARGIN, 88, { align: 'right' });

  doc.setTextColor(15, 23, 42);
  let y = 188;
  y = writeSectionTitle(doc, y, 'Authority Context');
  y = renderPremiumTable(doc, {
    startY: y,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 190 } },
    body: [
      ['Authority', authorityConfig.authorityName || 'Local Authority'],
      ['Reporting Period', reportPeriod],
      ['Section 151 Officer', authorityConfig.section151Officer || 'Not specified'],
      ['Chief Executive', authorityConfig.chiefExecutive || 'Not specified'],
      ['Report Date', reportDate.toLocaleDateString('en-GB')],
      ['Generated Timestamp', now.toLocaleString('en-GB')],
    ],
  }) + 12;

  y = writeSectionTitle(doc, y, 'Executive Summary');
  const summary = result.totalGap <= 0
    ? `Model outputs indicate a balanced MTFS across the planning period. Overall risk is ${result.overallRiskScore.toFixed(0)}/100 (${riskBand(result.overallRiskScore)}). Delivery assurance and reserves discipline should now be the focus.`
    : `Model outputs indicate a five-year gap of ${fmtK(result.totalGap)} and structural pressure of ${fmtK(result.totalStructuralGap)}. Corrective recurring action of ${fmtK(result.requiredSavingsToBalance)} per annum is required to restore sustainable balance.`;
  y = writeParagraph(doc, y, summary);
  y += 4;
  y = writeParagraph(
    doc,
    y,
    `Statutory position: s.114 trigger status is ${result.s114Triggered ? 'at risk' : 'not currently triggered'}. Reserves are ${result.yearReservesExhausted ? `projected exhausted by ${result.yearReservesExhausted}` : 'not exhausted in-period'}.`
  );
  y += 6;
  y = writeCallout(
    doc,
    y,
    'Decision Required',
    result.totalGap <= 0
      ? 'Approve monitoring cadence, reserves protection controls, and clear trigger thresholds for intervention.'
      : `Approve a recurring mitigation package equivalent to ${fmtK(result.requiredSavingsToBalance)} per annum, with a contingency trigger if delivery underperforms.`,
    result.totalGap <= 0 ? 'blue' : 'amber'
  );

  y = ensureSpace(doc, y, 100);
  y = drawKpiCards(doc, y, [
    {
      label: 'Five-Year Gap',
      value: fmtK(result.totalGap),
      hint: 'Cumulative net budget pressure over the horizon.',
      tone: result.totalGap > 0 ? 'red' : 'green',
    },
    {
      label: 'Structural Gap',
      value: fmtK(result.totalStructuralGap),
      hint: 'Recurring imbalance after removing one-off effects.',
      tone: result.totalStructuralGap > 0 ? 'amber' : 'green',
    },
    {
      label: 'Overall Risk',
      value: `${result.overallRiskScore.toFixed(0)}/100`,
      hint: `Risk band: ${riskBand(result.overallRiskScore)}`,
      tone: result.overallRiskScore >= 60 ? 'red' : result.overallRiskScore >= 40 ? 'amber' : 'blue',
    },
    {
      label: 'Y5 Reserves Ratio',
      value: fmtPct(result.reservesToNetBudget, 1),
      hint: 'Closing reserves as % of Y5 funding.',
      tone: result.reservesToNetBudget < 5 ? 'red' : 'blue',
    },
  ]);

  y = ensureSpace(doc, y, 220);
  y = writeSectionTitle(doc, y, 'Decision Dashboard');
  y = renderPremiumTable(doc, {
    startY: y,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 220 } },
    body: [
      ['5-Year Cumulative Gap', fmtK(result.totalGap)],
      ['Structural Gap', fmtK(result.totalStructuralGap)],
      ['Required Annual Savings', fmtK(result.requiredSavingsToBalance)],
      ['Council Tax Equivalent (Year 1)', fmtPct(result.councilTaxEquivalent, 2)],
      ['Overall Risk Score', `${result.overallRiskScore.toFixed(0)}/100 (${riskBand(result.overallRiskScore)})`],
      ['Reserves-to-Budget (Year 5)', fmtPct(result.reservesToNetBudget, 1)],
      ['Year Reserves Exhausted', result.yearReservesExhausted ?? 'Not exhausted in period'],
      ['s.114 Trigger Assessment', result.s114Triggered ? `At risk (${result.s114Reasons.join('; ') || 'see risk section'})` : 'No immediate trigger'],
    ],
  }) + 8;

  y = ensureSpace(doc, y, 124);
  y = drawCompactTrendBars(
    doc,
    y,
    'Yearly Raw Gap Trend',
    result.years.map((r) => `Y${r.year}`),
    result.years.map((r) => r.rawGap),
    [239, 68, 68]
  );
  y += 6;
  y = drawCompactTrendBars(
    doc,
    y,
    'Closing Reserves Trend',
    result.years.map((r) => `Y${r.year}`),
    result.years.map((r) => r.totalClosingReserves),
    [59, 130, 246]
  );
  y += 8;

  y = ensureSpace(doc, y, 220);
  y = writeSectionTitle(doc, y, 'Scenario Comparator (Base / Optimistic / Stress)');
  y = renderPremiumTable(doc, {
    startY: y,
    head: [['Scenario', '5-Year Gap', 'Delta vs Base', 'Risk Score', 'Y5 Reserves', 'Confidence Note']],
    body: scenarioRows.map((s) => [
      s.name,
      fmtK(s.result.totalGap),
      s.name === 'Base' ? '-' : fmtK(s.result.totalGap - baseScenario.totalGap),
      `${s.result.overallRiskScore.toFixed(0)}/100`,
      fmtK(s.result.years[4]?.totalClosingReserves ?? 0),
      `${s.confidence}: ${s.note}`,
    ]),
    fontSize: 8.4,
  }) + 10;

  y = ensureSpace(doc, y, 270);
  y = writeSectionTitle(doc, y, 'Year-by-Year Financial Position (GBP 000s)');
  y = renderPremiumTable(doc, {
    startY: y,
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
    fontSize: 8.1,
  }) + 10;

  y = ensureSpace(doc, y, 220);
  y = writeSectionTitle(doc, y, 'Assumptions and Programme Inputs');
  y = renderPremiumTable(doc, {
    startY: y,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 220 } },
    body: [
      ['Council Tax Increase', fmtPct(y1(assumptions.funding.councilTaxIncrease), 2)],
      ['Business Rates Growth', fmtPct(y1(assumptions.funding.businessRatesGrowth), 2)],
      ['Grant Variation', fmtPct(y1(assumptions.funding.grantVariation), 2)],
      ['Fees & Charges Growth', fmtPct(y1(assumptions.funding.feesChargesElasticity), 2)],
      ['Pay Award', fmtPct(y1(assumptions.expenditure.payAward), 2)],
      ['Non-Pay Inflation', fmtPct(y1(assumptions.expenditure.nonPayInflation), 2)],
      ['ASC Demand Growth', fmtPct(y1(assumptions.expenditure.ascDemandGrowth), 2)],
      ['CSC Demand Growth', fmtPct(y1(assumptions.expenditure.cscDemandGrowth), 2)],
      ['Savings Delivery Risk', fmtPct(y1(assumptions.expenditure.savingsDeliveryRisk), 1)],
      ['Savings Proposals', String(savingsProposals.length)],
      ['Custom Service Lines', String(baseline.customServiceLines.length)],
      ['Named Reserves', String(baseline.namedReserves.length)],
    ],
  }) + 10;

  y = ensureSpace(doc, y, 220);
  y = writeSectionTitle(doc, y, 'Risk Factors');
  y = renderPremiumTable(doc, {
    startY: y,
    head: [['Risk Factor', 'Score', 'Level', 'Weight', 'Description']],
    body: result.riskFactors.map((f) => [
      f.name,
      `${f.score}/100`,
      f.level.toUpperCase(),
      fmtPct(f.weight * 100, 0),
      f.description,
    ]),
    fontSize: 8.3,
  }) + 8;

  y = ensureSpace(doc, y, 190);
  y = writeSectionTitle(doc, y, 'Legal and Compliance Mapping');
  y = renderPremiumTable(doc, {
    startY: y,
    head: [['Framework Reference', 'Check', 'Current Position']],
    body: [
      ['Local Government Act 2003 s25', 'Robustness of estimates', result.totalGap <= 0 ? 'Balanced central case modelled' : `Gap remains (${fmtK(result.totalGap)})`],
      ['Local Government Act 2003 s25', 'Adequacy of reserves', result.reservesToNetBudget >= 5 ? `Within reference range (${fmtPct(result.reservesToNetBudget, 1)})` : `Below reference (${fmtPct(result.reservesToNetBudget, 1)})`],
      ['Section 114 risk trigger', 'Statutory distress indicators', result.s114Triggered ? `At risk (${result.s114Reasons.join('; ') || 'see narrative'})` : 'No immediate trigger under current assumptions'],
      ['CIPFA Prudential Code', 'Authorised/Operational boundary tests', result.treasuryBreaches.length > 0 ? result.treasuryBreaches.join('; ') : 'No treasury indicator breach flagged'],
    ],
    fontSize: 8.2,
  }) + 10;

  const topInsights = result.insights.slice(0, 8);
  if (topInsights.length > 0) {
    y = ensureSpace(doc, y, 130);
    y = writeSectionTitle(doc, y, 'Key Insights and Recommended Actions');
    topInsights.forEach((insight, idx) => {
      y = ensureSpace(doc, y, 44);
      y = writeParagraph(
        doc,
        y,
        `${idx + 1}. [${insight.type.toUpperCase()}] ${insight.title}: ${insight.body}${insight.action ? ` Action: ${insight.action}` : ''}`,
        8.8
      );
      y += 1;
    });
  }

  doc.addPage();
  let sy = PAGE_MARGIN;
  sy = writeSectionTitle(doc, sy, 'Section 151 Statutory Assurance Statement');
  const assurance = result.totalGap <= 0 && !result.yearReservesExhausted && result.reservesToNetBudget >= 5
    ? 'Positive assurance can be provided, subject to normal quarterly monitoring and delivery controls.'
    : 'Qualified assurance is advised: the authority should consider further mitigations before approval.';
  sy = writeCallout(
    doc,
    sy,
    'Formal Assurance Position',
    assurance,
    result.totalGap <= 0 && !result.yearReservesExhausted ? 'blue' : 'amber'
  );
  sy = writeParagraph(
    doc,
    sy,
    `In accordance with Section 25 of the Local Government Act 2003, the Section 151 Officer (${authorityConfig.section151Officer || 'Not specified'}) has reviewed estimate robustness and reserve adequacy against the current MTFS assumptions and model outputs.`,
    9
  );
  sy += 8;
  const qualificationPoints: string[] = [];
  if (result.totalGap > 0) qualificationPoints.push(`Budget gap remains at ${fmtK(result.totalGap)} over five years.`);
  if (result.yearReservesExhausted) qualificationPoints.push(`Reserves are projected to be exhausted by ${result.yearReservesExhausted}.`);
  if (result.reservesToNetBudget < 5) qualificationPoints.push(`Reserves-to-budget ratio (${fmtPct(result.reservesToNetBudget, 1)}) is below prudent reference level.`);
  if (result.structuralDeficitFlag) qualificationPoints.push('Structural deficit remains and requires recurring mitigations.');
  if (qualificationPoints.length === 0) qualificationPoints.push('No material qualification points flagged under current assumptions.');
  renderPremiumTable(doc, {
    startY: sy,
    head: [['Qualification Checklist']],
    body: qualificationPoints.map((point) => [point]),
    fontSize: 8.7,
  });

  doc.addPage();
  let ay = PAGE_MARGIN;
  ay = writeSectionTitle(doc, ay, 'Appendix: Methodology, Glossary and Data Notes');
  ay = writeParagraph(doc, ay, 'Methodology summary: deterministic, driver-based forecasting with explicit treatment of recurring vs one-off measures and reserve adequacy checks.', 9);
  ay += 4;
  ay = renderPremiumTable(doc, {
    startY: ay,
    head: [['Glossary Term', 'Definition']],
    body: [
      ['Structural gap', 'Recurring shortfall after removing one-off items.'],
      ['Council tax equivalent', 'Year 1 shortfall expressed as % of Year 1 council tax income.'],
      ['Reserves-to-budget ratio', 'Year 5 closing reserves as a percentage of Year 5 funding.'],
      ['s.114 trigger indicator', 'Composite warning based on reserve exhaustion, persistent deficits and risk score.'],
    ],
    fontSize: 8.2,
  }) + 8;
  ay = ensureSpace(doc, ay, 180);
  ay = renderPremiumTable(doc, {
    startY: ay,
    head: [['Data Definition', 'Current Value / Source']],
    body: [
      ['Assumption set', `${MODEL_VERSION} / Report Date ${reportDate.toLocaleDateString('en-GB')} / Generated ${now.toLocaleString('en-GB')}`],
      ['Savings proposals', `${savingsProposals.length} lines`],
      ['Named reserves', `${baseline.namedReserves.length} lines`],
      ['Custom service lines', `${baseline.customServiceLines.length} lines`],
      ['Assurance wording', assurance],
      ['Insight excerpt', result.insights.slice(0, 2).map((i) => i.title).join(' | ') || 'No flagged insight excerpt'],
    ],
    fontSize: 8.2,
  }) + 8;
  writeParagraph(
    doc,
    ay,
    'Limitations and assurance: model outputs support decision-making and do not replace Section 151 professional judgement. Calibration against authority accounts and treasury strategy is required before statutory sign-off.',
    8.8
  );

  doc.addPage();
  let my = PAGE_MARGIN;
  my = writeSectionTitle(doc, my, 'Appendix: Comprehensive Metrics Pack');
  my = writeParagraph(
    doc,
    my,
    'This appendix includes the full model metrics set used in the web app, including technical year fields, baseline configuration, and register-level schedules.',
    9
  );
  my += 4;

  my = ensureSpace(doc, my, 220);
  my = writeSectionTitle(doc, my, 'All MTFS Output Metrics (Top-Level)');
  my = renderPremiumTable(doc, {
    startY: my,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 240 } },
    body: [
      ['totalGap', fmtK(result.totalGap)],
      ['totalStructuralGap', fmtK(result.totalStructuralGap)],
      ['totalCumulativeGap', fmtK(result.totalCumulativeGap)],
      ['requiredSavingsToBalance', fmtK(result.requiredSavingsToBalance)],
      ['councilTaxEquivalent', fmtPct(result.councilTaxEquivalent, 2)],
      ['reservesToNetBudget', fmtPct(result.reservesToNetBudget, 1)],
      ['savingsAsBudgetPct', fmtPct(result.savingsAsBudgetPct, 1)],
      ['overallRiskScore', `${result.overallRiskScore.toFixed(0)}/100`],
      ['fundingVolatilityScore', `${result.fundingVolatilityScore.toFixed(0)}/100`],
      ['structuralDeficitFlag', boolText(result.structuralDeficitFlag)],
      ['yearReservesExhausted', result.yearReservesExhausted ?? 'Not exhausted in period'],
      ['recommendedMinimumReserves', fmtK(result.recommendedMinimumReserves)],
      ['effectiveMinimumReservesThreshold', fmtK(result.effectiveMinimumReservesThreshold)],
      ['grantsExpiringInYears', result.grantsExpiringInYears.length > 0 ? result.grantsExpiringInYears.join(', ') : 'None'],
      ['s114Triggered', boolText(result.s114Triggered)],
      ['s114Reasons', result.s114Reasons.length > 0 ? result.s114Reasons.join('; ') : 'None'],
      ['treasuryBreaches', result.treasuryBreaches.length > 0 ? result.treasuryBreaches.join('; ') : 'None'],
      ['mrpCharges', result.mrpCharges.map((v, i) => `Y${i + 1}:${fmtK(v)}`).join(' | ')],
    ],
    fontSize: 8.1,
  }) + 8;

  my = ensureSpace(doc, my, 260);
  my = writeSectionTitle(doc, my, 'YearResult Technical Metrics (All Core Fields)');
  const yearSeries = result.years.slice(0, 5);
  const technicalRows: Array<Array<string>> = [
    ['totalFunding', ...yearSeries.map((yRow) => fmtK(yRow.totalFunding))],
    ['councilTax', ...yearSeries.map((yRow) => fmtK(yRow.councilTax))],
    ['businessRates', ...yearSeries.map((yRow) => fmtK(yRow.businessRates))],
    ['coreGrants', ...yearSeries.map((yRow) => fmtK(yRow.coreGrants))],
    ['feesAndCharges', ...yearSeries.map((yRow) => fmtK(yRow.feesAndCharges))],
    ['payBase', ...yearSeries.map((yRow) => fmtK(yRow.payBase))],
    ['payInflationImpact', ...yearSeries.map((yRow) => fmtK(yRow.payInflationImpact))],
    ['nonPayBase', ...yearSeries.map((yRow) => fmtK(yRow.nonPayBase))],
    ['nonPayInflationImpact', ...yearSeries.map((yRow) => fmtK(yRow.nonPayInflationImpact))],
    ['ascPressure', ...yearSeries.map((yRow) => fmtK(yRow.ascPressure))],
    ['cscPressure', ...yearSeries.map((yRow) => fmtK(yRow.cscPressure))],
    ['otherServiceExp', ...yearSeries.map((yRow) => fmtK(yRow.otherServiceExp))],
    ['capitalFinancingCost', ...yearSeries.map((yRow) => fmtK(yRow.capitalFinancingCost))],
    ['reservesRebuildContribution', ...yearSeries.map((yRow) => fmtK(yRow.reservesRebuildContribution))],
    ['contractIndexationCost', ...yearSeries.map((yRow) => fmtK(yRow.contractIndexationCost))],
    ['investToSaveNetImpact', ...yearSeries.map((yRow) => fmtK(yRow.investToSaveNetImpact))],
    ['incomeGenerationIncome', ...yearSeries.map((yRow) => fmtK(yRow.incomeGenerationIncome))],
    ['mrpCharge', ...yearSeries.map((yRow) => fmtK(yRow.mrpCharge))],
    ['customLinesTotalExpenditure', ...yearSeries.map((yRow) => fmtK(yRow.customLinesTotalExpenditure))],
    ['grossExpenditureBeforeSavings', ...yearSeries.map((yRow) => fmtK(yRow.grossExpenditureBeforeSavings))],
    ['deliveredSavings', ...yearSeries.map((yRow) => fmtK(yRow.deliveredSavings))],
    ['recurringDeliveredSavings', ...yearSeries.map((yRow) => fmtK(yRow.recurringDeliveredSavings))],
    ['oneOffDeliveredSavings', ...yearSeries.map((yRow) => fmtK(yRow.oneOffDeliveredSavings))],
    ['totalExpenditure', ...yearSeries.map((yRow) => fmtK(yRow.totalExpenditure))],
    ['rawGap', ...yearSeries.map((yRow) => fmtK(yRow.rawGap))],
    ['structuralGap', ...yearSeries.map((yRow) => fmtK(yRow.structuralGap))],
    ['reservesDrawdown', ...yearSeries.map((yRow) => fmtK(yRow.reservesDrawdown))],
    ['netGap', ...yearSeries.map((yRow) => fmtK(yRow.netGap))],
    ['generalFundOpeningBalance', ...yearSeries.map((yRow) => fmtK(yRow.generalFundOpeningBalance))],
    ['earmarkedOpeningBalance', ...yearSeries.map((yRow) => fmtK(yRow.earmarkedOpeningBalance))],
    ['totalOpeningReserves', ...yearSeries.map((yRow) => fmtK(yRow.totalOpeningReserves))],
    ['generalFundClosingBalance', ...yearSeries.map((yRow) => fmtK(yRow.generalFundClosingBalance))],
    ['earmarkedClosingBalance', ...yearSeries.map((yRow) => fmtK(yRow.earmarkedClosingBalance))],
    ['totalClosingReserves', ...yearSeries.map((yRow) => fmtK(yRow.totalClosingReserves))],
    ['reservesBelowThreshold', ...yearSeries.map((yRow) => boolText(yRow.reservesBelowThreshold))],
    ['reservesExhausted', ...yearSeries.map((yRow) => boolText(yRow.reservesExhausted))],
    ['structuralDeficit', ...yearSeries.map((yRow) => boolText(yRow.structuralDeficit))],
    ['overReliantOnReserves', ...yearSeries.map((yRow) => boolText(yRow.overReliantOnReserves))],
    ['unrealisticSavings', ...yearSeries.map((yRow) => boolText(yRow.unrealisticSavings))],
  ];
  my = renderPremiumTable(doc, {
    startY: my,
    head: [['Metric', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5']],
    body: technicalRows,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 150 } },
    fontSize: 7.5,
  }) + 8;

  my = ensureSpace(doc, my, 180);
  my = writeSectionTitle(doc, my, 'Assumptions (Full)');
  const assumptionRows: Array<[string, string]> = [];
  flattenPrimitiveObject(assumptions, '', assumptionRows);
  my = renderPremiumTable(doc, {
    startY: my,
    body: assumptionRows,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 230 } },
    fontSize: 8.0,
  }) + 8;

  my = ensureSpace(doc, my, 200);
  my = writeSectionTitle(doc, my, 'Baseline Configuration (Flattened)');
  const baselineRows: Array<[string, string]> = [];
  flattenPrimitiveObject(baseline, '', baselineRows);
  my = renderPremiumTable(doc, {
    startY: my,
    body: baselineRows,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 250 } },
    fontSize: 7.8,
  }) + 8;

  if (baseline.customServiceLines.length > 0) {
    my = ensureSpace(doc, my, 180);
    my = writeSectionTitle(doc, my, 'Custom Service Line Register');
    my = renderPremiumTable(doc, {
      startY: my,
      head: [['Name', 'Category', 'Base', 'Inflation Driver', 'Manual %', 'Demand %', 'Recurring', 'Notes']],
      body: baseline.customServiceLines.map((line) => [
        line.name || 'Unnamed',
        line.category,
        fmtK(line.baseValue),
        line.inflationDriver,
        fmtPct(line.manualInflationRate, 2),
        fmtPct(line.demandGrowthRate, 2),
        boolText(line.isRecurring),
        line.notes || '-',
      ]),
      fontSize: 7.7,
    }) + 8;
  }

  if (baseline.namedReserves.length > 0) {
    my = ensureSpace(doc, my, 200);
    my = writeSectionTitle(doc, my, 'Named Reserves Register');
    my = renderPremiumTable(doc, {
      startY: my,
      head: [['Reserve', 'Type', 'Opening', 'Min', 'Contrib Y1..Y5', 'Draw Y1..Y5', 'Purpose']],
      body: baseline.namedReserves.map((r) => [
        r.name || 'Unnamed',
        (r.category ?? (r.isEarmarked ? 'service_specific' : 'general_fund')).replaceAll('_', ' '),
        fmtK(r.openingBalance),
        fmtK(r.minimumBalance),
        r.plannedContributions.map((v) => fmtK(v)).join(' | '),
        r.plannedDrawdowns.map((v) => fmtK(v)).join(' | '),
        r.purpose || '-',
      ]),
      fontSize: 7.7,
    }) + 8;
  }

  my = ensureSpace(doc, my, 220);
  my = writeSectionTitle(doc, my, 'Savings Programme Register and Delivery');
  const savingsRows = savingsProposals.map((proposal) => {
    const deliveries = result.years.map((yr) =>
      yr.savingsProposalResults.find((p) => p.id === proposal.id)?.deliveredValue ?? 0
    );
    const totalDelivered = deliveries.reduce((sum, v) => sum + v, 0);
    return [
      proposal.name || 'Unnamed',
      proposal.category,
      proposal.ragStatus.toUpperCase(),
      proposal.responsibleOfficer || '-',
      fmtK(proposal.grossValue),
      fmtPct(proposal.achievementRate, 1),
      `Y${proposal.deliveryYear}`,
      boolText(proposal.isRecurring),
      ...deliveries.map((v) => fmtK(v)),
      fmtK(totalDelivered),
    ];
  });
  my = renderPremiumTable(doc, {
    startY: my,
    head: [[
      'Proposal', 'Category', 'RAG', 'Owner', 'Gross',
      'Achv %', 'Start', 'Recurring', 'Deliv Y1', 'Deliv Y2', 'Deliv Y3', 'Deliv Y4', 'Deliv Y5', 'Total Delivered',
    ]],
    body: savingsRows.length > 0 ? savingsRows : [[
      'No savings proposals configured', '-', '-', '-', '-',
      '-', '-', '-', '-', '-', '-', '-', '-', '-',
    ]],
    fontSize: 7.3,
  }) + 8;

  my = ensureSpace(doc, my, 180);
  my = writeSectionTitle(doc, my, 'Insights Register (Complete)');
  renderPremiumTable(doc, {
    startY: my,
    head: [['Type', 'Title', 'Body', 'Action']],
    body: result.insights.length > 0
      ? result.insights.map((insight) => [
        insight.type.toUpperCase(),
        insight.title,
        insight.body,
        insight.action ?? '-',
      ])
      : [['INFO', 'No active insight', 'No insight messages were generated.', '-']],
    fontSize: 8.0,
  });

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
  const reportDate = resolveReportDate(authorityConfig, now);
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
  doc.text(`${authorityConfig.authorityName} · ${authorityConfig.reportingPeriod} · ${reportDate.toLocaleDateString('en-GB')}`, PAGE_MARGIN, 68);

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

export function exportCfoDemoBriefPdf(
  result: MTFSResult,
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[],
  authorityConfig: AuthorityConfig
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const now = new Date();
  const reportDate = resolveReportDate(authorityConfig, now);
  const scenarioRows = buildComparatorScenarios(result, assumptions, baseline, savingsProposals);
  const topRisks = [...result.riskFactors].sort((a, b) => b.score - a.score).slice(0, 3);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 118, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text('CFO MTFS Leadership Brief', PAGE_MARGIN, 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${authorityConfig.authorityName} · ${authorityConfig.reportingPeriod} · ${reportDate.toLocaleDateString('en-GB')}`, PAGE_MARGIN, 76);
  doc.text('10-minute demo pack: position, drivers, options, assurance and export readiness', PAGE_MARGIN, 94);
  doc.setTextColor(15, 23, 42);

  let y = 148;
  y = writeSectionTitle(doc, y, 'Executive Position');
  y = writeParagraph(
    doc,
    y,
    result.totalGap <= 0
      ? `The current MTFS is modelled as balanced over five years, with Year 5 reserves of ${fmtK(result.years[4]?.totalClosingReserves ?? 0)} and risk score ${result.overallRiskScore.toFixed(0)}/100.`
      : `The current MTFS shows a ${fmtK(result.totalGap)} five-year gap and a recurring structural gap of ${fmtK(result.totalStructuralGap)}. Average annual action required is ${fmtK(result.requiredSavingsToBalance)}.`
  );
  y += 8;
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 9.2, cellPadding: 4.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    head: [['Metric', 'Position', 'CFO readout']],
    body: [
      ['5-year gap', fmtK(result.totalGap), result.totalGap <= 0 ? 'Balanced under current assumptions.' : 'Requires recurring action and delivery grip.'],
      ['Annual action', fmtK(result.requiredSavingsToBalance), 'Average annual mitigation needed to remove positive gaps.'],
      ['Year 5 reserves', fmtK(result.years[4]?.totalClosingReserves ?? 0), result.yearReservesExhausted ? `Exhausted by ${result.yearReservesExhausted}.` : `${result.reservesToNetBudget.toFixed(1)}% of net funding.`],
      ['Risk score', `${result.overallRiskScore.toFixed(0)}/100`, `${riskBand(result.overallRiskScore)} risk band.`],
      ['Savings programme', `${savingsProposals.length} lines`, `${fmtK(result.years.reduce((sum, yr) => sum + yr.deliveredSavings, 0))} risk-adjusted delivery modelled.`],
    ],
  });
  y = finalY(doc, y) + 10;

  y = ensureSpace(doc, y, 160);
  y = writeSectionTitle(doc, y, 'Scenario Decision View');
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.4, cellPadding: 3.8 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    head: [['Option', 'Gap', 'Annual action', 'Y5 reserves', 'Risk', 'Narrative']],
    body: scenarioRows.map((scenario) => [
      scenario.name,
      fmtK(scenario.result.totalGap),
      fmtK(scenario.result.requiredSavingsToBalance),
      fmtK(scenario.result.years[4]?.totalClosingReserves ?? 0),
      `${scenario.result.overallRiskScore.toFixed(0)}/100`,
      scenario.note,
    ]),
  });
  y = finalY(doc, y) + 10;

  y = ensureSpace(doc, y, 140);
  y = writeSectionTitle(doc, y, 'Top Finance Leadership Risks');
  topRisks.forEach((risk, idx) => {
    y = writeParagraph(doc, y, `${idx + 1}. ${risk.name}: ${risk.score}/100 (${risk.level.toUpperCase()}) - ${risk.description}`, 8.8);
  });
  y += 8;
  y = writeCallout(
    doc,
    y,
    'Recommended Close',
    result.totalGap <= 0
      ? 'Ask leadership to endorse the current plan as the working base, with explicit delivery tracking and reserve monitoring.'
      : 'Ask leadership to endorse the recommended scenario as the working base, commission recurring savings delivery assurance, and maintain a funding shock contingency.',
    result.totalGap <= 0 ? 'blue' : 'amber'
  );

  y = ensureSpace(doc, y + 8, 110);
  y = writeSectionTitle(doc, y, 'Assurance Evidence');
  [
    `Assumptions use five-year profiles; Year 1 reference values include pay ${fmtPct(y1(assumptions.expenditure.payAward))}, non-pay ${fmtPct(y1(assumptions.expenditure.nonPayInflation))}, grant variation ${fmtPct(y1(assumptions.funding.grantVariation))}.`,
    'Calculation trace links visible KPIs to funding, expenditure, savings, reserves and structural gap outputs.',
    'Governance exports are decision-support evidence and do not replace Section 151 professional judgement.',
  ].forEach((line) => {
    y = writeParagraph(doc, y, line, 8.8);
  });

  addFooter(doc, authorityConfig.authorityName, now);
  doc.save(`MTFS_CFO_Brief_${sanitize(authorityConfig.authorityName)}_${now.toISOString().slice(0, 10)}.pdf`);
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
  const reportDate = resolveReportDate(authorityConfig, now);
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
  doc.text(`${authorityConfig.authorityName} · ${authorityConfig.reportingPeriod} · ${reportDate.toLocaleDateString('en-GB')}`, PAGE_MARGIN, 84);
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
      ['Council Tax Increase', `${y1(assumptions.funding.councilTaxIncrease).toFixed(2)}%`, 'Core recurrent funding uplift.'],
      ['Business Rates Growth', `${y1(assumptions.funding.businessRatesGrowth).toFixed(2)}%`, 'Locally retained business-rate trajectory.'],
      ['Pay Award', `${y1(assumptions.expenditure.payAward).toFixed(2)}%`, 'Main workforce cost pressure.'],
      ['ASC Demand Growth', `${y1(assumptions.expenditure.ascDemandGrowth).toFixed(2)}%`, 'Demand-led spending growth in social care.'],
      ['Savings Delivery Risk', `${y1(assumptions.expenditure.savingsDeliveryRisk).toFixed(1)}%`, 'Programme delivery haircut in forecasts.'],
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
      ['Report date', reportDate.toLocaleDateString('en-GB')],
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
