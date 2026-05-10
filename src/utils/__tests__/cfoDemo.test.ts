import { buildCfoDemoDataset, CFO_DEMO_STEPS } from '../cfoDemo';
import { validateModel } from '../../engine/validation';

describe('CFO demo dataset', () => {
  it('populates the full 10-minute demo fixture', () => {
    const dataset = buildCfoDemoDataset();
    const current = dataset.scenarios.find((scenario) => scenario.name === 'Current Plan');

    expect(CFO_DEMO_STEPS).toEqual(['position', 'drivers', 'options', 'assurance', 'export']);
    expect(dataset.authorityConfig.authorityName).toBe('Northshire Council');
    expect(dataset.savingsProposals.length).toBeGreaterThanOrEqual(5);
    expect(dataset.scenarios.map((scenario) => scenario.name)).toEqual([
      'Current Plan',
      'Do Nothing',
      'Recommended Plan',
      'Funding Shock',
    ]);
    expect(current?.result.years).toHaveLength(5);
    expect(dataset.snapshot.scenarios).toHaveLength(4);
  });

  it('has enough evidence to support the CFO assurance step', () => {
    const dataset = buildCfoDemoDataset();
    const result = dataset.scenarios[0].result;
    const summary = validateModel({
      authorityConfig: dataset.authorityConfig,
      baseline: dataset.baseline,
      assumptions: dataset.assumptions,
      result,
      savingsProposals: dataset.savingsProposals,
      scenarios: dataset.scenarios,
      snapshots: [dataset.snapshot],
      workflowState: {
        baselineLocked: true,
        assumptionsFrozen: true,
        governanceExports: { memberBrief: 1, s151Pack: 1, dataCsv: 1 },
      },
    });

    expect(summary.blockers).toHaveLength(0);
    expect(summary.modelConfidenceScore).toBeGreaterThanOrEqual(80);
  });
});
