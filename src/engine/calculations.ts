import type {
  Assumptions,
  YearProfile5,
  BaselineData,
  MTFSResult,
  YearResult,
  RiskFactor,
  Insight,
  CustomServiceLine,
  SavingsProposal,
  NamedReserve,
  ReserveCategory,
  CustomLineYearResult,
  NamedReserveYearResult,
  SavingsProposalYearResult,
  MonteCarloSummary,
} from '../types/financial';
import { migratePaySpineRowsToWorkforcePosts } from '../utils/workforcePay';

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_BASELINE: BaselineData = {
  // Funding baseline totals exactly £414.0m
  councilTax: 168_000,
  businessRates: 92_000,
  coreGrants: 102_000,
  feesAndCharges: 52_000,
  // Expenditure baseline tuned so default scenario is balanced across 5 years
  pay: 195_000,
  nonPay: 88_000,
  ascDemandLed: 63_000,
  cscDemandLed: 24_000,
  otherServiceExp: 16_000,
  generalFundReserves: 14_200,
  earmarkedReserves: 8_800,
  reservesMinimumThreshold: 8_000,
  customServiceLines: [],
  namedReserves: [],
  councilTaxBaseConfig: {
    enabled: false,
    bandDEquivalentDwellings: 50_000,
    bandDCharge: 1_970,
    collectionRate: 98,
    parishPrecepts: 0,
    corePreceptPct: 2.99,
    ascPreceptPct: 2.0,
    collectionFundSurplusDeficit: 0,
  },
  businessRatesConfig: {
    enabled: false,
    baselineRates: 92_000,
    growthRate: { y1: 2, y2: 2, y3: 2, y4: 2, y5: 2 },
    appealsProvision: 0,
    tariffTopUp: 0,
    levySafetyNet: 0,
    poolingGain: 0,
    collectionFundAdjustment: 0,
    resetAdjustment: 0,
    resetYear: 3,
  },
  grantSchedule: [],
  ascCohortModel: {
    enabled: false,
    population18to64: 120_000,
    population65plus: 48_000,
    prevalence18to64: 1.9,
    prevalence65plus: 17,
    unitCost18to64: 16_500,
    unitCost65plus: 8_200,
    growth18to64: 2.5,
    growth65plus: 3.8,
  },
  capitalFinancing: {
    enabled: false,
    borrowingByYear: [0, 0, 0, 0, 0],
    interestRate: 4.5,
    mrpRate: 2.0,
  },
  riskBasedReserves: {
    enabled: false,
    adoptAsMinimumThreshold: false,
    demandVolatility: 1_200,
    savingsNonDelivery: 1_000,
    fundingUncertainty: 900,
    litigationRisk: 600,
  },
  reservesRecoveryPlan: {
    enabled: false,
    targetYear: 5,
    targetLevel: 10_000,
    annualContribution: 0,
    autoCalculate: true,
  },
  paySpineConfig: {
    enabled: false,
    rows: [],
  },
  workforceModel: {
    enabled: false,
    mode: 'baseline',
    posts: [],
  },
  contractIndexationTracker: {
    enabled: false,
    indexAssumptions: {
      cpi: { y1: 3, y2: 3, y3: 3, y4: 3, y5: 3 },
      rpi: { y1: 4, y2: 4, y3: 4, y4: 4, y5: 4 },
      nmw: { y1: 6, y2: 5, y3: 4, y4: 4, y5: 4 },
      fixed: { y1: 3, y2: 3, y3: 3, y4: 3, y5: 3 },
      bespoke: { y1: 3, y2: 3, y3: 3, y4: 3, y5: 3 },
    },
    contracts: [],
  },
  investToSave: {
    enabled: false,
    proposals: [],
  },
  incomeGenerationWorkbook: {
    enabled: false,
    lines: [],
  },
  growthProposals: [],
  manualAdjustments: [],
  importMappingProfiles: [],
  overlayImports: [],
  reservesAdequacyMethodology: {
    method: 'fixed',
    fixedMinimum: 8_000,
    pctOfNetBudget: 5,
  },
  treasuryIndicators: {
    enabled: false,
    authorisedLimit: 120_000,
    operationalBoundary: 105_000,
    netFinancingNeed: 95_000,
  },
  mrpCalculator: {
    enabled: false,
    policy: 'asset-life',
    baseBorrowing: 75_000,
    assetLifeYears: 40,
    annuityRate: 3.5,
  },
};

function profileOrDefault(value: YearProfile5 | number | undefined, fallback: YearProfile5): YearProfile5 {
  if (typeof value === 'number') return { y1: value, y2: value, y3: value, y4: value, y5: value };
  if (!value) return { ...fallback };
  return {
    y1: Number.isFinite(value.y1) ? value.y1 : fallback.y1,
    y2: Number.isFinite(value.y2) ? value.y2 : fallback.y2,
    y3: Number.isFinite(value.y3) ? value.y3 : fallback.y3,
    y4: Number.isFinite(value.y4) ? value.y4 : fallback.y4,
    y5: Number.isFinite(value.y5) ? value.y5 : fallback.y5,
  };
}

export function normalizeBaseline(baselineInput: BaselineData | Partial<BaselineData> | undefined | null): BaselineData {
  const source = (baselineInput ?? {}) as Partial<BaselineData>;
  const businessRatesConfig = source.businessRatesConfig ?? DEFAULT_BASELINE.businessRatesConfig;
  const contractTracker = source.contractIndexationTracker ?? DEFAULT_BASELINE.contractIndexationTracker;
  const legacyPayPosts = migratePaySpineRowsToWorkforcePosts(source.paySpineConfig?.rows, source.workforceModel?.posts ?? []);
  const workforcePosts = [...(source.workforceModel?.posts ?? []), ...legacyPayPosts];

  return {
    ...DEFAULT_BASELINE,
    ...source,
    customServiceLines: source.customServiceLines ?? [],
    namedReserves: (source.namedReserves ?? []).map((reserve) => {
      const category = reserveCategoryOf(reserve);
      return { ...reserve, category, isEarmarked: category !== 'general_fund' };
    }),
    grantSchedule: source.grantSchedule ?? [],
    growthProposals: source.growthProposals ?? [],
    manualAdjustments: source.manualAdjustments ?? [],
    importMappingProfiles: source.importMappingProfiles ?? [],
    overlayImports: source.overlayImports ?? [],
    councilTaxBaseConfig: {
      ...DEFAULT_BASELINE.councilTaxBaseConfig,
      ...(source.councilTaxBaseConfig ?? {}),
    },
    businessRatesConfig: {
      ...DEFAULT_BASELINE.businessRatesConfig,
      ...businessRatesConfig,
      growthRate: profileOrDefault(businessRatesConfig.growthRate, DEFAULT_BASELINE.businessRatesConfig.growthRate),
    },
    ascCohortModel: {
      ...DEFAULT_BASELINE.ascCohortModel,
      ...(source.ascCohortModel ?? {}),
    },
    capitalFinancing: {
      ...DEFAULT_BASELINE.capitalFinancing,
      ...(source.capitalFinancing ?? {}),
      borrowingByYear: source.capitalFinancing?.borrowingByYear ?? [...DEFAULT_BASELINE.capitalFinancing.borrowingByYear],
    },
    riskBasedReserves: {
      ...DEFAULT_BASELINE.riskBasedReserves,
      ...(source.riskBasedReserves ?? {}),
    },
    reservesRecoveryPlan: {
      ...DEFAULT_BASELINE.reservesRecoveryPlan,
      ...(source.reservesRecoveryPlan ?? {}),
    },
    paySpineConfig: {
      ...DEFAULT_BASELINE.paySpineConfig,
      ...(source.paySpineConfig ?? {}),
      rows: source.paySpineConfig?.rows ?? [],
    },
    workforceModel: {
      ...DEFAULT_BASELINE.workforceModel,
      ...(source.workforceModel ?? {}),
      enabled: workforcePosts.length > 0,
      mode: workforcePosts.length > 0 ? 'workforce_posts' : 'baseline',
      posts: workforcePosts,
    },
    contractIndexationTracker: {
      ...DEFAULT_BASELINE.contractIndexationTracker,
      ...contractTracker,
      indexAssumptions: {
        cpi: profileOrDefault(contractTracker.indexAssumptions?.cpi, DEFAULT_BASELINE.contractIndexationTracker.indexAssumptions.cpi),
        rpi: profileOrDefault(contractTracker.indexAssumptions?.rpi, DEFAULT_BASELINE.contractIndexationTracker.indexAssumptions.rpi),
        nmw: profileOrDefault(contractTracker.indexAssumptions?.nmw, DEFAULT_BASELINE.contractIndexationTracker.indexAssumptions.nmw),
        fixed: profileOrDefault(contractTracker.indexAssumptions?.fixed, DEFAULT_BASELINE.contractIndexationTracker.indexAssumptions.fixed),
        bespoke: profileOrDefault(contractTracker.indexAssumptions?.bespoke, DEFAULT_BASELINE.contractIndexationTracker.indexAssumptions.bespoke),
      },
      contracts: contractTracker.contracts ?? [],
    },
    investToSave: {
      ...DEFAULT_BASELINE.investToSave,
      ...(source.investToSave ?? {}),
      proposals: source.investToSave?.proposals ?? [],
    },
    incomeGenerationWorkbook: {
      ...DEFAULT_BASELINE.incomeGenerationWorkbook,
      ...(source.incomeGenerationWorkbook ?? {}),
      lines: source.incomeGenerationWorkbook?.lines ?? [],
    },
    reservesAdequacyMethodology: {
      ...DEFAULT_BASELINE.reservesAdequacyMethodology,
      ...(source.reservesAdequacyMethodology ?? {}),
    },
    treasuryIndicators: {
      ...DEFAULT_BASELINE.treasuryIndicators,
      ...(source.treasuryIndicators ?? {}),
    },
    mrpCalculator: {
      ...DEFAULT_BASELINE.mrpCalculator,
      ...(source.mrpCalculator ?? {}),
    },
  };
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  funding: {
    councilTaxIncrease: { y1: 4.99, y2: 4.99, y3: 4.99, y4: 4.99, y5: 4.99 },
    businessRatesGrowth: { y1: 2.0, y2: 2.0, y3: 2.0, y4: 2.0, y5: 2.0 },
    grantVariation: { y1: -1.5, y2: -1.5, y3: -1.5, y4: -1.5, y5: -1.5 },
    feesChargesElasticity: { y1: 2.5, y2: 2.5, y3: 2.5, y4: 2.5, y5: 2.5 },
  },
  expenditure: {
    payAward: { y1: 3.5, y2: 3.5, y3: 3.5, y4: 3.5, y5: 3.5 },
    nonPayInflation: { y1: 3.0, y2: 3.0, y3: 3.0, y4: 3.0, y5: 3.0 },
    ascDemandGrowth: { y1: 5.5, y2: 5.5, y3: 5.5, y4: 5.5, y5: 5.5 },
    cscDemandGrowth: { y1: 4.0, y2: 4.0, y3: 4.0, y4: 4.0, y5: 4.0 },
    savingsDeliveryRisk: { y1: 85, y2: 85, y3: 85, y4: 85, y5: 85 },
    payAwardByFundingSource: {
      general_fund: 3.5,
      grant: 3.5,
      other: 3.5,
    },
    payGroupSensitivity: {
      default: 0,
      teachers: 0,
      njc: 0,
      senior: 0,
      other: 0,
    },
  },
  policy: {
    annualSavingsTarget: { y1: 0, y2: 0, y3: 0, y4: 0, y5: 0 },
    reservesUsage: { y1: 0, y2: 0, y3: 0, y4: 0, y5: 0 },
    socialCareProtection: true,
  },
  advanced: {
    realTermsToggle: false,
    inflationRate: 3.0,
  },
};

export const DEFAULT_AUTHORITY_CONFIG = {
  authorityName: 'Example Unitary Authority',
  section151Officer: 'Director of Finance',
  chiefExecutive: 'Chief Executive',
  reportingPeriod: `${new Date().getFullYear()}/${String(new Date().getFullYear() + 1).slice(2)} – ${new Date().getFullYear() + 4}/${String(new Date().getFullYear() + 5).slice(2)}`,
  reportDate: new Date().toISOString().split('T')[0],
  authorityType: 'Unitary Authority',
  population: 320_000,
  strategicPriority1: 'Protect vulnerable residents',
  strategicPriority2: 'Inclusive local growth',
  strategicPriority3: 'Neighbourhood and climate resilience',
};

const YEARS = 5;
const EMPTY_SOURCE_TOTALS = { general_fund: 0, grant: 0, other: 0 };
const EMPTY_GROUP_TOTALS = { default: 0, teachers: 0, njc: 0, senior: 0, other: 0 };

function reserveCategoryOf(reserve: Pick<NamedReserve, 'category' | 'isEarmarked'>): ReserveCategory {
  return reserve.category ?? (reserve.isEarmarked ? 'service_specific' : 'general_fund');
}

function reserveTotalsByCategory(results: NamedReserveYearResult[]): Record<ReserveCategory, number> {
  return results.reduce<Record<ReserveCategory, number>>((acc, reserve) => {
    acc[reserve.category] += reserve.closingBalance;
    return acc;
  }, { general_fund: 0, service_specific: 0, ringfenced: 0, technical: 0 });
}

function yearValue(profile: YearProfile5 | number, year: number): number {
  if (typeof profile === 'number') return profile;
  const y = Math.max(1, Math.min(5, year));
  return profile[`y${y}` as keyof YearProfile5];
}

function normalizeYearProfile(profile: YearProfile5 | number): YearProfile5 {
  if (typeof profile === 'number') {
    return { y1: profile, y2: profile, y3: profile, y4: profile, y5: profile };
  }
  return profile;
}

function compoundFactor(profile: YearProfile5 | number, year: number): number {
  if (year <= 0) return 1;
  if (typeof profile === 'number') return Math.pow(1 + profile / 100, year);
  let factor = 1;
  for (let i = 1; i <= year; i += 1) {
    factor *= 1 + yearValue(profile, i) / 100;
  }
  return factor;
}

function bumpProfile(profile: YearProfile5 | number, delta: number): YearProfile5 {
  if (typeof profile === 'number') {
    const value = profile + delta;
    return { y1: value, y2: value, y3: value, y4: value, y5: value };
  }
  return {
    y1: profile.y1 + delta,
    y2: profile.y2 + delta,
    y3: profile.y3 + delta,
    y4: profile.y4 + delta,
    y5: profile.y5 + delta,
  };
}

// ─── CSV Import helper (Item 2) ───────────────────────────────────────────────

export interface CsvImportResult {
  success: boolean;
  baseline?: Partial<BaselineData>;
  errors: string[];
}

const BASELINE_FIELD_MAP: Record<string, keyof BaselineData> = {
  counciltax: 'councilTax',
  council_tax: 'councilTax',
  businessrates: 'businessRates',
  business_rates: 'businessRates',
  coregrants: 'coreGrants',
  core_grants: 'coreGrants',
  feesandcharges: 'feesAndCharges',
  fees_and_charges: 'feesAndCharges',
  pay: 'pay',
  nonpay: 'nonPay',
  non_pay: 'nonPay',
  ascdemandled: 'ascDemandLed',
  asc_demand_led: 'ascDemandLed',
  cscdemandled: 'cscDemandLed',
  csc_demand_led: 'cscDemandLed',
  otherserviceexp: 'otherServiceExp',
  other_service_exp: 'otherServiceExp',
  generalfundreserves: 'generalFundReserves',
  general_fund_reserves: 'generalFundReserves',
  earmarkedreserves: 'earmarkedReserves',
  earmarked_reserves: 'earmarkedReserves',
  reservesminimumthreshold: 'reservesMinimumThreshold',
  reserves_minimum_threshold: 'reservesMinimumThreshold',
};

function normalizeFieldName(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
}

function parseNumeric(value: string): number | null {
  const num = parseFloat(value.replace(/[£,\s]/g, ''));
  return Number.isFinite(num) ? num : null;
}

function parseTabularBaseline(rows: string[][]): CsvImportResult {
  const errors: string[] = [];
  if (rows.length < 2) {
    return { success: false, errors: ['Import must include headers and at least one data row'] };
  }

  const headers = rows[0].map((h) => normalizeFieldName(h));
  const partial: Partial<BaselineData> = {};

  // Standard wide format: row 1 headers + row 2 values
  let mappedCount = 0;
  headers.forEach((h, i) => {
    const field = BASELINE_FIELD_MAP[h];
    if (field) {
      const num = parseNumeric((rows[1]?.[i] ?? '').trim());
      if (num !== null) {
        (partial as Record<string, number>)[field] = num;
        mappedCount += 1;
      } else {
        errors.push(`Could not parse value for "${rows[0]?.[i] ?? h}"`);
      }
    }
  });

  // Long / multi-year format: first column is line name, following columns are years
  if (mappedCount === 0) {
    for (let r = 1; r < rows.length; r += 1) {
      const row = rows[r];
      const nameRaw = row[0] ?? '';
      const field = BASELINE_FIELD_MAP[normalizeFieldName(nameRaw)];
      if (!field) continue;

      // Use first numeric year column as baseline
      const numericValue = row
        .slice(1)
        .map((v) => parseNumeric(v.trim()))
        .find((v): v is number => v !== null);

      if (numericValue !== undefined) {
        (partial as Record<string, number>)[field] = numericValue;
        mappedCount += 1;
      } else {
        errors.push(`No numeric year values found for "${nameRaw}"`);
      }
    }
  }

  if (mappedCount === 0) {
    errors.push('No recognised baseline fields were found in the import file');
  }

  return { success: errors.length === 0, baseline: partial, errors };
}

/** Parse CSV/TSV text with baseline field headers or line-name rows. */
export function parseBaselineCsv(csvText: string): CsvImportResult {
  const lines = csvText
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { success: false, errors: ['CSV must have a header row and at least one data row'] };
  }
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const rows = lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
  return parseTabularBaseline(rows);
}

/** Parse spreadsheet files exported from Excel (.xlsx/.xls). */
export async function parseBaselineSpreadsheet(file: File): Promise<CsvImportResult> {
  try {
    const { read, utils } = await import('xlsx');
    const data = await file.arrayBuffer();
    const workbook = read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, errors: ['Spreadsheet contains no sheets'] };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 })
      .map((row) => row.map((cell) => String(cell ?? '').trim()))
      .filter((row) => row.some((cell) => cell.length > 0));

    return parseTabularBaseline(rows);
  } catch {
    return { success: false, errors: ['Could not parse spreadsheet file. Please check the file format.'] };
  }
}

// ─── Inflation driver resolver ────────────────────────────────────────────────

function resolveInflationRate(
  line: CustomServiceLine,
  assumptions: Assumptions,
  year: number
): number {
  switch (line.inflationDriver) {
    case 'pay': return yearValue(assumptions.expenditure.payAward, year);
    case 'cpi': return yearValue(assumptions.expenditure.nonPayInflation, year);
    case 'asc-demand': return yearValue(assumptions.expenditure.ascDemandGrowth, year);
    case 'csc-demand': return yearValue(assumptions.expenditure.cscDemandGrowth, year);
    case 'manual': return line.manualInflationRate;
    default: return yearValue(assumptions.expenditure.nonPayInflation, year);
  }
}

// ─── Named reserves engine (Item 15) ─────────────────────────────────────────

function runNamedReservesYear(
  reserves: NamedReserve[],
  openingBalances: Map<string, number>,
  year: number
): {
  results: NamedReserveYearResult[];
  totalGF: number;
  totalEM: number;
  closingBalances: Map<string, number>;
} {
  const results: NamedReserveYearResult[] = [];
  const closingBalances = new Map<string, number>();
  let totalGF = 0;
  let totalEM = 0;

  for (const r of reserves) {
    const opening = openingBalances.get(r.id) ?? r.openingBalance;
    const category = reserveCategoryOf(r);
    const contribution = r.plannedContributions[year - 1] ?? 0;
    const drawdown = Math.min(r.plannedDrawdowns[year - 1] ?? 0, opening + contribution);
    const closing = Math.max(0, opening + contribution - drawdown);
    closingBalances.set(r.id, closing);
    results.push({ id: r.id, name: r.name, category, openingBalance: opening, contribution, drawdown, closingBalance: closing, isEarmarked: category !== 'general_fund' });
    if (category !== 'general_fund') {
      totalEM += closing;
    } else {
      totalGF += closing;
    }
  }

  return { results, totalGF, totalEM, closingBalances };
}

// ─── Savings programme engine (Items 10, 11) ──────────────────────────────────

function computeSavingsForYear(
  proposals: SavingsProposal[],
  year: number
): {
  results: SavingsProposalYearResult[];
  totalDelivered: number;
  recurringDelivered: number;
  oneOffDelivered: number;
} {
  let totalDelivered = 0;
  let recurringDelivered = 0;
  let oneOffDelivered = 0;
  const results: SavingsProposalYearResult[] = [];

  for (const p of proposals) {
    const yearlyPct = (p.yearlyDelivery[year - 1] ?? 0) / 100;
    const achievementFactor = p.achievementRate / 100;
    const delivered = p.grossValue * yearlyPct * achievementFactor;

    totalDelivered += delivered;
    if (p.isRecurring) {
      recurringDelivered += delivered;
    } else {
      oneOffDelivered += delivered;
    }

    results.push({
      id: p.id,
      name: p.name,
      category: p.category,
      grossValue: p.grossValue * yearlyPct,
      deliveredValue: delivered,
      isRecurring: p.isRecurring,
      ragStatus: p.ragStatus,
    });
  }

  return { results, totalDelivered, recurringDelivered, oneOffDelivered };
}

function grantCertaintyFactor(certainty: 'confirmed' | 'indicative' | 'assumed'): number {
  if (certainty === 'confirmed') return 1;
  if (certainty === 'indicative') return 0.75;
  return 0.5;
}

function computeRecommendedMinimumReserves(baseline: BaselineData): number {
  if (!baseline.riskBasedReserves.enabled) return baseline.reservesMinimumThreshold;
  const cfg = baseline.riskBasedReserves;
  return cfg.demandVolatility + cfg.savingsNonDelivery + cfg.fundingUncertainty + cfg.litigationRisk;
}

function resolveContractUpliftRate(
  method: 'cpi' | 'rpi' | 'fixed' | 'custom',
  assumptions: Assumptions,
  baseline: BaselineData,
  fixedRate: number,
  customRate: number,
  year: number
): number {
  const table = baseline.contractIndexationTracker.indexAssumptions;
  if (method === 'fixed') return Number.isFinite(fixedRate) ? fixedRate : yearValue(table.fixed, year);
  if (method === 'custom') return Number.isFinite(customRate) ? customRate : yearValue(table.bespoke, year);
  if (method === 'rpi') return yearValue(table.rpi, year);
  return table?.cpi ? yearValue(table.cpi, year) : yearValue(assumptions.expenditure.nonPayInflation, year);
}

function resolveContractEffectiveFactor(
  year: number,
  effectiveFromYear: number,
  reviewMonth: number,
  phaseInMonths: number
): number {
  if (year < effectiveFromYear) return 0;
  const monthFactor = Math.max(0, Math.min(1, (13 - reviewMonth) / 12));
  const phaseFactor = phaseInMonths <= 0 ? 1 : Math.max(0, Math.min(1, (12 - Math.min(12, phaseInMonths)) / 12));
  if (year === effectiveFromYear) return monthFactor * phaseFactor;
  return 1;
}

function buildReconciliationRows(baseline: BaselineData, results: YearResult[]): MTFSResult['reconciliationRows'] {
  const year1 = results[0];
  if (!year1) return [];
  const sourceMap: Record<string, number | null> = {};
  for (const overlay of baseline.overlayImports) {
    Object.entries(overlay.mappedValues).forEach(([field, value]) => {
      sourceMap[field] = value;
    });
    overlay.unmappedFields.forEach((field) => {
      if (!(field in sourceMap)) sourceMap[field] = null;
    });
  }
  const modelMap: Record<string, number> = {
    councilTax: year1.councilTax,
    businessRates: year1.businessRates,
    coreGrants: year1.coreGrants,
    feesAndCharges: year1.feesAndCharges,
    pay: year1.payBase + year1.payInflationImpact,
    nonPay: year1.nonPayBase + year1.nonPayInflationImpact,
    contractIndexationCost: year1.contractIndexationCost,
    growthProposalsImpact: year1.growthProposalsImpact,
  };

  const fields = new Set([...Object.keys(modelMap), ...Object.keys(sourceMap)]);
  return Array.from(fields).map((field) => {
    const modelValue = modelMap[field] ?? 0;
    const sourceValue = field in sourceMap ? sourceMap[field] : null;
    if (sourceValue === null) {
      return {
        field,
        sourceValue,
        modelValue,
        variance: null,
        variancePct: null,
        status: field in sourceMap ? 'unmapped' : 'missing_source',
      };
    }
    const variance = modelValue - sourceValue;
    const variancePct = sourceValue === 0 ? null : (variance / sourceValue) * 100;
    return {
      field,
      sourceValue,
      modelValue,
      variance,
      variancePct,
      status: Math.abs(variance) < 0.001 ? 'matched' : 'variance',
    };
  });
}

function computeMrpChargeForYear(baseline: BaselineData, year: number): number {
  if (!baseline.mrpCalculator.enabled) return 0;
  const cfg = baseline.mrpCalculator;
  if (cfg.policy === 'annuity') return cfg.baseBorrowing * (cfg.annuityRate / 100);
  if (cfg.policy === 'straight-line') return cfg.baseBorrowing / Math.max(1, cfg.assetLifeYears);
  const remainingLife = Math.max(1, cfg.assetLifeYears - (year - 1));
  return cfg.baseBorrowing / remainingLife;
}

function computeS114Assessment(
  results: YearResult[],
  overallRiskScore: number,
  structuralDeficitFlag: boolean
): { triggered: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const yearReservesExhausted = results.find((y) => y.reservesExhausted);
  const persistentDeficitYears = results.filter((y) => y.rawGap > 0).length;

  if (yearReservesExhausted) reasons.push(`Reserves exhausted by ${yearReservesExhausted.label}`);
  if (persistentDeficitYears >= 3) reasons.push('Deficit projected in 3 or more years');
  if (structuralDeficitFlag) reasons.push('Structural deficit identified');
  if (overallRiskScore >= 75) reasons.push(`Overall risk score ${overallRiskScore.toFixed(0)}/100 is critical`);

  return { triggered: reasons.length > 0, reasons };
}

function postSplit(post: { fundingSource: keyof typeof EMPTY_SOURCE_TOTALS; generalFundSplit?: number; grantFundSplit?: number; otherSplit?: number }) {
  const splitFallback = post.fundingSource === 'grant'
    ? { general_fund: 0, grant: 100, other: 0 }
    : post.fundingSource === 'other'
      ? { general_fund: 0, grant: 0, other: 100 }
      : { general_fund: 100, grant: 0, other: 0 };
  const generalFund = Math.max(0, Math.min(100, post.generalFundSplit ?? splitFallback.general_fund));
  const grant = Math.max(0, Math.min(100, post.grantFundSplit ?? splitFallback.grant));
  const other = Math.max(0, Math.min(100, post.otherSplit ?? Math.max(0, 100 - generalFund - grant)));
  const total = Math.max(1, generalFund + grant + other);
  return {
    general_fund: generalFund / total,
    grant: grant / total,
    other: other / total,
    totalPct: generalFund + grant + other,
  };
}

function computePayModelForYear(
  baseline: BaselineData,
  assumptions: Assumptions,
  year: number,
  deflator: number
) {
  const activeWorkforce = baseline.workforceModel.posts.length > 0;
  const workforceBase = activeWorkforce
    ? baseline.workforceModel.posts.reduce((sum, post) => sum + ((post.fte * post.annualCost * (1 - Math.max(0, Math.min(100, post.vacancyFactor ?? 0)) / 100)) / 1000), 0) * deflator
    : 0;

  const baseBySource = { ...EMPTY_SOURCE_TOTALS };
  const pressureBySource = { ...EMPTY_SOURCE_TOTALS };
  const pressureByGroup = { ...EMPTY_GROUP_TOTALS };

  if (activeWorkforce) {
    for (const post of baseline.workforceModel.posts) {
      const split = postSplit(post);
      const base = ((post.fte * post.annualCost * (1 - Math.max(0, Math.min(100, post.vacancyFactor ?? 0)) / 100)) / 1000) * deflator;
      const groupAdj = assumptions.expenditure.payGroupSensitivity[post.payAssumptionGroup] ?? 0;
      const generalRate = assumptions.expenditure.payAwardByFundingSource.general_fund + groupAdj;
      const grantRate = assumptions.expenditure.payAwardByFundingSource.grant + groupAdj;
      const otherRate = assumptions.expenditure.payAwardByFundingSource.other + groupAdj;
      const generalBase = base * split.general_fund;
      const grantBase = base * split.grant;
      const otherBase = base * split.other;
      const generalPressure = generalBase * (Math.pow(1 + generalRate / 100, year) - 1);
      const grantPressure = grantBase * (Math.pow(1 + grantRate / 100, year) - 1);
      const otherPressure = otherBase * (Math.pow(1 + otherRate / 100, year) - 1);

      baseBySource.general_fund += generalBase;
      baseBySource.grant += grantBase;
      baseBySource.other += otherBase;
      pressureBySource.general_fund += generalPressure;
      pressureBySource.grant += grantPressure;
      pressureBySource.other += otherPressure;
      pressureByGroup[post.payAssumptionGroup] += generalPressure + grantPressure + otherPressure;
    }
  }

  const importedPayBudget = workforceBase;
  const fallbackPayBase = baseline.pay * deflator;
  const fallbackPayPressure = fallbackPayBase * (compoundFactor(assumptions.expenditure.payAward, year) - 1);
  const usesImportedBase = importedPayBudget > 0;
  const payBase = usesImportedBase ? importedPayBudget : fallbackPayBase;
  if (!usesImportedBase) {
    baseBySource.general_fund = fallbackPayBase;
    pressureBySource.general_fund = fallbackPayPressure;
    pressureBySource.grant = 0;
    pressureBySource.other = 0;
    pressureByGroup.default = fallbackPayPressure;
  }

  return {
    payBase,
    importedPayBudget,
    activeModelMode: usesImportedBase ? 'workforce_posts' as const : 'baseline' as const,
    baseBySource,
    pressureBySource,
    pressureByGroup,
  };
}

// ─── Main calculation engine ──────────────────────────────────────────────────

export function runCalculations(
  assumptions: Assumptions,
  baselineInput: BaselineData,
  savingsProposals: SavingsProposal[] = []
): MTFSResult {
  const baseline = normalizeBaseline(baselineInput);
  const results: YearResult[] = [];
  const useNamedReserves = baseline.namedReserves.length > 0;
  const useSavingsProgramme = savingsProposals.length > 0;

  const recommendedMinimumReserves = computeRecommendedMinimumReserves(baseline);
  const baseNetBudget =
    baseline.councilTax + baseline.businessRates + baseline.coreGrants + baseline.feesAndCharges;
  const effectiveMinimumReservesThreshold =
    baseline.riskBasedReserves.enabled && baseline.riskBasedReserves.adoptAsMinimumThreshold
      ? recommendedMinimumReserves
      : baseline.reservesAdequacyMethodology.method === 'risk_based'
      ? recommendedMinimumReserves
      : baseline.reservesAdequacyMethodology.method === 'pct_of_net_budget'
        ? (baseNetBudget * baseline.reservesAdequacyMethodology.pctOfNetBudget) / 100
        : baseline.reservesMinimumThreshold;

  let gfBalance = baseline.generalFundReserves;
  let emBalance = baseline.earmarkedReserves;
  let namedBalances = new Map<string, number>(baseline.namedReserves.map((r) => [r.id, r.openingBalance]));
  let cumulativeGap = 0;
  let yearReservesExhausted: string | null = null;
  const grantsExpiringInYears = new Set<string>();
  const mrpCharges: [number, number, number, number, number] = [0, 0, 0, 0, 0];

  const openingTotalReserves = useNamedReserves
    ? baseline.namedReserves.reduce((s, r) => s + r.openingBalance, 0)
    : baseline.generalFundReserves + baseline.earmarkedReserves;

  const recoveryAnnualContribution = baseline.reservesRecoveryPlan.enabled
    ? (baseline.reservesRecoveryPlan.autoCalculate
      ? Math.max(
        0,
        (baseline.reservesRecoveryPlan.targetLevel - openingTotalReserves) / baseline.reservesRecoveryPlan.targetYear
      )
      : baseline.reservesRecoveryPlan.annualContribution)
    : 0;

  const deflator = (y: number) =>
    assumptions.advanced.realTermsToggle ? Math.pow(1 + assumptions.advanced.inflationRate / 100, -y) : 1;

  for (let y = 1; y <= YEARS; y += 1) {
    const label = `${new Date().getFullYear() + y - 1}/${String(new Date().getFullYear() + y).slice(2)}`;
    const ctGrowthProfile = assumptions.funding.councilTaxIncrease;
    const brGrowthProfile = assumptions.funding.businessRatesGrowth;
    const grantProfile = assumptions.funding.grantVariation;
    const feesProfile = assumptions.funding.feesChargesElasticity;
    const payProfile = assumptions.expenditure.payAward;
    const nonPayProfile = assumptions.expenditure.nonPayInflation;
    const ascProfile = assumptions.expenditure.ascDemandGrowth;
    const cscProfile = assumptions.expenditure.cscDemandGrowth;
    const savingsDeliveryProfile = assumptions.expenditure.savingsDeliveryRisk;
    const savingsTargetProfile = assumptions.policy.annualSavingsTarget;
    const reservesUsageProfile = assumptions.policy.reservesUsage;

    const taxCfg = baseline.councilTaxBaseConfig;
    const ctIncreasePct = taxCfg.enabled
      ? taxCfg.corePreceptPct + taxCfg.ascPreceptPct
      : yearValue(ctGrowthProfile, y);

    const councilTaxBaseYield = taxCfg.enabled
      ? ((taxCfg.bandDEquivalentDwellings * taxCfg.bandDCharge * (taxCfg.collectionRate / 100)) / 1000) + taxCfg.parishPrecepts + (taxCfg.collectionFundSurplusDeficit ?? 0)
      : baseline.councilTax;
    const councilTax = councilTaxBaseYield * (taxCfg.enabled ? Math.pow(1 + ctIncreasePct / 100, y) : compoundFactor(ctGrowthProfile, y)) * deflator(y);

    const brCfg = baseline.businessRatesConfig;
    const businessRates = brCfg.enabled
      ? (
        (brCfg.baselineRates || baseline.businessRates) * compoundFactor(brCfg.growthRate, y)
        - (brCfg.appealsProvision ?? 0)
        + (brCfg.tariffTopUp ?? 0)
        + (brCfg.levySafetyNet ?? 0)
        + (brCfg.poolingGain ?? 0)
        + (brCfg.collectionFundAdjustment ?? 0)
        + (y >= (brCfg.resetYear ?? 3) ? (brCfg.resetAdjustment ?? 0) : 0)
      ) * deflator(y)
      : baseline.businessRates * compoundFactor(brGrowthProfile, y) * deflator(y);
    const incomeGenerationIncome = baseline.incomeGenerationWorkbook.enabled
      ? baseline.incomeGenerationWorkbook.lines.reduce((sum, line) => {
        const volume = line.baseVolume * Math.pow(1 + line.volumeGrowth / 100, y);
        const price = line.basePrice * Math.pow(1 + line.priceGrowth / 100, y);
        return sum + ((volume * price) / 1000);
      }, 0) * deflator(y)
      : 0;
    const feesAndCharges = baseline.feesAndCharges * compoundFactor(feesProfile, y) * deflator(y) + incomeGenerationIncome;

    const baseCoreGrants = baseline.coreGrants * compoundFactor(grantProfile, y) * deflator(y);
    let coreGrants = baseCoreGrants;
    if (baseline.grantSchedule.length > 0) {
      const scheduledGrants = baseline.grantSchedule.reduce((sum, grant) => {
        if (grant.endYear < y) return sum + (grant.value * ((grant.replacementAssumption ?? 0) / 100) * grantCertaintyFactor(grant.certainty));
        if (grant.endYear === y && y < YEARS) grantsExpiringInYears.add(label);
        const linkedValue = grant.inflationLinked ? grant.value * compoundFactor(grantProfile, Math.max(0, y - 1)) : grant.value;
        return sum + (linkedValue * grantCertaintyFactor(grant.certainty));
      }, 0);
      const scheduledGrantsWithVariation = scheduledGrants * deflator(y);
      // Grant schedule entries are treated as additional grant lines layered over the core-grants baseline.
      coreGrants = baseCoreGrants + scheduledGrantsWithVariation;
    }
    const totalFunding = councilTax + businessRates + coreGrants + feesAndCharges;

    const payModel = computePayModelForYear(baseline, assumptions, y, deflator(y));
    const payBase = payModel.payBase;
    const generalFundPayPressureResolved = payModel.pressureBySource.general_fund;
    const grantFundedPayPressure = payModel.pressureBySource.grant;
    const otherFundedPayPressure = payModel.pressureBySource.other;
    const payInflationImpact = generalFundPayPressureResolved + grantFundedPayPressure + otherFundedPayPressure;
    const nonPayBase = baseline.nonPay * deflator(y);
    const nonPayInflationImpact = nonPayBase * (compoundFactor(nonPayProfile, y) - 1);

    const ascPressure = baseline.ascCohortModel.enabled
      ? (() => {
        const c = baseline.ascCohortModel;
        const users18 = c.population18to64 * (c.prevalence18to64 / 100) * Math.pow(1 + c.growth18to64 / 100, y);
        const users65 = c.population65plus * (c.prevalence65plus / 100) * Math.pow(1 + c.growth65plus / 100, y);
        return ((users18 * c.unitCost18to64) + (users65 * c.unitCost65plus)) / 1000 * deflator(y);
      })()
      : baseline.ascDemandLed * compoundFactor(ascProfile, y) * deflator(y);

    const cscPressure = baseline.cscDemandLed * compoundFactor(cscProfile, y) * deflator(y);
    const otherServiceExp = baseline.otherServiceExp * deflator(y);
    const contractBreakdown: YearResult['contractIndexationBreakdown'] = [];
    const contractIndexationCost = baseline.contractIndexationTracker.enabled
      ? baseline.contractIndexationTracker.contracts.reduce((sum, c) => {
        const upliftMethod = c.upliftMethod ?? (c.clause === 'bespoke' ? 'custom' : c.clause === 'nmw' ? 'fixed' : c.clause);
        const rateRaw = resolveContractUpliftRate(upliftMethod, assumptions, baseline, c.fixedRate ?? yearValue(payProfile, y), c.customRate ?? c.bespokeRate, y);
        const rate = Math.max(c.collarRate ?? -100, Math.min(c.capRate ?? 100, rateRaw));
        const effectiveYear = c.nextUpliftYear ?? c.effectiveFromYear ?? 1;
        const effectiveFactor = resolveContractEffectiveFactor(y, effectiveYear, c.reviewMonth ?? 4, c.phaseInMonths ?? 0);
        const upliftPeriods = Math.max(0, y - effectiveYear + 1);
        const upliftCost = c.value * (Math.pow(1 + rate / 100, upliftPeriods) - 1) * effectiveFactor;
        contractBreakdown.push({
          contractId: c.id,
          name: c.name,
          year: y,
          method: upliftMethod,
          effectiveFactor,
          upliftCost,
          appliedRate: rate,
          supplier: c.supplier,
          service: c.service,
          fundingSource: c.fundingSource,
        });
        return sum + upliftCost;
      }, 0) * deflator(y)
      : 0;

    const capitalFinancingCost = baseline.capitalFinancing.enabled
      ? (baseline.capitalFinancing.borrowingByYear.slice(0, y).reduce((s, v) => s + v, 0)
        * ((baseline.capitalFinancing.interestRate + baseline.capitalFinancing.mrpRate) / 100)
        * deflator(y))
      : 0;
    const mrpCharge = computeMrpChargeForYear(baseline, y) * deflator(y);
    mrpCharges[y - 1] = mrpCharge;

    const reservesRebuildContribution = baseline.reservesRecoveryPlan.enabled && y <= baseline.reservesRecoveryPlan.targetYear
      ? recoveryAnnualContribution
      : 0;

    const customLineResults: CustomLineYearResult[] = baseline.customServiceLines.map((line) => {
      const inflationRate = resolveInflationRate(line, assumptions, y);
      const combinedGrowthRate = inflationRate / 100 + line.demandGrowthRate / 100;
      return {
        id: line.id,
        name: line.name,
        baseValue: line.baseValue,
        inflatedValue: line.baseValue * Math.pow(1 + combinedGrowthRate, y) * deflator(y),
        isRecurring: line.isRecurring,
      };
    });
    const customLinesTotalExpenditure = customLineResults.reduce((s, l) => s + l.inflatedValue, 0);

    const investToSaveNetImpact = baseline.investToSave.enabled
      ? baseline.investToSave.proposals.reduce((sum, p) => {
        const upfront = y === p.deliveryYear ? p.upfrontCost : 0;
        const saving = y >= p.deliveryYear + p.paybackYears ? p.annualSaving : 0;
        return sum + upfront - saving;
      }, 0) * deflator(y)
      : 0;

    let oneOffGrowthImpact = 0;
    const growthProposalsImpact = baseline.growthProposals.reduce((sum, gp) => {
      if (y < gp.deliveryYear) return sum;
      const phase = Math.max(0, (gp.yearlyPhasing[y - 1] ?? 0) / 100);
      const confidence = Math.max(0, Math.min(1, gp.confidence / 100));
      const impact = gp.value * phase * confidence;
      if (!gp.isRecurring) oneOffGrowthImpact += impact;
      return sum + impact;
    }, 0) * deflator(y);
    oneOffGrowthImpact *= deflator(y);
    const manualAdjustmentsImpact = baseline.manualAdjustments
      .filter((adj) => adj.year === y)
      .reduce((sum, adj) => sum + adj.amount, 0) * deflator(y);

    const coreExpenditure = payBase + payInflationImpact + nonPayBase + nonPayInflationImpact +
      ascPressure + cscPressure + otherServiceExp + contractIndexationCost + capitalFinancingCost + mrpCharge +
      reservesRebuildContribution + investToSaveNetImpact + growthProposalsImpact + manualAdjustmentsImpact;
    const grossExpenditureBeforeSavings = coreExpenditure + customLinesTotalExpenditure;

    let deliveredSavings = 0;
    let recurringDeliveredSavings = 0;
    let oneOffDeliveredSavings = 0;
    let savingsProposalResults: SavingsProposalYearResult[] = [];

    if (useSavingsProgramme) {
      const sr = computeSavingsForYear(savingsProposals, y);
      deliveredSavings = sr.totalDelivered;
      recurringDeliveredSavings = sr.recurringDelivered;
      oneOffDeliveredSavings = sr.oneOffDelivered;
      savingsProposalResults = sr.results;
    } else {
      const deliveryRamp = Math.min(0.6 + y * 0.1, 1.0);
      deliveredSavings = yearValue(savingsTargetProfile, y) * (yearValue(savingsDeliveryProfile, y) / 100) * deliveryRamp * y;
      recurringDeliveredSavings = deliveredSavings;
    }

    // Policy lever: when social care protection is enabled, reduce effective savings to
    // avoid implicitly applying equal cuts to protected ASC demand-led spend.
    if (assumptions.policy.socialCareProtection && grossExpenditureBeforeSavings > 0 && deliveredSavings > 0) {
      const ascShare = Math.max(0, Math.min(0.95, ascPressure / grossExpenditureBeforeSavings));
      const retainedSavingsFactor = 1 - ascShare;
      deliveredSavings *= retainedSavingsFactor;
      recurringDeliveredSavings *= retainedSavingsFactor;
      oneOffDeliveredSavings *= retainedSavingsFactor;
    }

    const totalExpenditure = Math.max(0, grossExpenditureBeforeSavings - deliveredSavings);
    const rawGap = totalExpenditure - totalFunding;
    const recurringCustomLines = customLineResults.filter((l) => l.isRecurring).reduce((s, l) => s + l.inflatedValue, 0);
    const nonRecurringCustomLines = customLinesTotalExpenditure - recurringCustomLines;
    const structuralGap = rawGap + oneOffDeliveredSavings - nonRecurringCustomLines - oneOffGrowthImpact;
    // Planned reserves use is an explicit annual mitigation amount.
    // 0 means no planned reserves drawdown.
    const plannedReservesUse = Math.max(0, yearValue(reservesUsageProfile, y));
    let reservesDrawdown = rawGap > 0 ? Math.min(rawGap, plannedReservesUse) : 0;
    let netGap = rawGap - reservesDrawdown;
    cumulativeGap += rawGap;

    const gfOpening = gfBalance;
    const emOpening = emBalance;
    let namedReserveResults: NamedReserveYearResult[] = [];
    let gfClose = gfBalance;
    let emClose = emBalance;

    if (useNamedReserves) {
      const nr = runNamedReservesYear(baseline.namedReserves, namedBalances, y);
      namedReserveResults = nr.results;
      namedBalances = nr.closingBalances;

      if (reservesRebuildContribution > 0 && nr.results.length > 0) {
        const targetReserve = nr.results.find((r) => r.category === 'general_fund') ?? nr.results[0];
        targetReserve.closingBalance += reservesRebuildContribution;
        targetReserve.contribution += reservesRebuildContribution;
        namedBalances.set(targetReserve.id, targetReserve.closingBalance);
      }

      if (reservesDrawdown > 0) {
        let remaining = reservesDrawdown;
        let actualPolicyDrawdown = 0;
        for (const res of nr.results) {
          if (res.category === 'general_fund' && remaining > 0) {
            const take = Math.min(res.closingBalance, remaining);
            res.closingBalance -= take;
            namedBalances.set(res.id, res.closingBalance);
            remaining -= take;
            actualPolicyDrawdown += take;
          }
        }
        reservesDrawdown = actualPolicyDrawdown;
        netGap = rawGap - reservesDrawdown;
      }

      gfClose = nr.results.filter((r) => r.category === 'general_fund').reduce((s, r) => s + r.closingBalance, 0);
      emClose = nr.results.filter((r) => r.category !== 'general_fund').reduce((s, r) => s + r.closingBalance, 0);
    } else {
      gfBalance += reservesRebuildContribution;
      const drawFromGF = Math.min(reservesDrawdown * 0.7, gfBalance);
      const drawFromEM = Math.min(reservesDrawdown * 0.3, emBalance);
      gfBalance = Math.max(0, gfBalance - drawFromGF);
      emBalance = Math.max(0, emBalance - drawFromEM);
      gfClose = gfBalance;
      emClose = emBalance;
    }

    const totalOpeningReserves = useNamedReserves
      ? namedReserveResults.reduce((s, r) => s + r.openingBalance, 0)
      : gfOpening + emOpening;
    const totalClosingReserves = gfClose + emClose;
    const reserveCategoryClosingBalances = useNamedReserves
      ? reserveTotalsByCategory(namedReserveResults)
      : { general_fund: gfClose, service_specific: emClose, ringfenced: 0, technical: 0 };
    const reservesBelowThreshold = totalClosingReserves < effectiveMinimumReservesThreshold;
    const reservesExhausted = totalClosingReserves <= 0;
    if (reservesExhausted && !yearReservesExhausted) yearReservesExhausted = label;

    const structuralDeficit = structuralGap > 0;
    const overReliantOnReserves = rawGap > 0 && reservesDrawdown / (totalFunding || 1) > 0.05;
    const unrealisticSavings = deliveredSavings / (grossExpenditureBeforeSavings || 1) > 0.08;

    results.push({
      year: y,
      label,
      councilTax,
      businessRates,
      coreGrants,
      feesAndCharges,
      totalFunding,
      payBase,
      payInflationImpact,
      generalFundPayPressure: generalFundPayPressureResolved,
      grantFundedPayPressure,
      otherFundedPayPressure,
      payBudgetReconciliation: {
        importedPayBudget: payModel.importedPayBudget,
        baselinePay: baseline.pay,
        variance: payModel.importedPayBudget - baseline.pay,
        activeModelMode: payModel.activeModelMode,
        generalFundBase: payModel.baseBySource.general_fund,
        grantFundedBase: payModel.baseBySource.grant,
        otherFundedBase: payModel.baseBySource.other,
      },
      nonPayBase,
      nonPayInflationImpact,
      ascPressure,
      cscPressure,
      otherServiceExp,
      capitalFinancingCost,
      reservesRebuildContribution,
      contractIndexationCost,
      contractIndexationBreakdown: contractBreakdown,
      investToSaveNetImpact,
      growthProposalsImpact,
      manualAdjustmentsImpact,
      incomeGenerationIncome,
      mrpCharge,
      customLineResults,
      customLinesTotalExpenditure,
      grossExpenditureBeforeSavings,
      deliveredSavings,
      recurringDeliveredSavings,
      oneOffDeliveredSavings,
      totalExpenditure,
      rawGap,
      structuralGap,
      reservesDrawdown,
      netGap,
      namedReserveResults,
      generalFundOpeningBalance: useNamedReserves ? 0 : gfOpening,
      earmarkedOpeningBalance: useNamedReserves ? 0 : emOpening,
      reserveCategoryClosingBalances,
      totalOpeningReserves,
      generalFundClosingBalance: gfClose,
      earmarkedClosingBalance: emClose,
      totalClosingReserves,
      reservesBelowThreshold,
      reservesExhausted,
      savingsProposalResults,
      fundingBridge: {
        baseline: {
          councilTax: baseline.councilTax,
          businessRates: baseline.businessRates,
          grants: baseline.coreGrants,
          otherFunding: baseline.feesAndCharges,
        },
        modelled: {
          councilTax,
          businessRates,
          grants: coreGrants,
          otherFunding: feesAndCharges,
        },
        deltas: {
          councilTax: councilTax - baseline.councilTax,
          businessRates: businessRates - baseline.businessRates,
          grants: coreGrants - baseline.coreGrants,
          otherFunding: feesAndCharges - baseline.feesAndCharges,
        },
      },
      structuralDeficit,
      overReliantOnReserves,
      unrealisticSavings,
    });
  }

  const totalGap = results.reduce((s, r) => s + Math.max(0, r.rawGap), 0);
  const totalStructuralGap = results.reduce((s, r) => s + Math.max(0, r.structuralGap), 0);
  const lastYear = results[YEARS - 1];
  const reservesToNetBudget = (lastYear.totalClosingReserves / (lastYear.totalFunding || 1)) * 100;
  const totalDeliveredSavings = results.reduce((s, r) => s + r.deliveredSavings, 0);
  const totalExp5 = results.reduce((s, r) => s + r.totalExpenditure, 0);
  const savingsAsBudgetPct = (totalDeliveredSavings / (totalExp5 || 1)) * 100;
  const requiredSavingsToBalance = Math.max(0, totalGap / YEARS);
  const year1Gap = Math.max(0, results[0].rawGap);
  const councilTaxEquivalent = (year1Gap / (results[0].councilTax || baseline.councilTax || 1)) * 100;
  const structuralDeficitFlag = results.filter((r) => r.structuralDeficit).length >= 2;
  const treasuryBreaches: string[] = [];
  if (baseline.treasuryIndicators.enabled) {
    if (baseline.treasuryIndicators.netFinancingNeed > baseline.treasuryIndicators.authorisedLimit) {
      treasuryBreaches.push('Net Financing Need exceeds Authorised Limit');
    }
    if (baseline.treasuryIndicators.netFinancingNeed > baseline.treasuryIndicators.operationalBoundary) {
      treasuryBreaches.push('Net Financing Need exceeds Operational Boundary');
    }
    if (baseline.treasuryIndicators.operationalBoundary > baseline.treasuryIndicators.authorisedLimit) {
      treasuryBreaches.push('Operational Boundary exceeds Authorised Limit');
    }
  }

  const riskFactors = computeRiskFactors(results, effectiveMinimumReservesThreshold, assumptions);
  const overallRiskScore = computeOverallRisk(riskFactors);
  const fundingVolatilityScore =
    Math.abs(yearValue(assumptions.funding.grantVariation, 1)) * 5 +
    Math.abs(yearValue(assumptions.funding.businessRatesGrowth, 1) - 2) * 3;
  const s114 = computeS114Assessment(results, overallRiskScore, structuralDeficitFlag);

  const insights = generateInsights(results, {
    totalGap,
    totalStructuralGap,
    yearReservesExhausted,
    reservesToNetBudget,
    structuralDeficitFlag,
    savingsAsBudgetPct,
    overallRiskScore,
    councilTaxEquivalent,
    assumptions,
    useSavingsProgramme,
    savingsCount: savingsProposals.length,
  });

  return {
    years: results,
    totalGap,
    totalStructuralGap,
    totalCumulativeGap: cumulativeGap,
    yearReservesExhausted,
    requiredSavingsToBalance,
    councilTaxEquivalent,
    reservesToNetBudget,
    savingsAsBudgetPct,
    structuralDeficitFlag,
    fundingVolatilityScore,
    overallRiskScore,
    riskFactors,
    insights,
    recommendedMinimumReserves,
    effectiveMinimumReservesThreshold,
    grantsExpiringInYears: Array.from(grantsExpiringInYears),
    s114Triggered: s114.triggered,
    s114Reasons: s114.reasons,
    treasuryBreaches,
    mrpCharges,
    reconciliationRows: buildReconciliationRows(baseline, results),
  };
}

// ─── Risk Factors ─────────────────────────────────────────────────────────────

function computeRiskFactors(
  results: YearResult[],
  minimumThreshold: number,
  assumptions: Assumptions
): RiskFactor[] {
  const lastYear = results[results.length - 1];
  const totalReserves = lastYear.totalClosingReserves;
  const threshold = minimumThreshold;

  const reservesRatio = threshold > 0 ? totalReserves / threshold : 2;
  const reservesScore = reservesRatio < 1 ? 90 : reservesRatio < 1.5 ? 60 : reservesRatio < 2 ? 35 : 15;

  const totalGap = results.reduce((s, r) => s + Math.max(0, r.rawGap), 0);
  const totalBudget = results.reduce((s, r) => s + r.totalFunding, 0);
  const gapRatio = totalBudget > 0 ? totalGap / totalBudget : 0;
  const gapScore = gapRatio > 0.15 ? 90 : gapRatio > 0.08 ? 65 : gapRatio > 0.04 ? 40 : 20;

  const grantVolatility = Math.abs(yearValue(assumptions.funding.grantVariation, 1));
  const volatilityScore = grantVolatility > 5 ? 80 : grantVolatility > 3 ? 55 : grantVolatility > 1 ? 30 : 15;

  const demandPressure = (yearValue(assumptions.expenditure.ascDemandGrowth, 1) + yearValue(assumptions.expenditure.cscDemandGrowth, 1)) / 2;
  const demandScore = demandPressure > 7 ? 85 : demandPressure > 5 ? 60 : demandPressure > 3 ? 35 : 15;

  const savingsRisk = 100 - yearValue(assumptions.expenditure.savingsDeliveryRisk, 1);
  const savingsScore = savingsRisk > 30 ? 80 : savingsRisk > 20 ? 55 : savingsRisk > 10 ? 35 : 15;

  const level = (s: number): RiskFactor['level'] =>
    s >= 75 ? 'critical' : s >= 55 ? 'high' : s >= 35 ? 'medium' : 'low';

  return [
    { name: 'Reserves Adequacy', score: reservesScore, weight: 0.3, description: `Closing reserves vs minimum threshold ratio: ${reservesRatio.toFixed(2)}x`, level: level(reservesScore) },
    { name: 'Budget Gap Exposure', score: gapScore, weight: 0.25, description: `5-year cumulative gap as % of budget: ${(gapRatio * 100).toFixed(1)}%`, level: level(gapScore) },
    { name: 'Funding Volatility', score: volatilityScore, weight: 0.2, description: `Grant variation assumption (Y1): ${yearValue(assumptions.funding.grantVariation, 1) > 0 ? '+' : ''}${yearValue(assumptions.funding.grantVariation, 1)}%`, level: level(volatilityScore) },
    { name: 'Demand Pressure', score: demandScore, weight: 0.15, description: `Average demand growth (ASC/CSC): ${demandPressure.toFixed(1)}% p.a.`, level: level(demandScore) },
    { name: 'Savings Delivery Risk', score: savingsScore, weight: 0.1, description: `Savings not delivered: ${savingsRisk.toFixed(0)}% of programme`, level: level(savingsScore) },
  ];
}

function computeOverallRisk(factors: RiskFactor[]): number {
  return factors.reduce((s, f) => s + f.score * f.weight, 0);
}

// ─── Insights ─────────────────────────────────────────────────────────────────

interface InsightContext {
  totalGap: number;
  totalStructuralGap: number;
  yearReservesExhausted: string | null;
  reservesToNetBudget: number;
  structuralDeficitFlag: boolean;
  savingsAsBudgetPct: number;
  overallRiskScore: number;
  councilTaxEquivalent: number;
  assumptions: Assumptions;
  useSavingsProgramme: boolean;
  savingsCount: number;
}

function generateInsights(results: YearResult[], ctx: InsightContext): Insight[] {
  const insights: Insight[] = [];
  const fmt = (n: number) =>
    `£${Math.abs(n).toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`;

  if (ctx.totalGap <= 0) {
    insights.push({
      type: 'success',
      title: 'Budget is in balance over the MTFS period',
      body: 'Under current assumptions, expenditure does not exceed funding over the 5-year horizon. No structural gap has been identified.',
      action: 'Consider building additional reserves as a financial buffer against future uncertainty.',
    });
  } else {
    if (ctx.structuralDeficitFlag) {
      insights.push({
        type: 'critical',
        title: 'Structural deficit identified',
        body: `A recurring budget gap of ${fmt(ctx.totalStructuralGap)} (structural component) is projected across the MTFS period. Total gap including one-off items: ${fmt(ctx.totalGap)}. This represents a structural imbalance that cannot be sustainably managed through reserves use alone.`,
        action: 'Immediate action required: identify recurring savings or additional income. One-off reserves use is not a sustainable solution.',
      });
    } else {
      insights.push({
        type: 'warning',
        title: `5-year budget gap: ${fmt(ctx.totalGap)}`,
        body: 'A budget gap exists over the MTFS period. Current assumptions indicate the gap may be manageable but requires active mitigation.',
        action: 'Develop a phased savings programme and review income generation opportunities.',
      });
    }
  }

  if (ctx.useSavingsProgramme && ctx.savingsCount === 0) {
    insights.push({
      type: 'warning',
      title: 'No savings proposals entered',
      body: 'The savings programme builder is active but contains no proposals. The model is using zero savings, which may overstate the budget gap.',
      action: 'Navigate to the Savings Programme tab and enter individual proposals, or switch to the policy lever savings target in the sidebar.',
    });
  }

  if (ctx.yearReservesExhausted) {
    insights.push({
      type: 'critical',
      title: `Reserves exhausted by ${ctx.yearReservesExhausted}`,
      body: 'At current rates of drawdown, reserves will be fully depleted before the end of the MTFS period. This represents an unsustainable financial position and would constitute unlawful expenditure.',
      action: 'Restructure the reserves strategy immediately. Reduce planned drawdown and identify alternative gap mitigation measures.',
    });
  } else if (ctx.reservesToNetBudget < 5) {
    insights.push({
      type: 'warning',
      title: 'Reserves approaching minimum threshold',
      body: `Reserves-to-net-budget ratio is ${ctx.reservesToNetBudget.toFixed(1)}%, below the recommended 5–10% benchmark. Financial resilience is limited.`,
      action: 'Prioritise rebuilding reserves in years where the budget is balanced or a surplus exists.',
    });
  }

  if (ctx.savingsAsBudgetPct > 8) {
    insights.push({
      type: 'warning',
      title: 'Savings target may be unrealistic',
      body: `Required savings represent ${ctx.savingsAsBudgetPct.toFixed(1)}% of total expenditure over 5 years. Savings programmes of this scale carry significant delivery risk.`,
      action: 'Commission a savings feasibility review. Consider phasing targets and building in delivery risk reserves.',
    });
  }

  if (ctx.councilTaxEquivalent > 2) {
    insights.push({
      type: 'info',
      title: `Year 1 gap requires ${ctx.councilTaxEquivalent.toFixed(1)}% council tax equivalent`,
      body: 'This contextualises the scale of the budget gap versus council tax raising powers for elected members.',
      action: 'Present this metric to elected members alongside the savings programme as a decision-support reference.',
    });
  }

  if (results[0].rawGap <= 0 && results[results.length - 1].rawGap > 0) {
    insights.push({
      type: 'warning',
      title: 'Deteriorating financial position over time',
      body: 'The budget is balanced in the near term but the gap widens in later years, driven by demand growth and inflation outpacing funding. This is a structural trend requiring early intervention.',
      action: 'Begin modelling multi-year transformation programmes now. Avoid short-term thinking.',
    });
  }

  if (ctx.overallRiskScore >= 65) {
    insights.push({
      type: 'critical',
      title: 'Overall financial risk is HIGH',
      body: 'The multi-factor risk assessment indicates high financial risk. The combination of gap size, reserves adequacy, and demand pressures represents a significant challenge to financial sustainability.',
      action: 'This plan should not be presented as a balanced MTFS without further work. Escalate to the S151 Officer and CLT immediately.',
    });
  } else if (ctx.overallRiskScore >= 45) {
    insights.push({
      type: 'warning',
      title: 'Overall financial risk is MEDIUM',
      body: 'The MTFS plan is feasible but carries material risk. Active management of assumptions and quarterly monitoring is required.',
      action: 'Establish quarterly MTFS monitoring reports and review key assumptions at each budget cycle.',
    });
  }

  return insights;
}

// ─── Sensitivity Analysis ─────────────────────────────────────────────────────

export function computeSensitivity(
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[] = []
) {
  const base = runCalculations(assumptions, baseline, savingsProposals);

  const perturb = (patch: { funding?: Partial<typeof assumptions.funding>; expenditure?: Partial<typeof assumptions.expenditure> }): MTFSResult => {
    return runCalculations(
      {
        funding: { ...assumptions.funding, ...patch.funding },
        expenditure: { ...assumptions.expenditure, ...patch.expenditure },
        policy: assumptions.policy,
        advanced: assumptions.advanced,
      },
      baseline,
      savingsProposals
    );
  };

  const diff = (r: MTFSResult, y: number) => (r.years[y - 1]?.rawGap ?? 0) - (base.years[y - 1]?.rawGap ?? 0);

  return [
    {
      driver: 'Council Tax +1%',
      change: '+1%',
      year1Impact: diff(perturb({ funding: { councilTaxIncrease: bumpProfile(assumptions.funding.councilTaxIncrease, 1) } }), 1),
      year3Impact: diff(perturb({ funding: { councilTaxIncrease: bumpProfile(assumptions.funding.councilTaxIncrease, 1) } }), 3),
      year5Impact: diff(perturb({ funding: { councilTaxIncrease: bumpProfile(assumptions.funding.councilTaxIncrease, 1) } }), 5),
      direction: 'positive' as const,
    },
    {
      driver: 'Pay Award +1%',
      change: '+1%',
      year1Impact: diff(perturb({ expenditure: { payAward: bumpProfile(assumptions.expenditure.payAward, 1) } }), 1),
      year3Impact: diff(perturb({ expenditure: { payAward: bumpProfile(assumptions.expenditure.payAward, 1) } }), 3),
      year5Impact: diff(perturb({ expenditure: { payAward: bumpProfile(assumptions.expenditure.payAward, 1) } }), 5),
      direction: 'negative' as const,
    },
    {
      driver: 'ASC Demand +1%',
      change: '+1%',
      year1Impact: diff(perturb({ expenditure: { ascDemandGrowth: bumpProfile(assumptions.expenditure.ascDemandGrowth, 1) } }), 1),
      year3Impact: diff(perturb({ expenditure: { ascDemandGrowth: bumpProfile(assumptions.expenditure.ascDemandGrowth, 1) } }), 3),
      year5Impact: diff(perturb({ expenditure: { ascDemandGrowth: bumpProfile(assumptions.expenditure.ascDemandGrowth, 1) } }), 5),
      direction: 'negative' as const,
    },
    {
      driver: 'Grants -2%',
      change: '-2%',
      year1Impact: diff(perturb({ funding: { grantVariation: bumpProfile(assumptions.funding.grantVariation, -2) } }), 1),
      year3Impact: diff(perturb({ funding: { grantVariation: bumpProfile(assumptions.funding.grantVariation, -2) } }), 3),
      year5Impact: diff(perturb({ funding: { grantVariation: bumpProfile(assumptions.funding.grantVariation, -2) } }), 5),
      direction: 'negative' as const,
    },
    {
      driver: 'Savings Delivery -10%',
      change: '-10%',
      year1Impact: diff(perturb({ expenditure: { savingsDeliveryRisk: bumpProfile(assumptions.expenditure.savingsDeliveryRisk, -10) } }), 1),
      year3Impact: diff(perturb({ expenditure: { savingsDeliveryRisk: bumpProfile(assumptions.expenditure.savingsDeliveryRisk, -10) } }), 3),
      year5Impact: diff(perturb({ expenditure: { savingsDeliveryRisk: bumpProfile(assumptions.expenditure.savingsDeliveryRisk, -10) } }), 5),
      direction: 'negative' as const,
    },
  ];
}

// ─── Monte Carlo Simulation (Item 29) ───────────────────────────────────────

function gaussian(mean = 0, stdDev = 1): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + (z * stdDev);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function computeMonteCarlo(
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[] = [],
  iterations = 1500
): MonteCarloSummary {
  const safeIterations = clamp(Math.round(iterations), 200, 10000);
  const gaps: number[] = [];
  let deficitCount = 0;
  let reservesBreachCount = 0;
  let s114Count = 0;

  for (let i = 0; i < safeIterations; i += 1) {
    const sampleProfile = (profileInput: YearProfile5 | number, stdDev: number, min: number, max: number): YearProfile5 => {
      const profile = normalizeYearProfile(profileInput);
      return {
        y1: clamp(profile.y1 + gaussian(0, stdDev), min, max),
        y2: clamp(profile.y2 + gaussian(0, stdDev), min, max),
        y3: clamp(profile.y3 + gaussian(0, stdDev), min, max),
        y4: clamp(profile.y4 + gaussian(0, stdDev), min, max),
        y5: clamp(profile.y5 + gaussian(0, stdDev), min, max),
      };
    };
    const sampled: Assumptions = {
      funding: {
        councilTaxIncrease: sampleProfile(assumptions.funding.councilTaxIncrease, 0.7, 0, 10),
        businessRatesGrowth: sampleProfile(assumptions.funding.businessRatesGrowth, 1.2, -8, 10),
        grantVariation: sampleProfile(assumptions.funding.grantVariation, 1.5, -15, 8),
        feesChargesElasticity: sampleProfile(assumptions.funding.feesChargesElasticity, 1.0, -5, 12),
      },
      expenditure: {
        payAward: sampleProfile(assumptions.expenditure.payAward, 1.0, 0, 12),
        nonPayInflation: sampleProfile(assumptions.expenditure.nonPayInflation, 1.2, 0, 15),
        ascDemandGrowth: sampleProfile(assumptions.expenditure.ascDemandGrowth, 1.5, 0, 20),
        cscDemandGrowth: sampleProfile(assumptions.expenditure.cscDemandGrowth, 1.3, 0, 20),
        savingsDeliveryRisk: sampleProfile(assumptions.expenditure.savingsDeliveryRisk, 8, 20, 100),
        payAwardByFundingSource: {
          general_fund: clamp(assumptions.expenditure.payAwardByFundingSource.general_fund + gaussian(0, 1.0), 0, 12),
          grant: clamp(assumptions.expenditure.payAwardByFundingSource.grant + gaussian(0, 1.0), 0, 12),
          other: clamp(assumptions.expenditure.payAwardByFundingSource.other + gaussian(0, 1.0), 0, 12),
        },
        payGroupSensitivity: {
          default: clamp(assumptions.expenditure.payGroupSensitivity.default + gaussian(0, 0.5), -5, 5),
          teachers: clamp(assumptions.expenditure.payGroupSensitivity.teachers + gaussian(0, 0.5), -5, 5),
          njc: clamp(assumptions.expenditure.payGroupSensitivity.njc + gaussian(0, 0.5), -5, 5),
          senior: clamp(assumptions.expenditure.payGroupSensitivity.senior + gaussian(0, 0.5), -5, 5),
          other: clamp(assumptions.expenditure.payGroupSensitivity.other + gaussian(0, 0.5), -5, 5),
        },
      },
      policy: {
        ...assumptions.policy,
        annualSavingsTarget: normalizeYearProfile(assumptions.policy.annualSavingsTarget),
        reservesUsage: normalizeYearProfile(assumptions.policy.reservesUsage),
      },
      advanced: assumptions.advanced,
    };

    const outcome = runCalculations(sampled, baseline, savingsProposals);
    gaps.push(Math.max(0, outcome.totalGap));
    if (outcome.totalGap > 0) deficitCount += 1;
    if (outcome.years.some((y) => y.reservesBelowThreshold)) reservesBreachCount += 1;
    if (outcome.s114Triggered) s114Count += 1;
  }

  gaps.sort((a, b) => a - b);
  const at = (q: number) => gaps[Math.min(gaps.length - 1, Math.floor((gaps.length - 1) * q))] ?? 0;

  return {
    iterations: safeIterations,
    deficitProbability: (deficitCount / safeIterations) * 100,
    reservesBreachProbability: (reservesBreachCount / safeIterations) * 100,
    s114Probability: (s114Count / safeIterations) * 100,
    gapP10: at(0.1),
    gapP50: at(0.5),
    gapP90: at(0.9),
  };
}
