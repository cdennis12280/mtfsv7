import type { Assumptions, BaselineData, MTFSResult, SavingsProposal, Scenario, YearProfile5 } from '../types/financial';
import { runCalculations } from '../engine/calculations';
import { coerceYearProfile, makeYearProfile } from './yearProfile';
import { validateModel } from '../engine/validation';

export type ScenarioGoal = 'balance_gap' | 'protect_reserves' | 'minimise_savings' | 'stress_funding';

export const SCENARIO_LABELS: NonNullable<Scenario['label']>[] = ['Draft', 'Reviewed', 'Recommended', 'Rejected', 'Cabinet Pack'];

function addProfile(profile: YearProfile5 | number, delta: number): YearProfile5 {
  const p = coerceYearProfile(profile, 0);
  return { y1: p.y1 + delta, y2: p.y2 + delta, y3: p.y3 + delta, y4: p.y4 + delta, y5: p.y5 + delta };
}

function scaleProfile(profile: YearProfile5 | number, factor: number): YearProfile5 {
  const p = coerceYearProfile(profile, 0);
  return { y1: p.y1 * factor, y2: p.y2 * factor, y3: p.y3 * factor, y4: p.y4 * factor, y5: p.y5 * factor };
}

function scenarioNotes(rationale: string, tradeOffs: string, risks: string, decisionRequired: string): NonNullable<Scenario['notes']> {
  return {
    rationale,
    assumptions: 'Uses the current baseline and five-year assumption profiles as the starting point.',
    tradeOffs,
    risks,
    decisionRequired,
  };
}

export function buildScenarioTemplates(
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[],
  result: MTFSResult
): Scenario[] {
  const now = Date.now();
  const createdAt = new Date().toISOString();
  const base = assumptions;
  const annualBalance = Math.max(0, result.requiredSavingsToBalance);
  const templateData: Array<[string, Scenario['type'], Assumptions, string, Scenario['label'], NonNullable<Scenario['notes']>]> = [
    ['Balanced Plan', 'optimistic', { ...base, policy: { ...base.policy, annualSavingsTarget: makeYearProfile(annualBalance + 1_500), reservesUsage: scaleProfile(base.policy.reservesUsage, 0.6) } }, '#10b981', 'Reviewed', scenarioNotes('Closes the modelled gap with additional recurring savings and lower reserves reliance.', 'Higher delivery ask in return for stronger resilience.', 'Savings delivery confidence must be evidenced.', 'Confirm as working balanced plan or adjust risk appetite.')],
    ['Do Nothing', 'pessimistic', { ...base, policy: { ...base.policy, annualSavingsTarget: makeYearProfile(0), reservesUsage: makeYearProfile(0) } }, '#64748b', 'Draft', scenarioNotes('Shows the counterfactual without further savings or reserves mitigation.', 'Clarifies scale of unmanaged pressure.', 'Likely weak affordability and resilience.', 'Use as comparator, not a recommended option.')],
    ['Recommended Plan', 'optimistic', { ...base, policy: { ...base.policy, annualSavingsTarget: makeYearProfile(annualBalance + 2_500), reservesUsage: scaleProfile(base.policy.reservesUsage, 0.5) } }, '#3b82f6', 'Recommended', scenarioNotes('Balances affordability, risk and reserve protection for leadership review.', 'Accepts a stronger savings programme to reduce one-off support.', 'Requires governance grip on amber savings.', 'Endorse as the preferred scenario for cabinet pack preparation.')],
    ['Funding Shock', 'pessimistic', { ...base, funding: { ...base.funding, grantVariation: addProfile(base.funding.grantVariation, -3), businessRatesGrowth: addProfile(base.funding.businessRatesGrowth, -1.5) } }, '#ef4444', 'Draft', scenarioNotes('Tests adverse grant and business rates settlement risk.', 'Shows resilience to external funding downside.', 'May require contingency savings or reserves policy.', 'Agree contingency triggers and monitoring cadence.')],
    ['Demand Shock', 'pessimistic', { ...base, expenditure: { ...base.expenditure, ascDemandGrowth: addProfile(base.expenditure.ascDemandGrowth, 2), cscDemandGrowth: addProfile(base.expenditure.cscDemandGrowth, 1.5) } }, '#f97316', 'Draft', scenarioNotes('Tests social care and demand volatility.', 'Makes service-pressure exposure explicit.', 'Demand assumptions may need operational validation.', 'Confirm mitigations for demand-led services.')],
    ['Savings Slippage', 'pessimistic', { ...base, expenditure: { ...base.expenditure, savingsDeliveryRisk: addProfile(base.expenditure.savingsDeliveryRisk, -20) } }, '#f59e0b', 'Draft', scenarioNotes('Tests lower savings achievement across the programme.', 'Highlights deliverability sensitivity.', 'Amber/red proposals may create budget stress.', 'Agree escalation for slipping savings.')],
    ['Inflation Shock', 'pessimistic', { ...base, expenditure: { ...base.expenditure, payAward: addProfile(base.expenditure.payAward, 1.5), nonPayInflation: addProfile(base.expenditure.nonPayInflation, 2) } }, '#8b5cf6', 'Draft', scenarioNotes('Tests higher pay and contract inflation.', 'Separates macro pressure from policy choices.', 'Could reduce headroom even with savings delivery.', 'Confirm inflation contingency and contract review actions.')],
  ];

  return templateData.map(([name, type, nextAssumptions, color, label, notes], idx) => ({
    id: `scenario-template-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${now}-${idx}`,
    name,
    description: notes.rationale,
    type,
    label,
    owner: 'Head of Finance',
    reviewDate: new Date().toISOString().slice(0, 10),
    notes,
    versionHistory: [{ timestamp: createdAt, description: 'Template created' }],
    assumptions: nextAssumptions,
    result: runCalculations(nextAssumptions, baseline, name === 'Do Nothing' ? [] : savingsProposals),
    createdAt,
    color,
  }));
}

export function buildScenarioFromGoal(
  goal: ScenarioGoal,
  assumptions: Assumptions,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[],
  result: MTFSResult
): Scenario {
  const templates = buildScenarioTemplates(assumptions, baseline, savingsProposals, result);
  const match = {
    balance_gap: 'Balanced Plan',
    protect_reserves: 'Recommended Plan',
    minimise_savings: 'Do Nothing',
    stress_funding: 'Funding Shock',
  }[goal];
  const template = templates.find((scenario) => scenario.name === match) ?? templates[0];
  return {
    ...template,
    id: `scenario-goal-${goal}-${Date.now()}`,
    name: `${template.name} (${new Date().toLocaleDateString('en-GB')})`,
    versionHistory: [{ timestamp: new Date().toISOString(), description: `Scenario wizard goal: ${goal}` }],
  };
}

export function scenarioNarrative(scenario: Scenario, current: MTFSResult): string {
  const gapDelta = scenario.result.totalGap - current.totalGap;
  const reserveDelta = (scenario.result.years[4]?.totalClosingReserves ?? 0) - (current.years[4]?.totalClosingReserves ?? 0);
  const gapText = gapDelta <= 0 ? 'improves affordability' : 'worsens affordability';
  const reserveText = reserveDelta >= 0 ? 'strengthens reserves' : 'uses more reserve capacity';
  return `${scenario.name} ${gapText} by ${Math.abs(gapDelta).toLocaleString('en-GB', { maximumFractionDigits: 0 })}k and ${reserveText} by ${Math.abs(reserveDelta).toLocaleString('en-GB', { maximumFractionDigits: 0 })}k versus current.`;
}

export function scenarioConfidence(
  scenario: Scenario,
  baseline: BaselineData,
  savingsProposals: SavingsProposal[]
): { score: number; blockers: string[]; warnings: string[] } {
  const summary = validateModel({
    authorityConfig: {
      authorityName: 'Scenario confidence check',
      section151Officer: 'Scenario review',
      chiefExecutive: 'Scenario review',
      reportingPeriod: 'Scenario period',
      reportDate: new Date().toISOString().slice(0, 10),
      authorityType: 'Local Authority',
      population: 1,
      strategicPriority1: 'Affordability',
      strategicPriority2: 'Resilience',
      strategicPriority3: 'Deliverability',
    },
    baseline,
    assumptions: scenario.assumptions,
    result: scenario.result,
    savingsProposals,
    scenarios: [scenario],
    snapshots: [],
    workflowState: {
      baselineLocked: true,
      assumptionsFrozen: !!scenario.label && ['Reviewed', 'Recommended', 'Cabinet Pack'].includes(scenario.label),
      governanceExports: { memberBrief: 0, s151Pack: 0, dataCsv: 0 },
    },
  });
  const metadataPenalty = (!scenario.owner ? 8 : 0) + (!scenario.reviewDate ? 8 : 0) + (!scenario.notes?.decisionRequired ? 6 : 0);
  return {
    score: Math.max(0, summary.modelConfidenceScore - metadataPenalty),
    blockers: summary.blockers,
    warnings: summary.warnings,
  };
}

export function rankScenarios(
  scenarios: Scenario[],
  weights: { affordability: number; risk: number; reserves: number; deliverability: number }
) {
  const values = scenarios.map((scenario) => ({
    scenario,
    gap: scenario.result.totalGap,
    risk: scenario.result.overallRiskScore,
    reserves: scenario.result.years[4]?.totalClosingReserves ?? 0,
    deliverability: Math.max(0, 100 - scenario.result.savingsAsBudgetPct * 8),
  }));
  const ranges = {
    gap: [Math.min(...values.map((v) => v.gap)), Math.max(...values.map((v) => v.gap))],
    risk: [Math.min(...values.map((v) => v.risk)), Math.max(...values.map((v) => v.risk))],
    reserves: [Math.min(...values.map((v) => v.reserves)), Math.max(...values.map((v) => v.reserves))],
    deliverability: [Math.min(...values.map((v) => v.deliverability)), Math.max(...values.map((v) => v.deliverability))],
  };
  const lowBetter = (value: number, min: number, max: number) => (max === min ? 50 : ((max - value) / (max - min)) * 100);
  const highBetter = (value: number, min: number, max: number) => (max === min ? 50 : ((value - min) / (max - min)) * 100);
  const totalWeight = Math.max(1, weights.affordability + weights.risk + weights.reserves + weights.deliverability);
  return values.map((v) => {
    const affordabilityScore = lowBetter(v.gap, ranges.gap[0], ranges.gap[1]);
    const riskScore = lowBetter(v.risk, ranges.risk[0], ranges.risk[1]);
    const reservesScore = highBetter(v.reserves, ranges.reserves[0], ranges.reserves[1]);
    const deliverabilityScore = highBetter(v.deliverability, ranges.deliverability[0], ranges.deliverability[1]);
    const weightedScore = (
      affordabilityScore * weights.affordability
      + riskScore * weights.risk
      + reservesScore * weights.reserves
      + deliverabilityScore * weights.deliverability
    ) / totalWeight;
    return { ...v, affordabilityScore, riskScore, reservesScore, deliverabilityScore, weightedScore };
  }).sort((a, b) => b.weightedScore - a.weightedScore);
}

export function exportScenarioAuditCsv(scenarios: Scenario[], current: MTFSResult): string {
  const headers = ['Scenario', 'Label', 'Owner', 'ReviewDate', 'Gap', 'GapDelta', 'AnnualSavings', 'Y5Reserves', 'Risk', 'CreatedAt', 'Rationale', 'DecisionRequired'];
  const rows = scenarios.map((scenario) => [
    scenario.name,
    scenario.label ?? 'Draft',
    scenario.owner ?? '',
    scenario.reviewDate ?? '',
    scenario.result.totalGap.toFixed(0),
    (scenario.result.totalGap - current.totalGap).toFixed(0),
    scenario.result.requiredSavingsToBalance.toFixed(0),
    (scenario.result.years[4]?.totalClosingReserves ?? 0).toFixed(0),
    scenario.result.overallRiskScore.toFixed(0),
    scenario.createdAt,
    scenario.notes?.rationale ?? scenario.description,
    scenario.notes?.decisionRequired ?? '',
  ]);
  return [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}
