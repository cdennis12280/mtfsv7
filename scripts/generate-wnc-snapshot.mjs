import fs from 'node:fs';
import path from 'node:path';
import * as xlsx from 'xlsx';

const outputPath = path.resolve('data/snapshots/wnc_full_snapshot_2025-26_p7.xlsx');

const snapshot = {
  id: 'snapshot-wnc-full-2025-26-p7',
  name: 'WNC Full Snapshot 2025-26 P7',
  description: 'West Northamptonshire Council full snapshot aligned to P7 2025/26 working simulation and enhancement modules.',
  createdAt: '2025-12-22T18:00:00.000Z',
  authorityConfig: {
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
  },
  assumptions: {
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
      payAwardByFundingSource: { general_fund: 3.7, grant: 3.3, other: 3.5 },
      payGroupSensitivity: { default: 0, teachers: 0.2, njc: 0.1, senior: 0.3, other: 0 },
    },
    policy: {
      annualSavingsTarget: 20000,
      reservesUsage: 1800,
      socialCareProtection: true,
    },
    advanced: {
      realTermsToggle: false,
      inflationRate: 2.5,
    },
  },
  baseline: {
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
  metadata: {
    appVersion: 'v7.0',
    notes: 'Derived from WNC Revenue Monitoring P7 context and enhancement modelling assumptions.',
  },
};

const wb = xlsx.utils.book_new();

const metaRows = [
  ['key', 'value'],
  ['format', 'mtfs-snapshot-xlsx-v2'],
  ['snapshot_id', snapshot.id],
  ['snapshot_name', snapshot.name],
  ['description', snapshot.description],
  ['created_at', snapshot.createdAt],
  ['app_version', snapshot.metadata.appVersion],
  ['notes', snapshot.metadata.notes],
];

const authorityRows = [
  ['field', 'value'],
  ...Object.entries(snapshot.authorityConfig),
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
  ['councilTaxBaseConfig.enabled', 'true', 'boolean'],
  ['councilTaxBaseConfig.bandDEquivalentDwellings', 148000.4, 'count'],
  ['councilTaxBaseConfig.bandDCharge', 1866.98, '£'],
  ['councilTaxBaseConfig.collectionRate', 98.7, '%'],
  ['councilTaxBaseConfig.parishPrecepts', 9200, '£000'],
  ['councilTaxBaseConfig.corePreceptPct', 2.99, '%'],
  ['councilTaxBaseConfig.ascPreceptPct', 2.0, '%'],
  ['ascCohortModel.enabled', 'true', 'boolean'],
  ['ascCohortModel.population18to64', 250000, 'count'],
  ['ascCohortModel.population65plus', 76000, 'count'],
  ['ascCohortModel.prevalence18to64', 1.7, '%'],
  ['ascCohortModel.prevalence65plus', 16.8, '%'],
  ['ascCohortModel.unitCost18to64', 16500, '£'],
  ['ascCohortModel.unitCost65plus', 12100, '£'],
  ['ascCohortModel.growth18to64', 1.1, '%'],
  ['ascCohortModel.growth65plus', 2.0, '%'],
  ['capitalFinancing.enabled', 'true', 'boolean'],
  ['capitalFinancing.interestRate', 4.6, '%'],
  ['capitalFinancing.mrpRate', 3.0, '%'],
  ['capitalFinancing.borrowingByYear.1', 18000, '£000'],
  ['capitalFinancing.borrowingByYear.2', 20000, '£000'],
  ['capitalFinancing.borrowingByYear.3', 16500, '£000'],
  ['capitalFinancing.borrowingByYear.4', 14000, '£000'],
  ['capitalFinancing.borrowingByYear.5', 12000, '£000'],
  ['riskBasedReserves.enabled', 'true', 'boolean'],
  ['riskBasedReserves.adoptAsMinimumThreshold', 'true', 'boolean'],
  ['riskBasedReserves.demandVolatility', 12000, '£000'],
  ['riskBasedReserves.savingsNonDelivery', 8000, '£000'],
  ['riskBasedReserves.fundingUncertainty', 5000, '£000'],
  ['riskBasedReserves.litigationRisk', 1500, '£000'],
  ['reservesRecoveryPlan.enabled', 'true', 'boolean'],
  ['reservesRecoveryPlan.targetYear', 5, 'year 1-5'],
  ['reservesRecoveryPlan.targetLevel', 30000, '£000'],
  ['reservesRecoveryPlan.annualContribution', 1200, '£000'],
  ['reservesRecoveryPlan.autoCalculate', 'false', 'boolean'],
  ['reservesAdequacyMethodology.method', 'risk_based', 'fixed|pct_of_net_budget|risk_based'],
  ['reservesAdequacyMethodology.fixedMinimum', 18000, '£000'],
  ['reservesAdequacyMethodology.pctOfNetBudget', 4.2, '%'],
  ['treasuryIndicators.enabled', 'true', 'boolean'],
  ['treasuryIndicators.authorisedLimit', 520000, '£000'],
  ['treasuryIndicators.operationalBoundary', 470000, '£000'],
  ['treasuryIndicators.netFinancingNeed', 435000, '£000'],
  ['mrpCalculator.enabled', 'true', 'boolean'],
  ['mrpCalculator.policy', 'asset-life', 'asset-life|annuity|straight-line'],
  ['mrpCalculator.baseBorrowing', 350000, '£000'],
  ['mrpCalculator.assetLifeYears', 40, 'years'],
  ['mrpCalculator.annuityRate', 3.5, '%'],
  ['paySpineConfig.enabled', 'true', 'boolean'],
  ['contractIndexationTracker.enabled', 'true', 'boolean'],
  ['investToSave.enabled', 'true', 'boolean'],
  ['incomeGenerationWorkbook.enabled', 'true', 'boolean'],
];

const savingsRows = [
  ['id','name','description','category','grossValue','deliveryYear','achievementRate','isRecurring','ragStatus','responsibleOfficer','Y1','Y2','Y3','Y4','Y5'],
  ['wnc-1','Planning Service Income','Annual inflationary increase on planning fees','income',60,1,92,'true','green','Resources Director',100,100,100,100,100],
  ['wnc-2','Parking Regulations and Charges','Car parking charges and policy implementation','income',50,1,80,'true','amber','Place Director',80,100,100,100,100],
  ['wnc-3','Integrated Commissioning','Centralising commissioning function','transformation',69,2,82,'true','amber','People Director',0,70,100,100,100],
  ['wnc-4','Internal Audit Restructure','Internal controls team restructure','efficiency',66,1,90,'true','green','Resources Director',100,100,100,100,100],
];

const namedReserveRows = [
  ['id','name','purpose','openingBalance','isEarmarked','minimumBalance','contribY1','contribY2','contribY3','contribY4','contribY5','drawY1','drawY2','drawY3','drawY4','drawY5'],
  ['nr-1','General Reserve','Core financial resilience',28500,'false',18000,600,700,800,900,1000,1200,1000,900,700,600],
  ['nr-2','Demand Volatility Reserve','Buffer for ASC/CSC pressure',14500,'true',5000,300,300,300,300,300,900,700,600,500,400],
  ['nr-3','Transformation Reserve','Fund one-off transformation costs',12000,'true',0,0,0,0,0,0,2200,1800,1200,800,500],
];

const customServiceRows = [
  ['id','name','category','baseValue','inflationDriver','manualInflationRate','demandGrowthRate','isRecurring','notes'],
  ['cs-1','Temporary Accommodation','demand-led',7200,'manual',5.5,4.2,'true','High demand and market pressure'],
  ['cs-2','SEND Transport','demand-led',6800,'manual',4.8,5.0,'true','Route and contract pressure'],
  ['cs-3','Corporate Energy','non-pay',4200,'cpi',0,0,'true','Utility market linked'],
];

const grantRows = [
  ['id','name','value','certainty','endYear'],
  ['g-1','Social Care Support Grant',16200,'confirmed',5],
  ['g-2','Services Grant',9800,'indicative',3],
  ['g-3','Extended Producer Responsibility',2100,'assumed',2],
];

const paySpineRows = [
  ['id','grade','fte','spinePointCost'],
  ['ps-1','NJC SCP 23',55,32100],
  ['ps-2','NJC SCP 30',45,38900],
  ['ps-3','NJC SCP 38',28,47200],
];

const contractRows = [
  ['id','name','value','clause','bespokeRate','effectiveFromYear','reviewMonth','upliftMethod','fixedRate','customRate','phaseInMonths'],
  ['ct-1','Waste Collection Contract',2800,'cpi',0,1,4,'cpi',0,0,0],
  ['ct-2','Facilities Management',1450,'rpi',0,2,7,'rpi',0,0,3],
  ['ct-3','Specialist Placement Framework',950,'bespoke',4.25,1,10,'custom',0,4.25,6],
];

const investRows = [
  ['id','name','upfrontCost','annualSaving','paybackYears','deliveryYear'],
  ['i2s-1','Digital Case Management',1200,420,3,1],
  ['i2s-2','Fleet Optimisation',650,210,3,2],
  ['i2s-3','Back Office Automation',900,360,2,1],
];

const incomeRows = [
  ['id','name','baseVolume','basePrice','volumeGrowth','priceGrowth'],
  ['inc-1','Trade Waste',3200,145,2.1,3.5],
  ['inc-2','Planning Pre-Apps',1100,280,1.2,2.8],
  ['inc-3','Parking Permits',5200,96,1.5,2.2],
];

const scenarioRows = [
  ['id','name','description','type','color','createdAt','councilTaxIncrease','businessRatesGrowth','grantVariation','feesChargesElasticity','payAward','nonPayInflation','ascDemandGrowth','cscDemandGrowth','savingsDeliveryRisk','payAwardByFundingSourceGeneralFund','payAwardByFundingSourceGrant','payAwardByFundingSourceOther','payGroupSensitivityDefault','payGroupSensitivityTeachers','payGroupSensitivityNJC','payGroupSensitivitySenior','payGroupSensitivityOther','annualSavingsTarget','reservesUsage','socialCareProtection','realTermsToggle','inflationRate','resultTotalGap','resultRiskScore'],
  ['sc-1','WNC Base P7','Base working position','base','#3b82f6','2025-12-22T18:00:00.000Z',4.99,1.4,0.2,1.9,3.6,3.3,5.4,4.9,78,3.7,3.3,3.5,0,0.2,0.1,0.3,0,20000,1800,'true','false',2.5,0,52],
];

const jsonFallbackRows = [['json'], [JSON.stringify({
  id: snapshot.id,
  name: snapshot.name,
  description: snapshot.description,
  createdAt: snapshot.createdAt,
  assumptions: snapshot.assumptions,
  baseline: {
    ...snapshot.baseline,
    customServiceLines: [],
    namedReserves: [],
    councilTaxBaseConfig: {},
    grantSchedule: [],
    ascCohortModel: {},
    capitalFinancing: {},
    riskBasedReserves: {},
    reservesRecoveryPlan: {},
    paySpineConfig: { enabled: true, rows: [] },
    workforceModel: { enabled: true, mode: 'hybrid', posts: [] },
    contractIndexationTracker: { enabled: true, contracts: [] },
    investToSave: { enabled: true, proposals: [] },
    incomeGenerationWorkbook: { enabled: true, lines: [] },
    growthProposals: [],
    manualAdjustments: [],
    importMappingProfiles: [],
    overlayImports: [],
    reservesAdequacyMethodology: { method: 'risk_based', fixedMinimum: 18000, pctOfNetBudget: 4.2 },
    treasuryIndicators: { enabled: true, authorisedLimit: 520000, operationalBoundary: 470000, netFinancingNeed: 435000 },
    mrpCalculator: { enabled: true, policy: 'asset-life', baseBorrowing: 350000, assetLifeYears: 40, annuityRate: 3.5 },
  },
  savingsProposals: [],
  authorityConfig: snapshot.authorityConfig,
  scenarios: [],
  metadata: snapshot.metadata,
})]];

const readmeRows = [
  ['WNC Full Snapshot Workbook'],
  ['Tracked artifact for governance/demo use.'],
  ['Import in app via Scenarios > Model Snapshots (A31) > Import JSON/XLSX.'],
];

const sheets = [
  ['Meta', metaRows],
  ['AuthorityConfig', authorityRows],
  ['Assumptions', assumptionsRows],
  ['BaselineCore', baselineCoreRows],
  ['BaselineSettings', baselineSettingsRows],
  ['SavingsProposals', savingsRows],
  ['NamedReserves', namedReserveRows],
  ['CustomServiceLines', customServiceRows],
  ['GrantSchedule', grantRows],
  ['PaySpine', paySpineRows],
  ['Contracts', contractRows],
  ['InvestToSave', investRows],
  ['IncomeLines', incomeRows],
  ['Scenarios', scenarioRows],
  ['SnapshotJSON', jsonFallbackRows],
  ['Readme', readmeRows],
];

for (const [name, rows] of sheets) {
  const sheet = xlsx.utils.aoa_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, sheet, name);
}

xlsx.writeFile(wb, outputPath);
console.log(`Wrote ${outputPath}`);
