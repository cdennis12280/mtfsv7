import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Assumptions, AuthorityConfig, MTFSResult, RiskFactor } from '../types/financial';

export interface DecisionPackPdfOption {
  label: string;
  name: string;
  description: string;
  type: 'base' | 'optimistic' | 'pessimistic' | 'custom' | 'current';
  assumptions: Assumptions;
  result: MTFSResult;
}

interface DecisionPackPdfInput {
  authorityConfig: AuthorityConfig;
  options: DecisionPackPdfOption[];
}

const PAGE_MARGIN = 36;
const PAGE_BOTTOM_MARGIN = 42;

function fmtK(v: number) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  return `${sign}£${abs >= 1000 ? `${(abs / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m` : `${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`}`;
}

function riskBand(score: number) {
  if (score >= 75) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function sanitizeFileToken(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'authority';
}

function getAutoTableFinalY(doc: jsPDF, fallbackY: number) {
  const maybe = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  return maybe.lastAutoTable?.finalY ?? fallbackY;
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed <= pageHeight - PAGE_BOTTOM_MARGIN) return y;
  doc.addPage();
  return PAGE_MARGIN;
}

function writeParagraph(doc: jsPDF, text: string, y: number, size = 10) {
  const width = doc.internal.pageSize.getWidth() - (PAGE_MARGIN * 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, PAGE_MARGIN, y);
  return y + (lines.length * (size + 2));
}

function drawSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(16, 24, 39);
  doc.text(title, PAGE_MARGIN, y);
  doc.setDrawColor(203, 213, 225);
  doc.line(PAGE_MARGIN, y + 5, doc.internal.pageSize.getWidth() - PAGE_MARGIN, y + 5);
  return y + 18;
}

function rankRecommendation(options: DecisionPackPdfOption[]) {
  return [...options].sort((a, b) => {
    if (a.result.totalGap !== b.result.totalGap) return a.result.totalGap - b.result.totalGap;
    if (a.result.overallRiskScore !== b.result.overallRiskScore) return a.result.overallRiskScore - b.result.overallRiskScore;
    return (b.result.years[4]?.totalClosingReserves ?? 0) - (a.result.years[4]?.totalClosingReserves ?? 0);
  })[0];
}

function renderRiskFactors(doc: jsPDF, y: number, factors: RiskFactor[]) {
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    head: [['Risk Factor', 'Level', 'Score', 'Weight', 'Summary']],
    body: factors.map((f) => [
      f.name,
      f.level.toUpperCase(),
      `${f.score.toFixed(0)}/100`,
      `${(f.weight * 100).toFixed(0)}%`,
      f.description,
    ]),
  });
  return getAutoTableFinalY(doc, y) + 12;
}

export function exportDecisionPackPdf({ authorityConfig, options }: DecisionPackPdfInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const now = new Date();
  const selectedOptions = options.slice(0, 3);
  const recommended = rankRecommendation(selectedOptions);

  // Cover
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 145, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('MTFS Decision Pack', PAGE_MARGIN, 68);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Three-option appraisal for governance decision-making', PAGE_MARGIN, 92);
  doc.setTextColor(15, 23, 42);

  let y = 178;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Authority', PAGE_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(authorityConfig.authorityName || 'Local Authority', PAGE_MARGIN + 75, y);
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.text('Section 151', PAGE_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(authorityConfig.section151Officer || 'Not specified', PAGE_MARGIN + 75, y);
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.text('Period', PAGE_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(authorityConfig.reportingPeriod || `${now.getFullYear()}-${now.getFullYear() + 4}`, PAGE_MARGIN + 75, y);
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.text('Generated', PAGE_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(now.toLocaleString('en-GB'), PAGE_MARGIN + 75, y);

  y += 32;
  y = drawSectionTitle(doc, 'Executive Summary', y);
  const recommendationText = `${recommended.label} (${recommended.name}) is the leading option on combined affordability and risk. It delivers a ${fmtK(recommended.result.totalGap)} 5-year gap, risk score ${recommended.result.overallRiskScore.toFixed(0)}/100 (${riskBand(recommended.result.overallRiskScore)}), and Year 5 reserves of ${fmtK(recommended.result.years[4]?.totalClosingReserves ?? 0)}.`;
  y = writeParagraph(doc, recommendationText, y);
  y += 6;
  y = writeParagraph(
    doc,
    'This report summarises each option across fiscal impact, reserves resilience, statutory risk indicators, delivery assumptions, and year-by-year outcomes to support cabinet/committee appraisal.',
    y
  );

  y += 18;
  y = drawSectionTitle(doc, 'Option Comparison', y);
  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    head: [[
      'Option',
      'Scenario',
      '5yr Gap',
      'Structural Gap',
      'Risk',
      'Y5 Reserves',
      'Reserves Exhausted',
      's.114 Trigger',
    ]],
    body: selectedOptions.map((o) => [
      o.label,
      o.name,
      fmtK(o.result.totalGap),
      fmtK(o.result.totalStructuralGap),
      `${o.result.overallRiskScore.toFixed(0)}/100`,
      fmtK(o.result.years[4]?.totalClosingReserves ?? 0),
      o.result.yearReservesExhausted ?? 'No',
      o.result.s114Triggered ? 'Yes' : 'No',
    ]),
  });
  y = getAutoTableFinalY(doc, y) + 8;

  autoTable(doc, {
    startY: y,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    styles: { fontSize: 8.5, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 68 }, 1: { cellWidth: 430 } },
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    head: [['Option', 'Narrative Trade-off']],
    body: selectedOptions.map((o) => {
      const row5 = o.result.years[4];
      const tradeoff = o.result.totalGap <= 0
        ? `Balanced option with closing reserves ${fmtK(row5?.totalClosingReserves ?? 0)}; focus shifts to delivery assurance and resilience.`
        : o.result.overallRiskScore >= 65
          ? `Higher-risk pathway with residual gap ${fmtK(o.result.totalGap)}; requires stronger mitigations and contingency planning.`
          : `Partially mitigated position with manageable residual pressure; governance oversight required on savings and reserves use.`;
      return [o.label, tradeoff];
    }),
  });
  y = getAutoTableFinalY(doc, y) + 12;

  y = ensureSpace(doc, y, 220);
  y = drawSectionTitle(doc, 'Recommended Option: Statutory and Risk Context', y);
  const highlightedInsights = recommended.result.insights.filter((i) => i.type === 'critical' || i.type === 'warning').slice(0, 5);
  if (highlightedInsights.length === 0) {
    y = writeParagraph(doc, 'No critical or warning insights were generated for the recommended option.', y);
  } else {
    highlightedInsights.forEach((insight, idx) => {
      y = ensureSpace(doc, y, 60);
      y = writeParagraph(doc, `${idx + 1}. ${insight.title}: ${insight.body}${insight.action ? ` Action: ${insight.action}` : ''}`, y, 9);
      y += 2;
    });
  }
  y += 8;
  y = ensureSpace(doc, y, 190);
  y = renderRiskFactors(doc, y, recommended.result.riskFactors);

  // Option detail pages
  selectedOptions.forEach((option, idx) => {
    doc.addPage();
    let detailY = PAGE_MARGIN;
    detailY = drawSectionTitle(doc, `${option.label}: ${option.name} (${option.type})`, detailY);
    if (option.description) {
      detailY = writeParagraph(doc, option.description, detailY);
      detailY += 6;
    }

    autoTable(doc, {
      startY: detailY,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 190 } },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
      head: [['KPI', 'Value']],
      body: [
        ['5-Year Gap', fmtK(option.result.totalGap)],
        ['5-Year Structural Gap', fmtK(option.result.totalStructuralGap)],
        ['Overall Risk Score', `${option.result.overallRiskScore.toFixed(0)}/100 (${riskBand(option.result.overallRiskScore)})`],
        ['Council Tax Equivalent (Year 1)', `${option.result.councilTaxEquivalent.toFixed(2)}%`],
        ['Required Savings to Balance', fmtK(option.result.requiredSavingsToBalance)],
        ['Year Reserves Exhausted', option.result.yearReservesExhausted ?? 'No'],
        ['s.114 Trigger Assessment', option.result.s114Triggered ? `Triggered (${option.result.s114Reasons.join('; ') || 'See risk section'})` : 'Not triggered'],
      ],
    });
    detailY = getAutoTableFinalY(doc, detailY) + 10;

    autoTable(doc, {
      startY: detailY,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: { fontSize: 8, cellPadding: 3.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      head: [['Year', 'Funding', 'Expenditure', 'Raw Gap', 'Net Gap', 'Closing Reserves', 'Flags']],
      body: option.result.years.map((year) => [
        year.label,
        fmtK(year.totalFunding),
        fmtK(year.totalExpenditure),
        fmtK(year.rawGap),
        fmtK(year.netGap),
        fmtK(year.totalClosingReserves),
        [
          year.structuralDeficit ? 'Structural deficit' : null,
          year.reservesBelowThreshold ? 'Below threshold' : null,
          year.unrealisticSavings ? 'Savings risk' : null,
        ].filter(Boolean).join(', ') || 'None',
      ]),
    });
    detailY = getAutoTableFinalY(doc, detailY) + 10;

    autoTable(doc, {
      startY: detailY,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: { fontSize: 8.5, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold' } },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
      head: [['Key Assumptions', 'Value']],
      body: [
        ['Council Tax Increase', `${option.assumptions.funding.councilTaxIncrease.toFixed(2)}%`],
        ['Business Rates Growth', `${option.assumptions.funding.businessRatesGrowth.toFixed(2)}%`],
        ['Pay Award', `${option.assumptions.expenditure.payAward.toFixed(2)}%`],
        ['ASC Demand Growth', `${option.assumptions.expenditure.ascDemandGrowth.toFixed(2)}%`],
        ['Savings Delivery Risk', `${option.assumptions.expenditure.savingsDeliveryRisk.toFixed(1)}%`],
        ['Annual Savings Target', fmtK(option.assumptions.policy.annualSavingsTarget)],
        ['Planned Reserves Usage (per year)', fmtK(option.assumptions.policy.reservesUsage)],
        ['Social Care Protection', option.assumptions.policy.socialCareProtection ? 'Enabled' : 'Disabled'],
      ],
    });

    const detailInsights = option.result.insights.slice(0, 4).map((i) => `${i.type.toUpperCase()}: ${i.title}`);
    detailY = getAutoTableFinalY(doc, detailY) + 12;
    detailY = ensureSpace(doc, detailY, 90);
    detailY = drawSectionTitle(doc, `${option.label} Commentary`, detailY);
    detailY = writeParagraph(
      doc,
      detailInsights.length > 0
        ? detailInsights.join(' | ')
        : 'No additional insight flags were generated for this option.',
      detailY,
      9
    );

    if (idx === selectedOptions.length - 1 && option.result.treasuryBreaches.length > 0) {
      detailY += 12;
      detailY = ensureSpace(doc, detailY, 80);
      detailY = drawSectionTitle(doc, 'Treasury / Prudential Notes', detailY);
      option.result.treasuryBreaches.forEach((b) => {
        detailY = writeParagraph(doc, `• ${b}`, detailY, 9);
      });
    }
  });

  // Footer on each page
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`MTFS Decision Pack · ${authorityConfig.authorityName || 'Local Authority'}`, PAGE_MARGIN, h - 18);
    doc.text(`Page ${page} of ${pages}`, w - PAGE_MARGIN, h - 18, { align: 'right' });
  }

  const dateToken = now.toISOString().slice(0, 10);
  const authToken = sanitizeFileToken(authorityConfig.authorityName || 'authority');
  doc.save(`decision_pack_${authToken}_${dateToken}.pdf`);
}
