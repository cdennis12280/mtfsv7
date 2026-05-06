import type {
  Assumptions,
  BaselineData,
  ModelSnapshot,
  Scenario,
} from '../types/financial';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_AUTHORITY_CONFIG,
  DEFAULT_BASELINE,
  runCalculations,
} from '../engine/calculations';
type XlsxModule = typeof import('xlsx');
type Worksheet = ReturnType<XlsxModule['utils']['aoa_to_sheet']>;

const SHEET_META = 'Meta';
const SHEET_AUTHORITY = 'AuthorityConfig';
const SHEET_ASSUMPTIONS = 'Assumptions';
const SHEET_BASELINE_CORE = 'BaselineCore';
const SHEET_BASELINE_SETTINGS = 'BaselineSettings';
const SHEET_SAVINGS = 'SavingsProposals';
const SHEET_RESERVES = 'NamedReserves';
const SHEET_CUSTOM_LINES = 'CustomServiceLines';
const SHEET_GRANTS = 'GrantSchedule';
const SHEET_PAY_SPINE = 'PaySpine';
const SHEET_CONTRACTS = 'Contracts';
const SHEET_INVEST = 'InvestToSave';
const SHEET_INCOME = 'IncomeLines';
const SHEET_SCENARIOS = 'Scenarios';
const SHEET_JSON_FALLBACK = 'SnapshotJSON';
const SHEET_README = 'Readme';

const EDITABLE_SHEETS = new Set([
  SHEET_ASSUMPTIONS,
  SHEET_BASELINE_CORE,
  SHEET_BASELINE_SETTINGS,
  SHEET_SAVINGS,
  SHEET_RESERVES,
  SHEET_CUSTOM_LINES,
  SHEET_GRANTS,
  SHEET_PAY_SPINE,
  SHEET_CONTRACTS,
  SHEET_INVEST,
  SHEET_INCOME,
  SHEET_SCENARIOS,
  SHEET_AUTHORITY,
]);

function parseCell(raw: unknown): string | number | boolean | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number' || typeof raw === 'boolean') return raw;
  const text = String(raw).trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower === 'true' || lower === 'yes') return true;
  if (lower === 'false' || lower === 'no') return false;
  const num = Number(text.replace(/,/g, ''));
  if (!Number.isNaN(num) && /^-?\d+(\.\d+)?$/.test(text.replace(/,/g, ''))) return num;
  return text;
}

function toNumber(raw: unknown, fallback = 0): number {
  const parsed = parseCell(raw);
  return typeof parsed === 'number' ? parsed : fallback;
}

function toBoolean(raw: unknown, fallback = false): boolean {
  const parsed = parseCell(raw);
  return typeof parsed === 'boolean' ? parsed : fallback;
}

function toText(raw: unknown, fallback = ''): string {
  const parsed = parseCell(raw);
  return parsed === null ? fallback : String(parsed);
}

function tuple5(a: unknown, b: unknown, c: unknown, d: unknown, e: unknown): [number, number, number, number, number] {
  return [toNumber(a, 0), toNumber(b, 0), toNumber(c, 0), toNumber(d, 0), toNumber(e, 0)];
}

function getRows<T extends Record<string, unknown>>(xlsx: XlsxModule, workbook: ReturnType<XlsxModule['read']>, sheetName: string): T[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' }) as T[];
}

function inferColumnWidths(rows: (string | number)[][], min = 12, max = 44): Array<{ wch: number }> {
  const columns = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const widths: Array<{ wch: number }> = [];
  for (let col = 0; col < columns; col += 1) {
    let longest = min;
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx += 1) {
      const value = rows[rowIdx][col];
      const len = String(value ?? '').length;
      if (len > longest) longest = len;
    }
    widths.push({ wch: Math.max(min, Math.min(max, longest + 2)) });
  }
  return widths;
}

function configureSheet(sheet: Worksheet, sheetName: string, rows: (string | number)[][]): Worksheet {
  sheet['!cols'] = inferColumnWidths(rows);
  if (rows.length > 1 && rows[0].length > 0 && sheet['!ref']) {
    const lastColumn = rows[0].length - 1;
    const range = `A1:${String.fromCharCode(65 + lastColumn)}1`;
    sheet['!autofilter'] = { ref: range };
    if (EDITABLE_SHEETS.has(sheetName)) {
      sheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' } as unknown as Worksheet['!freeze'];
    }
  }
  return sheet;
}

function buildEditableWorkbookRows(snapshot: ModelSnapshot) {
  const metaRows = [
    ['key', 'value'],
    ['format', 'mtfs-snapshot-xlsx-v2'],
    ['snapshot_id', snapshot.id],
    ['snapshot_name', snapshot.name],
    ['description', snapshot.description],
    ['created_at', snapshot.createdAt],
    ['app_version', snapshot.metadata?.appVersion ?? 'v7.0'],
    ['notes', snapshot.metadata?.notes ?? ''],
  ];

  const authorityRows = [
    ['field', 'value'],
    ['authorityName', snapshot.authorityConfig.authorityName],
    ['section151Officer', snapshot.authorityConfig.section151Officer],
    ['chiefExecutive', snapshot.authorityConfig.chiefExecutive],
    ['reportingPeriod', snapshot.authorityConfig.reportingPeriod],
    ['reportDate', snapshot.authorityConfig.reportDate],
    ['authorityType', snapshot.authorityConfig.authorityType],
    ['population', snapshot.authorityConfig.population],
    ['strategicPriority1', snapshot.authorityConfig.strategicPriority1],
    ['strategicPriority2', snapshot.authorityConfig.strategicPriority2],
    ['strategicPriority3', snapshot.authorityConfig.strategicPriority3],
  ];

  const a = snapshot.assumptions;
  const assumptionsRows = [
    ['section', 'field', 'value', 'unit'],
    ['funding', 'councilTaxIncrease', a.funding.councilTaxIncrease, '%'],
    ['funding', 'businessRatesGrowth', a.funding.businessRatesGrowth, '%'],
    ['funding', 'grantVariation', a.funding.grantVariation, '%'],
    ['funding', 'feesChargesElasticity', a.funding.feesChargesElasticity, '%'],
    ['expenditure', 'payAward', a.expenditure.payAward, '%'],
    ['expenditure', 'nonPayInflation', a.expenditure.nonPayInflation, '%'],
    ['expenditure', 'ascDemandGrowth', a.expenditure.ascDemandGrowth, '%'],
    ['expenditure', 'cscDemandGrowth', a.expenditure.cscDemandGrowth, '%'],
    ['expenditure', 'savingsDeliveryRisk', a.expenditure.savingsDeliveryRisk, '%'],
    ['expenditure', 'payAwardByFundingSource.general_fund', a.expenditure.payAwardByFundingSource.general_fund, '%'],
    ['expenditure', 'payAwardByFundingSource.grant', a.expenditure.payAwardByFundingSource.grant, '%'],
    ['expenditure', 'payAwardByFundingSource.other', a.expenditure.payAwardByFundingSource.other, '%'],
    ['expenditure', 'payGroupSensitivity.default', a.expenditure.payGroupSensitivity.default, 'pp'],
    ['expenditure', 'payGroupSensitivity.teachers', a.expenditure.payGroupSensitivity.teachers, 'pp'],
    ['expenditure', 'payGroupSensitivity.njc', a.expenditure.payGroupSensitivity.njc, 'pp'],
    ['expenditure', 'payGroupSensitivity.senior', a.expenditure.payGroupSensitivity.senior, 'pp'],
    ['expenditure', 'payGroupSensitivity.other', a.expenditure.payGroupSensitivity.other, 'pp'],
    ['policy', 'annualSavingsTarget', a.policy.annualSavingsTarget, '£000'],
    ['policy', 'reservesUsage', a.policy.reservesUsage, '£000'],
    ['policy', 'socialCareProtection', String(a.policy.socialCareProtection), 'boolean'],
    ['advanced', 'realTermsToggle', String(a.advanced.realTermsToggle), 'boolean'],
    ['advanced', 'inflationRate', a.advanced.inflationRate, '%'],
  ];

  const b = snapshot.baseline;
  const baselineCoreRows = [
    ['field', 'value', 'unit'],
    ['councilTax', b.councilTax, '£000'],
    ['businessRates', b.businessRates, '£000'],
    ['coreGrants', b.coreGrants, '£000'],
    ['feesAndCharges', b.feesAndCharges, '£000'],
    ['pay', b.pay, '£000'],
    ['nonPay', b.nonPay, '£000'],
    ['ascDemandLed', b.ascDemandLed, '£000'],
    ['cscDemandLed', b.cscDemandLed, '£000'],
    ['otherServiceExp', b.otherServiceExp, '£000'],
    ['generalFundReserves', b.generalFundReserves, '£000'],
    ['earmarkedReserves', b.earmarkedReserves, '£000'],
    ['reservesMinimumThreshold', b.reservesMinimumThreshold, '£000'],
  ];

  const baselineSettingsRows = [
    ['path', 'value', 'unit_or_note'],
    ['councilTaxBaseConfig.enabled', String(b.councilTaxBaseConfig.enabled), 'boolean'],
    ['councilTaxBaseConfig.bandDEquivalentDwellings', b.councilTaxBaseConfig.bandDEquivalentDwellings, 'count'],
    ['councilTaxBaseConfig.bandDCharge', b.councilTaxBaseConfig.bandDCharge, '£'],
    ['councilTaxBaseConfig.collectionRate', b.councilTaxBaseConfig.collectionRate, '%'],
    ['councilTaxBaseConfig.parishPrecepts', b.councilTaxBaseConfig.parishPrecepts, '£000'],
    ['councilTaxBaseConfig.corePreceptPct', b.councilTaxBaseConfig.corePreceptPct, '%'],
    ['councilTaxBaseConfig.ascPreceptPct', b.councilTaxBaseConfig.ascPreceptPct, '%'],
    ['ascCohortModel.enabled', String(b.ascCohortModel.enabled), 'boolean'],
    ['ascCohortModel.population18to64', b.ascCohortModel.population18to64, 'count'],
    ['ascCohortModel.population65plus', b.ascCohortModel.population65plus, 'count'],
    ['ascCohortModel.prevalence18to64', b.ascCohortModel.prevalence18to64, '%'],
    ['ascCohortModel.prevalence65plus', b.ascCohortModel.prevalence65plus, '%'],
    ['ascCohortModel.unitCost18to64', b.ascCohortModel.unitCost18to64, '£'],
    ['ascCohortModel.unitCost65plus', b.ascCohortModel.unitCost65plus, '£'],
    ['ascCohortModel.growth18to64', b.ascCohortModel.growth18to64, '%'],
    ['ascCohortModel.growth65plus', b.ascCohortModel.growth65plus, '%'],
    ['capitalFinancing.enabled', String(b.capitalFinancing.enabled), 'boolean'],
    ['capitalFinancing.interestRate', b.capitalFinancing.interestRate, '%'],
    ['capitalFinancing.mrpRate', b.capitalFinancing.mrpRate, '%'],
    ['capitalFinancing.borrowingByYear.1', b.capitalFinancing.borrowingByYear[0], '£000'],
    ['capitalFinancing.borrowingByYear.2', b.capitalFinancing.borrowingByYear[1], '£000'],
    ['capitalFinancing.borrowingByYear.3', b.capitalFinancing.borrowingByYear[2], '£000'],
    ['capitalFinancing.borrowingByYear.4', b.capitalFinancing.borrowingByYear[3], '£000'],
    ['capitalFinancing.borrowingByYear.5', b.capitalFinancing.borrowingByYear[4], '£000'],
    ['riskBasedReserves.enabled', String(b.riskBasedReserves.enabled), 'boolean'],
    ['riskBasedReserves.adoptAsMinimumThreshold', String(b.riskBasedReserves.adoptAsMinimumThreshold), 'boolean'],
    ['riskBasedReserves.demandVolatility', b.riskBasedReserves.demandVolatility, '£000'],
    ['riskBasedReserves.savingsNonDelivery', b.riskBasedReserves.savingsNonDelivery, '£000'],
    ['riskBasedReserves.fundingUncertainty', b.riskBasedReserves.fundingUncertainty, '£000'],
    ['riskBasedReserves.litigationRisk', b.riskBasedReserves.litigationRisk, '£000'],
    ['reservesRecoveryPlan.enabled', String(b.reservesRecoveryPlan.enabled), 'boolean'],
    ['reservesRecoveryPlan.targetYear', b.reservesRecoveryPlan.targetYear, 'year 1-5'],
    ['reservesRecoveryPlan.targetLevel', b.reservesRecoveryPlan.targetLevel, '£000'],
    ['reservesRecoveryPlan.annualContribution', b.reservesRecoveryPlan.annualContribution, '£000'],
    ['reservesRecoveryPlan.autoCalculate', String(b.reservesRecoveryPlan.autoCalculate), 'boolean'],
    ['reservesAdequacyMethodology.method', b.reservesAdequacyMethodology.method, 'fixed|pct_of_net_budget|risk_based'],
    ['reservesAdequacyMethodology.fixedMinimum', b.reservesAdequacyMethodology.fixedMinimum, '£000'],
    ['reservesAdequacyMethodology.pctOfNetBudget', b.reservesAdequacyMethodology.pctOfNetBudget, '%'],
    ['treasuryIndicators.enabled', String(b.treasuryIndicators.enabled), 'boolean'],
    ['treasuryIndicators.authorisedLimit', b.treasuryIndicators.authorisedLimit, '£000'],
    ['treasuryIndicators.operationalBoundary', b.treasuryIndicators.operationalBoundary, '£000'],
    ['treasuryIndicators.netFinancingNeed', b.treasuryIndicators.netFinancingNeed, '£000'],
    ['mrpCalculator.enabled', String(b.mrpCalculator.enabled), 'boolean'],
    ['mrpCalculator.policy', b.mrpCalculator.policy, 'asset-life|annuity|straight-line'],
    ['mrpCalculator.baseBorrowing', b.mrpCalculator.baseBorrowing, '£000'],
    ['mrpCalculator.assetLifeYears', b.mrpCalculator.assetLifeYears, 'years'],
    ['mrpCalculator.annuityRate', b.mrpCalculator.annuityRate, '%'],
    ['paySpineConfig.enabled', String(b.paySpineConfig.enabled), 'boolean'],
    ['contractIndexationTracker.enabled', String(b.contractIndexationTracker.enabled), 'boolean'],
    ['investToSave.enabled', String(b.investToSave.enabled), 'boolean'],
    ['incomeGenerationWorkbook.enabled', String(b.incomeGenerationWorkbook.enabled), 'boolean'],
  ];

  const savingsRows = [
    ['id', 'name', 'description', 'category', 'grossValue', 'deliveryYear', 'achievementRate', 'isRecurring', 'ragStatus', 'responsibleOfficer', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5'],
    ...snapshot.savingsProposals.map((p) => [
      p.id,
      p.name,
      p.description,
      p.category,
      p.grossValue,
      p.deliveryYear,
      p.achievementRate,
      String(p.isRecurring),
      p.ragStatus,
      p.responsibleOfficer,
      p.yearlyDelivery[0],
      p.yearlyDelivery[1],
      p.yearlyDelivery[2],
      p.yearlyDelivery[3],
      p.yearlyDelivery[4],
    ]),
  ];

  const namedReserveRows = [
    ['id', 'name', 'purpose', 'openingBalance', 'isEarmarked', 'minimumBalance', 'contribY1', 'contribY2', 'contribY3', 'contribY4', 'contribY5', 'drawY1', 'drawY2', 'drawY3', 'drawY4', 'drawY5'],
    ...b.namedReserves.map((r) => [
      r.id,
      r.name,
      r.purpose,
      r.openingBalance,
      String(r.isEarmarked),
      r.minimumBalance,
      r.plannedContributions[0],
      r.plannedContributions[1],
      r.plannedContributions[2],
      r.plannedContributions[3],
      r.plannedContributions[4],
      r.plannedDrawdowns[0],
      r.plannedDrawdowns[1],
      r.plannedDrawdowns[2],
      r.plannedDrawdowns[3],
      r.plannedDrawdowns[4],
    ]),
  ];

  const customLineRows = [
    ['id', 'name', 'category', 'baseValue', 'inflationDriver', 'manualInflationRate', 'demandGrowthRate', 'isRecurring', 'notes'],
    ...b.customServiceLines.map((c) => [
      c.id,
      c.name,
      c.category,
      c.baseValue,
      c.inflationDriver,
      c.manualInflationRate,
      c.demandGrowthRate,
      String(c.isRecurring),
      c.notes,
    ]),
  ];

  const grantRows = [
    ['id', 'name', 'value', 'certainty', 'endYear'],
    ...b.grantSchedule.map((g) => [g.id, g.name, g.value, g.certainty, g.endYear]),
  ];

  const paySpineRows = [
    ['id', 'grade', 'fte', 'spinePointCost'],
    ...b.paySpineConfig.rows.map((r) => [r.id, r.grade, r.fte, r.spinePointCost]),
  ];

  const contractRows = [
    ['id', 'name', 'value', 'clause', 'bespokeRate', 'effectiveFromYear', 'reviewMonth', 'upliftMethod', 'fixedRate', 'customRate', 'phaseInMonths'],
    ...b.contractIndexationTracker.contracts.map((c) => [
      c.id, c.name, c.value, c.clause, c.bespokeRate, c.effectiveFromYear, c.reviewMonth, c.upliftMethod, c.fixedRate, c.customRate, c.phaseInMonths,
    ]),
  ];

  const investRows = [
    ['id', 'name', 'upfrontCost', 'annualSaving', 'paybackYears', 'deliveryYear'],
    ...b.investToSave.proposals.map((p) => [p.id, p.name, p.upfrontCost, p.annualSaving, p.paybackYears, p.deliveryYear]),
  ];

  const incomeRows = [
    ['id', 'name', 'baseVolume', 'basePrice', 'volumeGrowth', 'priceGrowth'],
    ...b.incomeGenerationWorkbook.lines.map((l) => [l.id, l.name, l.baseVolume, l.basePrice, l.volumeGrowth, l.priceGrowth]),
  ];

  const scenarioRows = [
    ['id', 'name', 'description', 'type', 'color', 'createdAt', 'councilTaxIncrease', 'businessRatesGrowth', 'grantVariation', 'feesChargesElasticity', 'payAward', 'nonPayInflation', 'ascDemandGrowth', 'cscDemandGrowth', 'savingsDeliveryRisk', 'payAwardByFundingSourceGeneralFund', 'payAwardByFundingSourceGrant', 'payAwardByFundingSourceOther', 'payGroupSensitivityDefault', 'payGroupSensitivityTeachers', 'payGroupSensitivityNJC', 'payGroupSensitivitySenior', 'payGroupSensitivityOther', 'annualSavingsTarget', 'reservesUsage', 'socialCareProtection', 'realTermsToggle', 'inflationRate', 'resultTotalGap', 'resultRiskScore'],
    ...snapshot.scenarios.map((s) => [
      s.id,
      s.name,
      s.description,
      s.type,
      s.color,
      s.createdAt,
      s.assumptions.funding.councilTaxIncrease,
      s.assumptions.funding.businessRatesGrowth,
      s.assumptions.funding.grantVariation,
      s.assumptions.funding.feesChargesElasticity,
      s.assumptions.expenditure.payAward,
      s.assumptions.expenditure.nonPayInflation,
      s.assumptions.expenditure.ascDemandGrowth,
      s.assumptions.expenditure.cscDemandGrowth,
      s.assumptions.expenditure.savingsDeliveryRisk,
      s.assumptions.expenditure.payAwardByFundingSource.general_fund,
      s.assumptions.expenditure.payAwardByFundingSource.grant,
      s.assumptions.expenditure.payAwardByFundingSource.other,
      s.assumptions.expenditure.payGroupSensitivity.default,
      s.assumptions.expenditure.payGroupSensitivity.teachers,
      s.assumptions.expenditure.payGroupSensitivity.njc,
      s.assumptions.expenditure.payGroupSensitivity.senior,
      s.assumptions.expenditure.payGroupSensitivity.other,
      s.assumptions.policy.annualSavingsTarget,
      s.assumptions.policy.reservesUsage,
      String(s.assumptions.policy.socialCareProtection),
      String(s.assumptions.advanced.realTermsToggle),
      s.assumptions.advanced.inflationRate,
      s.result.totalGap,
      s.result.overallRiskScore,
    ]),
  ];

  const jsonFallbackRows = [['json'], [JSON.stringify(snapshot)]];
  const readmeRows = [
    ['MTFS Snapshot Workbook (editable)'],
    ['Edit values in sheets such as Assumptions, BaselineCore, SavingsProposals, NamedReserves, and related config sheets.'],
    ['Columns with labels and units are designed for direct user editing. Keep IDs if you want stable object references.'],
    ['Header row is frozen and filter-enabled on editable sheets to support review and data entry.'],
    ['Import this workbook back into the app via Scenarios > Model Snapshots > Import JSON/XLSX.'],
    ['SnapshotJSON sheet is a fallback for compatibility with older exports; editable sheets are read first.'],
  ];

  return {
    metaRows,
    authorityRows,
    assumptionsRows,
    baselineCoreRows,
    baselineSettingsRows,
    savingsRows,
    namedReserveRows,
    customLineRows,
    grantRows,
    paySpineRows,
    contractRows,
    investRows,
    incomeRows,
    scenarioRows,
    jsonFallbackRows,
    readmeRows,
  };
}

function applySettingPath(baseline: BaselineData, path: string, raw: unknown): void {
  switch (path) {
    case 'councilTaxBaseConfig.enabled': baseline.councilTaxBaseConfig.enabled = toBoolean(raw, baseline.councilTaxBaseConfig.enabled); break;
    case 'councilTaxBaseConfig.bandDEquivalentDwellings': baseline.councilTaxBaseConfig.bandDEquivalentDwellings = toNumber(raw, baseline.councilTaxBaseConfig.bandDEquivalentDwellings); break;
    case 'councilTaxBaseConfig.bandDCharge': baseline.councilTaxBaseConfig.bandDCharge = toNumber(raw, baseline.councilTaxBaseConfig.bandDCharge); break;
    case 'councilTaxBaseConfig.collectionRate': baseline.councilTaxBaseConfig.collectionRate = toNumber(raw, baseline.councilTaxBaseConfig.collectionRate); break;
    case 'councilTaxBaseConfig.parishPrecepts': baseline.councilTaxBaseConfig.parishPrecepts = toNumber(raw, baseline.councilTaxBaseConfig.parishPrecepts); break;
    case 'councilTaxBaseConfig.corePreceptPct': baseline.councilTaxBaseConfig.corePreceptPct = toNumber(raw, baseline.councilTaxBaseConfig.corePreceptPct); break;
    case 'councilTaxBaseConfig.ascPreceptPct': baseline.councilTaxBaseConfig.ascPreceptPct = toNumber(raw, baseline.councilTaxBaseConfig.ascPreceptPct); break;
    case 'ascCohortModel.enabled': baseline.ascCohortModel.enabled = toBoolean(raw, baseline.ascCohortModel.enabled); break;
    case 'ascCohortModel.population18to64': baseline.ascCohortModel.population18to64 = toNumber(raw, baseline.ascCohortModel.population18to64); break;
    case 'ascCohortModel.population65plus': baseline.ascCohortModel.population65plus = toNumber(raw, baseline.ascCohortModel.population65plus); break;
    case 'ascCohortModel.prevalence18to64': baseline.ascCohortModel.prevalence18to64 = toNumber(raw, baseline.ascCohortModel.prevalence18to64); break;
    case 'ascCohortModel.prevalence65plus': baseline.ascCohortModel.prevalence65plus = toNumber(raw, baseline.ascCohortModel.prevalence65plus); break;
    case 'ascCohortModel.unitCost18to64': baseline.ascCohortModel.unitCost18to64 = toNumber(raw, baseline.ascCohortModel.unitCost18to64); break;
    case 'ascCohortModel.unitCost65plus': baseline.ascCohortModel.unitCost65plus = toNumber(raw, baseline.ascCohortModel.unitCost65plus); break;
    case 'ascCohortModel.growth18to64': baseline.ascCohortModel.growth18to64 = toNumber(raw, baseline.ascCohortModel.growth18to64); break;
    case 'ascCohortModel.growth65plus': baseline.ascCohortModel.growth65plus = toNumber(raw, baseline.ascCohortModel.growth65plus); break;
    case 'capitalFinancing.enabled': baseline.capitalFinancing.enabled = toBoolean(raw, baseline.capitalFinancing.enabled); break;
    case 'capitalFinancing.interestRate': baseline.capitalFinancing.interestRate = toNumber(raw, baseline.capitalFinancing.interestRate); break;
    case 'capitalFinancing.mrpRate': baseline.capitalFinancing.mrpRate = toNumber(raw, baseline.capitalFinancing.mrpRate); break;
    case 'capitalFinancing.borrowingByYear.1': baseline.capitalFinancing.borrowingByYear[0] = toNumber(raw, baseline.capitalFinancing.borrowingByYear[0]); break;
    case 'capitalFinancing.borrowingByYear.2': baseline.capitalFinancing.borrowingByYear[1] = toNumber(raw, baseline.capitalFinancing.borrowingByYear[1]); break;
    case 'capitalFinancing.borrowingByYear.3': baseline.capitalFinancing.borrowingByYear[2] = toNumber(raw, baseline.capitalFinancing.borrowingByYear[2]); break;
    case 'capitalFinancing.borrowingByYear.4': baseline.capitalFinancing.borrowingByYear[3] = toNumber(raw, baseline.capitalFinancing.borrowingByYear[3]); break;
    case 'capitalFinancing.borrowingByYear.5': baseline.capitalFinancing.borrowingByYear[4] = toNumber(raw, baseline.capitalFinancing.borrowingByYear[4]); break;
    case 'riskBasedReserves.enabled': baseline.riskBasedReserves.enabled = toBoolean(raw, baseline.riskBasedReserves.enabled); break;
    case 'riskBasedReserves.adoptAsMinimumThreshold': baseline.riskBasedReserves.adoptAsMinimumThreshold = toBoolean(raw, baseline.riskBasedReserves.adoptAsMinimumThreshold); break;
    case 'riskBasedReserves.demandVolatility': baseline.riskBasedReserves.demandVolatility = toNumber(raw, baseline.riskBasedReserves.demandVolatility); break;
    case 'riskBasedReserves.savingsNonDelivery': baseline.riskBasedReserves.savingsNonDelivery = toNumber(raw, baseline.riskBasedReserves.savingsNonDelivery); break;
    case 'riskBasedReserves.fundingUncertainty': baseline.riskBasedReserves.fundingUncertainty = toNumber(raw, baseline.riskBasedReserves.fundingUncertainty); break;
    case 'riskBasedReserves.litigationRisk': baseline.riskBasedReserves.litigationRisk = toNumber(raw, baseline.riskBasedReserves.litigationRisk); break;
    case 'reservesRecoveryPlan.enabled': baseline.reservesRecoveryPlan.enabled = toBoolean(raw, baseline.reservesRecoveryPlan.enabled); break;
    case 'reservesRecoveryPlan.targetYear': baseline.reservesRecoveryPlan.targetYear = Math.max(1, Math.min(5, Math.round(toNumber(raw, baseline.reservesRecoveryPlan.targetYear)))) as 1 | 2 | 3 | 4 | 5; break;
    case 'reservesRecoveryPlan.targetLevel': baseline.reservesRecoveryPlan.targetLevel = toNumber(raw, baseline.reservesRecoveryPlan.targetLevel); break;
    case 'reservesRecoveryPlan.annualContribution': baseline.reservesRecoveryPlan.annualContribution = toNumber(raw, baseline.reservesRecoveryPlan.annualContribution); break;
    case 'reservesRecoveryPlan.autoCalculate': baseline.reservesRecoveryPlan.autoCalculate = toBoolean(raw, baseline.reservesRecoveryPlan.autoCalculate); break;
    case 'reservesAdequacyMethodology.method': baseline.reservesAdequacyMethodology.method = toText(raw, baseline.reservesAdequacyMethodology.method) as BaselineData['reservesAdequacyMethodology']['method']; break;
    case 'reservesAdequacyMethodology.fixedMinimum': baseline.reservesAdequacyMethodology.fixedMinimum = toNumber(raw, baseline.reservesAdequacyMethodology.fixedMinimum); break;
    case 'reservesAdequacyMethodology.pctOfNetBudget': baseline.reservesAdequacyMethodology.pctOfNetBudget = toNumber(raw, baseline.reservesAdequacyMethodology.pctOfNetBudget); break;
    case 'treasuryIndicators.enabled': baseline.treasuryIndicators.enabled = toBoolean(raw, baseline.treasuryIndicators.enabled); break;
    case 'treasuryIndicators.authorisedLimit': baseline.treasuryIndicators.authorisedLimit = toNumber(raw, baseline.treasuryIndicators.authorisedLimit); break;
    case 'treasuryIndicators.operationalBoundary': baseline.treasuryIndicators.operationalBoundary = toNumber(raw, baseline.treasuryIndicators.operationalBoundary); break;
    case 'treasuryIndicators.netFinancingNeed': baseline.treasuryIndicators.netFinancingNeed = toNumber(raw, baseline.treasuryIndicators.netFinancingNeed); break;
    case 'mrpCalculator.enabled': baseline.mrpCalculator.enabled = toBoolean(raw, baseline.mrpCalculator.enabled); break;
    case 'mrpCalculator.policy': baseline.mrpCalculator.policy = toText(raw, baseline.mrpCalculator.policy) as BaselineData['mrpCalculator']['policy']; break;
    case 'mrpCalculator.baseBorrowing': baseline.mrpCalculator.baseBorrowing = toNumber(raw, baseline.mrpCalculator.baseBorrowing); break;
    case 'mrpCalculator.assetLifeYears': baseline.mrpCalculator.assetLifeYears = Math.round(toNumber(raw, baseline.mrpCalculator.assetLifeYears)); break;
    case 'mrpCalculator.annuityRate': baseline.mrpCalculator.annuityRate = toNumber(raw, baseline.mrpCalculator.annuityRate); break;
    case 'paySpineConfig.enabled': baseline.paySpineConfig.enabled = toBoolean(raw, baseline.paySpineConfig.enabled); break;
    case 'contractIndexationTracker.enabled': baseline.contractIndexationTracker.enabled = toBoolean(raw, baseline.contractIndexationTracker.enabled); break;
    case 'investToSave.enabled': baseline.investToSave.enabled = toBoolean(raw, baseline.investToSave.enabled); break;
    case 'incomeGenerationWorkbook.enabled': baseline.incomeGenerationWorkbook.enabled = toBoolean(raw, baseline.incomeGenerationWorkbook.enabled); break;
    default: break;
  }
}

export async function exportSnapshotToWorkbookBlob(snapshot: ModelSnapshot): Promise<Blob> {
  const xlsx = await import('xlsx');
  const workbook = xlsx.utils.book_new();
  const rows = buildEditableWorkbookRows(snapshot);
  const sheetRows: Array<{ name: string; rows: (string | number)[][] }> = [
    { name: SHEET_META, rows: rows.metaRows },
    { name: SHEET_AUTHORITY, rows: rows.authorityRows },
    { name: SHEET_ASSUMPTIONS, rows: rows.assumptionsRows },
    { name: SHEET_BASELINE_CORE, rows: rows.baselineCoreRows },
    { name: SHEET_BASELINE_SETTINGS, rows: rows.baselineSettingsRows },
    { name: SHEET_SAVINGS, rows: rows.savingsRows },
    { name: SHEET_RESERVES, rows: rows.namedReserveRows },
    { name: SHEET_CUSTOM_LINES, rows: rows.customLineRows },
    { name: SHEET_GRANTS, rows: rows.grantRows },
    { name: SHEET_PAY_SPINE, rows: rows.paySpineRows },
    { name: SHEET_CONTRACTS, rows: rows.contractRows },
    { name: SHEET_INVEST, rows: rows.investRows },
    { name: SHEET_INCOME, rows: rows.incomeRows },
    { name: SHEET_SCENARIOS, rows: rows.scenarioRows },
    { name: SHEET_JSON_FALLBACK, rows: rows.jsonFallbackRows },
    { name: SHEET_README, rows: rows.readmeRows },
  ];
  for (const entry of sheetRows) {
    const sheet = xlsx.utils.aoa_to_sheet(entry.rows);
    const configured = configureSheet(sheet, entry.name, entry.rows);
    xlsx.utils.book_append_sheet(workbook, configured, entry.name);
  }

  const bytes = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function parseEditableWorkbookToSnapshot(xlsx: XlsxModule, workbook: ReturnType<XlsxModule['read']>): ModelSnapshot | null {
  const assumptionsRows = getRows<{ section: string; field: string; value: unknown }>(xlsx, workbook, SHEET_ASSUMPTIONS);
  const coreRows = getRows<{ field: string; value: unknown }>(xlsx, workbook, SHEET_BASELINE_CORE);
  const hasEditableStructure = assumptionsRows.length > 0 || coreRows.length > 0;
  if (!hasEditableStructure) return null;

  const metaRows = getRows<{ key: string; value: unknown }>(xlsx, workbook, SHEET_META);
  const authorityRows = getRows<{ field: string; value: unknown }>(xlsx, workbook, SHEET_AUTHORITY);
  const settingsRows = getRows<{ path: string; value: unknown }>(xlsx, workbook, SHEET_BASELINE_SETTINGS);
  const savingsRows = getRows<Record<string, unknown>>(xlsx, workbook, SHEET_SAVINGS);
  const reserveRows = getRows<Record<string, unknown>>(xlsx, workbook, SHEET_RESERVES);
  const customRows = getRows<Record<string, unknown>>(xlsx, workbook, SHEET_CUSTOM_LINES);
  const grantRows = getRows<Record<string, unknown>>(xlsx, workbook, SHEET_GRANTS);
  const payRows = getRows<Record<string, unknown>>(xlsx, workbook, SHEET_PAY_SPINE);
  const contractRows = getRows<Record<string, unknown>>(xlsx, workbook, SHEET_CONTRACTS);
  const investRows = getRows<Record<string, unknown>>(xlsx, workbook, SHEET_INVEST);
  const incomeRows = getRows<Record<string, unknown>>(xlsx, workbook, SHEET_INCOME);
  const scenarioRows = getRows<Record<string, unknown>>(xlsx, workbook, SHEET_SCENARIOS);

  const assumptions: Assumptions = JSON.parse(JSON.stringify(DEFAULT_ASSUMPTIONS)) as Assumptions;
  for (const row of assumptionsRows) {
    const section = String(row.section || '').trim();
    const field = String(row.field || '').trim();
    if (!section || !field) continue;
    if (section === 'funding') {
      if (field === 'councilTaxIncrease') assumptions.funding.councilTaxIncrease = toNumber(row.value, assumptions.funding.councilTaxIncrease);
      if (field === 'businessRatesGrowth') assumptions.funding.businessRatesGrowth = toNumber(row.value, assumptions.funding.businessRatesGrowth);
      if (field === 'grantVariation') assumptions.funding.grantVariation = toNumber(row.value, assumptions.funding.grantVariation);
      if (field === 'feesChargesElasticity') assumptions.funding.feesChargesElasticity = toNumber(row.value, assumptions.funding.feesChargesElasticity);
    }
    if (section === 'expenditure') {
      if (field === 'payAward') assumptions.expenditure.payAward = toNumber(row.value, assumptions.expenditure.payAward);
      if (field === 'nonPayInflation') assumptions.expenditure.nonPayInflation = toNumber(row.value, assumptions.expenditure.nonPayInflation);
      if (field === 'ascDemandGrowth') assumptions.expenditure.ascDemandGrowth = toNumber(row.value, assumptions.expenditure.ascDemandGrowth);
      if (field === 'cscDemandGrowth') assumptions.expenditure.cscDemandGrowth = toNumber(row.value, assumptions.expenditure.cscDemandGrowth);
      if (field === 'savingsDeliveryRisk') assumptions.expenditure.savingsDeliveryRisk = Math.max(0, Math.min(100, toNumber(row.value, assumptions.expenditure.savingsDeliveryRisk)));
      if (field === 'payAwardByFundingSource.general_fund') assumptions.expenditure.payAwardByFundingSource.general_fund = toNumber(row.value, assumptions.expenditure.payAwardByFundingSource.general_fund);
      if (field === 'payAwardByFundingSource.grant') assumptions.expenditure.payAwardByFundingSource.grant = toNumber(row.value, assumptions.expenditure.payAwardByFundingSource.grant);
      if (field === 'payAwardByFundingSource.other') assumptions.expenditure.payAwardByFundingSource.other = toNumber(row.value, assumptions.expenditure.payAwardByFundingSource.other);
      if (field === 'payGroupSensitivity.default') assumptions.expenditure.payGroupSensitivity.default = toNumber(row.value, assumptions.expenditure.payGroupSensitivity.default);
      if (field === 'payGroupSensitivity.teachers') assumptions.expenditure.payGroupSensitivity.teachers = toNumber(row.value, assumptions.expenditure.payGroupSensitivity.teachers);
      if (field === 'payGroupSensitivity.njc') assumptions.expenditure.payGroupSensitivity.njc = toNumber(row.value, assumptions.expenditure.payGroupSensitivity.njc);
      if (field === 'payGroupSensitivity.senior') assumptions.expenditure.payGroupSensitivity.senior = toNumber(row.value, assumptions.expenditure.payGroupSensitivity.senior);
      if (field === 'payGroupSensitivity.other') assumptions.expenditure.payGroupSensitivity.other = toNumber(row.value, assumptions.expenditure.payGroupSensitivity.other);
    }
    if (section === 'policy') {
      if (field === 'annualSavingsTarget') assumptions.policy.annualSavingsTarget = toNumber(row.value, assumptions.policy.annualSavingsTarget);
      if (field === 'reservesUsage') assumptions.policy.reservesUsage = toNumber(row.value, assumptions.policy.reservesUsage);
      if (field === 'socialCareProtection') assumptions.policy.socialCareProtection = toBoolean(row.value, assumptions.policy.socialCareProtection);
    }
    if (section === 'advanced') {
      if (field === 'realTermsToggle') assumptions.advanced.realTermsToggle = toBoolean(row.value, assumptions.advanced.realTermsToggle);
      if (field === 'inflationRate') assumptions.advanced.inflationRate = toNumber(row.value, assumptions.advanced.inflationRate);
    }
  }

  const baseline: BaselineData = JSON.parse(JSON.stringify(DEFAULT_BASELINE)) as BaselineData;
  for (const row of coreRows) {
    const field = String(row.field || '').trim();
    if (!field) continue;
    if (field === 'councilTax') baseline.councilTax = toNumber(row.value, baseline.councilTax);
    if (field === 'businessRates') baseline.businessRates = toNumber(row.value, baseline.businessRates);
    if (field === 'coreGrants') baseline.coreGrants = toNumber(row.value, baseline.coreGrants);
    if (field === 'feesAndCharges') baseline.feesAndCharges = toNumber(row.value, baseline.feesAndCharges);
    if (field === 'pay') baseline.pay = toNumber(row.value, baseline.pay);
    if (field === 'nonPay') baseline.nonPay = toNumber(row.value, baseline.nonPay);
    if (field === 'ascDemandLed') baseline.ascDemandLed = toNumber(row.value, baseline.ascDemandLed);
    if (field === 'cscDemandLed') baseline.cscDemandLed = toNumber(row.value, baseline.cscDemandLed);
    if (field === 'otherServiceExp') baseline.otherServiceExp = toNumber(row.value, baseline.otherServiceExp);
    if (field === 'generalFundReserves') baseline.generalFundReserves = toNumber(row.value, baseline.generalFundReserves);
    if (field === 'earmarkedReserves') baseline.earmarkedReserves = toNumber(row.value, baseline.earmarkedReserves);
    if (field === 'reservesMinimumThreshold') baseline.reservesMinimumThreshold = toNumber(row.value, baseline.reservesMinimumThreshold);
  }
  for (const row of settingsRows) {
    const path = String(row.path || '').trim();
    if (!path) continue;
    applySettingPath(baseline, path, row.value);
  }

  baseline.customServiceLines = customRows
    .filter((r) => toText(r.name).trim().length > 0)
    .map((r, idx) => ({
      id: toText(r.id, `custom-${Date.now()}-${idx}`),
      name: toText(r.name, `Custom line ${idx + 1}`),
      category: toText(r.category, 'other') as BaselineData['customServiceLines'][number]['category'],
      baseValue: toNumber(r.baseValue, 0),
      inflationDriver: toText(r.inflationDriver, 'manual') as BaselineData['customServiceLines'][number]['inflationDriver'],
      manualInflationRate: toNumber(r.manualInflationRate, 0),
      demandGrowthRate: toNumber(r.demandGrowthRate, 0),
      isRecurring: toBoolean(r.isRecurring, true),
      notes: toText(r.notes, ''),
    }));

  baseline.namedReserves = reserveRows
    .filter((r) => toText(r.name).trim().length > 0)
    .map((r, idx) => ({
      id: toText(r.id, `reserve-${Date.now()}-${idx}`),
      name: toText(r.name, `Reserve ${idx + 1}`),
      purpose: toText(r.purpose, ''),
      openingBalance: toNumber(r.openingBalance, 0),
      plannedContributions: tuple5(r.contribY1, r.contribY2, r.contribY3, r.contribY4, r.contribY5),
      plannedDrawdowns: tuple5(r.drawY1, r.drawY2, r.drawY3, r.drawY4, r.drawY5),
      isEarmarked: toBoolean(r.isEarmarked, true),
      minimumBalance: toNumber(r.minimumBalance, 0),
    }));

  baseline.grantSchedule = grantRows
    .filter((r) => toText(r.name).trim().length > 0)
    .map((r, idx) => ({
      id: toText(r.id, `grant-${Date.now()}-${idx}`),
      name: toText(r.name, `Grant ${idx + 1}`),
      value: toNumber(r.value, 0),
      certainty: toText(r.certainty, 'assumed') as BaselineData['grantSchedule'][number]['certainty'],
      endYear: Math.max(1, Math.min(5, Math.round(toNumber(r.endYear, 5)))) as 1 | 2 | 3 | 4 | 5,
    }));

  baseline.paySpineConfig.rows = payRows
    .filter((r) => toText(r.grade).trim().length > 0)
    .map((r, idx) => ({
      id: toText(r.id, `pay-${Date.now()}-${idx}`),
      grade: toText(r.grade, `Grade ${idx + 1}`),
      fte: toNumber(r.fte, 0),
      spinePointCost: toNumber(r.spinePointCost, 0),
    }));

  baseline.contractIndexationTracker.contracts = contractRows
    .filter((r) => toText(r.name).trim().length > 0)
    .map((r, idx) => ({
      id: toText(r.id, `contract-${Date.now()}-${idx}`),
      name: toText(r.name, `Contract ${idx + 1}`),
      value: toNumber(r.value, 0),
      clause: toText(r.clause, 'bespoke') as BaselineData['contractIndexationTracker']['contracts'][number]['clause'],
      bespokeRate: toNumber(r.bespokeRate, 0),
      effectiveFromYear: Math.max(1, Math.min(5, Math.round(toNumber(r.effectiveFromYear, 1)))) as 1 | 2 | 3 | 4 | 5,
      reviewMonth: Math.max(1, Math.min(12, Math.round(toNumber(r.reviewMonth, 4)))),
      upliftMethod: toText(r.upliftMethod, 'cpi') as BaselineData['contractIndexationTracker']['contracts'][number]['upliftMethod'],
      fixedRate: toNumber(r.fixedRate, 0),
      customRate: toNumber(r.customRate, toNumber(r.bespokeRate, 0)),
      phaseInMonths: Math.max(0, Math.min(12, Math.round(toNumber(r.phaseInMonths, 0)))),
    }));

  baseline.investToSave.proposals = investRows
    .filter((r) => toText(r.name).trim().length > 0)
    .map((r, idx) => ({
      id: toText(r.id, `invest-${Date.now()}-${idx}`),
      name: toText(r.name, `Invest-to-save ${idx + 1}`),
      upfrontCost: toNumber(r.upfrontCost, 0),
      annualSaving: toNumber(r.annualSaving, 0),
      paybackYears: toNumber(r.paybackYears, 0),
      deliveryYear: Math.max(1, Math.min(5, Math.round(toNumber(r.deliveryYear, 1)))) as 1 | 2 | 3 | 4 | 5,
    }));

  baseline.incomeGenerationWorkbook.lines = incomeRows
    .filter((r) => toText(r.name).trim().length > 0)
    .map((r, idx) => ({
      id: toText(r.id, `income-${Date.now()}-${idx}`),
      name: toText(r.name, `Income line ${idx + 1}`),
      baseVolume: toNumber(r.baseVolume, 0),
      basePrice: toNumber(r.basePrice, 0),
      volumeGrowth: toNumber(r.volumeGrowth, 0),
      priceGrowth: toNumber(r.priceGrowth, 0),
    }));

  const savingsProposals = savingsRows
    .filter((r) => toText(r.name).trim().length > 0)
    .map((r, idx) => ({
      id: toText(r.id, `saving-${Date.now()}-${idx}`),
      name: toText(r.name, `Saving ${idx + 1}`),
      description: toText(r.description, ''),
      category: toText(r.category, 'efficiency') as ModelSnapshot['savingsProposals'][number]['category'],
      grossValue: toNumber(r.grossValue, 0),
      deliveryYear: Math.max(1, Math.min(5, Math.round(toNumber(r.deliveryYear, 1)))) as 1 | 2 | 3 | 4 | 5,
      achievementRate: Math.max(0, Math.min(100, toNumber(r.achievementRate, 100))),
      isRecurring: toBoolean(r.isRecurring, true),
      ragStatus: toText(r.ragStatus, 'amber') as ModelSnapshot['savingsProposals'][number]['ragStatus'],
      responsibleOfficer: toText(r.responsibleOfficer, ''),
      yearlyDelivery: tuple5(r.Y1, r.Y2, r.Y3, r.Y4, r.Y5),
    }));

  const authorityConfig = JSON.parse(JSON.stringify(DEFAULT_AUTHORITY_CONFIG)) as ModelSnapshot['authorityConfig'];
  for (const row of authorityRows) {
    const field = String(row.field || '').trim();
    if (!field) continue;
    if (field === 'authorityName') authorityConfig.authorityName = toText(row.value, authorityConfig.authorityName);
    if (field === 'section151Officer') authorityConfig.section151Officer = toText(row.value, authorityConfig.section151Officer);
    if (field === 'chiefExecutive') authorityConfig.chiefExecutive = toText(row.value, authorityConfig.chiefExecutive);
    if (field === 'reportingPeriod') authorityConfig.reportingPeriod = toText(row.value, authorityConfig.reportingPeriod);
    if (field === 'reportDate') authorityConfig.reportDate = toText(row.value, authorityConfig.reportDate);
    if (field === 'authorityType') authorityConfig.authorityType = toText(row.value, authorityConfig.authorityType);
    if (field === 'population') authorityConfig.population = toNumber(row.value, authorityConfig.population);
    if (field === 'strategicPriority1') authorityConfig.strategicPriority1 = toText(row.value, authorityConfig.strategicPriority1);
    if (field === 'strategicPriority2') authorityConfig.strategicPriority2 = toText(row.value, authorityConfig.strategicPriority2);
    if (field === 'strategicPriority3') authorityConfig.strategicPriority3 = toText(row.value, authorityConfig.strategicPriority3);
  }

  const scenarios: Scenario[] = scenarioRows
    .filter((r) => toText(r.name).trim().length > 0)
    .map((r, idx) => {
      const scenarioAssumptions: Assumptions = {
        funding: {
          councilTaxIncrease: toNumber(r.councilTaxIncrease, assumptions.funding.councilTaxIncrease),
          businessRatesGrowth: toNumber(r.businessRatesGrowth, assumptions.funding.businessRatesGrowth),
          grantVariation: toNumber(r.grantVariation, assumptions.funding.grantVariation),
          feesChargesElasticity: toNumber(r.feesChargesElasticity, assumptions.funding.feesChargesElasticity),
        },
        expenditure: {
          payAward: toNumber(r.payAward, assumptions.expenditure.payAward),
          nonPayInflation: toNumber(r.nonPayInflation, assumptions.expenditure.nonPayInflation),
          ascDemandGrowth: toNumber(r.ascDemandGrowth, assumptions.expenditure.ascDemandGrowth),
          cscDemandGrowth: toNumber(r.cscDemandGrowth, assumptions.expenditure.cscDemandGrowth),
          savingsDeliveryRisk: Math.max(0, Math.min(100, toNumber(r.savingsDeliveryRisk, assumptions.expenditure.savingsDeliveryRisk))),
          payAwardByFundingSource: {
            general_fund: toNumber(r.payAwardByFundingSourceGeneralFund, assumptions.expenditure.payAwardByFundingSource.general_fund),
            grant: toNumber(r.payAwardByFundingSourceGrant, assumptions.expenditure.payAwardByFundingSource.grant),
            other: toNumber(r.payAwardByFundingSourceOther, assumptions.expenditure.payAwardByFundingSource.other),
          },
          payGroupSensitivity: {
            default: toNumber(r.payGroupSensitivityDefault, assumptions.expenditure.payGroupSensitivity.default),
            teachers: toNumber(r.payGroupSensitivityTeachers, assumptions.expenditure.payGroupSensitivity.teachers),
            njc: toNumber(r.payGroupSensitivityNJC, assumptions.expenditure.payGroupSensitivity.njc),
            senior: toNumber(r.payGroupSensitivitySenior, assumptions.expenditure.payGroupSensitivity.senior),
            other: toNumber(r.payGroupSensitivityOther, assumptions.expenditure.payGroupSensitivity.other),
          },
        },
        policy: {
          annualSavingsTarget: toNumber(r.annualSavingsTarget, assumptions.policy.annualSavingsTarget),
          reservesUsage: toNumber(r.reservesUsage, assumptions.policy.reservesUsage),
          socialCareProtection: toBoolean(r.socialCareProtection, assumptions.policy.socialCareProtection),
        },
        advanced: {
          realTermsToggle: toBoolean(r.realTermsToggle, assumptions.advanced.realTermsToggle),
          inflationRate: toNumber(r.inflationRate, assumptions.advanced.inflationRate),
        },
      };
      const scenarioResult = runCalculations(scenarioAssumptions, baseline, savingsProposals);
      return {
        id: toText(r.id, `scenario-${Date.now()}-${idx}`),
        name: toText(r.name, `Scenario ${idx + 1}`),
        description: toText(r.description, ''),
        type: toText(r.type, 'custom') as Scenario['type'],
        assumptions: scenarioAssumptions,
        result: scenarioResult,
        createdAt: toText(r.createdAt, new Date().toISOString()),
        color: toText(r.color, '#3b82f6'),
      };
    });

  const meta = Object.fromEntries(metaRows.map((r) => [String(r.key || ''), r.value]));
  const snapshot: ModelSnapshot = {
    id: toText(meta.snapshot_id, `snapshot-${Date.now()}`),
    name: toText(meta.snapshot_name, 'Imported Snapshot'),
    description: toText(meta.description, ''),
    createdAt: toText(meta.created_at, new Date().toISOString()),
    assumptions,
    baseline,
    savingsProposals,
    authorityConfig,
    scenarios,
    metadata: {
      appVersion: toText(meta.app_version, 'v7.0'),
      notes: toText(meta.notes, ''),
    },
  };
  return snapshot;
}

function parseJsonFallbackSnapshot(xlsx: XlsxModule, workbook: ReturnType<XlsxModule['read']>): ModelSnapshot | null {
  const fallbackRows = getRows<{ json: string }>(xlsx, workbook, SHEET_JSON_FALLBACK);
  const first = fallbackRows[0]?.json;
  if (!first) return null;
  try {
    return JSON.parse(first) as ModelSnapshot;
  } catch {
    return null;
  }
}

export async function importSnapshotFromWorkbookFile(file: File): Promise<{ success: true; snapshot: ModelSnapshot } | { success: false; message: string }> {
  try {
    const xlsx = await import('xlsx');
    const data = await file.arrayBuffer();
    const workbook = xlsx.read(data, { type: 'array' });

    const editable = parseEditableWorkbookToSnapshot(xlsx, workbook);
    if (editable) return { success: true, snapshot: editable };

    const fallback = parseJsonFallbackSnapshot(xlsx, workbook);
    if (fallback) return { success: true, snapshot: fallback };

    return { success: false, message: 'Workbook did not contain editable snapshot sheets or valid fallback JSON.' };
  } catch {
    return { success: false, message: 'Could not parse snapshot spreadsheet. Ensure the file is a valid MTFS snapshot workbook.' };
  }
}
