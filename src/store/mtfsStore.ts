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
} from '../types/financial';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_BASELINE,
  DEFAULT_AUTHORITY_CONFIG,
  runCalculations,
} from '../engine/calculations';
import { exportSnapshotToWorkbookBlob, importSnapshotFromWorkbookFile } from '../utils/snapshotExcel';

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
  activeTab: string;
  viewMode: 'strategic' | 'technical';
  audienceMode: 'finance' | 'members';
  accessibilityPreset: 'default' | 'large-text' | 'high-contrast' | 'dyslexia-friendly';
  densityMode: 'comfortable' | 'compact' | 'presentation';
  snapshots: ModelSnapshot[];
  peerBenchmark: PeerBenchmarkConfig;

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
  deleteScenario: (id: string) => void;
  loadScenario: (id: string) => void;

  setActiveTab: (tab: string) => void;
  setViewMode: (mode: 'strategic' | 'technical') => void;
  setAudienceMode: (mode: 'finance' | 'members') => void;
  setAccessibilityPreset: (preset: 'default' | 'large-text' | 'high-contrast' | 'dyslexia-friendly') => void;
  setDensityMode: (mode: 'comfortable' | 'compact' | 'presentation') => void;
  saveSnapshot: (name: string, description: string) => void;
  loadSnapshot: (id: string) => void;
  deleteSnapshot: (id: string) => void;
  exportSnapshotAsJson: (id: string) => string | null;
  importSnapshotFromJson: (jsonText: string) => { success: boolean; message: string };
  exportSnapshotAsXlsx: (id: string) => Promise<Blob | null>;
  importSnapshotFromXlsxFile: (file: File) => Promise<{ success: boolean; message: string }>;
  setPeerBenchmark: (updates: Partial<PeerBenchmarkConfig>) => void;
  resetToDefaults: () => void;
  applyPreset: (preset: 'optimistic' | 'pessimistic') => void;
}

const SCENARIO_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#f97316', '#84cc16',
];

const SNAPSHOT_STORAGE_KEY = 'mtfs-snapshots-v1';

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
  return runCalculations(assumptions, baseline, savingsProposals);
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
  return {
    id: candidate.id || `snapshot-${Date.now()}`,
    name: candidate.name || 'Imported Snapshot',
    description: candidate.description || '',
    createdAt: candidate.createdAt || new Date().toISOString(),
    assumptions: candidate.assumptions,
    baseline: candidate.baseline,
    savingsProposals: candidate.savingsProposals || [],
    authorityConfig: { ...DEFAULT_AUTHORITY_CONFIG, ...(candidate.authorityConfig || {}) },
    scenarios: candidate.scenarios || [],
    metadata: {
      appVersion: candidate.metadata?.appVersion || 'v7.0',
      notes: candidate.metadata?.notes || '',
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
  activeTab: 'overview',
  viewMode: 'technical',
  audienceMode: 'finance',
  accessibilityPreset: 'default',
  densityMode: 'comfortable',
  snapshots: loadSnapshotsFromStorage(),
  peerBenchmark: DEFAULT_PEER_BENCHMARK,

  setAssumptions: (a, description = 'Assumptions updated') =>
    set((s) => {
      const result = recompute(a, s.baseline, s.savingsProposals);
      return {
        assumptions: a,
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(a, description)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, description)],
      };
    }),

  updateFunding: (key, value, description) =>
    set((s) => {
      const assumptions = { ...s.assumptions, funding: { ...s.assumptions.funding, [key]: value } };
      const desc = description ?? `Funding updated: ${String(key)}`;
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      return {
        assumptions,
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, desc)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, desc)],
      };
    }),

  updateExpenditure: (key, value, description) =>
    set((s) => {
      const assumptions = { ...s.assumptions, expenditure: { ...s.assumptions.expenditure, [key]: value } };
      const desc = description ?? `Expenditure updated: ${String(key)}`;
      const result = recompute(assumptions, s.baseline, s.savingsProposals);
      return {
        assumptions,
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(assumptions, desc)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, desc)],
      };
    }),

  updatePayAwardByFundingSource: (source, value, description) =>
    set((s) => {
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
      const assumptions = { ...s.assumptions, policy: { ...s.assumptions.policy, [key]: value } };
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
      const result = recompute(s.assumptions, b, s.savingsProposals);
      return { baseline: b, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, description)] };
    }),

  updateBaselineField: (key, value, description) =>
    set((s) => {
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
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, desc)] };
    }),

  importBaselinePartial: (partial, description = 'Baseline imported') =>
    set((s) => {
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
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, description)] };
    }),

  updateCouncilTaxBaseConfig: (updates) =>
    set((s) => {
      const baseline = { ...s.baseline, councilTaxBaseConfig: { ...s.baseline.councilTaxBaseConfig, ...updates } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Council tax base config updated')] };
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
      const baseline = { ...s.baseline, paySpineConfig: { ...s.baseline.paySpineConfig, rows: [...s.baseline.paySpineConfig.rows, row] } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Pay spine row added')] };
    }),

  updatePaySpineRow: (id, updates) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        paySpineConfig: {
          ...s.baseline.paySpineConfig,
          rows: s.baseline.paySpineConfig.rows.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Pay spine row updated')] };
    }),

  removePaySpineRow: (id) =>
    set((s) => {
      const baseline = {
        ...s.baseline,
        paySpineConfig: {
          ...s.baseline.paySpineConfig,
          rows: s.baseline.paySpineConfig.rows.filter((r) => r.id !== id),
        },
      };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, 'Pay spine row removed')] };
    }),

  setPaySpineEnabled: (enabled) =>
    set((s) => {
      const baseline = { ...s.baseline, paySpineConfig: { ...s.baseline.paySpineConfig, enabled } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, `Pay spine ${enabled ? 'enabled' : 'disabled'}`)] };
    }),

  setWorkforceModelEnabled: (enabled) =>
    set((s) => {
      const baseline = { ...s.baseline, workforceModel: { ...s.baseline.workforceModel, enabled } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, `Workforce model ${enabled ? 'enabled' : 'disabled'}`)] };
    }),

  setWorkforceModelMode: (mode) =>
    set((s) => {
      const baseline = { ...s.baseline, workforceModel: { ...s.baseline.workforceModel, mode } };
      const result = recompute(s.assumptions, baseline, s.savingsProposals);
      return { baseline, result, auditTrail: [...s.auditTrail, buildAuditEntry(result, `Workforce model mode set: ${mode}`)] };
    }),

  addWorkforcePost: (post) =>
    set((s) => {
      const baseline = { ...s.baseline, workforceModel: { ...s.baseline.workforceModel, posts: [...s.baseline.workforceModel.posts, post] } };
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
            payAward: assumptions.expenditure.payAward + 2,
            payAwardByFundingSource: {
              general_fund: assumptions.expenditure.payAwardByFundingSource.general_fund + 2,
              grant: assumptions.expenditure.payAwardByFundingSource.grant + 2,
              other: assumptions.expenditure.payAwardByFundingSource.other + 2,
            },
          },
        };
      }
      if (name === 'asc_demand_shock' || name === 'worst_case') {
        assumptions = { ...assumptions, expenditure: { ...assumptions.expenditure, ascDemandGrowth: assumptions.expenditure.ascDemandGrowth + 15 } };
      }
      if (name === 'grant_reduction_year2' || name === 'worst_case') {
        assumptions = { ...assumptions, funding: { ...assumptions.funding, grantVariation: assumptions.funding.grantVariation - 3 } };
      }
      if (name === 'worst_case') {
        assumptions = {
          ...assumptions,
          expenditure: {
            ...assumptions.expenditure,
            nonPayInflation: assumptions.expenditure.nonPayInflation + 3,
            savingsDeliveryRisk: Math.max(30, assumptions.expenditure.savingsDeliveryRisk - 20),
          },
          funding: {
            ...assumptions.funding,
            businessRatesGrowth: assumptions.funding.businessRatesGrowth - 2,
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
    set((s) => ({ authorityConfig: { ...s.authorityConfig, ...cfg } })),

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
      assumptions: { ...s.assumptions },
      result: { ...s.result },
      createdAt: new Date().toISOString(),
      color: SCENARIO_COLORS[colorIndex],
    };
    set((state) => ({ scenarios: [...state.scenarios, scenario] }));
  },

  deleteScenario: (id) =>
    set((s) => ({
      scenarios: s.scenarios.filter((sc) => sc.id !== id),
      activeScenarioId: s.activeScenarioId === id ? null : s.activeScenarioId,
    })),

  loadScenario: (id) => {
    const s = get();
    const scenario = s.scenarios.find((sc) => sc.id === id);
    if (scenario) {
      const result = recompute(scenario.assumptions, s.baseline, s.savingsProposals);
      set({
        assumptions: scenario.assumptions,
        result,
        activeScenarioId: id,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(scenario.assumptions, `Scenario loaded: ${scenario.name}`)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, `Scenario loaded: ${scenario.name}`)],
      });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setAudienceMode: (mode) => set({ audienceMode: mode }),
  setAccessibilityPreset: (preset) => set({ accessibilityPreset: preset }),
  setDensityMode: (mode) => set({ densityMode: mode }),
  saveSnapshot: (name, description) =>
    set((s) => {
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
          notes: s.modelRunDescription || '',
        },
      };
      const snapshots = [snapshot, ...s.snapshots];
      persistSnapshots(snapshots);
      return { snapshots };
    }),
  loadSnapshot: (id) =>
    set((s) => {
      const snapshot = s.snapshots.find((x) => x.id === id);
      if (!snapshot) return {};
      const result = recompute(snapshot.assumptions, snapshot.baseline, snapshot.savingsProposals);
      return {
        assumptions: snapshot.assumptions,
        baseline: snapshot.baseline,
        savingsProposals: snapshot.savingsProposals,
        authorityConfig: snapshot.authorityConfig,
        scenarios: snapshot.scenarios,
        result,
        assumptionHistory: [...s.assumptionHistory, buildAssumptionHistory(snapshot.assumptions, `Snapshot loaded: ${snapshot.name}`)],
        auditTrail: [...s.auditTrail, buildAuditEntry(result, `Snapshot loaded: ${snapshot.name}`)],
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
      return { success: true, message: `Imported snapshot: ${snapshot.name}` };
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
    return { success: true, message: `Imported snapshot from workbook: ${snapshot.name}` };
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
      };
    }),

  applyPreset: (preset) => {
    const s = get();
    const assumptions: Assumptions = preset === 'optimistic'
      ? {
        funding: { councilTaxIncrease: 4.99, businessRatesGrowth: 3.0, grantVariation: 1.0, feesChargesElasticity: 4.0 },
        expenditure: {
          payAward: 2.5,
          nonPayInflation: 2.0,
          ascDemandGrowth: 3.5,
          cscDemandGrowth: 3.0,
          savingsDeliveryRisk: 95,
          payAwardByFundingSource: { general_fund: 2.5, grant: 2.5, other: 2.5 },
          payGroupSensitivity: { default: 0, teachers: 0, njc: 0, senior: 0, other: 0 },
        },
        policy: { ...s.assumptions.policy, annualSavingsTarget: 3_000 },
        advanced: s.assumptions.advanced,
      }
      : {
        funding: { councilTaxIncrease: 2.99, businessRatesGrowth: 0.5, grantVariation: -4.0, feesChargesElasticity: 0.5 },
        expenditure: {
          payAward: 5.0,
          nonPayInflation: 5.0,
          ascDemandGrowth: 8.0,
          cscDemandGrowth: 6.5,
          savingsDeliveryRisk: 65,
          payAwardByFundingSource: { general_fund: 5.0, grant: 5.0, other: 5.0 },
          payGroupSensitivity: { default: 0, teachers: 0, njc: 0, senior: 0, other: 0 },
        },
        policy: { ...s.assumptions.policy, annualSavingsTarget: 6_000 },
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
}));
