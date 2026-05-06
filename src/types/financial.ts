// ─── Authority Configuration (Item 22) ───────────────────────────────────────
export interface AuthorityConfig {
  authorityName: string;
  section151Officer: string;
  chiefExecutive: string;
  reportingPeriod: string;       // e.g. "2025/26 – 2029/30"
  reportDate: string;            // ISO date string
  authorityType: string;         // e.g. "Unitary Authority" | "County Council" | ...
  population: number;            // resident population for per-capita context
  strategicPriority1: string;    // e.g. "Protect vulnerable residents"
  strategicPriority2: string;    // e.g. "Inclusive local growth"
  strategicPriority3: string;    // e.g. "Neighbourhood and climate resilience"
}

// ─── Custom Service Lines (Items 3 & 6) ──────────────────────────────────────
export type InflationDriver =
  | 'cpi'          // linked to non-pay inflation assumption
  | 'pay'          // linked to pay award assumption
  | 'manual'       // user-specified fixed rate
  | 'asc-demand'   // linked to ASC demand growth
  | 'csc-demand';  // linked to CSC demand growth

export interface CustomServiceLine {
  id: string;
  name: string;
  category: 'pay' | 'non-pay' | 'demand-led' | 'income' | 'other';
  baseValue: number;             // £000s — base year
  inflationDriver: InflationDriver;
  manualInflationRate: number;   // % — used when driver = 'manual'
  demandGrowthRate: number;      // % — additional demand growth on top of inflation
  isRecurring: boolean;          // true = structural, false = one-off/time-limited
  notes: string;
}

// ─── Savings Programme (Items 10 & 11) ───────────────────────────────────────
export type SavingsCategory =
  | 'efficiency'
  | 'income'
  | 'demand-management'
  | 'service-reduction'
  | 'transformation'
  | 'procurement';

export type RagStatus = 'green' | 'amber' | 'red';

export interface SavingsProposal {
  id: string;
  name: string;
  description: string;
  category: SavingsCategory;
  grossValue: number;            // £000s — full year recurring value
  deliveryYear: 1 | 2 | 3 | 4 | 5;
  achievementRate: number;       // % — proposal-level delivery risk (0–100)
  isRecurring: boolean;          // true = removes from structural deficit; false = one-off
  ragStatus: RagStatus;
  responsibleOfficer: string;
  yearlyDelivery: [number, number, number, number, number]; // % delivered per year (sums to ≤100)
}

// ─── Named Reserves (Item 15) ────────────────────────────────────────────────
export interface NamedReserve {
  id: string;
  name: string;
  purpose: string;
  openingBalance: number;        // £000s
  plannedContributions: [number, number, number, number, number]; // £000s per year
  plannedDrawdowns: [number, number, number, number, number];    // £000s per year
  isEarmarked: boolean;          // true = earmarked; false = general fund
  minimumBalance: number;        // £000s — 0 if no restriction
}

// ─── High Value Config (Items 4, 5, 7, 17, 18, 19, 26) ─────────────────────
export interface CouncilTaxBaseConfig {
  enabled: boolean;
  bandDEquivalentDwellings: number;
  bandDCharge: number;           // £ per Band D
  collectionRate: number;        // %
  parishPrecepts: number;        // £000s
  corePreceptPct: number;        // %
  ascPreceptPct: number;         // %
}

export type GrantCertainty = 'confirmed' | 'indicative' | 'assumed';

export interface GrantScheduleEntry {
  id: string;
  name: string;
  value: number;                 // £000s per annum
  certainty: GrantCertainty;
  endYear: 1 | 2 | 3 | 4 | 5;
}

export interface AscCohortModel {
  enabled: boolean;
  population18to64: number;
  population65plus: number;
  prevalence18to64: number;      // %
  prevalence65plus: number;      // %
  unitCost18to64: number;        // £ per service user
  unitCost65plus: number;        // £ per service user
  growth18to64: number;          // %
  growth65plus: number;          // %
}

export interface CapitalFinancingConfig {
  enabled: boolean;
  borrowingByYear: [number, number, number, number, number]; // £000s
  interestRate: number;          // %
  mrpRate: number;               // %
}

export interface RiskBasedReservesConfig {
  enabled: boolean;
  adoptAsMinimumThreshold: boolean;
  demandVolatility: number;      // £000s
  savingsNonDelivery: number;    // £000s
  fundingUncertainty: number;    // £000s
  litigationRisk: number;        // £000s
}

export interface ReservesRecoveryPlan {
  enabled: boolean;
  targetYear: 1 | 2 | 3 | 4 | 5;
  targetLevel: number;           // £000s
  annualContribution: number;    // £000s (if autoCalculate = false)
  autoCalculate: boolean;
}

// ─── Enhancement Config (Items 8, 9, 13, 14, 16, 20, 21, 27, 28) ───────────
export interface PaySpineRow {
  id: string;
  grade: string;
  fte: number;
  spinePointCost: number;        // £ per FTE
}

export interface PaySpineConfig {
  enabled: boolean;
  rows: PaySpineRow[];
}

export type FundingSource = 'general_fund' | 'grant' | 'other';
export type PayAssumptionGroup = 'default' | 'teachers' | 'njc' | 'senior' | 'other';
export type PayModelMode = 'pay_spine' | 'workforce_posts' | 'hybrid';

export interface WorkforcePost {
  id: string;
  postId: string;
  service: string;
  fundingSource: FundingSource;
  fte: number;
  annualCost: number;
  payAssumptionGroup: PayAssumptionGroup;
}

export interface WorkforceModel {
  enabled: boolean;
  mode: PayModelMode;
  posts: WorkforcePost[];
}

export type ContractIndexationClause = 'cpi' | 'rpi' | 'nmw' | 'bespoke';
export type ContractUpliftMethod = 'cpi' | 'rpi' | 'fixed' | 'custom';

export interface ContractIndexationEntry {
  id: string;
  name: string;
  value: number;                 // £000s
  clause: ContractIndexationClause;
  bespokeRate: number;           // %
  effectiveFromYear: 1 | 2 | 3 | 4 | 5;
  reviewMonth: number;           // 1-12
  upliftMethod: ContractUpliftMethod;
  fixedRate: number;             // %
  customRate: number;            // %
  phaseInMonths: number;         // 0-12
}

export interface ContractIndexationTracker {
  enabled: boolean;
  contracts: ContractIndexationEntry[];
}

export interface InvestToSaveProposal {
  id: string;
  name: string;
  upfrontCost: number;           // £000s
  annualSaving: number;          // £000s
  paybackYears: number;
  deliveryYear: 1 | 2 | 3 | 4 | 5;
}

export interface InvestToSaveConfig {
  enabled: boolean;
  proposals: InvestToSaveProposal[];
}

export interface IncomeGenerationLine {
  id: string;
  name: string;
  baseVolume: number;
  basePrice: number;             // £ per unit
  volumeGrowth: number;          // %
  priceGrowth: number;           // %
}

export interface IncomeGenerationWorkbook {
  enabled: boolean;
  lines: IncomeGenerationLine[];
}

export interface GrowthProposal {
  id: string;
  name: string;
  service: string;
  owner: string;
  value: number; // £000s full-year impact
  deliveryYear: 1 | 2 | 3 | 4 | 5;
  isRecurring: boolean;
  confidence: number; // 0-100
  yearlyPhasing: [number, number, number, number, number]; // % per year
  notes: string;
}

export interface ManualAdjustment {
  id: string;
  service: string;
  year: 1 | 2 | 3 | 4 | 5;
  amount: number; // £000s (+ cost / - saving)
  reason: string;
}

export interface ImportMappingProfile {
  id: string;
  name: string;
  mappings: Record<string, string>; // source column -> internal baseline/assumption field
  createdAt: string;
}

export interface OverlayImportRecord {
  id: string;
  sourceName: string;
  importedAt: string;
  mappedValues: Record<string, number>;
  unmappedFields: string[];
}

export type ReservesAdequacyMethod = 'fixed' | 'pct_of_net_budget' | 'risk_based';

export interface ReservesAdequacyMethodology {
  method: ReservesAdequacyMethod;
  fixedMinimum: number;          // £000s
  pctOfNetBudget: number;        // %
}

export interface TreasuryIndicators {
  enabled: boolean;
  authorisedLimit: number;       // £000s
  operationalBoundary: number;   // £000s
  netFinancingNeed: number;      // £000s
}

export type MrpPolicy = 'asset-life' | 'annuity' | 'straight-line';

export interface MrpCalculatorConfig {
  enabled: boolean;
  policy: MrpPolicy;
  baseBorrowing: number;         // £000s
  assetLifeYears: number;
  annuityRate: number;           // %
}

// ─── Baseline (extended) ─────────────────────────────────────────────────────
export interface BaselineData {
  // Core funding streams
  councilTax: number;
  businessRates: number;
  coreGrants: number;
  feesAndCharges: number;

  // Core expenditure (£000s)
  pay: number;
  nonPay: number;
  ascDemandLed: number;
  cscDemandLed: number;
  otherServiceExp: number;

  // Legacy reserves (used when namedReserves is empty)
  generalFundReserves: number;
  earmarkedReserves: number;
  reservesMinimumThreshold: number;

  // Extended items
  customServiceLines: CustomServiceLine[];
  namedReserves: NamedReserve[];      // Item 15 — replaces flat reserves when populated
  councilTaxBaseConfig: CouncilTaxBaseConfig;
  grantSchedule: GrantScheduleEntry[];
  ascCohortModel: AscCohortModel;
  capitalFinancing: CapitalFinancingConfig;
  riskBasedReserves: RiskBasedReservesConfig;
  reservesRecoveryPlan: ReservesRecoveryPlan;
  paySpineConfig: PaySpineConfig;
  workforceModel: WorkforceModel;
  contractIndexationTracker: ContractIndexationTracker;
  investToSave: InvestToSaveConfig;
  incomeGenerationWorkbook: IncomeGenerationWorkbook;
  growthProposals: GrowthProposal[];
  manualAdjustments: ManualAdjustment[];
  importMappingProfiles: ImportMappingProfile[];
  overlayImports: OverlayImportRecord[];
  reservesAdequacyMethodology: ReservesAdequacyMethodology;
  treasuryIndicators: TreasuryIndicators;
  mrpCalculator: MrpCalculatorConfig;
}

// ─── Assumptions ─────────────────────────────────────────────────────────────
export interface FundingAssumptions {
  councilTaxIncrease: YearProfile5 | number;       // %
  businessRatesGrowth: YearProfile5 | number;      // %
  grantVariation: YearProfile5 | number;           // %
  feesChargesElasticity: YearProfile5 | number;    // %
  /** @deprecated legacy scalar import support only */
  councilTaxIncreaseLegacy?: number;
  /** @deprecated legacy scalar import support only */
  businessRatesGrowthLegacy?: number;
  /** @deprecated legacy scalar import support only */
  grantVariationLegacy?: number;
  /** @deprecated legacy scalar import support only */
  feesChargesElasticityLegacy?: number;
}

export interface ExpenditureAssumptions {
  payAward: YearProfile5 | number;                 // %
  nonPayInflation: YearProfile5 | number;          // %
  ascDemandGrowth: YearProfile5 | number;          // %
  cscDemandGrowth: YearProfile5 | number;          // %
  savingsDeliveryRisk: YearProfile5 | number;      // % achievement (authority-wide default)
  /** @deprecated legacy scalar import support only */
  payAwardLegacy?: number;
  /** @deprecated legacy scalar import support only */
  nonPayInflationLegacy?: number;
  /** @deprecated legacy scalar import support only */
  ascDemandGrowthLegacy?: number;
  /** @deprecated legacy scalar import support only */
  cscDemandGrowthLegacy?: number;
  /** @deprecated legacy scalar import support only */
  savingsDeliveryRiskLegacy?: number;
  payAwardByFundingSource: {
    general_fund: number;
    grant: number;
    other: number;
  };
  payGroupSensitivity: {
    default: number;
    teachers: number;
    njc: number;
    senior: number;
    other: number;
  };
}

export interface PolicyLevers {
  annualSavingsTarget: YearProfile5 | number;      // £000s — used when no savings programme defined
  reservesUsage: YearProfile5 | number;            // £000s per year — planned drawdown override
  socialCareProtection: boolean;
  /** @deprecated legacy scalar import support only */
  annualSavingsTargetLegacy?: number;
  /** @deprecated legacy scalar import support only */
  reservesUsageLegacy?: number;
}

export interface AdvancedControls {
  realTermsToggle: boolean;
  inflationRate: number;            // for real terms deflator %
}

export interface Assumptions {
  funding: FundingAssumptions;
  expenditure: ExpenditureAssumptions;
  policy: PolicyLevers;
  advanced: AdvancedControls;
}

export type YearProfile5 = any;

export interface AssumptionReviewFlag {
  requiresReview: boolean;
  reason: string;
}

// ─── Year Result (extended) ──────────────────────────────────────────────────
export interface CustomLineYearResult {
  id: string;
  name: string;
  baseValue: number;
  inflatedValue: number;
  isRecurring: boolean;
}

export interface NamedReserveYearResult {
  id: string;
  name: string;
  openingBalance: number;
  contribution: number;
  drawdown: number;
  closingBalance: number;
  isEarmarked: boolean;
}

export interface YearResult {
  year: number;
  label: string;

  // Funding
  councilTax: number;
  businessRates: number;
  coreGrants: number;
  feesAndCharges: number;
  totalFunding: number;

  // Core expenditure components
  payBase: number;
  payInflationImpact: number;
  generalFundPayPressure: number;
  grantFundedPayPressure: number;
  otherFundedPayPressure: number;
  nonPayBase: number;
  nonPayInflationImpact: number;
  ascPressure: number;
  cscPressure: number;
  otherServiceExp: number;
  capitalFinancingCost: number;
  reservesRebuildContribution: number;
  contractIndexationCost: number;
  contractIndexationBreakdown: Array<{
    contractId: string;
    name: string;
    year: number;
    method: ContractUpliftMethod;
    effectiveFactor: number;
    upliftCost: number;
  }>;
  investToSaveNetImpact: number;
  growthProposalsImpact: number;
  manualAdjustmentsImpact: number;
  incomeGenerationIncome: number;
  mrpCharge: number;

  // Custom service lines
  customLineResults: CustomLineYearResult[];
  customLinesTotalExpenditure: number;

  // Savings
  grossExpenditureBeforeSavings: number;
  deliveredSavings: number;
  recurringDeliveredSavings: number;    // subset that is structural
  oneOffDeliveredSavings: number;       // subset that is non-recurring
  totalExpenditure: number;

  // Gap
  rawGap: number;
  structuralGap: number;               // gap excluding one-off mitigation
  reservesDrawdown: number;
  netGap: number;

  // Reserves (named or flat)
  namedReserveResults: NamedReserveYearResult[];
  generalFundOpeningBalance: number;
  earmarkedOpeningBalance: number;
  totalOpeningReserves: number;
  generalFundClosingBalance: number;
  earmarkedClosingBalance: number;
  totalClosingReserves: number;
  reservesBelowThreshold: boolean;
  reservesExhausted: boolean;

  // Savings programme detail
  savingsProposalResults: SavingsProposalYearResult[];
  fundingBridge: {
    baseline: {
      councilTax: number;
      businessRates: number;
      grants: number;
      otherFunding: number;
    };
    modelled: {
      councilTax: number;
      businessRates: number;
      grants: number;
      otherFunding: number;
    };
    deltas: {
      councilTax: number;
      businessRates: number;
      grants: number;
      otherFunding: number;
    };
  };

  // Sustainability flags
  structuralDeficit: boolean;
  overReliantOnReserves: boolean;
  unrealisticSavings: boolean;
}

export interface SavingsProposalYearResult {
  id: string;
  name: string;
  category: SavingsCategory;
  grossValue: number;
  deliveredValue: number;
  isRecurring: boolean;
  ragStatus: RagStatus;
}

// ─── MTFS Result ─────────────────────────────────────────────────────────────
export interface MTFSResult {
  years: YearResult[];
  totalGap: number;
  totalStructuralGap: number;          // recurring gap only
  totalCumulativeGap: number;
  yearReservesExhausted: string | null;
  requiredSavingsToBalance: number;
  councilTaxEquivalent: number;
  reservesToNetBudget: number;
  savingsAsBudgetPct: number;
  structuralDeficitFlag: boolean;
  fundingVolatilityScore: number;
  overallRiskScore: number;
  riskFactors: RiskFactor[];
  insights: Insight[];
  recommendedMinimumReserves: number;
  effectiveMinimumReservesThreshold: number;
  grantsExpiringInYears: string[];
  s114Triggered: boolean;
  s114Reasons: string[];
  treasuryBreaches: string[];
  mrpCharges: [number, number, number, number, number];
  reconciliationRows: ReconciliationRow[];
}

export interface ReconciliationRow {
  field: string;
  sourceValue: number | null;
  modelValue: number;
  variance: number | null;
  variancePct: number | null;
  status: 'matched' | 'variance' | 'missing_source' | 'unmapped';
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
  level: 'low' | 'medium' | 'high' | 'critical';
}

export interface Insight {
  type: 'warning' | 'critical' | 'info' | 'success';
  title: string;
  body: string;
  action?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'base' | 'optimistic' | 'pessimistic' | 'custom';
  assumptions: Assumptions;
  result: MTFSResult;
  createdAt: string;
  color: string;
}

export interface PeerBenchmarkConfig {
  enabled: boolean;
  peerMedianReservesToBudget: number; // %
  peerMedianGapPct: number; // % of annual funding
  peerUpperRiskScore: number; // 0-100
  peerNetExpenditurePerCapita: number; // £ per resident
  peerSavingsDeliveryRate: number; // %
  peerDebtToNetRevenue: number; // %
  sourceLabel: string;
}

export interface ModelSnapshot {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  assumptions: Assumptions;
  baseline: BaselineData;
  savingsProposals: SavingsProposal[];
  authorityConfig: AuthorityConfig;
  scenarios: Scenario[];
  metadata: {
    appVersion: string;
    notes: string;
    schemaVersion?: string;
    requiresReview?: Record<string, AssumptionReviewFlag>;
    legacySource?: string;
  };
}

export interface SnapshotSaveContext {
  sourceCard: string;
  sectionEnabled?: boolean;
  counts?: Record<string, number>;
}

export interface MonteCarloSummary {
  iterations: number;
  deficitProbability: number; // %
  reservesBreachProbability: number; // %
  s114Probability: number; // %
  gapP10: number;
  gapP50: number;
  gapP90: number;
}

export interface SensitivityRow {
  driver: string;
  change: string;
  year1Impact: number;
  year3Impact: number;
  year5Impact: number;
  direction: 'positive' | 'negative';
}

export interface AssumptionsHistoryEntry {
  id: string;
  timestamp: string;
  description: string;
  assumptions: Assumptions;
}

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  description: string;
  totalGap: number;
  totalStructuralGap: number;
  overallRiskScore: number;
  yearReservesExhausted: string | null;
}
