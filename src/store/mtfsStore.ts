import { create } from 'zustand';
import type {
  Assumptions,
  Scenario,
  MTFSResult,
  BaselineData,
  SavingsProposal,
  NamedReserve,
  CustomServiceLine,
  AuthorityConfig,
  GrantScheduleEntry,
  AssumptionsHistoryEntry,
  AuditTrailEntry,
  PaySpineRow,
  ContractIndexationEntry,
  InvestToSaveProposal,
  IncomeGenerationLine,
  ModelSnapshot,
  PeerBenchmarkConfig,
  WorkforcePost,
  PayModelMode,
  GrowthProposal,
  ManualAdjustment,
  ImportMappingProfile,
  SnapshotSaveContext,
  YearProfile5,
  AssumptionReviewFlag,
} from '../types/financial';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_BASELINE,
  DEFAULT_AUTHORITY_CONFIG,
  runCalculations,
} from '../engine/calculations';
import { validateModel } from '../engine/validation';
import { exportSnapshotToWorkbookBlob, importSnapshotFromWorkbookFile } from '../utils/snapshotExcel';
import { buildCfoDemoDataset, CFO_DEMO_STEPS, type CfoDemoStep } from '../utils/cfoDemo';
import { buildScenarioFromGoal, buildScenarioTemplates, exportScenarioAuditCsv, type ScenarioGoal } from '../utils/scenarioUtils';
import { legacyPaySpineRowToWorkforcePost, migratePaySpineRowsToWorkforcePosts } from '../utils/workforcePay';
import {
  ROLE_PRESETS,
  defaultRehearsalChecklist,
  type AssumptionEditMode,
  type PrintPreviewMode,
  type RehearsalChecklist,
  type RolePreset,
  type SaveState,
} from '../utils/uiUx';

interface MTFSStore {
  assumptions: Assumptions;
  baseline: BaselineData;
  savingsProposals: SavingsProposal[];
  result: MTFSResult;

  authorityConfig: AuthorityConfig;

  assumptionHistory: AssumptionsHistoryEntry[];
  auditTrail: AuditTrailEntry[];
  modelRunDescription: string;

  scenarios: Scenario[];
  activeScenarioId: string | null;
  scenariosFocus: 'none' | 'snapshots';
  activeTab: string;
  activeRole: 'finance' | 'members';
  rolePreset: RolePreset;
  viewMode: 'strategic' | 'technical';
  audienceMode: 'finance' | 'members';
  assumptionEditMode: AssumptionEditMode;
  activeSectionAnchor: string | null;
  saveState: SaveState;
  meetingMode: boolean;
  printPreviewMode: PrintPreviewMode;
  rehearsalChecklist: RehearsalChecklist;
  lastImportSnapshot: {
    label: string;
    timestamp: string;
    baseline: BaselineData;
    assumptions: Assumptions;
    savingsProposals: SavingsProposal[];
    scenarios: Scenario[];
  } | null;
  uiWarnings: Array<{ id: string; severity: 'warning' | 'critical'; message: string; targetTab: string }>;
  advancedPanelsOpen: Record<string, boolean>;
  accessibilityPreset: 'default' | 'large-text' | 'high-contrast' | 'dyslexia-friendly';
  densityMode: 'comfortable' | 'compact' | 'presentation';
  snapshots: ModelSnapshot[];
  peerBenchmark: PeerBenchmarkConfig;
  decisionWeights: {
    affordability: number;
    risk: number;
    reserves: number;
    deliverability: number;
  };
  cfoDemo: {
    enabled: boolean;
    step: CfoDemoStep;
    startedAt?: string;
    datasetLoaded: boolean;
    rehearsal: Record<string, boolean>;
  };
  workflowState: {
    baselineLocked: boolean;
    assumptionsFrozen: boolean;
    frozenLabel?: string;
    governanceExports: { memberBrief: number; s151Pack: number; dataCsv: number };
    currentWorkingSet?: { kind: 'snapshot' | 'scenario'; name: string; timestamp: string };
    selectedDecisionOption?: { label: 'A' | 'B' | 'C'; name: string; sourceType: 'current' | 'scenario' | 'snapshot'; timestamp: string };
    lastValidation?: { timestamp: string; blockers: string[]; warnings: string[] };
  };

  setAssumptions: (a: Assumptions, description?: string) => void;
  updateFunding: (key: keyof Assumptions['funding'], value: number, description?: string) => void;
  updateExpenditure: (key: keyof Assumptions['expenditure'], value: number, description?: string) => void;
  updatePayAwardByFundingSource: (source: keyof Assumptions['expenditure']['payAwardByFundingSource'], value: number, description?: string) => void;
  updatePayGroupSensitivity: (group: keyof Assumptions['expenditure']['payGroupSensitivity'], value: number, description?: string) => void;
  updatePolicy: (key: keyof Assumptions['policy'], value: number | boolean, description?: string) => void;
  updateAdvanced: (key: keyof Assumptions['advanced'], value: number | boolean, description?: string) => void;

  setBaseline: (b: BaselineData, description?: string) => void;
  updateBaselineField: (key: keyof BaselineData, value: number, description?: string) => void;
  importBaselinePartial: (partial: Partial<BaselineData>, description?: string) => void;

  updateCouncilTaxBaseConfig: (updates: Partial<BaselineData['councilTaxBaseConfig']>) => void;
  updateBusinessRatesConfig: (updates: Partial<BaselineData['businessRatesConfig']>) => void;
  addGrantScheduleEntry: (entry: GrantScheduleEntry) => void;
  updateGrantScheduleEntry: (id: string, updates: Partial<GrantScheduleEntry>) => void;
  removeGrantScheduleEntry: (id: string) => void;
  updateAscCohortModel: (updates: Partial<BaselineData['ascCohortModel']>) => void;
  updateCapitalFinancing: (updates: Partial<BaselineData['capitalFinancing']>) => void;
  updateRiskBasedReserves: (updates: Partial<BaselineData['riskBasedReserves']>) => void;
  updateReservesRecoveryPlan: (updates: Partial<BaselineData['reservesRecoveryPlan']>) => void;
  updateReservesAdequacyMethodology: (updates: Partial<BaselineData['reservesAdequacyMethodology']>) => void;

  addPaySpineRow: (row: PaySpineRow) => void;
  updatePaySpineRow: (id: string, updates: Partial<PaySpineRow>) => void;
  removePaySpineRow: (id: string) => void;
  setPaySpineEnabled: (enabled: boolean) => void;
  setWorkforceModelEnabled: (enabled: boolean) => void;
  setWorkforceModelMode: (mode: PayModelMode) => void;
  addWorkforcePost: (post: WorkforcePost) => void;
  updateWorkforcePost: (id: string, updates: Partial<WorkforcePost>) => void;
  removeWorkforcePost: (id: string) => void;

  addContractEntry: (entry: ContractIndexationEntry) => void;
  updateContractEntry: (id: string, updates: Partial<ContractIndexationEntry>) => void;
  removeContractEntry: (id: string) => void;
  setContractTrackerEnabled: (enabled: boolean) => void;
  updateContractIndexAssumptions: (updates: Partial<BaselineData['contractIndexationTracker']['indexAssumptions']>) => void;

  addInvestToSaveProposal: (proposal: InvestToSaveProposal) => void;
  updateInvestToSaveProposal: (id: string, updates: Partial<InvestToSaveProposal>) => void;
  removeInvestToSaveProposal: (id: string) => void;
  setInvestToSaveEnabled: (enabled: boolean) => void;

  addIncomeLine: (line: IncomeGenerationLine) => void;
  updateIncomeLine: (id: string, updates: Partial<IncomeGenerationLine>) => void;
  removeIncomeLine: (id: string) => void;
  setIncomeWorkbookEnabled: (enabled: boolean) => void;
  addGrowthProposal: (proposal: GrowthProposal) => void;
  updateGrowthProposal: (id: string, updates: Partial<GrowthProposal>) => void;
  removeGrowthProposal: (id: string) => void;
  addManualAdjustment: (adjustment: ManualAdjustment) => void;
  updateManualAdjustment: (id: string, updates: Partial<ManualAdjustment>) => void;
  removeManualAdjustment: (id: string) => void;
  addImportMappingProfile: (profile: ImportMappingProfile) => void;
  updateImportMappingProfile: (id: string, updates: Partial<ImportMappingProfile>) => void;
  removeImportMappingProfile: (id: string) => void;
  applyOverlayImport: (sourceName: string, mappedValues: Record<string, number>, unmappedFields?: string[]) => void;
  clearOverlayImports: () => void;

  updateTreasuryIndicators: (updates: Partial<BaselineData['treasuryIndicators']>) => void;
  updateMrpCalculator: (updates: Partial<BaselineData['mrpCalculator']>) => void;

  applyNamedStressTest: (name: 'pay_settlement_plus2' | 'asc_demand_shock' | 'grant_reduction_year2' | 'worst_case') => void;

  addCustomLine: (line: CustomServiceLine) => void;
  updateCustomLine: (id: string, updates: Partial<CustomServiceLine>) => void;
  removeCustomLine: (id: string) => void;

  addSavingsProposal: (p: SavingsProposal) => void;
  updateSavingsProposal: (id: string, updates: Partial<SavingsProposal>) => void;
  removeSavingsProposal: (id: string) => void;
  clearSavingsProposals: () => void;

  addNamedReserve: (r: NamedReserve) => void;
  updateNamedReserve: (id: string, updates: Partial<NamedReserve>) => void;
  removeNamedReserve: (id: string) => void;

  setAuthorityConfig: (cfg: Partial<AuthorityConfig>) => void;

  setModelRunDescription: (description: string) => void;
  appendAssumptionHistory: (description: string) => void;

  saveScenario: (name: string, description: string, type: Scenario['type']) => void;
  updateScenario: (id: string, updates: Partial<Scenario>, description?: string) => void;
  cloneScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  loadScenario: (id: string) => void;

  setActiveTab: (tab: string) => void;
  setActiveRole: (role: 'finance' | 'members') => void;
  setRolePreset: (role: RolePreset) => void;
  setAssumptionEditMode: (mode: AssumptionEditMode) => void;
  setActiveSectionAnchor: (anchor: string | null) => void;
  setSaveState: (state: SaveState) => void;
  setMeetingMode: (enabled: boolean) => void;
  setPrintPreviewMode: (mode: PrintPreviewMode) => void;
  toggleRehearsalChecklistItem: (id: keyof RehearsalChecklist) => void;
  markRehearsalChecklistItem: (id: keyof RehearsalChecklist, value: boolean) => void;
  resetWorkflowUiState: () => void;
  undoLastImport: () => void;
  setUiWarnings: (warnings: Array<{ id: string; severity: 'warning' | 'critical'; message: string; targetTab: string }>) => void;
  setAdvancedPanelOpen: (panelId: string, open: boolean) => void;
  setScenariosFocus: (focus: 'none' | 'snapshots') => void;
  setViewMode: (mode: 'strategic' | 'technical') => void;
  setAudienceMode: (mode: 'finance' | 'members') => void;
  setAccessibilityPreset: (preset: 'default' | 'large-text' | 'high-contrast' | 'dyslexia-friendly') => void;
  setDensityMode: (mode: 'comfortable' | 'compact' | 'presentation') => void;
  saveSnapshot: (name: string, description: string, context?: SnapshotSaveContext) => void;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  exportSnapshotAsJson: (id: string) => string | null;
  importSnapshotFromJson: (jsonText: string) => { success: boolean; message: string; snapshotId?: string; snapshotName?: string };
  exportSnapshotAsXlsx: (id: string) => Promise<Blob | null>;
  importSnapshotFromXlsxFile: (file: File) => Promise<{ success: boolean; message: string; snapshotId?: string; snapshotName?: string }>;
  setPeerBenchmark: (updates: Partial<PeerBenchmarkConfig>) => void;
  resetToDefaults: () => void;
  applyPreset: (preset: 'optimistic' | 'pessimistic') => void;
  lockBaseline: () => void;
  unlockBaseline: () => void;
  freezeAssumptionsForPack: (label: string) => void;
  unfreezeAssumptions: () => void;
  noteGovernanceExport: (kind: 'memberBrief' | 's151Pack' | 'dataCsv') => void;
  setCurrentWorkingSet: (workingSet: MTFSStore['workflowState']['currentWorkingSet']) => void;
  setSelectedDecisionOption: (option: MTFSStore['workflowState']['selectedDecisionOption']) => void;
  setDecisionWeights: (weights: Partial<MTFSStore['decisionWeights']>) => void;
  runEndToEndValidation: () => { blockers: string[]; warnings: string[] };
  createDefaultScenarioPack: () => void;
  createScenarioFromGoal: (goal: ScenarioGoal) => void;
  exportScenarioAuditCsv: () => string;
  enterCfoDemoMode: () => void;
  exitCfoDemoMode: () => void;
  setCfoDemoStep: (step: CfoDemoStep) => void;
  loadCfoDemoDataset: () => void;
  resetCfoDemoState: () => void;
  toggleCfoRehearsalItem: (id: string) => void;
}

const SCENARIO_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#f97316', '#84cc16',
];

const SNAPSHOT_STORAGE_KEY = 'mtfs-snapshots-v1';

function makeYearProfile(value: number): YearProfile5 {
  return { y1: value, y2: value, y3: value, y4: value, y5: value };
}

function coerceYearProfile(value: unknown, fallback: YearProfile5 | number): YearProfile5 {
  const fallbackProfile = typeof fallback === 'number' ? makeYearProfile(fallback) : fallback;
  if (value && typeof value === 'object') {
    const src = value as Partial<YearProfile5>;
    return {
      y1: Number.isFinite(Number(src.y1)) ? Number(src.y1) : fallbackProfile.y1,
      y2: Number.isFinite(Number(src.y2)) ? Number(src.y2) : fallbackProfile.y2,
      y3: Number.isFinite(Number(src.y3)) ? Number(src.y3) : fallbackProfile.y3,
      y4: Number.isFinite(Number(src.y4)) ? Number(src.y4) : fallbackProfile.y4,
      y5: Number.isFinite(Number(src.y5)) ? Number(src.y5) : fallbackProfile.y5,
    };
  }
  if (Number.isFinite(Number(value))) return makeYearProfile(Number(value));
  return fallbackProfile;
}

function incrementYearProfile(profile: YearProfile5 | number, delta: number): YearProfile5 {
  if (typeof profile === 'number') {
    const v = profile + delta;
    return { y1: v, y2: v, y3: v, y4: v, y5: v };
  }
  return { y1: profile.y1 + delta, y2: profile.y2 + delta, y3: profile.y3 + delta, y4: profile.y4 + delta, y5: profile.y5 + delta };
}

function loadSnapshotsFromStorage(): ModelSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ModelSnapshot[];
  } catch {
    return [];
  }
}

function persistSnapshots(snapshots: ModelSnapshot[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
  } catch {
    // ignore localStorage failures
  }
}

const DEFAULT_PEER_BENCHMARK: PeerBenchmarkConfig = {
  enabled: false,
  peerMedianReservesToBudget: 8,
  peerMedianGapPct: 1.5,
  peerUpperRiskScore: 55,
  peerNetExpenditurePerCapita: 1650,
  peerSavingsDeliveryRate: 82,
  peerDebtToNetRevenue: 145,
  sourceLabel: 'User-entered benchmark',
};

function recompute(
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[]
): MTFSResult {
  return runCalculations(normalizeAssumptions(assumptions), baseline, savingsProposals);
}

function normalizeAssumptions(input: Partial<Assumptions> | Assumptions): Assumptions {
  const source = (input ?? {}) as Partial<Assumptions>;
  const expenditure = (source.expenditure ?? {}) as Partial<Assumptions['expenditure']>;
  const funding = (source.funding ?? {}) as Partial<Assumptions['funding']>;
  const policy = (source.policy ?? {}) as Partial<Assumptions['policy']>;
  return {
    ...DEFAULT_ASSUMPTIONS,
    ...source,
    funding: {
      ...DEFAULT_ASSUMPTIONS.funding,
      ...funding,
      councilTaxIncrease: coerceYearProfile(funding.councilTaxIncrease, DEFAULT_ASSUMPTIONS.funding.councilTaxIncrease),
      businessRatesGrowth: coerceYearProfile(funding.businessRatesGrowth, DEFAULT_ASSUMPTIONS.funding.businessRatesGrowth),
      grantVariation: coerceYearProfile(funding.grantVariation, DEFAULT_ASSUMPTIONS.funding.grantVariation),
      feesChargesElasticity: coerceYearProfile(funding.feesChargesElasticity, DEFAULT_ASSUMPTIONS.funding.feesChargesElasticity),
    },
    expenditure: {
      ...DEFAULT_ASSUMPTIONS.expenditure,
      ...expenditure,
      payAward: coerceYearProfile(expenditure.payAward, DEFAULT_ASSUMPTIONS.expenditure.payAward),
      nonPayInflation: coerceYearProfile(expenditure.nonPayInflation, DEFAULT_ASSUMPTIONS.expenditure.nonPayInflation),
      ascDemandGrowth: coerceYearProfile(expenditure.ascDemandGrowth, DEFAULT_ASSUMPTIONS.expenditure.ascDemandGrowth),
      cscDemandGrowth: coerceYearProfile(expenditure.cscDemandGrowth, DEFAULT_ASSUMPTIONS.expenditure.cscDemandGrowth),
      savingsDeliveryRisk: coerceYearProfile(expenditure.savingsDeliveryRisk, DEFAULT_ASSUMPTIONS.expenditure.savingsDeliveryRisk),
      payAwardByFundingSource: {
        ...DEFAULT_ASSUMPTIONS.expenditure.payAwardByFundingSource,
        ...(expenditure.payAwardByFundingSource ?? {}),
      },
      payGroupSensitivity: {
        ...DEFAULT_ASSUMPTIONS.expenditure.payGroupSensitivity,
        ...(expenditure.payGroupSensitivity ?? {}),
      },
    },
    policy: {
      ...DEFAULT_ASSUMPTIONS.policy,
      ...policy,
      annualSavingsTarget: coerceYearProfile(policy.annualSavingsTarget, DEFAULT_ASSUMPTIONS.policy.annualSavingsTarget),
      reservesUsage: coerceYearProfile(policy.reservesUsage, DEFAULT_ASSUMPTIONS.policy.reservesUsage),
    },
    advanced: {
      ...DEFAULT_ASSUMPTIONS.advanced,
      ...(source.advanced ?? {}),
    },
  };
}

function resolveUniqueScenarioName(name: string, scenarios: Scenario[]): string {
  const baseName = name.trim() || 'Scenario';
  const existing = new Set(scenarios.map((s) => s.name.trim().toLowerCase()));
  if (!existing.has(baseName.toLowerCase())) return baseName;
  let suffix = 2;
  let candidate = `${baseName} (${suffix})`;
  while (existing.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${baseName} (${suffix})`;
  }
  return candidate;
}

function buildAuditEntry(result: MTFSResult, description: string): AuditTrailEntry {
  return {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    description,
    totalGap: result.totalGap,
    totalStructuralGap: result.totalStructuralGap,
    overallRiskScore: result.overallRiskScore,
    yearReservesExhausted: result.yearReservesExhausted,
  };
}

function buildAssumptionHistory(assumptions: Assumptions, description: string): AssumptionsHistoryEntry {
  return {
    id: `ah-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    description,
    assumptions,
  };
}

function coerceSnapshotLike(input: unknown): ModelSnapshot | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Partial<ModelSnapshot>;
  if (!candidate.assumptions || !candidate.baseline) return null;
  const requiresReview: Record<string, AssumptionReviewFlag> = {};
  const raw = candidate.assumptions as unknown as Record<string, unknown>;
  const rawFunding = (raw?.funding as Record<string, unknown>) ?? {};
  const rawExpenditure = (raw?.expenditure as Record<string, unknown>) ?? {};
  const rawPolicy = (raw?.policy as Record<string, unknown>) ?? {};
  const markIfScalar = (container: Record<string, unknown>, key: string) => {
    if (typeof container[key] === 'number') {
      requiresReview[key] = { requiresReview: true, reason: 'Legacy scalar imported; Year 1–5 reset to zero for explicit review.' };
    }
  };
  markIfScalar(rawFunding, 'councilTaxIncrease');
  markIfScalar(rawFunding, 'businessRatesGrowth');
  markIfScalar(rawFunding, 'grantVariation');
  markIfScalar(rawFunding, 'feesChargesElasticity');
  markIfScalar(rawExpenditure, 'payAward');
  markIfScalar(rawExpenditure, 'nonPayInflation');
  markIfScalar(rawExpenditure, 'ascDemandGrowth');
  markIfScalar(rawExpenditure, 'cscDemandGrowth');
  markIfScalar(rawExpenditure, 'savingsDeliveryRisk');
  markIfScalar(rawPolicy, 'annualSavingsTarget');
  markIfScalar(rawPolicy, 'reservesUsage');

  const normalized = normalizeAssumptions(candidate.assumptions as Assumptions);
  const zeroIfFlagged = (path: string, current: YearProfile5 | number): YearProfile5 =>
    requiresReview[path]?.requiresReview
      ? { y1: 0, y2: 0, y3: 0, y4: 0, y5: 0 }
      : coerceYearProfile(current, 0);

  return {
    id: candidate.id || `snapshot-${Date.now()}`,
    name: candidate.name || 'Imported Snapshot',
    description: candidate.description || '',
    createdAt: candidate.createdAt || new Date().toISOString(),
    assumptions: {
      ...normalized,
      funding: {
        ...normalized.funding,
        councilTaxIncrease: zeroIfFlagged('councilTaxIncrease', normalized.funding.councilTaxIncrease),
        businessRatesGrowth: zeroIfFlagged('businessRatesGrowth', normalized.funding.businessRatesGrowth),
        grantVariation: zeroIfFlagged('grantVariation', normalized.funding.grantVariation),
        feesChargesElasticity: zeroIfFlagged('feesChargesElasticity', normalized.funding.feesChargesElasticity),
      },
      expenditure: {
        ...normalized.expenditure,
        payAward: zeroIfFlagged('payAward', normalized.expenditure.payAward),
        nonPayInflation: zeroIfFlagged('nonPayInflation', normalized.expenditure.nonPayInflation),
        ascDemandGrowth: zeroIfFlagged('ascDemandGrowth', normalized.expenditure.ascDemandGrowth),
        cscDemandGrowth: zeroIfFlagged('cscDemandGrowth', normalized.expenditure.cscDemandGrowth),
        savingsDeliveryRisk: zeroIfFlagged('savingsDeliveryRisk', normalized.expenditure.savingsDeliveryRisk),
      },
      policy: {
        ...normalized.policy,
        annualSavingsTarget: zeroIfFlagged('annualSavingsTarget', normalized.policy.annualSavingsTarget),
        reservesUsage: zeroIfFlagged('reservesUsage', normalized.policy.reservesUsage),
      },
    },
    baseline: candidate.baseline,
    savingsProposals: candidate.savingsProposals || [],
    authorityConfig: { ...DEFAULT_AUTHORITY_CONFIG, ...(candidate.authorityConfig || {}) },
    scenarios: candidate.scenarios || [],
    metadata: {
      appVersion: candidate.metadata?.appVersion || 'v7.0',
      notes: candidate.metadata?.notes || '',
      schemaVersion: candidate.metadata?.schemaVersion || 'mtfs-v8-yearprofiles',
      requiresReview: {
        ...(candidate.metadata?.requiresReview ?? {}),
        ...requiresReview,
      },
      legacySource: candidate.metadata?.legacySource || (Object.keys(requiresReview).length > 0 ? 'legacy-scalar-import' : undefined),
    },
  };
}

export const useMTFSStore = create<MTFSStore>((set, get) => ({
  assumptions: DEFAULT_ASSUMPTIONS,
  baseline: DEFAULT_BASELINE,
  savingsProposals: [],
  result: recompute(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, []),

  authorityConfig: DEFAULT_AUTHORITY_CONFIG,

  assumptionHistory: [buildAssumptionHistory(DEFAULT_ASSUMPTIONS, 'Initial assumptions')],
  auditTrail: [buildAuditEntry(recompute(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, []), 'Initial model run')],
  modelRunDescription: '',

  scenarios: [],
  activeScenarioId: null,
  scenariosFocus: 'none',
  activeTab: 'summary',
  activeRole: 'finance',
  rolePreset: 'head_of_finance',
  viewMode: 'technical',
  audienceMode: 'finance',
  assumptionEditMode: 'quick_y1',
  activeSectionAnchor: null,
  saveState: 'saved',
  meetingMode: false,
  printPreviewMode: 'none',
  rehearsalChecklist: defaultRehearsalChecklist(),
  lastImportSnapshot: null,
  uiWarnings: [],
  advancedPanelsOpen: {
    baselineAdvanced: false,
    savingsAdvanced: false,
  },
  accessibilityPreset: 'default',
  densityMode: 'comfortable',
  snapshots: loadSnapshotsFromStorage(),
  peerBenchmark: DEFAULT_PEER_BENCHMARK,
  decisionWeights: {
    affordability: 40,
    risk: 30,
    reserves: 20,
    deliverability: 10,
  },
  cfoDemo: {
    enabled: false,
    step: 'position',
    datasetLoaded: false,
    rehearsal: {
      dataset: false,
      scenarios: false,
      assurance: false,
      export: false,
      timing: false,
    },
  },
  workflowState: {
    baselineLocked: false,
    assumptionsFrozen: false,
    governanceExports: { memberBrief: 0, s151Pack: 0, dataCsv: 0 },
  },

  setAssumptions: (a, description = 'Assumptions updated') =>
    set((s) => {
      if (s.workflowState.assumptionsFrozen) return {};
      const assumptions = normalizeAssumptions(a);
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      return {
        assumptions,
        result,
        saveState: 'unsaved',
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, description)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, description)],
      };
    }),

  updateFunding: (key, value, description) =>
    set((s) => {
      if (s.workflowState.assumptionsFrozen) return {};
      const existing = s.assumptions.funding[key];
      const nextValue = typeof existing === 'object' && existing !== null ? makeYearProfile(value) : value;
      const assumptions = { ...s.assumptions, funding: { ...s.assumptions.funding, [key]: nextValue } };
      const desc = description ?? `Funding updated: ${String(key)}`;
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      return {
        assumptions,
        result,
        saveState: 'unsaved',
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, desc)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, desc)],
      };
    }),

  updateExpenditure: (key, value, description) =>
    set((s) => {
      if (s.workflowState.assumptionsFrozen) return {};
      const existing = s.assumptions.expenditure[key];
      const nextValue = typeof existing === 'object' && existing !== null ? makeYearProfile(value) : value;
      const assumptions = { ...s.assumptions, expenditure: { ...s.assumptions.expenditure, [key]: nextValue } };
      const desc = description ?? `Expenditure updated: ${String(key)}`;
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      return {
        assumptions,
        result,
        saveState: 'unsaved',
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, desc)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, desc)],
      };
    }),

  updatePayAwardByFundingSource: (source, value, description) =>
    set((s) => {
      if (s.workflowState.assumptionsFrozen) return {};
      const assumptions = {
        ...s.assumptions,
        expenditure: {
          ...s.assumptions.expenditure,
          payAwardByFundingSource: {
            ...s.assumptions.expenditure.payAwardByFundingSource,
            [source]: value,
          },
        },
      };
      const desc = description ?? `Pay award by source updated: ${String(source)}`;
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      return {
        assumptions,
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, desc)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, desc)],
      };
    }),

  updatePayGroupSensitivity: (group, value, description) =>
    set((s) => {
      if (s.workflowState.assumptionsFrozen) return {};
      const assumptions = {
        ...s.assumptions,
        expenditure: {
          ...s.assumptions.expenditure,
          payGroupSensitivity: {
            ...s.assumptions.expenditure.payGroupSensitivity,
            [group]: value,
          },
        },
      };
      const desc = description ?? `Pay group sensitivity updated: ${String(group)}`;
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      return {
        assumptions,
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, desc)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, desc)],
      };
    }),

  updatePolicy: (key, value, description) =>
    set((s) => {
      if (s.workflowState.assumptionsFrozen) return {};
      const existing = s.assumptions.policy[key];
      const nextValue = (typeof existing === 'object' && existing !== null && typeof value === 'number') ? makeYearProfile(value) : value;
      const assumptions = { ...s.assumptions, policy: { ...s.assumptions.policy, [key]: nextValue as never } };
      const desc = description ?? `Policy updated: ${String(key)}`;
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      return {
        assumptions,
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, desc)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, desc)],
      };
    }),

  updateAdvanced: (key, value, description) =>
    set((s) => {
      if (s.workflowState.assumptionsFrozen) return {};
      const assumptions = { ...s.assumptions, advanced: { ...s.assumptions.advanced, [key]: value } };
      const desc = description ?? `Advanced control updated: ${String(key)}`;
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      return {
        assumptions,
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, desc)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, desc)],
      };
    }),

  setBaseline: (b, description = 'Baseline replaced') =>
    set((s) => {
      if (s.workflowState.baselineLocked || s.workflowState.assumptionsFrozen) return {};
      const result = recompute(s.assumptions, b, s.savingsProposals);
      return { baseline: b, result, saveState: 'unsaved', auditTrail: [...s.auditTrail, buildAuditEntry(result, description)] };
    }),

  updateBaselineField: (key, value, description) =>
    set((s) => {
      if (s.workflowState.baselineLocked || s.workflowState.assumptionsFrozen) return {};
      const baseline = {
        ...s.baseline,
        [key]: value,
        ...(key === 'reservesMinimumThreshold'
          ? {
            reservesAdequacyMethodology: {
              ...s.baseline.reservesAdequacyMethodology,
              fixedMinimum: value,
            },
          }
          : {}),
      };
      const desc = description ?? `Baseline field updated: ${String(key)}`;
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, saveState: 'unsaved', auditTrail: [...s.auditTrail, buildAuditEntry(result, desc)] };
    }),

  importBaselinePartial: (partial, description = 'Baseline imported') =>
    set((s) => {
      if (s.workflowState.baselineLocked || s.workflowState.assumptionsFrozen) return {};
      const baseline = {
        ...s.baseline,
        ...partial,
        ...(typeof partial.reservesMinimumThreshold === 'number'
          ? {
            reservesAdequacyMethodology: {
              ...s.baseline.reservesAdequacyMethodology,
              fixedMinimum: partial.reservesMinimumThreshold,
            },
          }
          : {}),
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return {
        baseline,
        result,
        saveState: 'unsaved',
        lastImportSnapshot: {
          label: description,
          timestamp: new Date().toISOString(),
          baseline: s.baseline,
          assumptions: s.assumptions,
          savingsProposals: s.savingsProposals,
          scenarios: s.scenarios,
        },
        auditTrail: [...s.auditTrail, buildAuditEntry(result, description)],
      };
    }),

  updateCouncilTaxBaseConfig: (updates) =>
    set((s) => {
      const baseline = { ...s.baseline, councilTaxBaseConfig: { ...s.baseline.councilTaxBaseConfig, ...updates } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Council tax base config updated')] };
    }),

  updateBusinessRatesConfig: (updates) =>
    set((s) => {
      const baseline = { ...s.baseline, businessRatesConfig: { ...s.baseline.businessRatesConfig, ...updates } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Business rates config updated')] };
    }),

  addGrantScheduleEntry: (entry) =>
    set((s) => {
      const baseline = { ...s.baseline, grantSchedule: [...s.baseline.grantSchedule, entry] };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Grant schedule entry added')] };
    }),

  updateGrantScheduleEntry: (id, updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        grantSchedule: s.baseline.grantSchedule.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Grant schedule entry updated')] };
    }),

  removeGrantScheduleEntry: (id) =>
    set((s) => {
      const baseline = { ...s.baseline, grantSchedule: s.baseline.grantSchedule.filter((g) => g.id !== id) };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Grant schedule entry removed')] };
    }),

  updateAscCohortModel: (updates) =>
    set((s) => {
      const baseline = { ...s.baseline, ascCohortModel: { ...s.baseline.ascCohortModel, ...updates } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'ASC cohort model updated')] };
    }),

  updateCapitalFinancing: (updates) =>
    set((s) => {
      const baseline = { ...s.baseline, capitalFinancing: { ...s.baseline.capitalFinancing, ...updates } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Capital financing config updated')] };
    }),

  updateRiskBasedReserves: (updates) =>
    set((s) => {
      const baseline = { ...s.baseline, riskBasedReserves: { ...s.baseline.riskBasedReserves, ...updates } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Risk-based reserves config updated')] };
    }),

  updateReservesRecoveryPlan: (updates) =>
    set((s) => {
      const baseline = { ...s.baseline, reservesRecoveryPlan: { ...s.baseline.reservesRecoveryPlan, ...updates } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Reserves recovery plan updated')] };
    }),

  updateReservesAdequacyMethodology: (updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        reservesAdequacyMethodology: { ...s.baseline.reservesAdequacyMethodology, ...updates },
        ...(typeof updates.fixedMinimum === 'number'
          ? { reservesMinimumThreshold: updates.fixedMinimum }
          : {}),
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Reserves adequacy methodology updated')] };
    }),

  addPaySpineRow: (row) =>
    set((s) => {
      const post = legacyPaySpineRowToWorkforcePost(row);
      const baseline = {
        ...s.baseline,
        workforceModel: {
          ...s.baseline.workforceModel,
          enabled: true,
          mode: 'workforce_posts' as PayModelMode,
          posts: [...s.baseline.workforceModel.posts, post],
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Legacy pay spine row migrated to workforce post')] };
    }),

  updatePaySpineRow: (id, updates) =>
    set((s) => {
      const postId = `wf-legacy-${id}`;
      const baseline = {
        ...s.baseline,
        workforceModel: {
          ...s.baseline.workforceModel,
          enabled: true,
          mode: 'workforce_posts' as PayModelMode,
          posts: s.baseline.workforceModel.posts.map((post) => (post.id === postId ? {
            ...post,
            postId: updates.grade ?? post.postId,
            service: updates.grade ? 'Legacy pay spine migration' : post.service,
            fte: typeof updates.fte === 'number' ? updates.fte : post.fte,
            annualCost: typeof updates.spinePointCost === 'number' ? updates.spinePointCost : post.annualCost,
          } : post)),
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Legacy pay spine workforce post updated')] };
    }),

  removePaySpineRow: (id) =>
    set((s) => {
      const postId = `wf-legacy-${id}`;
      const baseline = {
        ...s.baseline,
        workforceModel: { ...s.baseline.workforceModel, posts: s.baseline.workforceModel.posts.filter((post) => post.id !== postId) },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Legacy pay spine workforce post removed')] };
    }),

  setPaySpineEnabled: (enabled) =>
    set((s) => {
      const migrated = enabled ? migratePaySpineRowsToWorkforcePosts(s.baseline.paySpineConfig.rows, s.baseline.workforceModel.posts) : [];
      const baseline = {
        ...s.baseline,
        workforceModel: {
          ...s.baseline.workforceModel,
          enabled: enabled || s.baseline.workforceModel.posts.length > 0,
          mode: (enabled || s.baseline.workforceModel.posts.length > 0 ? 'workforce_posts' : 'baseline') as PayModelMode,
          posts: [...s.baseline.workforceModel.posts, ...migrated],
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, `Legacy pay spine ${enabled ? 'migrated' : 'left inactive'}`)] };
    }),

  setWorkforceModelEnabled: (enabled) =>
    set((s) => {
      const baseline = { ...s.baseline, workforceModel: { ...s.baseline.workforceModel, enabled } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, `Workforce model ${enabled ? 'enabled' : 'disabled'}`)] };
    }),

  setWorkforceModelMode: (mode) =>
    set((s) => {
      const nextMode: PayModelMode = s.baseline.workforceModel.posts.length > 0 || mode === 'workforce_posts' ? 'workforce_posts' : 'baseline';
      const baseline = { ...s.baseline, workforceModel: { ...s.baseline.workforceModel, enabled: nextMode === 'workforce_posts', mode: nextMode } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, `Workforce pay model set: ${nextMode}`)] };
    }),

  addWorkforcePost: (post) =>
    set((s) => {
      const baseline = { ...s.baseline, workforceModel: { ...s.baseline.workforceModel, enabled: true, mode: 'workforce_posts' as PayModelMode, posts: [...s.baseline.workforceModel.posts, post] } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Workforce post added')] };
    }),

  updateWorkforcePost: (id, updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        workforceModel: {
          ...s.baseline.workforceModel,
          posts: s.baseline.workforceModel.posts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Workforce post updated')] };
    }),

  removeWorkforcePost: (id) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        workforceModel: { ...s.baseline.workforceModel, posts: s.baseline.workforceModel.posts.filter((p) => p.id !== id) },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Workforce post removed')] };
    }),

  addContractEntry: (entry) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        contractIndexationTracker: {
          ...s.baseline.contractIndexationTracker,
          contracts: [...s.baseline.contractIndexationTracker.contracts, entry],
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Contract entry added')] };
    }),

  updateContractEntry: (id, updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        contractIndexationTracker: {
          ...s.baseline.contractIndexationTracker,
          contracts: s.baseline.contractIndexationTracker.contracts.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Contract entry updated')] };
    }),

  removeContractEntry: (id) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        contractIndexationTracker: {
          ...s.baseline.contractIndexationTracker,
          contracts: s.baseline.contractIndexationTracker.contracts.filter((c) => c.id !== id),
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Contract entry removed')] };
    }),

  setContractTrackerEnabled: (enabled) =>
    set((s) => {
      const baseline = { ...s.baseline, contractIndexationTracker: { ...s.baseline.contractIndexationTracker, enabled } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, `Contract tracker ${enabled ? 'enabled' : 'disabled'}`)] };
    }),

  updateContractIndexAssumptions: (updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        contractIndexationTracker: {
          ...s.baseline.contractIndexationTracker,
          indexAssumptions: { ...s.baseline.contractIndexationTracker.indexAssumptions, ...updates },
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Contract index assumptions updated')] };
    }),

  addInvestToSaveProposal: (proposal) =>
    set((s) => {
      const baseline = { ...s.baseline, investToSave: { ...s.baseline.investToSave, proposals: [...s.baseline.investToSave.proposals, proposal] } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Invest-to-save proposal added')] };
    }),

  updateInvestToSaveProposal: (id, updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        investToSave: {
          ...s.baseline.investToSave,
          proposals: s.baseline.investToSave.proposals.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Invest-to-save proposal updated')] };
    }),

  removeInvestToSaveProposal: (id) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        investToSave: { ...s.baseline.investToSave, proposals: s.baseline.investToSave.proposals.filter((p) => p.id !== id) },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Invest-to-save proposal removed')] };
    }),

  setInvestToSaveEnabled: (enabled) =>
    set((s) => {
      const baseline = { ...s.baseline, investToSave: { ...s.baseline.investToSave, enabled } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, `Invest-to-save ${enabled ? 'enabled' : 'disabled'}`)] };
    }),

  addIncomeLine: (line) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        incomeGenerationWorkbook: { ...s.baseline.incomeGenerationWorkbook, lines: [...s.baseline.incomeGenerationWorkbook.lines, line] },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Income line added')] };
    }),

  updateIncomeLine: (id, updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        incomeGenerationWorkbook: {
          ...s.baseline.incomeGenerationWorkbook,
          lines: s.baseline.incomeGenerationWorkbook.lines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Income line updated')] };
    }),

  removeIncomeLine: (id) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        incomeGenerationWorkbook: {
          ...s.baseline.incomeGenerationWorkbook,
          lines: s.baseline.incomeGenerationWorkbook.lines.filter((l) => l.id !== id),
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Income line removed')] };
    }),

  setIncomeWorkbookEnabled: (enabled) =>
    set((s) => {
      const baseline = { ...s.baseline, incomeGenerationWorkbook: { ...s.baseline.incomeGenerationWorkbook, enabled } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, `Income workbook ${enabled ? 'enabled' : 'disabled'}`)] };
    }),

  addGrowthProposal: (proposal) =>
    set((s) => {
      const baseline = { ...s.baseline, growthProposals: [...s.baseline.growthProposals, proposal] };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Growth proposal added')] };
    }),

  updateGrowthProposal: (id, updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        growthProposals: s.baseline.growthProposals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Growth proposal updated')] };
    }),

  removeGrowthProposal: (id) =>
    set((s) => {
      const baseline = { ...s.baseline, growthProposals: s.baseline.growthProposals.filter((g) => g.id !== id) };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Growth proposal removed')] };
    }),

  addManualAdjustment: (adjustment) =>
    set((s) => {
      const baseline = { ...s.baseline, manualAdjustments: [...s.baseline.manualAdjustments, adjustment] };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return {
        baseline,
        result,
        auditTrail: [...s.auditTrail, buildAuditEntry(result, `Manual adjustment added (${adjustment.service} Y${adjustment.year}): ${adjustment.reason}`)],
      };
    }),

  updateManualAdjustment: (id, updates) =>
    set((s) => {
      const existing = s.baseline.manualAdjustments.find((a) => a.id === id);
      const baseline = {
        ...s.baseline,
        manualAdjustments: s.baseline.manualAdjustments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      const next = { ...existing, ...updates };
      return {
        baseline,
        result,
        auditTrail: [...s.auditTrail, buildAuditEntry(result, `Manual adjustment updated (${next.service} Y${next.year}): ${next.reason}`)],
      };
    }),

  removeManualAdjustment: (id) =>
    set((s) => {
      const baseline = { ...s.baseline, manualAdjustments: s.baseline.manualAdjustments.filter((a) => a.id !== id) };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Manual adjustment removed')] };
    }),

  addImportMappingProfile: (profile) =>
    set((s) => {
      const baseline = { ...s.baseline, importMappingProfiles: [...s.baseline.importMappingProfiles, profile] };
      return { baseline };
    }),

  updateImportMappingProfile: (id, updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        importMappingProfiles: s.baseline.importMappingProfiles.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      };
      return { baseline };
    }),

  removeImportMappingProfile: (id) =>
    set((s) => {
      const baseline = { ...s.baseline, importMappingProfiles: s.baseline.importMappingProfiles.filter((p) => p.id !== id) };
      return { baseline };
    }),

  applyOverlayImport: (sourceName, mappedValues, unmappedFields = []) =>
    set((s) => {
      const record = {
        id: `overlay-${Date.now()}`,
        sourceName,
        importedAt: new Date().toISOString(),
        mappedValues,
        unmappedFields,
      };
      const baseline = { ...s.baseline, overlayImports: [record, ...s.baseline.overlayImports] };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, `Overlay import applied: ${sourceName}`)] };
    }),

  clearOverlayImports: () =>
    set((s) => {
      const baseline = { ...s.baseline, overlayImports: [] };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Overlay imports cleared')] };
    }),

  updateTreasuryIndicators: (updates) =>
    set((s) => {
      const baseline = { ...s.baseline, treasuryIndicators: { ...s.baseline.treasuryIndicators, ...updates } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Treasury indicators updated')] };
    }),

  updateMrpCalculator: (updates) =>
    set((s) => {
      const baseline = { ...s.baseline, mrpCalculator: { ...s.baseline.mrpCalculator, ...updates } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'MRP calculator updated')] };
    }),

  applyNamedStressTest: (name) =>
    set((s) => {
      let assumptions = { ...s.assumptions };
      if (name === 'pay_settlement_plus2' || name === 'worst_case') {
        assumptions = {
          ...assumptions,
          expenditure: {
            ...assumptions.expenditure,
            payAward: incrementYearProfile(assumptions.expenditure.payAward, 2),
            payAwardByFundingSource: {
              general_fund: assumptions.expenditure.payAwardByFundingSource.general_fund + 2,
              grant: assumptions.expenditure.payAwardByFundingSource.grant + 2,
              other: assumptions.expenditure.payAwardByFundingSource.other + 2,
            },
          },
        };
      }
      if (name === 'asc_demand_shock' || name === 'worst_case') {
        assumptions = { ...assumptions, expenditure: { ...assumptions.expenditure, ascDemandGrowth: incrementYearProfile(assumptions.expenditure.ascDemandGrowth, 15) } };
      }
      if (name === 'grant_reduction_year2' || name === 'worst_case') {
        assumptions = { ...assumptions, funding: { ...assumptions.funding, grantVariation: incrementYearProfile(assumptions.funding.grantVariation, -3) } };
      }
      if (name === 'worst_case') {
        const savingsDelivery = coerceYearProfile(assumptions.expenditure.savingsDeliveryRisk, DEFAULT_ASSUMPTIONS.expenditure.savingsDeliveryRisk);
        assumptions = {
          ...assumptions,
          expenditure: {
            ...assumptions.expenditure,
            nonPayInflation: incrementYearProfile(assumptions.expenditure.nonPayInflation, 3),
            savingsDeliveryRisk: {
              y1: Math.max(30, savingsDelivery.y1 - 20),
              y2: Math.max(30, savingsDelivery.y2 - 20),
              y3: Math.max(30, savingsDelivery.y3 - 20),
              y4: Math.max(30, savingsDelivery.y4 - 20),
              y5: Math.max(30, savingsDelivery.y5 - 20),
            },
          },
          funding: {
            ...assumptions.funding,
            businessRatesGrowth: incrementYearProfile(assumptions.funding.businessRatesGrowth, -2),
          },
        };
      }
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      return {
        assumptions,
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, `Stress test applied: ${name}`)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, `Stress test applied: ${name}`)],
      };
    }),

  addCustomLine: (line) =>
    set((s) => {
      const baseline = { ...s.baseline, customServiceLines: [...s.baseline.customServiceLines, line] };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Custom service line added')] };
    }),

  updateCustomLine: (id, updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        customServiceLines: s.baseline.customServiceLines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Custom service line updated')] };
    }),

  removeCustomLine: (id) =>
    set((s) => {
      const baseline = { ...s.baseline, customServiceLines: s.baseline.customServiceLines.filter((l) => l.id !== id) };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Custom service line removed')] };
    }),

  addSavingsProposal: (p) =>
    set((s) => {
      const proposals = [...s.savingsProposals, p];
      const result = recompute(s.assumptions, s.baseline, proposals);
      return { savingsProposals: proposals, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Savings proposal added')] };
    }),

  updateSavingsProposal: (id, updates) =>
    set((s) => {
      const proposals = s.savingsProposals.map((p) => (p.id === id ? { ...p, ...updates } : p));
      const result = recompute(s.assumptions, s.baseline, proposals);
      return { savingsProposals: proposals, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Savings proposal updated')] };
    }),

  removeSavingsProposal: (id) =>
    set((s) => {
      const proposals = s.savingsProposals.filter((p) => p.id !== id);
      const result = recompute(s.assumptions, s.baseline, proposals);
      return { savingsProposals: proposals, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Savings proposal removed')] };
    }),

  clearSavingsProposals: () =>
    set((s) => {
      const result = recompute(s.assumptions, s.baseline, []);
      return { savingsProposals: [], result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Savings proposals cleared')] };
    }),

  addNamedReserve: (r) =>
    set((s) => {
      const baseline = { ...s.baseline, namedReserves: [...s.baseline.namedReserves, r] };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Named reserve added')] };
    }),

  updateNamedReserve: (id, updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        namedReserves: s.baseline.namedReserves.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Named reserve updated')] };
    }),

  removeNamedReserve: (id) =>
    set((s) => {
      const baseline = { ...s.baseline, namedReserves: s.baseline.namedReserves.filter((r) => r.id !== id) };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Named reserve removed')] };
    }),

  setAuthorityConfig: (cfg) =>
    set((s) => {
      if (s.workflowState.assumptionsFrozen) return {};
      return { authorityConfig: { ...s.authorityConfig, ...cfg } };
    }),

  setModelRunDescription: (description) => set({ modelRunDescription: description }),

  appendAssumptionHistory: (description) =>
    set((s) => ({
      assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(s.assumptions, description)],
    })),

  saveScenario: (name, description, type) => {
    const s = get();
    const id = `scenario-${Date.now()}`;
    const colorIndex = s.scenarios.length % SCENARIO_COLORS.length;
    const resolvedName = resolveUniqueScenarioName(name, s.scenarios);
    const scenario: Scenario = {
      id,
      name: resolvedName,
      description,
      type,
      assumptions: normalizeAssumptions(s.assumptions),
      result: { ...s.result },
      createdAt: new Date().toISOString(),
      color: SCENARIO_COLORS[colorIndex],
      label: 'Draft',
      owner: 'Head of Finance',
      reviewDate: new Date().toISOString().slice(0, 10),
      notes: {
        rationale: description || 'Saved from current model assumptions.',
        assumptions: 'Captured from current five-year assumption profiles.',
        tradeOffs: 'Review affordability, risk and reserves before recommendation.',
        risks: 'Delivery, funding and reserve risk should be checked before governance use.',
        decisionRequired: 'Confirm whether this option should move forward.',
      },
      versionHistory: [{ timestamp: new Date().toISOString(), description: 'Scenario saved' }],
    };
    set((state) => ({ scenarios: [...state.scenarios, scenario] }));
  },
  updateScenario: (id, updates, description = 'Scenario updated') =>
    set((s) => ({
      scenarios: s.scenarios.map((scenario) => {
        if (scenario.id !== id) return scenario;
        const assumptions = updates.assumptions ? normalizeAssumptions(updates.assumptions) : scenario.assumptions;
        const result = updates.assumptions ? recompute(assumptions, s.baseline, s.savingsProposals) : scenario.result;
        return {
          ...scenario,
          ...updates,
          assumptions,
          result,
          versionHistory: [
            ...(scenario.versionHistory ?? []),
            { timestamp: new Date().toISOString(), description },
          ],
        };
      }),
    })),
  cloneScenario: (id) =>
    set((s) => {
      const source = s.scenarios.find((scenario) => scenario.id === id);
      if (!source) return {};
      const cloned: Scenario = {
        ...source,
        id: `scenario-clone-${Date.now()}`,
        name: resolveUniqueScenarioName(`${source.name} Copy`, s.scenarios),
        label: 'Draft',
        createdAt: new Date().toISOString(),
        versionHistory: [
          ...(source.versionHistory ?? []),
          { timestamp: new Date().toISOString(), description: `Cloned from ${source.name}` },
        ],
      };
      return { scenarios: [...s.scenarios, cloned] };
    }),

  deleteScenario: (id) =>
    set((s) => ({
      scenarios: s.scenarios.filter((sc) => sc.id !== id),
      activeScenarioId: s.activeScenarioId === id ? null : s.activeScenarioId,
    })),

  loadScenario: (id) => {
    const s = get();
    const scenario = s.scenarios.find((sc) => sc.id === id);
    if (scenario) {
      const assumptions = normalizeAssumptions(scenario.assumptions);
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      set({
        assumptions,
        result,
        activeScenarioId: id,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, `Scenario loaded: ${scenario.name}`)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, `Scenario loaded: ${scenario.name}`)],
        workflowState: {
          ...s.workflowState,
          currentWorkingSet: { kind: 'scenario', name: scenario.name, timestamp: new Date().toISOString() },
        },
        saveState: 'scenario_loaded',
      });
    }
  },

  setActiveTab: (tab) => {
    const redirects: Record<string, string> = {
      overview: 'summary',
      gap: 'summary',
      insights: 'summary',
      highvalue: 'baseline',
      enhancement: 'baseline',
      drivers: 'baseline',
      technical: 'governance',
      section151: 'governance',
      risk: 'summary',
      help: 'governance',
    };
    set({ activeTab: redirects[tab] ?? tab, printPreviewMode: 'none' });
  },
  setActiveRole: (role) => set({ activeRole: role, audienceMode: role, rolePreset: role === 'members' ? 'councillor' : 'head_of_finance', activeTab: role === 'members' ? 'summary' : 'summary', printPreviewMode: 'none', meetingMode: false }),
  setRolePreset: (role) => {
    const preset = ROLE_PRESETS[role];
    set({
      rolePreset: role,
      activeRole: preset.audience === 'members' ? 'members' : 'finance',
      audienceMode: preset.audience,
      activeTab: preset.defaultTab,
      densityMode: role === 'cfo' || role === 'councillor' ? 'presentation' : 'comfortable',
      printPreviewMode: 'none',
      meetingMode: false,
    });
  },
  setAssumptionEditMode: (mode) => set({ assumptionEditMode: mode }),
  setActiveSectionAnchor: (anchor) => {
    set({ activeSectionAnchor: anchor });
    if (typeof window !== 'undefined' && anchor) {
      window.setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  },
  setSaveState: (state) => set({ saveState: state }),
  setMeetingMode: (enabled) => set({ meetingMode: enabled, densityMode: enabled ? 'presentation' : 'comfortable' }),
  setPrintPreviewMode: (mode) => set({ printPreviewMode: mode }),
  toggleRehearsalChecklistItem: (id) =>
    set((s) => ({ rehearsalChecklist: { ...s.rehearsalChecklist, [id]: !s.rehearsalChecklist[id] } })),
  markRehearsalChecklistItem: (id, value) =>
    set((s) => ({ rehearsalChecklist: { ...s.rehearsalChecklist, [id]: value } })),
  resetWorkflowUiState: () =>
    set({
      activeTab: 'summary',
      activeSectionAnchor: null,
      saveState: 'saved',
      meetingMode: false,
      printPreviewMode: 'none',
      rehearsalChecklist: defaultRehearsalChecklist(),
      scenariosFocus: 'none',
    }),
  undoLastImport: () =>
    set((s) => {
      if (!s.lastImportSnapshot) return {};
      const result = recompute(s.lastImportSnapshot.assumptions, s.lastImportSnapshot.baseline, s.lastImportSnapshot.savingsProposals);
      return {
        baseline: s.lastImportSnapshot.baseline,
        assumptions: s.lastImportSnapshot.assumptions,
        savingsProposals: s.lastImportSnapshot.savingsProposals,
        scenarios: s.lastImportSnapshot.scenarios,
        result,
        saveState: 'unsaved',
        lastImportSnapshot: null,
        auditTrail: [...s.auditTrail, buildAuditEntry(result, `Undo import: ${s.lastImportSnapshot.label}`)],
      };
    }),
  setUiWarnings: (warnings) => set({ uiWarnings: warnings }),
  setAdvancedPanelOpen: (panelId, open) =>
    set((s) => ({ advancedPanelsOpen: { ...s.advancedPanelsOpen, [panelId]: open } })),
  setScenariosFocus: (focus) => set({ scenariosFocus: focus }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setAudienceMode: (mode) => set({ audienceMode: mode }),
  setAccessibilityPreset: (preset) => set({ accessibilityPreset: preset }),
  setDensityMode: (mode) => set({ densityMode: mode }),
  saveSnapshot: (name, description, context) =>
    set((s) => {
      const contextCounts = Object.entries(context?.counts ?? {})
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      const contextNote = context
        ? `source=${context.sourceCard}; enabled=${context.sectionEnabled ?? 'n/a'}${contextCounts ? `; ${contextCounts}` : ''}`
        : '';
      const snapshot: ModelSnapshot = {
        id: `snapshot-${Date.now()}`,
        name,
        description,
        createdAt: new Date().toISOString(),
        assumptions: s.assumptions,
        baseline: s.baseline,
        savingsProposals: s.savingsProposals,
        authorityConfig: s.authorityConfig,
        scenarios: s.scenarios,
        metadata: {
          appVersion: 'v7.0',
          notes: [s.modelRunDescription || '', contextNote].filter(Boolean).join(' | '),
        },
      };
      const snapshots = [snapshot, ...s.snapshots];
      persistSnapshots(snapshots);
      return {
        snapshots,
        workflowState: {
          ...s.workflowState,
          currentWorkingSet: { kind: 'snapshot', name, timestamp: snapshot.createdAt },
        },
      };
    }),
  loadSnapshot: (id) =>
    set((s) => {
      const snapshot = s.snapshots.find((x) => x.id === id);
      if (!snapshot) return {};
      const assumptions = normalizeAssumptions(snapshot.assumptions);
      const result = recompute(assumptions, snapshot.baseline, snapshot.savingsProposals);
      return {
        assumptions,
        baseline: snapshot.baseline,
        savingsProposals: snapshot.savingsProposals,
        authorityConfig: snapshot.authorityConfig,
        scenarios: snapshot.scenarios,
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, `Snapshot loaded: ${snapshot.name}`)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, `Snapshot loaded: ${snapshot.name}`)],
        workflowState: {
          ...s.workflowState,
          currentWorkingSet: { kind: 'snapshot', name: snapshot.name, timestamp: new Date().toISOString() },
        },
      };
    }),
  deleteSnapshot: (id) =>
    set((s) => {
      const snapshots = s.snapshots.filter((x) => x.id !== id);
      persistSnapshots(snapshots);
      return { snapshots };
    }),
  exportSnapshotAsJson: (id) => {
    const s = get();
    const snapshot = s.snapshots.find((x) => x.id === id);
    return snapshot ? JSON.stringify(snapshot, null, 2) : null;
  },
  importSnapshotFromJson: (jsonText) => {
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      const snapshot = coerceSnapshotLike(parsed);
      if (!snapshot) {
        return { success: false, message: 'Invalid snapshot JSON structure' };
      }
      const s = get();
      const snapshots = [snapshot, ...s.snapshots.filter((x) => x.id !== snapshot.id)];
      persistSnapshots(snapshots);
      set({ snapshots });
      return {
        success: true,
        message: 'Snapshot imported to library. Load it before locking if you want it to drive the current model.',
        snapshotId: snapshot.id,
        snapshotName: snapshot.name,
      };
    } catch {
      return { success: false, message: 'Could not parse snapshot JSON' };
    }
  },
  exportSnapshotAsXlsx: async (id) => {
    const s = get();
    const snapshot = s.snapshots.find((x) => x.id === id);
    if (!snapshot) return null;
    return exportSnapshotToWorkbookBlob(snapshot);
  },
  importSnapshotFromXlsxFile: async (file) => {
    const parsed = await importSnapshotFromWorkbookFile(file);
    if (!parsed.success) {
      return { success: false, message: parsed.message };
    }
    const snapshot = coerceSnapshotLike(parsed.snapshot);
    if (!snapshot) {
      return { success: false, message: 'Invalid snapshot structure in workbook' };
    }
    const s = get();
    const snapshots = [snapshot, ...s.snapshots.filter((x) => x.id !== snapshot.id)];
    persistSnapshots(snapshots);
    set({ snapshots });
    return {
      success: true,
      message: `Snapshot imported to library. Load it before locking if you want it to drive the current model.`,
      snapshotId: snapshot.id,
      snapshotName: snapshot.name,
    };
  },
  setPeerBenchmark: (updates) =>
    set((s) => ({ peerBenchmark: { ...s.peerBenchmark, ...updates } })),

  resetToDefaults: () =>
    set((s) => {
      const result = recompute(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, []);
      return {
        assumptions: DEFAULT_ASSUMPTIONS,
        baseline: DEFAULT_BASELINE,
        savingsProposals: [],
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(DEFAULT_ASSUMPTIONS, 'Reset to defaults')],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Reset to defaults')],
        workflowState: {
          baselineLocked: false,
          assumptionsFrozen: false,
          governanceExports: { memberBrief: 0, s151Pack: 0, dataCsv: 0 },
        },
      };
    }),

  applyPreset: (preset) => {
    const s = get();
    const assumptions: Assumptions = preset === 'optimistic'
      ? {
        funding: {
          councilTaxIncrease: makeYearProfile(4.99),
          businessRatesGrowth: makeYearProfile(3.0),
          grantVariation: makeYearProfile(1.0),
          feesChargesElasticity: makeYearProfile(4.0),
        },
        expenditure: {
          payAward: makeYearProfile(2.5),
          nonPayInflation: makeYearProfile(2.0),
          ascDemandGrowth: makeYearProfile(3.5),
          cscDemandGrowth: makeYearProfile(3.0),
          savingsDeliveryRisk: makeYearProfile(95),
          payAwardByFundingSource: { general_fund: 2.5, grant: 2.5, other: 2.5 },
          payGroupSensitivity: { default: 0, teachers: 0, njc: 0, senior: 0, other: 0 },
        },
        policy: { ...s.assumptions.policy, annualSavingsTarget: makeYearProfile(3_000) },
        advanced: s.assumptions.advanced,
      }
      : {
        funding: {
          councilTaxIncrease: makeYearProfile(2.99),
          businessRatesGrowth: makeYearProfile(0.5),
          grantVariation: makeYearProfile(-4.0),
          feesChargesElasticity: makeYearProfile(0.5),
        },
        expenditure: {
          payAward: makeYearProfile(5.0),
          nonPayInflation: makeYearProfile(5.0),
          ascDemandGrowth: makeYearProfile(8.0),
          cscDemandGrowth: makeYearProfile(6.5),
          savingsDeliveryRisk: makeYearProfile(65),
          payAwardByFundingSource: { general_fund: 5.0, grant: 5.0, other: 5.0 },
          payGroupSensitivity: { default: 0, teachers: 0, njc: 0, senior: 0, other: 0 },
        },
        policy: { ...s.assumptions.policy, annualSavingsTarget: makeYearProfile(6_000) },
        advanced: s.assumptions.advanced,
      };

    const result = recompute(assumptions, s.baseline, s.savingsProposals);
    set({
      assumptions,
      result,
      assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, `Preset applied: ${preset}`)],
      auditTrail: [...s.auditTrail, buildAuditEntry(result, `Preset applied: ${preset}`)],
    });
  },
  lockBaseline: () =>
    set((s) => ({ workflowState: { ...s.workflowState, baselineLocked: true }, saveState: 'baseline_locked', rehearsalChecklist: { ...s.rehearsalChecklist, baselineLocked: true } })),
  unlockBaseline: () =>
    set((s) => ({ workflowState: { ...s.workflowState, baselineLocked: false } })),
  freezeAssumptionsForPack: (label) =>
    set((s) => ({ workflowState: { ...s.workflowState, assumptionsFrozen: true, frozenLabel: label }, saveState: 'pack_frozen', rehearsalChecklist: { ...s.rehearsalChecklist, packFrozen: true } })),
  unfreezeAssumptions: () =>
    set((s) => ({ workflowState: { ...s.workflowState, assumptionsFrozen: false, frozenLabel: undefined } })),
  noteGovernanceExport: (kind) =>
    set((s) => ({
      workflowState: {
        ...s.workflowState,
        governanceExports: { ...s.workflowState.governanceExports, [kind]: s.workflowState.governanceExports[kind] + 1 },
      },
      rehearsalChecklist: { ...s.rehearsalChecklist, exportTested: true },
    })),
  setCurrentWorkingSet: (workingSet) =>
    set((s) => ({ workflowState: { ...s.workflowState, currentWorkingSet: workingSet } })),
  setSelectedDecisionOption: (option) =>
    set((s) => ({ workflowState: { ...s.workflowState, selectedDecisionOption: option } })),
  setDecisionWeights: (weights) =>
    set((s) => ({ decisionWeights: { ...s.decisionWeights, ...weights } })),
  runEndToEndValidation: () => {
    const s = get();
    const summary = validateModel({
      authorityConfig: s.authorityConfig,
      baseline: s.baseline,
      assumptions: s.assumptions,
      result: s.result,
      savingsProposals: s.savingsProposals,
      scenarios: s.scenarios,
      snapshots: s.snapshots,
      workflowState: s.workflowState,
    });
    set((state) => ({
      workflowState: {
        ...state.workflowState,
        lastValidation: { timestamp: new Date().toISOString(), blockers: summary.blockers, warnings: summary.warnings },
      },
      rehearsalChecklist: { ...state.rehearsalChecklist, validationRun: true },
    }));
    return { blockers: summary.blockers, warnings: summary.warnings };
  },
  createDefaultScenarioPack: () =>
    set((s) => {
      const baseAssumptions = normalizeAssumptions(s.assumptions);
      const templates = buildScenarioTemplates(baseAssumptions, s.baseline, s.savingsProposals, s.result);
      const templateNames = new Set(templates.map((scenario) => scenario.name.trim().toLowerCase()));
      const deduped = s.scenarios.filter((sc) => !templateNames.has(sc.name.trim().toLowerCase()));
      return { scenarios: [...deduped, ...templates], rehearsalChecklist: { ...s.rehearsalChecklist, scenariosReady: true } };
    }),
  createScenarioFromGoal: (goal) =>
    set((s) => {
      const scenario = buildScenarioFromGoal(goal, normalizeAssumptions(s.assumptions), s.baseline, s.savingsProposals, s.result);
      return { scenarios: [...s.scenarios, { ...scenario, name: resolveUniqueScenarioName(scenario.name, s.scenarios) }] };
    }),
  exportScenarioAuditCsv: () => exportScenarioAuditCsv(get().scenarios, get().result),
  enterCfoDemoMode: () =>
    set((s) => ({
      activeRole: 'finance',
      activeTab: 'summary',
      densityMode: 'presentation',
      cfoDemo: {
        ...s.cfoDemo,
        enabled: true,
        step: 'position',
        startedAt: new Date().toISOString(),
      },
    })),
  exitCfoDemoMode: () =>
    set((s) => ({
      densityMode: s.densityMode === 'presentation' ? 'comfortable' : s.densityMode,
      cfoDemo: { ...s.cfoDemo, enabled: false },
    })),
  setCfoDemoStep: (step) =>
    set((s) => ({
      cfoDemo: { ...s.cfoDemo, step: CFO_DEMO_STEPS.includes(step) ? step : 'position' },
    })),
  loadCfoDemoDataset: () =>
    set((s) => {
      const demo = buildCfoDemoDataset();
      const result = recompute(demo.assumptions, demo.baseline, demo.savingsProposals);
      const snapshots = [demo.snapshot, ...s.snapshots.filter((snapshot) => snapshot.id !== demo.snapshot.id)];
      persistSnapshots(snapshots);
      return {
        assumptions: demo.assumptions,
        baseline: demo.baseline,
        authorityConfig: demo.authorityConfig,
        savingsProposals: demo.savingsProposals,
        scenarios: demo.scenarios,
        snapshots,
        result,
        activeRole: 'finance',
        activeTab: 'summary',
        densityMode: 'presentation',
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(demo.assumptions, 'CFO demo dataset loaded')],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, 'CFO demo dataset loaded')],
        workflowState: {
          ...s.workflowState,
          baselineLocked: true,
          assumptionsFrozen: false,
          currentWorkingSet: { kind: 'snapshot', name: demo.snapshot.name, timestamp: demo.snapshot.createdAt },
          lastValidation: undefined,
        },
        cfoDemo: {
          ...s.cfoDemo,
          enabled: true,
          step: 'position',
          startedAt: new Date().toISOString(),
          datasetLoaded: true,
          rehearsal: { ...s.cfoDemo.rehearsal, dataset: true, scenarios: true },
        },
        rehearsalChecklist: {
          ...s.rehearsalChecklist,
          demoDataLoaded: true,
          baselineLocked: true,
          scenariosReady: true,
        },
      };
    }),
  resetCfoDemoState: () =>
    set((s) => ({
      cfoDemo: {
        ...s.cfoDemo,
        enabled: true,
        step: 'position',
        startedAt: new Date().toISOString(),
        rehearsal: {
          dataset: s.cfoDemo.datasetLoaded,
          scenarios: s.scenarios.length >= 3,
          assurance: false,
          export: false,
          timing: false,
        },
      },
      activeTab: 'summary',
      activeRole: 'finance',
      densityMode: 'presentation',
    })),
  toggleCfoRehearsalItem: (id) =>
    set((s) => ({
      cfoDemo: {
        ...s.cfoDemo,
        rehearsal: { ...s.cfoDemo.rehearsal, [id]: !s.cfoDemo.rehearsal[id] },
      },
    })),
}));
