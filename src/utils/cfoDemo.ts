import type { Assumptions, AuthorityConfig, BaselineData, ModelSnapshot, SavingsProposal, Scenario } from '../types/financial';
import { DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, DEFAULT_AUTHORITY_CONFIG, runCalculations } from '../engine/calculations';
import { makeYearProfile } from './yearProfile';

export const CFO_DEMO_STEPS = ['position', 'drivers', 'options', 'assurance', 'export'] as const;
export type CfoDemoStep = typeof CFO_DEMO_STEPS[number];

export const CFO_DEMO_STEP_META: Record<CfoDemoStep, { label: string; minutes: string; note: string }> = {
  position: {
    label: 'Position',
    minutes: '0:00-2:00',
    note: 'Open with the scale of the five-year gap, the required annual action, and the reserve position.',
  },
  drivers: {
    label: 'Drivers',
    minutes: '2:00-4:00',
    note: 'Show what is moving the gap: funding, pay, inflation, demand, savings delivery, and reserves.',
  },
  options: {
    label: 'Options',
    minutes: '4:00-6:30',
    note: 'Compare Current, Do Nothing, Recommended Plan, and Funding Shock using the same five metrics.',
  },
  assurance: {
    label: 'Assurance',
    minutes: '6:30-8:30',
    note: 'Evidence traceability: assumptions, audit trail, validation, scenario provenance, and S151 confidence.',
  },
  export: {
    label: 'Export',
    minutes: '8:30-10:00',
    note: 'Close by exporting the CFO brief and showing the rehearsal checklist is ready.',
  },
};

export interface CfoDemoDataset {
  authorityConfig: AuthorityConfig;
  assumptions: Assumptions;
  baseline: BaselineData;
  savingsProposals: SavingsProposal[];
  scenarios: Scenario[];
  snapshot: ModelSnapshot;
}

export function buildCfoDemoDataset(): CfoDemoDataset {
  const createdAt = new Date().toISOString();
  const authorityConfig: AuthorityConfig = {
    ...DEFAULT_AUTHORITY_CONFIG,
    authorityName: 'Northshire Council',
    section151Officer: 'Priya Shah',
    chiefExecutive: 'Martin Hale',
    authorityType: 'County Council',
    population: 615_000,
    reportingPeriod: '2026/27 - 2030/31',
    reportDate: '2026-05-09',
    strategicPriority1: 'Protect vulnerable residents',
    strategicPriority2: 'Stabilise the financial recovery plan',
    strategicPriority3: 'Deliver sustainable neighbourhood services',
  };
  const baseline: BaselineData = {
    ...DEFAULT_BASELINE,
    councilTax: 248_500,
    businessRates: 86_200,
    coreGrants: 138_900,
    feesAndCharges: 58_400,
    pay: 254_800,
    nonPay: 121_500,
    ascDemandLed: 126_900,
    cscDemandLed: 74_200,
    otherServiceExp: 39_600,
    generalFundReserves: 31_800,
    earmarkedReserves: 42_600,
    reservesMinimumThreshold: 24_000,
    namedReserves: [
      { id: 'demo-general', name: 'General Fund Reserve', purpose: 'Financial resilience', openingBalance: 31_800, plannedContributions: [0, 0, 1_500, 2_000, 2_000], plannedDrawdowns: [7_500, 6_000, 3_000, 0, 0], isEarmarked: false, minimumBalance: 24_000 },
      { id: 'demo-transformation', name: 'Transformation Reserve', purpose: 'Savings delivery support', openingBalance: 12_500, plannedContributions: [0, 0, 0, 0, 0], plannedDrawdowns: [2_500, 2_000, 1_500, 1_000, 500], isEarmarked: true, minimumBalance: 2_500 },
      { id: 'demo-risk', name: 'Demand Risk Reserve', purpose: 'Social care volatility', openingBalance: 18_300, plannedContributions: [0, 0, 0, 1_500, 2_000], plannedDrawdowns: [3_000, 2_500, 1_500, 0, 0], isEarmarked: true, minimumBalance: 6_000 },
    ],
    reservesRecoveryPlan: { enabled: true, targetYear: 5, targetLevel: 28_000, annualContribution: 2_000, autoCalculate: false },
    riskBasedReserves: { enabled: true, adoptAsMinimumThreshold: true, demandVolatility: 8_000, savingsNonDelivery: 5_500, fundingUncertainty: 6_000, litigationRisk: 2_500 },
  };
  const assumptions: Assumptions = {
    ...DEFAULT_ASSUMPTIONS,
    funding: {
      councilTaxIncrease: { y1: 4.99, y2: 4.99, y3: 3.99, y4: 2.99, y5: 2.99 },
      businessRatesGrowth: { y1: 1.5, y2: 1.8, y3: 2.0, y4: 2.0, y5: 2.0 },
      grantVariation: { y1: -1.5, y2: -2.0, y3: -1.0, y4: 0, y5: 0 },
      feesChargesElasticity: { y1: 3.0, y2: 3.0, y3: 2.5, y4: 2.0, y5: 2.0 },
    },
    expenditure: {
      ...DEFAULT_ASSUMPTIONS.expenditure,
      payAward: { y1: 5.0, y2: 4.0, y3: 3.5, y4: 3.0, y5: 3.0 },
      nonPayInflation: { y1: 4.5, y2: 3.5, y3: 3.0, y4: 2.5, y5: 2.5 },
      ascDemandGrowth: { y1: 7.0, y2: 6.0, y3: 5.0, y4: 4.5, y5: 4.0 },
      cscDemandGrowth: { y1: 6.0, y2: 5.0, y3: 4.5, y4: 4.0, y5: 3.5 },
      savingsDeliveryRisk: { y1: 82, y2: 86, y3: 90, y4: 92, y5: 92 },
    },
    policy: {
      annualSavingsTarget: { y1: 8_500, y2: 10_000, y3: 11_500, y4: 12_000, y5: 12_000 },
      reservesUsage: { y1: 7_500, y2: 6_000, y3: 3_000, y4: 0, y5: 0 },
      socialCareProtection: true,
    },
  };
  const savingsProposals: SavingsProposal[] = [
    { id: 'demo-sv-1', name: 'Procurement reset', description: 'Corporate contract consolidation and category management.', category: 'procurement', grossValue: 7_500, deliveryYear: 1, achievementRate: 88, isRecurring: true, ragStatus: 'amber', responsibleOfficer: 'Head of Commercial', yearlyDelivery: [45, 80, 100, 100, 100] },
    { id: 'demo-sv-2', name: 'ASC demand management', description: 'Reablement, prevention and placement review programme.', category: 'demand-management', grossValue: 12_000, deliveryYear: 1, achievementRate: 80, isRecurring: true, ragStatus: 'amber', responsibleOfficer: 'DASS', yearlyDelivery: [30, 65, 90, 100, 100] },
    { id: 'demo-sv-3', name: 'Digital customer operations', description: 'Channel shift and contact centre automation.', category: 'transformation', grossValue: 5_500, deliveryYear: 2, achievementRate: 85, isRecurring: true, ragStatus: 'green', responsibleOfficer: 'Director of Customer', yearlyDelivery: [0, 45, 80, 100, 100] },
    { id: 'demo-sv-4', name: 'Income and fees review', description: 'Targeted charging review with hardship safeguards.', category: 'income', grossValue: 4_200, deliveryYear: 1, achievementRate: 90, isRecurring: true, ragStatus: 'green', responsibleOfficer: 'Head of Finance', yearlyDelivery: [60, 100, 100, 100, 100] },
    { id: 'demo-sv-5', name: 'Vacancy and agency control', description: 'Agency reduction and vacancy grip across high-cost services.', category: 'efficiency', grossValue: 6_800, deliveryYear: 1, achievementRate: 84, isRecurring: true, ragStatus: 'amber', responsibleOfficer: 'Director of HR', yearlyDelivery: [50, 85, 100, 100, 100] },
  ];
  const scenarioAssumptions = {
    current: assumptions,
    doNothing: { ...assumptions, policy: { ...assumptions.policy, annualSavingsTarget: makeYearProfile(0), reservesUsage: makeYearProfile(0) } },
    recommended: { ...assumptions, policy: { ...assumptions.policy, annualSavingsTarget: { y1: 10_500, y2: 12_500, y3: 13_500, y4: 13_500, y5: 13_500 }, reservesUsage: { y1: 6_000, y2: 4_000, y3: 1_500, y4: 0, y5: 0 } } },
    fundingShock: { ...assumptions, funding: { ...assumptions.funding, grantVariation: { y1: -3.0, y2: -5.0, y3: -3.0, y4: -1.5, y5: -1.0 }, businessRatesGrowth: { y1: 0.2, y2: 0.5, y3: 1.0, y4: 1.2, y5: 1.5 } } },
  };
  const scenarios: Scenario[] = [
    { id: 'cfo-current', name: 'Current Plan', description: 'Current MTFS position after known savings and reserves choices.', type: 'base', assumptions: scenarioAssumptions.current, result: runCalculations(scenarioAssumptions.current, baseline, savingsProposals), createdAt, color: '#3b82f6' },
    { id: 'cfo-do-nothing', name: 'Do Nothing', description: 'No further policy savings and no planned reserves mitigation.', type: 'pessimistic', assumptions: scenarioAssumptions.doNothing, result: runCalculations(scenarioAssumptions.doNothing, baseline, []), createdAt, color: '#64748b' },
    { id: 'cfo-recommended', name: 'Recommended Plan', description: 'Strengthened recurring savings with reduced reliance on reserves.', type: 'optimistic', assumptions: scenarioAssumptions.recommended, result: runCalculations(scenarioAssumptions.recommended, baseline, savingsProposals), createdAt, color: '#10b981' },
    { id: 'cfo-funding-shock', name: 'Funding Shock', description: 'Adverse grants and business rates case for sensitivity testing.', type: 'pessimistic', assumptions: scenarioAssumptions.fundingShock, result: runCalculations(scenarioAssumptions.fundingShock, baseline, savingsProposals), createdAt, color: '#ef4444' },
  ];
  const snapshot: ModelSnapshot = {
    id: `cfo-demo-snapshot-${Date.now()}`,
    name: 'CFO demo starting point',
    description: 'Preloaded leadership demo state for a 10-minute walkthrough.',
    createdAt,
    assumptions,
    baseline,
    savingsProposals,
    authorityConfig,
    scenarios,
    metadata: { appVersion: 'v7.0', notes: 'CFO demo fixture' },
  };
  return { authorityConfig, assumptions, baseline, savingsProposals, scenarios, snapshot };
}
