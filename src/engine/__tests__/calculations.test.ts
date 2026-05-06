import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_BASELINE,
  parseBaselineCsv,
  runCalculations,
} from '../calculations';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('calculation engine', () => {
  it('returns a valid five-year result from defaults', () => {
    const result = runCalculations(
      clone(DEFAULT_ASSUMPTIONS),
      clone(DEFAULT_BASELINE),
      []
    );

    expect(result.years).toHaveLength(5);
    expect(Number.isFinite(result.totalGap)).toBe(true);
    expect(Number.isFinite(result.overallRiskScore)).toBe(true);
    expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
    expect(result.overallRiskScore).toBeLessThanOrEqual(100);
  });

  it('higher pay award worsens the five-year gap vs baseline assumptions', () => {
    const baseAssumptions = clone(DEFAULT_ASSUMPTIONS);
    const stressedAssumptions = clone(DEFAULT_ASSUMPTIONS);
    stressedAssumptions.expenditure.payAward += 2;

    const base = runCalculations(baseAssumptions, clone(DEFAULT_BASELINE), []);
    const stressed = runCalculations(stressedAssumptions, clone(DEFAULT_BASELINE), []);

    expect(stressed.totalGap).toBeGreaterThan(base.totalGap);
  });

  it('planned reserves usage applies explicit annual drawdown up to the gap', () => {
    const assumptions = clone(DEFAULT_ASSUMPTIONS);
    assumptions.policy.reservesUsage = 500;

    const baseline = clone(DEFAULT_BASELINE);
    baseline.councilTax = 0;
    baseline.businessRates = 0;
    baseline.coreGrants = 0;
    baseline.feesAndCharges = 0;

    const result = runCalculations(assumptions, baseline, []);

    expect(result.years.every((y) => y.reservesDrawdown <= 500)).toBe(true);
    expect(result.years.some((y) => y.netGap > 0)).toBe(true);
  });

  it('zero planned reserves usage means no reserves drawdown', () => {
    const assumptions = clone(DEFAULT_ASSUMPTIONS);
    assumptions.policy.reservesUsage = 0;

    const baseline = clone(DEFAULT_BASELINE);
    baseline.councilTax = 0;
    baseline.businessRates = 0;
    baseline.coreGrants = 0;
    baseline.feesAndCharges = 0;

    const result = runCalculations(assumptions, baseline, []);
    expect(result.years.every((y) => y.reservesDrawdown === 0)).toBe(true);
  });

  it('council tax equivalent increases when year-1 gap pressure increases', () => {
    const pressureBaseline = clone(DEFAULT_BASELINE);
    pressureBaseline.councilTax = 40_000;
    pressureBaseline.businessRates = 20_000;
    pressureBaseline.coreGrants = 15_000;
    pressureBaseline.feesAndCharges = 10_000;

    const base = runCalculations(clone(DEFAULT_ASSUMPTIONS), pressureBaseline, []);
    const stressedAssumptions = clone(DEFAULT_ASSUMPTIONS);
    stressedAssumptions.expenditure.payAward += 3;
    const stressed = runCalculations(stressedAssumptions, pressureBaseline, []);

    expect(stressed.councilTaxEquivalent).toBeGreaterThan(base.councilTaxEquivalent);
  });

  it('council tax equivalent decreases when CT income growth increases', () => {
    const pressureBaseline = clone(DEFAULT_BASELINE);
    pressureBaseline.councilTax = 40_000;
    pressureBaseline.businessRates = 20_000;
    pressureBaseline.coreGrants = 15_000;
    pressureBaseline.feesAndCharges = 10_000;

    const base = runCalculations(clone(DEFAULT_ASSUMPTIONS), pressureBaseline, []);
    const ctBoostAssumptions = clone(DEFAULT_ASSUMPTIONS);
    ctBoostAssumptions.funding.councilTaxIncrease += 2;
    const boosted = runCalculations(ctBoostAssumptions, pressureBaseline, []);

    expect(boosted.councilTaxEquivalent).toBeLessThan(base.councilTaxEquivalent);
  });

  it('contract inflation applies only from effective year', () => {
    const baseline = clone(DEFAULT_BASELINE);
    baseline.contractIndexationTracker.enabled = true;
    baseline.contractIndexationTracker.contracts = [
      {
        id: 'ct-1',
        name: 'Delayed Contract',
        value: 1000,
        clause: 'cpi',
        bespokeRate: 0,
        effectiveFromYear: 3,
        reviewMonth: 4,
        upliftMethod: 'fixed',
        fixedRate: 5,
        customRate: 0,
        phaseInMonths: 0,
      },
    ];
    const result = runCalculations(clone(DEFAULT_ASSUMPTIONS), baseline, []);
    expect(result.years[0].contractIndexationCost).toBe(0);
    expect(result.years[1].contractIndexationCost).toBe(0);
    expect(result.years[2].contractIndexationCost).toBeGreaterThan(0);
  });

  it('contract phase-in reduces first-year uplift vs full application', () => {
    const base = clone(DEFAULT_BASELINE);
    base.contractIndexationTracker.enabled = true;

    const phased = clone(base);
    phased.contractIndexationTracker.contracts = [
      {
        id: 'ct-phased',
        name: 'Phased Contract',
        value: 1000,
        clause: 'cpi',
        bespokeRate: 0,
        effectiveFromYear: 1,
        reviewMonth: 10,
        upliftMethod: 'fixed',
        fixedRate: 6,
        customRate: 0,
        phaseInMonths: 6,
      },
    ];
    const full = clone(base);
    full.contractIndexationTracker.contracts = [
      {
        id: 'ct-full',
        name: 'Full Contract',
        value: 1000,
        clause: 'cpi',
        bespokeRate: 0,
        effectiveFromYear: 1,
        reviewMonth: 1,
        upliftMethod: 'fixed',
        fixedRate: 6,
        customRate: 0,
        phaseInMonths: 0,
      },
    ];

    const phasedResult = runCalculations(clone(DEFAULT_ASSUMPTIONS), phased, []);
    const fullResult = runCalculations(clone(DEFAULT_ASSUMPTIONS), full, []);
    expect(phasedResult.years[0].contractIndexationCost).toBeGreaterThan(0);
    expect(phasedResult.years[0].contractIndexationCost).toBeLessThan(fullResult.years[0].contractIndexationCost);
  });

  it('one-off growth proposals do not worsen structural gap like recurring proposals', () => {
    const recurring = clone(DEFAULT_BASELINE);
    recurring.councilTax = 0;
    recurring.businessRates = 0;
    recurring.coreGrants = 0;
    recurring.feesAndCharges = 0;
    recurring.growthProposals = [
      {
        id: 'gp-rec',
        name: 'Recurring growth',
        service: 'ASC',
        owner: 'Director',
        value: 5000,
        deliveryYear: 1,
        isRecurring: true,
        confidence: 100,
        yearlyPhasing: [100, 100, 100, 100, 100],
        notes: '',
      },
    ];
    const oneOff = clone(recurring);
    oneOff.growthProposals[0].id = 'gp-one';
    oneOff.growthProposals[0].isRecurring = false;
    oneOff.growthProposals[0].yearlyPhasing = [100, 0, 0, 0, 0];

    const recurringResult = runCalculations(clone(DEFAULT_ASSUMPTIONS), recurring, []);
    const oneOffResult = runCalculations(clone(DEFAULT_ASSUMPTIONS), oneOff, []);
    expect(recurringResult.years[4].structuralGap).toBeGreaterThan(oneOffResult.years[4].structuralGap);
    expect(oneOffResult.years[1].growthProposalsImpact).toBe(0);
  });

  it('manual adjustments apply only to selected year', () => {
    const baseline = clone(DEFAULT_BASELINE);
    baseline.manualAdjustments = [{ id: 'adj-1', service: 'Corporate', year: 3, amount: 500, reason: 'Timing adjustment' }];
    const result = runCalculations(clone(DEFAULT_ASSUMPTIONS), baseline, []);
    expect(result.years[0].manualAdjustmentsImpact).toBe(0);
    expect(result.years[1].manualAdjustmentsImpact).toBe(0);
    expect(result.years[2].manualAdjustmentsImpact).toBeGreaterThan(0);
    expect(result.years[3].manualAdjustmentsImpact).toBe(0);
  });

  it('funding bridge deltas reconcile modelled and baseline funding by stream', () => {
    const result = runCalculations(clone(DEFAULT_ASSUMPTIONS), clone(DEFAULT_BASELINE), []);
    const y1 = result.years[0];
    expect(y1.fundingBridge.modelled.councilTax - y1.fundingBridge.baseline.councilTax).toBeCloseTo(y1.fundingBridge.deltas.councilTax, 6);
    expect(y1.fundingBridge.modelled.businessRates - y1.fundingBridge.baseline.businessRates).toBeCloseTo(y1.fundingBridge.deltas.businessRates, 6);
    expect(y1.fundingBridge.modelled.grants - y1.fundingBridge.baseline.grants).toBeCloseTo(y1.fundingBridge.deltas.grants, 6);
    expect(y1.fundingBridge.modelled.otherFunding - y1.fundingBridge.baseline.otherFunding).toBeCloseTo(y1.fundingBridge.deltas.otherFunding, 6);
  });

  it('pay group sensitivity increases pay pressure for matching workforce groups', () => {
    const baseline = clone(DEFAULT_BASELINE);
    baseline.workforceModel.enabled = true;
    baseline.workforceModel.mode = 'workforce_posts';
    baseline.workforceModel.posts = [
      {
        id: 'wf-1',
        postId: 'POST-1',
        service: 'Corporate',
        fundingSource: 'general_fund',
        fte: 10,
        annualCost: 50000,
        payAssumptionGroup: 'teachers',
      },
    ];
    const baseA = clone(DEFAULT_ASSUMPTIONS);
    const stressed = clone(DEFAULT_ASSUMPTIONS);
    stressed.expenditure.payGroupSensitivity.teachers += 2;
    const baseResult = runCalculations(baseA, baseline, []);
    const stressedResult = runCalculations(stressed, baseline, []);
    expect(stressedResult.years[0].generalFundPayPressure).toBeGreaterThan(baseResult.years[0].generalFundPayPressure);
    expect(stressedResult.years[0].payInflationImpact).toBeGreaterThan(baseResult.years[0].payInflationImpact);
  });
});

describe('baseline csv parser', () => {
  it('parses wide header/value csv format', () => {
    const csv = [
      'councilTax,businessRates,coreGrants,feesAndCharges,pay,nonPay,ascDemandLed,cscDemandLed,otherServiceExp,generalFundReserves,earmarkedReserves,reservesMinimumThreshold',
      '100000,50000,40000,20000,120000,60000,30000,15000,10000,12000,8000,7000',
    ].join('\n');

    const parsed = parseBaselineCsv(csv);
    expect(parsed.success).toBe(true);
    expect(parsed.baseline?.councilTax).toBe(100000);
    expect(parsed.baseline?.reservesMinimumThreshold).toBe(7000);
  });

  it('parses long row-based csv format using first numeric year value', () => {
    const csv = [
      'lineName,2026/27,2027/28',
      'councilTax,111000,115000',
      'businessRates,51000,52000',
      'coreGrants,42000,43000',
      'feesAndCharges,21000,22000',
    ].join('\n');

    const parsed = parseBaselineCsv(csv);
    expect(parsed.success).toBe(true);
    expect(parsed.baseline?.councilTax).toBe(111000);
    expect(parsed.baseline?.feesAndCharges).toBe(21000);
  });
});

describe('baseline input connectivity', () => {
  it('core baseline budget lines feed funding and expenditure outputs', () => {
    const base = runCalculations(clone(DEFAULT_ASSUMPTIONS), clone(DEFAULT_BASELINE), []);

    const withCouncilTax = clone(DEFAULT_BASELINE);
    withCouncilTax.councilTax += 10_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withCouncilTax, []).years[0].totalFunding).toBeGreaterThan(base.years[0].totalFunding);

    const withBusinessRates = clone(DEFAULT_BASELINE);
    withBusinessRates.businessRates += 10_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withBusinessRates, []).years[0].totalFunding).toBeGreaterThan(base.years[0].totalFunding);

    const withCoreGrants = clone(DEFAULT_BASELINE);
    withCoreGrants.coreGrants += 10_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withCoreGrants, []).years[0].totalFunding).toBeGreaterThan(base.years[0].totalFunding);

    const withFees = clone(DEFAULT_BASELINE);
    withFees.feesAndCharges += 10_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withFees, []).years[0].totalFunding).toBeGreaterThan(base.years[0].totalFunding);

    const withPay = clone(DEFAULT_BASELINE);
    withPay.pay += 10_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withPay, []).years[0].totalExpenditure).toBeGreaterThan(base.years[0].totalExpenditure);

    const withNonPay = clone(DEFAULT_BASELINE);
    withNonPay.nonPay += 10_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withNonPay, []).years[0].totalExpenditure).toBeGreaterThan(base.years[0].totalExpenditure);

    const withAsc = clone(DEFAULT_BASELINE);
    withAsc.ascDemandLed += 10_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withAsc, []).years[0].totalExpenditure).toBeGreaterThan(base.years[0].totalExpenditure);

    const withCsc = clone(DEFAULT_BASELINE);
    withCsc.cscDemandLed += 10_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withCsc, []).years[0].totalExpenditure).toBeGreaterThan(base.years[0].totalExpenditure);

    const withOther = clone(DEFAULT_BASELINE);
    withOther.otherServiceExp += 10_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withOther, []).years[0].totalExpenditure).toBeGreaterThan(base.years[0].totalExpenditure);
  });

  it('reserve baseline fields feed opening reserves and threshold outputs', () => {
    const base = runCalculations(clone(DEFAULT_ASSUMPTIONS), clone(DEFAULT_BASELINE), []);

    const withGF = clone(DEFAULT_BASELINE);
    withGF.generalFundReserves += 5_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withGF, []).years[0].totalOpeningReserves).toBeGreaterThan(base.years[0].totalOpeningReserves);

    const withEM = clone(DEFAULT_BASELINE);
    withEM.earmarkedReserves += 5_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withEM, []).years[0].totalOpeningReserves).toBeGreaterThan(base.years[0].totalOpeningReserves);

    const withThreshold = clone(DEFAULT_BASELINE);
    withThreshold.reservesMinimumThreshold += 3_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withThreshold, []).effectiveMinimumReservesThreshold).toBeGreaterThan(base.effectiveMinimumReservesThreshold);
  });

  it('custom line financial inputs influence model outputs', () => {
    const withCustomLine = clone(DEFAULT_BASELINE);
    withCustomLine.customServiceLines = [{
      id: 'csl-1',
      name: 'Test line',
      category: 'non-pay',
      baseValue: 10_000,
      inflationDriver: 'cpi',
      manualInflationRate: 0,
      demandGrowthRate: 0,
      isRecurring: true,
      notes: '',
    }];
    const base = runCalculations(clone(DEFAULT_ASSUMPTIONS), withCustomLine, []);

    const withHigherBaseValue = clone(withCustomLine);
    withHigherBaseValue.customServiceLines[0].baseValue = 15_000;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withHigherBaseValue, []).years[0].totalExpenditure).toBeGreaterThan(base.years[0].totalExpenditure);

    const withManualRate = clone(withCustomLine);
    withManualRate.customServiceLines[0].inflationDriver = 'manual';
    withManualRate.customServiceLines[0].manualInflationRate = 8;
    const withLowerManualRate = clone(withCustomLine);
    withLowerManualRate.customServiceLines[0].inflationDriver = 'manual';
    withLowerManualRate.customServiceLines[0].manualInflationRate = 1;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withManualRate, []).years[4].totalExpenditure)
      .toBeGreaterThan(runCalculations(clone(DEFAULT_ASSUMPTIONS), withLowerManualRate, []).years[4].totalExpenditure);

    const withHigherDemand = clone(withCustomLine);
    withHigherDemand.customServiceLines[0].demandGrowthRate = 4;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), withHigherDemand, []).years[4].totalExpenditure).toBeGreaterThan(base.years[4].totalExpenditure);

    const oneOffLine = clone(withCustomLine);
    oneOffLine.customServiceLines[0].isRecurring = false;
    expect(runCalculations(clone(DEFAULT_ASSUMPTIONS), oneOffLine, []).totalStructuralGap)
      .toBeLessThan(runCalculations(clone(DEFAULT_ASSUMPTIONS), withCustomLine, []).totalStructuralGap);
  });

  it('custom line metadata fields are non-financial and do not change calculated totals', () => {
    const baseLine = clone(DEFAULT_BASELINE);
    baseLine.customServiceLines = [{
      id: 'csl-1',
      name: 'Line A',
      category: 'non-pay',
      baseValue: 10_000,
      inflationDriver: 'cpi',
      manualInflationRate: 0,
      demandGrowthRate: 0,
      isRecurring: true,
      notes: 'Note A',
    }];
    const base = runCalculations(clone(DEFAULT_ASSUMPTIONS), baseLine, []);

    const metadataChanged = clone(baseLine);
    metadataChanged.customServiceLines[0].name = 'Line B';
    metadataChanged.customServiceLines[0].category = 'income';
    metadataChanged.customServiceLines[0].notes = 'Note B';
    const changed = runCalculations(clone(DEFAULT_ASSUMPTIONS), metadataChanged, []);

    expect(changed.totalGap).toBe(base.totalGap);
    expect(changed.totalStructuralGap).toBe(base.totalStructuralGap);
    expect(changed.years[0].totalExpenditure).toBe(base.years[0].totalExpenditure);
  });
});

describe('assumption engine control connectivity', () => {
  it('funding sliders change funding outputs', () => {
    const baseA = clone(DEFAULT_ASSUMPTIONS);
    const base = runCalculations(baseA, clone(DEFAULT_BASELINE), []);

    const ctUp = clone(baseA);
    ctUp.funding.councilTaxIncrease += 1;
    expect(runCalculations(ctUp, clone(DEFAULT_BASELINE), []).years[4].councilTax).toBeGreaterThan(base.years[4].councilTax);

    const brUp = clone(baseA);
    brUp.funding.businessRatesGrowth += 1;
    expect(runCalculations(brUp, clone(DEFAULT_BASELINE), []).years[4].businessRates).toBeGreaterThan(base.years[4].businessRates);

    const grantUp = clone(baseA);
    grantUp.funding.grantVariation += 1;
    expect(runCalculations(grantUp, clone(DEFAULT_BASELINE), []).years[4].coreGrants).toBeGreaterThan(base.years[4].coreGrants);

    const feesUp = clone(baseA);
    feesUp.funding.feesChargesElasticity += 1;
    expect(runCalculations(feesUp, clone(DEFAULT_BASELINE), []).years[4].feesAndCharges).toBeGreaterThan(base.years[4].feesAndCharges);
  });

  it('expenditure sliders change expenditure outputs', () => {
    const baseA = clone(DEFAULT_ASSUMPTIONS);
    const base = runCalculations(baseA, clone(DEFAULT_BASELINE), []);

    const payUp = clone(baseA);
    payUp.expenditure.payAward += 1;
    expect(runCalculations(payUp, clone(DEFAULT_BASELINE), []).years[4].totalExpenditure).toBeGreaterThan(base.years[4].totalExpenditure);

    const nonPayUp = clone(baseA);
    nonPayUp.expenditure.nonPayInflation += 1;
    expect(runCalculations(nonPayUp, clone(DEFAULT_BASELINE), []).years[4].totalExpenditure).toBeGreaterThan(base.years[4].totalExpenditure);

    const ascUp = clone(baseA);
    ascUp.expenditure.ascDemandGrowth += 1;
    expect(runCalculations(ascUp, clone(DEFAULT_BASELINE), []).years[4].ascPressure).toBeGreaterThan(base.years[4].ascPressure);

    const cscUp = clone(baseA);
    cscUp.expenditure.cscDemandGrowth += 1;
    expect(runCalculations(cscUp, clone(DEFAULT_BASELINE), []).years[4].cscPressure).toBeGreaterThan(base.years[4].cscPressure);

    // Savings delivery risk only impacts outputs when a savings target/proposals exist.
    const pressureBaseline = clone(DEFAULT_BASELINE);
    pressureBaseline.councilTax = 0;
    pressureBaseline.businessRates = 0;
    pressureBaseline.coreGrants = 0;
    pressureBaseline.feesAndCharges = 0;
    const withTarget = clone(baseA);
    withTarget.policy.annualSavingsTarget = 5_000;
    const goodDelivery = clone(withTarget);
    goodDelivery.expenditure.savingsDeliveryRisk = 95;
    const weakDelivery = clone(withTarget);
    weakDelivery.expenditure.savingsDeliveryRisk = 60;
    expect(runCalculations(weakDelivery, pressureBaseline, []).totalGap).toBeGreaterThan(runCalculations(goodDelivery, pressureBaseline, []).totalGap);
  });

  it('policy controls change mitigation outputs', () => {
    const baseA = clone(DEFAULT_ASSUMPTIONS);
    const pressureBaseline = clone(DEFAULT_BASELINE);
    pressureBaseline.councilTax = 0;
    pressureBaseline.businessRates = 0;
    pressureBaseline.coreGrants = 0;
    pressureBaseline.feesAndCharges = 0;

    const noSavings = clone(baseA);
    noSavings.policy.annualSavingsTarget = 0;
    const withSavings = clone(baseA);
    withSavings.policy.annualSavingsTarget = 2_000;
    expect(runCalculations(withSavings, pressureBaseline, []).totalGap).toBeLessThan(runCalculations(noSavings, pressureBaseline, []).totalGap);

    const noReservesUse = clone(baseA);
    noReservesUse.policy.reservesUsage = 0;
    const withReservesUse = clone(baseA);
    withReservesUse.policy.reservesUsage = 1_000;
    expect(runCalculations(withReservesUse, pressureBaseline, []).years.some((y) => y.reservesDrawdown > 0)).toBe(true);
    expect(runCalculations(noReservesUse, pressureBaseline, []).years.every((y) => y.reservesDrawdown === 0)).toBe(true);

    const protectionOn = clone(baseA);
    protectionOn.policy.annualSavingsTarget = 2_000;
    protectionOn.policy.socialCareProtection = true;
    const protectionOff = clone(baseA);
    protectionOff.policy.annualSavingsTarget = 2_000;
    protectionOff.policy.socialCareProtection = false;
    expect(runCalculations(protectionOn, pressureBaseline, []).totalGap).toBeGreaterThan(runCalculations(protectionOff, pressureBaseline, []).totalGap);
  });

  it('advanced controls change real-terms outputs', () => {
    const nominal = clone(DEFAULT_ASSUMPTIONS);
    nominal.advanced.realTermsToggle = false;
    const realTerms = clone(DEFAULT_ASSUMPTIONS);
    realTerms.advanced.realTermsToggle = true;
    const nominalResult = runCalculations(nominal, clone(DEFAULT_BASELINE), []);
    const realTermsResult = runCalculations(realTerms, clone(DEFAULT_BASELINE), []);
    expect(realTermsResult.years[4].totalFunding).toBeLessThan(nominalResult.years[4].totalFunding);

    const rtLowDeflator = clone(DEFAULT_ASSUMPTIONS);
    rtLowDeflator.advanced.realTermsToggle = true;
    rtLowDeflator.advanced.inflationRate = 1;
    const rtHighDeflator = clone(DEFAULT_ASSUMPTIONS);
    rtHighDeflator.advanced.realTermsToggle = true;
    rtHighDeflator.advanced.inflationRate = 4;
    expect(runCalculations(rtHighDeflator, clone(DEFAULT_BASELINE), []).years[4].totalFunding)
      .toBeLessThan(runCalculations(rtLowDeflator, clone(DEFAULT_BASELINE), []).years[4].totalFunding);
  });
});
