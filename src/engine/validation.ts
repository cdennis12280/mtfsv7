import type {
  Assumptions,
  AuthorityConfig,
  BaselineData,
  ModelSnapshot,
  MTFSResult,
  SavingsProposal,
  Scenario,
  YearProfile5,
} from '../types/financial';
import { normalizeBaseline } from './calculations';
import { coerceYearProfile } from '../utils/yearProfile';

export type ValidationSeverity = 'blocker' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  area: 'setup' | 'baseline' | 'assumptions' | 'savings' | 'reserves' | 'scenarios' | 'governance';
  message: string;
  targetTab: string;
  targetSection?: string;
  evidence?: string;
}

export interface ValidationSummary {
  issues: ValidationIssue[];
  blockers: string[];
  warnings: string[];
  infos: string[];
  modelConfidenceScore: number;
}

interface WorkflowValidationState {
  baselineLocked: boolean;
  assumptionsFrozen: boolean;
  governanceExports: { memberBrief: number; s151Pack: number; dataCsv: number };
}

export interface ValidationInput {
  authorityConfig: AuthorityConfig;
  baseline: BaselineData;
  assumptions: Assumptions;
  result: MTFSResult;
  savingsProposals: SavingsProposal[];
  scenarios: Scenario[];
  snapshots: ModelSnapshot[];
  workflowState: WorkflowValidationState;
}

const PLACEHOLDER_AUTHORITY = 'Example Unitary Authority';

function profileValues(profile: YearProfile5 | number): number[] {
  const p = coerceYearProfile(profile, 0);
  return [p.y1, p.y2, p.y3, p.y4, p.y5];
}

function hasOutOfRange(profile: YearProfile5 | number, min: number, max: number): boolean {
  return profileValues(profile).some((value) => value < min || value > max);
}

function addIssue(issues: ValidationIssue[], issue: ValidationIssue) {
  issues.push(issue);
}

export function validateModel(input: ValidationInput): ValidationSummary {
  const { authorityConfig, assumptions, result, savingsProposals, scenarios, snapshots, workflowState } = input;
  const baseline = normalizeBaseline(input.baseline);
  const issues: ValidationIssue[] = [];

  if (!authorityConfig.authorityName || authorityConfig.authorityName === PLACEHOLDER_AUTHORITY) {
    addIssue(issues, {
      id: 'authority-placeholder',
      severity: 'blocker',
      area: 'setup',
      targetTab: 'baseline',
      message: 'Authority metadata has not been confirmed.',
      evidence: 'Replace the example authority name before sharing a pack.',
    });
  }

  if (!workflowState.baselineLocked) {
    addIssue(issues, {
      id: 'baseline-unlocked',
      severity: 'warning',
      area: 'baseline',
      targetTab: 'baseline',
      message: 'Baseline is still editable.',
      evidence: 'Lock the baseline before comparing scenarios or exporting committee material.',
    });
  }

  const coreBaselineFields: Array<[string, number]> = [
    ['Council tax', baseline.councilTax],
    ['Business rates', baseline.businessRates],
    ['Core grants', baseline.coreGrants],
    ['Fees and charges', baseline.feesAndCharges],
    ['Pay', baseline.pay],
    ['Non-pay', baseline.nonPay],
    ['ASC demand-led spend', baseline.ascDemandLed],
    ['CSC demand-led spend', baseline.cscDemandLed],
    ['Other service expenditure', baseline.otherServiceExp],
  ];
  for (const [label, value] of coreBaselineFields) {
    if (!Number.isFinite(value) || value < 0) {
      addIssue(issues, {
        id: `baseline-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        severity: 'blocker',
        area: 'baseline',
        targetTab: 'baseline',
        message: `${label} contains an invalid baseline value.`,
        evidence: `Current value: ${String(value)}`,
      });
    }
  }

  const percentageChecks: Array<[string, YearProfile5 | number, number, number]> = [
    ['Council tax increase', assumptions.funding.councilTaxIncrease, -5, 10],
    ['Business rates growth', assumptions.funding.businessRatesGrowth, -20, 20],
    ['Grant variation', assumptions.funding.grantVariation, -30, 30],
    ['Fees and charges elasticity', assumptions.funding.feesChargesElasticity, -30, 30],
    ['Pay award', assumptions.expenditure.payAward, 0, 15],
    ['Non-pay inflation', assumptions.expenditure.nonPayInflation, -5, 20],
    ['ASC demand growth', assumptions.expenditure.ascDemandGrowth, -5, 20],
    ['CSC demand growth', assumptions.expenditure.cscDemandGrowth, -5, 20],
    ['Savings delivery risk', assumptions.expenditure.savingsDeliveryRisk, 0, 100],
  ];
  for (const [label, profile, min, max] of percentageChecks) {
    if (hasOutOfRange(profile, min, max)) {
      addIssue(issues, {
        id: `assumption-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        severity: 'warning',
        area: 'assumptions',
        targetTab: 'baseline',
        message: `${label} is outside the expected range.`,
        evidence: `Expected ${min}% to ${max}% across all five years.`,
      });
    }
  }

  const unmappedImportCount = baseline.overlayImports.reduce((sum, record) => sum + record.unmappedFields.length, 0);
  if (unmappedImportCount > 0) {
    addIssue(issues, {
      id: 'imports-unmapped-fields',
      severity: 'warning',
      area: 'baseline',
      targetTab: 'import',
      message: 'Imported data still has unmapped fields.',
      evidence: `${unmappedImportCount} fields need review before relying on the model.`,
    });
  }

  if (baseline.workforceModel.posts.length > 0) {
    const reconciliation = result.years[0]?.payBudgetReconciliation;
    const importedPay = reconciliation?.importedPayBudget ?? 0;
    const variance = importedPay - baseline.pay;
    if (Math.abs(variance) > Math.max(500, baseline.pay * 0.02)) {
      addIssue(issues, {
        id: 'pay-budget-reconciliation',
        severity: 'warning',
        area: 'baseline',
        targetTab: 'baseline',
        message: 'Imported pay budgets do not reconcile to the baseline pay budget.',
        evidence: `${reconciliation?.activeModelMode ?? 'pay model'} variance is £${variance.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k.`,
      });
    }
    if (baseline.workforceModel.posts.some((post) => !post.service || !post.postId)) {
      addIssue(issues, {
        id: 'pay-budget-metadata',
        severity: 'warning',
        area: 'baseline',
        targetTab: 'baseline',
        message: 'Some workforce pay rows are missing post or service metadata.',
      });
    }
    if (baseline.workforceModel.posts.some((post) => {
      const total = (post.generalFundSplit ?? (post.fundingSource === 'general_fund' ? 100 : 0))
        + (post.grantFundSplit ?? (post.fundingSource === 'grant' ? 100 : 0))
        + (post.otherSplit ?? (post.fundingSource === 'other' ? 100 : 0));
      return Math.abs(total - 100) > 0.01;
    })) {
      addIssue(issues, {
        id: 'pay-budget-split-total',
        severity: 'warning',
        area: 'baseline',
        targetTab: 'baseline',
        message: 'Some workforce funding splits do not total 100%.',
        evidence: 'The calculation normalises split percentages, but source data should be corrected for audit clarity.',
      });
    }
  }

  if (baseline.contractIndexationTracker.enabled) {
    const contractTotal = baseline.contractIndexationTracker.contracts.reduce((sum, contract) => sum + contract.value, 0);
    if (Math.abs(contractTotal - baseline.nonPay) > Math.max(500, baseline.nonPay * 0.15)) {
      addIssue(issues, {
        id: 'contract-nonpay-reconciliation',
        severity: 'warning',
        area: 'baseline',
        targetTab: 'baseline',
        message: 'Indexed contract register does not reconcile closely to non-pay baseline.',
        evidence: `Contract register total £${contractTotal.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k vs non-pay baseline £${baseline.nonPay.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k.`,
      });
    }
  }

  if (baseline.grantSchedule.some((grant) => !grant.name || grant.replacementAssumption === undefined || grant.ringfenced === undefined)) {
    addIssue(issues, {
      id: 'grant-metadata-incomplete',
      severity: 'warning',
      area: 'baseline',
      targetTab: 'baseline',
      message: 'Some grant funding lines are missing ringfence or replacement assumptions.',
    });
  }

  if (result.requiredSavingsToBalance > 0 && savingsProposals.length === 0) {
    addIssue(issues, {
      id: 'savings-no-proposals',
      severity: 'warning',
      area: 'savings',
      targetTab: 'savings',
      message: 'No proposal-level savings plan has been entered.',
      evidence: 'The model still shows a savings requirement to balance.',
    });
  }

  if (savingsProposals.some((proposal) => proposal.achievementRate < 0 || proposal.achievementRate > 100 || proposal.grossValue < 0)) {
    addIssue(issues, {
      id: 'savings-invalid-values',
      severity: 'blocker',
      area: 'savings',
      targetTab: 'savings',
      message: 'At least one savings proposal has impossible values.',
      evidence: 'Achievement rates must be 0-100% and gross values must not be negative.',
    });
  }

  if (baseline.growthProposals.some((proposal) => !proposal.owner || proposal.confidence < 50 || !proposal.evidenceNote)) {
    addIssue(issues, {
      id: 'growth-proposal-evidence',
      severity: 'warning',
      area: 'savings',
      targetTab: 'savings',
      message: 'Some growth proposals are missing owner, confidence, or evidence notes.',
      evidence: 'Service-led growth needs explicit evidence before governance use.',
    });
  }

  if (result.yearReservesExhausted) {
    addIssue(issues, {
      id: 'reserves-exhausted',
      severity: 'blocker',
      area: 'reserves',
      targetTab: 'reserves',
      message: `Reserves are exhausted in ${result.yearReservesExhausted}.`,
      evidence: 'A governance pack should show a mitigation or recovery plan.',
    });
  } else if (result.reservesToNetBudget < 5) {
    addIssue(issues, {
      id: 'reserves-low',
      severity: 'warning',
      area: 'reserves',
      targetTab: 'reserves',
      message: 'Reserves resilience is below the usual presentation threshold.',
      evidence: `${result.reservesToNetBudget.toFixed(1)}% of net funding.`,
    });
  }

  if (scenarios.length === 0) {
    addIssue(issues, {
      id: 'scenarios-missing',
      severity: 'blocker',
      area: 'scenarios',
      targetTab: 'scenarios',
      message: 'No saved scenarios are available for decision comparison.',
      evidence: 'Create at least Base, Do Nothing, Funding Shock, and Delivery Risk options.',
    });
  }

  if (snapshots.length === 0) {
    addIssue(issues, {
      id: 'snapshots-missing',
      severity: 'warning',
      area: 'governance',
      targetTab: 'scenarios',
      message: 'No meeting snapshot has been saved.',
      evidence: 'Save a snapshot to support the “what changed since last meeting” audit trail.',
    });
  }

  if (!workflowState.assumptionsFrozen) {
    addIssue(issues, {
      id: 'pack-not-frozen',
      severity: 'warning',
      area: 'governance',
      targetTab: 'governance',
      message: 'The model has not been frozen for the governance pack.',
      evidence: 'Freeze assumptions before final export so provenance is clear.',
    });
  }

  if (workflowState.governanceExports.memberBrief === 0 && workflowState.governanceExports.s151Pack === 0) {
    addIssue(issues, {
      id: 'pack-not-exported',
      severity: 'info',
      area: 'governance',
      targetTab: 'governance',
      message: 'No governance pack export has been recorded yet.',
    });
  }

  const blockers = issues.filter((issue) => issue.severity === 'blocker').map((issue) => issue.message);
  const warnings = issues.filter((issue) => issue.severity === 'warning').map((issue) => issue.message);
  const infos = issues.filter((issue) => issue.severity === 'info').map((issue) => issue.message);
  const penalty = issues.reduce((sum, issue) => {
    if (issue.severity === 'blocker') return sum + 18;
    if (issue.severity === 'warning') return sum + 8;
    return sum + 2;
  }, 0);

  return {
    issues,
    blockers,
    warnings,
    infos,
    modelConfidenceScore: Math.max(0, Math.min(100, 100 - penalty)),
  };
}
