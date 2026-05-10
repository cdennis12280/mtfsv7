import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_AUTHORITY_CONFIG,
  DEFAULT_BASELINE,
  runCalculations,
} from '../calculations';
import { validateModel } from '../validation';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('validation engine', () => {
  it('flags demo metadata and missing scenario evidence as blockers', () => {
    const assumptions = clone(DEFAULT_ASSUMPTIONS);
    const baseline = clone(DEFAULT_BASELINE);
    const summary = validateModel({
      authorityConfig: clone(DEFAULT_AUTHORITY_CONFIG),
      baseline,
      assumptions,
      result: runCalculations(assumptions, baseline, []),
      savingsProposals: [],
      scenarios: [],
      snapshots: [],
      workflowState: {
        baselineLocked: false,
        assumptionsFrozen: false,
        governanceExports: { memberBrief: 0, s151Pack: 0, dataCsv: 0 },
      },
    });

    expect(summary.blockers).toEqual(expect.arrayContaining([
      'Authority metadata has not been confirmed.',
      'No saved scenarios are available for decision comparison.',
    ]));
    expect(summary.modelConfidenceScore).toBeLessThan(80);
  });

  it('passes a buyer-ready model without governance blockers', () => {
    const assumptions = clone(DEFAULT_ASSUMPTIONS);
    const baseline = clone(DEFAULT_BASELINE);
    const authorityConfig = { ...clone(DEFAULT_AUTHORITY_CONFIG), authorityName: 'Northshire Council' };
    const result = runCalculations(assumptions, baseline, []);
    const summary = validateModel({
      authorityConfig,
      baseline,
      assumptions,
      result,
      savingsProposals: [],
      scenarios: [
        { id: 'base', name: 'Base', description: '', type: 'base', assumptions, result, createdAt: new Date().toISOString(), color: '#3b82f6' },
      ],
      snapshots: [
        {
          id: 'snap-1',
          name: 'Cabinet draft',
          description: '',
          createdAt: new Date().toISOString(),
          assumptions,
          baseline,
          savingsProposals: [],
          authorityConfig,
          scenarios: [],
          metadata: { appVersion: 'test', notes: '' },
        },
      ],
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
