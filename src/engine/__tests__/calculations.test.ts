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

  it('planned reserves usage caps annual drawdown when set', () => {
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
