import type { Assumptions, BaselineData, ModelSnapshot, SavingsProposal } from '../types/financial';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_AUTHORITY_CONFIG,
  DEFAULT_BASELINE,
  runCalculations,
} from '../engine/calculations';
import { y1 } from './yearProfile';

type AssumptionsPatch = {
  funding?: Partial<Assumptions['funding']>;
  expenditure?: Partial<Assumptions['expenditure']>;
  policy?: Partial<Assumptions['policy']>;
  advanced?: Partial<Assumptions['advanced']>;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeAssumptions(base: Assumptions, patch: AssumptionsPatch): Assumptions {
  return {
    funding: { ...base.funding, ...(patch.funding ?? {}) },
    expenditure: { ...base.expenditure, ...(patch.expenditure ?? {}) },
    policy: { ...base.policy, ...(patch.policy ?? {}) },
    advanced: { ...base.advanced, ...(patch.advanced ?? {}) },
  };
}

function mergeBaseline(base: BaselineData, patch: Partial<BaselineData>): BaselineData {
  return {
    ...base,
    ...patch,
    councilTaxBaseConfig: { ...base.councilTaxBaseConfig, ...(patch.councilTaxBaseConfig ?? {}) },
    ascCohortModel: { ...base.ascCohortModel, ...(patch.ascCohortModel ?? {}) },
    capitalFinancing: { ...base.capitalFinancing, ...(patch.capitalFinancing ?? {}) },
    riskBasedReserves: { ...base.riskBasedReserves, ...(patch.riskBasedReserves ?? {}) },
    reservesRecoveryPlan: { ...base.reservesRecoveryPlan, ...(patch.reservesRecoveryPlan ?? {}) },
    reservesAdequacyMethodology: { ...base.reservesAdequacyMethodology, ...(patch.reservesAdequacyMethodology ?? {}) },
    treasuryIndicators: { ...base.treasuryIndicators, ...(patch.treasuryIndicators ?? {}) },
    mrpCalculator: { ...base.mrpCalculator, ...(patch.mrpCalculator ?? {}) },
    paySpineConfig: { ...base.paySpineConfig, ...(patch.paySpineConfig ?? {}) },
    contractIndexationTracker: { ...base.contractIndexationTracker, ...(patch.contractIndexationTracker ?? {}) },
    investToSave: { ...base.investToSave, ...(patch.investToSave ?? {}) },
    incomeGenerationWorkbook: { ...base.incomeGenerationWorkbook, ...(patch.incomeGenerationWorkbook ?? {}) },
    customServiceLines: patch.customServiceLines ?? base.customServiceLines,
    namedReserves: patch.namedReserves ?? base.namedReserves,
    grantSchedule: patch.grantSchedule ?? base.grantSchedule,
  };
}

function defaultYearlyDelivery(deliveryYear: number): [number, number, number, number, number] {
  const arr: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (let i = deliveryYear - 1; i < 5; i += 1) {
    arr[i] = i === deliveryYear - 1 ? 50 : 100;
  }
  return arr;
}

function makeSavings(
  id: string,
  name: string,
  grossValue: number,
  deliveryYear: 1 | 2 | 3 | 4 | 5,
  achievementRate: number,
  isRecurring: boolean
): SavingsProposal {
  return {
    id,
    name,
    description: `${name} - dummy data`,
    category: isRecurring ? 'efficiency' : 'transformation',
    grossValue,
    deliveryYear,
    achievementRate,
    isRecurring,
    ragStatus: achievementRate >= 85 ? 'green' : achievementRate >= 70 ? 'amber' : 'red',
    responsibleOfficer: 'Dummy Officer',
    yearlyDelivery: defaultYearlyDelivery(deliveryYear),
  };
}

function buildSnapshot(
  id: string,
  name: string,
  description: string,
  assumptionsPatch: AssumptionsPatch,
  baselinePatch: Partial<BaselineData>,
  savingsProposals: SavingsProposal[]
): ModelSnapshot {
  const assumptions = mergeAssumptions(clone(DEFAULT_ASSUMPTIONS), assumptionsPatch);
  const baseline = mergeBaseline(clone(DEFAULT_BASELINE), baselinePatch);
  const authorityConfig = {
    ...clone(DEFAULT_AUTHORITY_CONFIG),
    authorityName: 'Example Metropolitan Borough',
    section151Officer: 'Alex Morgan',
    chiefExecutive: 'Jamie Patel',
    reportingPeriod: '2026/27 - 2030/31',
  };
  return {
    id,
    name,
    description,
    createdAt: new Date().toISOString(),
    assumptions,
    baseline,
    savingsProposals,
    authorityConfig,
    scenarios: [],
    metadata: {
      appVersion: 'v7.0',
      notes: 'Template pack dummy snapshot',
    },
  };
}

function assumptionsRows(snapshot: ModelSnapshot): (string | number)[][] {
  const a = snapshot.assumptions;
  return [
    ['section', 'field', 'value', 'unit', 'guidance'],
    ['funding', 'councilTaxIncrease', y1(a.funding.councilTaxIncrease), '%', 'Annual council tax increase assumption'],
    ['funding', 'businessRatesGrowth', y1(a.funding.businessRatesGrowth), '%', 'Annual business rates growth assumption'],
    ['funding', 'grantVariation', y1(a.funding.grantVariation), '%', 'Annual grant increase/decrease assumption'],
    ['funding', 'feesChargesElasticity', y1(a.funding.feesChargesElasticity), '%', 'Annual fees and charges growth assumption'],
    ['expenditure', 'payAward', y1(a.expenditure.payAward), '%', 'Annual pay uplift assumption'],
    ['expenditure', 'nonPayInflation', y1(a.expenditure.nonPayInflation), '%', 'Annual non-pay inflation assumption'],
    ['expenditure', 'ascDemandGrowth', y1(a.expenditure.ascDemandGrowth), '%', 'ASC demand growth assumption'],
    ['expenditure', 'cscDemandGrowth', y1(a.expenditure.cscDemandGrowth), '%', 'CSC demand growth assumption'],
    ['expenditure', 'savingsDeliveryRisk', y1(a.expenditure.savingsDeliveryRisk), '%', 'Programme delivery percentage'],
    ['policy', 'annualSavingsTarget', y1(a.policy.annualSavingsTarget), '£000', 'Policy-level annual savings target'],
    ['policy', 'reservesUsage', y1(a.policy.reservesUsage), '£000', 'Planned annual reserves usage'],
    ['policy', 'socialCareProtection', String(a.policy.socialCareProtection), 'boolean', 'true/false'],
    ['advanced', 'realTermsToggle', String(a.advanced.realTermsToggle), 'boolean', 'true/false'],
    ['advanced', 'inflationRate', a.advanced.inflationRate, '%', 'Real terms deflator rate'],
  ];
}

function baselineCoreRows(snapshot: ModelSnapshot): (string | number)[][] {
  const b = snapshot.baseline;
  return [
    ['field', 'value', 'unit', 'guidance'],
    ['councilTax', b.councilTax, '£000', 'Base-year council tax income'],
    ['businessRates', b.businessRates, '£000', 'Base-year retained business rates'],
    ['coreGrants', b.coreGrants, '£000', 'Base-year grant funding'],
    ['feesAndCharges', b.feesAndCharges, '£000', 'Base-year fees and charges'],
    ['pay', b.pay, '£000', 'Base-year pay expenditure'],
    ['nonPay', b.nonPay, '£000', 'Base-year non-pay expenditure'],
    ['ascDemandLed', b.ascDemandLed, '£000', 'Base-year ASC expenditure'],
    ['cscDemandLed', b.cscDemandLed, '£000', 'Base-year CSC expenditure'],
    ['otherServiceExp', b.otherServiceExp, '£000', 'Other base-year service expenditure'],
    ['generalFundReserves', b.generalFundReserves, '£000', 'Opening general fund reserves'],
    ['earmarkedReserves', b.earmarkedReserves, '£000', 'Opening earmarked reserves'],
    ['reservesMinimumThreshold', b.reservesMinimumThreshold, '£000', 'Minimum prudent reserves threshold'],
  ];
}

function baselineSettingsRows(snapshot: ModelSnapshot): (string | number)[][] {
  const b = snapshot.baseline;
  return [
    ['path', 'value', 'unit_or_note'],
    ['ascCohortModel.enabled', String(b.ascCohortModel.enabled), 'boolean'],
    ['ascCohortModel.population18to64', b.ascCohortModel.population18to64, 'count'],
    ['ascCohortModel.population65plus', b.ascCohortModel.population65plus, 'count'],
    ['ascCohortModel.prevalence18to64', b.ascCohortModel.prevalence18to64, '%'],
    ['ascCohortModel.prevalence65plus', b.ascCohortModel.prevalence65plus, '%'],
    ['ascCohortModel.unitCost18to64', b.ascCohortModel.unitCost18to64, '£'],
    ['ascCohortModel.unitCost65plus', b.ascCohortModel.unitCost65plus, '£'],
    ['capitalFinancing.enabled', String(b.capitalFinancing.enabled), 'boolean'],
    ['capitalFinancing.interestRate', b.capitalFinancing.interestRate, '%'],
    ['capitalFinancing.mrpRate', b.capitalFinancing.mrpRate, '%'],
    ['capitalFinancing.borrowingByYear.1', b.capitalFinancing.borrowingByYear[0], '£000'],
    ['capitalFinancing.borrowingByYear.2', b.capitalFinancing.borrowingByYear[1], '£000'],
    ['capitalFinancing.borrowingByYear.3', b.capitalFinancing.borrowingByYear[2], '£000'],
    ['capitalFinancing.borrowingByYear.4', b.capitalFinancing.borrowingByYear[3], '£000'],
    ['capitalFinancing.borrowingByYear.5', b.capitalFinancing.borrowingByYear[4], '£000'],
  ];
}

function savingsRows(snapshot: ModelSnapshot): (string | number)[][] {
  return [
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
}

function authorityRows(snapshot: ModelSnapshot): (string | number)[][] {
  const a = snapshot.authorityConfig;
  return [
    ['field', 'value'],
    ['authorityName', a.authorityName],
    ['section151Officer', a.section151Officer],
    ['chiefExecutive', a.chiefExecutive],
    ['reportingPeriod', a.reportingPeriod],
    ['reportDate', a.reportDate],
    ['authorityType', a.authorityType],
    ['population', a.population],
    ['strategicPriority1', a.strategicPriority1],
    ['strategicPriority2', a.strategicPriority2],
    ['strategicPriority3', a.strategicPriority3],
  ];
}

function metaRows(snapshot: ModelSnapshot): (string | number)[][] {
  return [
    ['key', 'value'],
    ['format', 'mtfs-snapshot-xlsx-v2'],
    ['snapshot_id', snapshot.id],
    ['snapshot_name', snapshot.name],
    ['description', snapshot.description],
    ['created_at', snapshot.createdAt],
    ['app_version', snapshot.metadata?.appVersion ?? 'v7.0'],
    ['notes', snapshot.metadata?.notes ?? ''],
  ];
}

function exampleReadableRows(snapshot: ModelSnapshot): (string | number)[][] {
  const result = runCalculations(snapshot.assumptions, snapshot.baseline, snapshot.savingsProposals);
  return [
    ['Domain', 'Field', 'Value', 'Unit', 'Commentary'],
    ['Headline', '5yr Gap', result.totalGap, '£000', 'Lower/negative is better'],
    ['Headline', 'Structural Gap', result.totalStructuralGap, '£000', 'Recurring pressure'],
    ['Headline', 'Overall Risk Score', result.overallRiskScore, '0-100', 'Higher means greater risk'],
    ['Headline', 'Reserves Exhausted', result.yearReservesExhausted ?? 'No', 'year', 'Resilience indicator'],
    ['Funding', 'Council Tax Increase', y1(snapshot.assumptions.funding.councilTaxIncrease), '%', 'Annual uplift'],
    ['Funding', 'Business Rates Growth', y1(snapshot.assumptions.funding.businessRatesGrowth), '%', 'Annual uplift'],
    ['Expenditure', 'Pay Award', y1(snapshot.assumptions.expenditure.payAward), '%', 'Annual cost pressure'],
    ['Expenditure', 'ASC Demand Growth', y1(snapshot.assumptions.expenditure.ascDemandGrowth), '%', 'Demand-led pressure'],
    ['Policy', 'Annual Savings Target', y1(snapshot.assumptions.policy.annualSavingsTarget), '£000', 'Policy lever'],
    ['Reserves', 'General Fund', snapshot.baseline.generalFundReserves, '£000', 'Opening balance'],
    ['Reserves', 'Earmarked', snapshot.baseline.earmarkedReserves, '£000', 'Opening balance'],
    ['Programme', 'Savings Proposals Count', snapshot.savingsProposals.length, 'count', 'Configured proposals'],
  ];
}

export async function downloadSnapshotTemplatePack(): Promise<void> {
  const xlsx = await import('xlsx');

  const templateSnapshot = buildSnapshot(
    'snapshot-template',
    'Template Snapshot',
    'Editable template snapshot for local authority onboarding',
    {},
    {},
    []
  );

  const good1Savings = [
    makeSavings('g1-1', 'Digital automation programme', 1200, 1, 90, true),
    makeSavings('g1-2', 'Procurement consolidation', 900, 2, 85, true),
    makeSavings('g1-3', 'Asset rationalisation', 500, 1, 75, false),
  ];
  const good1 = buildSnapshot(
    'snapshot-good-1',
    'Good Example A - Balanced Recovery',
    'Balanced outlook with manageable risk and recurring delivery plan',
    {
      funding: { councilTaxIncrease: 4.99, businessRatesGrowth: 2.2 },
      expenditure: { payAward: 3.0, nonPayInflation: 2.7, ascDemandGrowth: 3.2, cscDemandGrowth: 3.0, savingsDeliveryRisk: 85 },
      policy: { annualSavingsTarget: 3200, reservesUsage: 700 },
    },
    { generalFundReserves: 22000, earmarkedReserves: 34000, reservesMinimumThreshold: 12000 },
    good1Savings
  );

  const good2Savings = [
    makeSavings('g2-1', 'Shared services platform', 1500, 1, 88, true),
    makeSavings('g2-2', 'Commercial income uplift', 700, 2, 82, true),
    makeSavings('g2-3', 'Temporary vacancy management', 400, 1, 80, false),
  ];
  const good2 = buildSnapshot(
    'snapshot-good-2',
    'Good Example B - Growth and Resilience',
    'Stronger funding growth and healthy reserve position',
    {
      funding: { councilTaxIncrease: 4.99, businessRatesGrowth: 2.8, feesChargesElasticity: 2.5 },
      expenditure: { payAward: 2.8, nonPayInflation: 2.5, ascDemandGrowth: 2.9, cscDemandGrowth: 2.7, savingsDeliveryRisk: 88 },
      policy: { annualSavingsTarget: 2800, reservesUsage: 500 },
    },
    { generalFundReserves: 26000, earmarkedReserves: 37000, reservesMinimumThreshold: 13000 },
    good2Savings
  );

  const badSavings = [
    makeSavings('b1-1', 'Uncertain transformation', 900, 2, 55, true),
    makeSavings('b1-2', 'One-off estate action', 650, 1, 60, false),
  ];
  const bad = buildSnapshot(
    'snapshot-bad-1',
    'Bad Example - High Risk Deficit',
    'High pressure scenario showing widening gap and weak reserves',
    {
      funding: { councilTaxIncrease: 2.5, businessRatesGrowth: 0.5, grantVariation: -2.0, feesChargesElasticity: 0.8 },
      expenditure: { payAward: 5.2, nonPayInflation: 4.8, ascDemandGrowth: 6.2, cscDemandGrowth: 5.8, savingsDeliveryRisk: 55 },
      policy: { annualSavingsTarget: 900, reservesUsage: 1800 },
    },
    { generalFundReserves: 7000, earmarkedReserves: 9000, reservesMinimumThreshold: 12000 },
    badSavings
  );

  const good1Result = runCalculations(good1.assumptions, good1.baseline, good1.savingsProposals);
  const good2Result = runCalculations(good2.assumptions, good2.baseline, good2.savingsProposals);
  const badResult = runCalculations(bad.assumptions, bad.baseline, bad.savingsProposals);

  const wncSavings = [
    makeSavings('wnc-p7-1', 'Planning Service Income (2526-B4-035)', 60, 1, 92, true),
    makeSavings('wnc-p7-2', 'Parking Regulations and Charges (2526-B4-055)', 50, 1, 80, true),
    makeSavings('wnc-p7-3', 'Regeneration Income Generation (2526-B4-007)', 65, 1, 75, true),
    makeSavings('wnc-p7-4', 'Internal Audit Restructure (2526-B4-127)', 66, 1, 90, true),
    makeSavings('wnc-p7-5', 'Integrated Commissioning (2526-B4-107)', 69, 2, 82, true),
    makeSavings('wnc-p7-6', 'Property Estates Staffing Realignment (2526-B4-136)', 64, 1, 85, true),
    makeSavings('wnc-p7-7', 'Economic Growth Revenue Budget Savings (2526-B4-075)', 65, 1, 84, true),
    makeSavings('wnc-p7-8', 'Home Adaptations Income Uplift (2526-B4-009)', 58, 2, 78, true),
  ];

  const wncP7 = buildSnapshot(
    'snapshot-wnc-p7-2025-26',
    'WNC P7 2025-26 - CFO Working Simulation',
    'WNC-oriented scenario calibrated from Revenue Monitoring P7 pack context, Appendix B savings lines, and 2025/26 approved budget scale.',
    {
      funding: {
        councilTaxIncrease: 4.99,
        businessRatesGrowth: 1.4,
        grantVariation: 0.2,
        feesChargesElasticity: 1.9,
      },
      expenditure: {
        payAward: 3.6,
        nonPayInflation: 3.3,
        ascDemandGrowth: 5.4,
        cscDemandGrowth: 4.9,
        savingsDeliveryRisk: 78,
      },
      policy: {
        annualSavingsTarget: 20000,
        reservesUsage: 1800,
      },
      advanced: {
        realTermsToggle: false,
        inflationRate: 2.5,
      },
    },
    {
      councilTax: 266500,
      businessRates: 81000,
      coreGrants: 51500,
      feesAndCharges: 32800,
      pay: 182000,
      nonPay: 95200,
      ascDemandLed: 101500,
      cscDemandLed: 82500,
      otherServiceExp: 12000,
      generalFundReserves: 28500,
      earmarkedReserves: 76000,
      reservesMinimumThreshold: 18000,
    },
    wncSavings
  );
  wncP7.authorityConfig = {
    ...wncP7.authorityConfig,
    authorityName: 'West Northamptonshire Council',
    section151Officer: 'Martin Henry (Interim)',
    chiefExecutive: 'Martin Henry (Interim)',
    reportingPeriod: '2025/26',
    reportDate: '2025-12-22',
    authorityType: 'Unitary',
    population: 430000,
    strategicPriority1: 'Financial sustainability and balanced budget delivery',
    strategicPriority2: 'Demand-led services stability (ASC and CSC)',
    strategicPriority3: 'Savings delivery and reserves resilience',
  };
  wncP7.metadata = {
    appVersion: 'v7.0',
    notes: 'Source context: Revenue Monitoring P7 2025-26, Appendix A/B/C titles and published extracts, plus WNC approved 2025-26 budget scale.',
  };
  const wncResult = runCalculations(wncP7.assumptions, wncP7.baseline, wncP7.savingsProposals);

  const workbook = xlsx.utils.book_new();

  const instructionsRows = [
    ['MTFS Model Snapshot Template Pack - User Guide'],
    [''],
    ['Purpose'],
    ['This workbook is designed for user-friendly snapshot editing and import. No JSON editing required.'],
    [''],
    ['Tabs to edit for import'],
    ['- Meta'],
    ['- AuthorityConfig'],
    ['- Assumptions'],
    ['- BaselineCore'],
    ['- BaselineSettings'],
    ['- SavingsProposals'],
    [''],
    ['How to import'],
    ['1) Edit the template tabs listed above.'],
    ['2) Save this workbook as .xlsx.'],
    ['3) In app: Scenarios > Model Snapshots > Import JSON/XLSX.'],
    ['4) The app will read editable tabs and load as a snapshot.'],
    [''],
    ['How to use examples'],
    ['- Review Example_Good_1 / Example_Good_2 / Example_Bad_1 tabs to understand good vs weak settings.'],
    ['- Review Example_WNC_P7 for a West Northamptonshire-oriented starting point.'],
    ['- Copy values from example tabs into template tabs if you want to start from them.'],
    [''],
    ['Important notes'],
    ['- Keep template sheet names unchanged for import compatibility.'],
    ['- Maintain the existing column headers on template tabs.'],
    ['- Values are mainly in £000 unless unit column states otherwise.'],
  ];

  const summaryRows = [
    ['Example', 'Description', '5yr Gap', 'Structural Gap', 'Risk Score', 'Reserves Exhausted', 'Y5 Reserves', 's114 Trigger'],
    [good1.name, good1.description, good1Result.totalGap, good1Result.totalStructuralGap, good1Result.overallRiskScore, good1Result.yearReservesExhausted ?? 'No', good1Result.years[4]?.totalClosingReserves ?? 0, good1Result.s114Triggered ? 'Yes' : 'No'],
    [good2.name, good2.description, good2Result.totalGap, good2Result.totalStructuralGap, good2Result.overallRiskScore, good2Result.yearReservesExhausted ?? 'No', good2Result.years[4]?.totalClosingReserves ?? 0, good2Result.s114Triggered ? 'Yes' : 'No'],
    [bad.name, bad.description, badResult.totalGap, badResult.totalStructuralGap, badResult.overallRiskScore, badResult.yearReservesExhausted ?? 'No', badResult.years[4]?.totalClosingReserves ?? 0, badResult.s114Triggered ? 'Yes' : 'No'],
    [wncP7.name, wncP7.description, wncResult.totalGap, wncResult.totalStructuralGap, wncResult.overallRiskScore, wncResult.yearReservesExhausted ?? 'No', wncResult.years[4]?.totalClosingReserves ?? 0, wncResult.s114Triggered ? 'Yes' : 'No'],
  ];

  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(instructionsRows), 'Instructions');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(metaRows(templateSnapshot)), 'Meta');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(authorityRows(templateSnapshot)), 'AuthorityConfig');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(assumptionsRows(templateSnapshot)), 'Assumptions');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(baselineCoreRows(templateSnapshot)), 'BaselineCore');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(baselineSettingsRows(templateSnapshot)), 'BaselineSettings');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(savingsRows(templateSnapshot)), 'SavingsProposals');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(exampleReadableRows(good1)), 'Example_Good_1');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(exampleReadableRows(good2)), 'Example_Good_2');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(exampleReadableRows(bad)), 'Example_Bad_1');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(exampleReadableRows(wncP7)), 'Example_WNC_P7');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(summaryRows), 'Example_Summary');

  const bytes = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mtfs_snapshot_template_pack.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
