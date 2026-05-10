import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, runCalculations } from '../../engine/calculations';
import type { DecisionPackPdfOption } from '../decisionPackPdf';
import { resolveDecisionPackRecommendation } from '../decisionPackPdf';

describe('decision pack PDF recommendation', () => {
  it('uses the weighted on-screen recommendation when supplied', () => {
    const result = runCalculations(DEFAULT_ASSUMPTIONS, DEFAULT_BASELINE, []);
    const options: DecisionPackPdfOption[] = [
      { label: 'Option A', name: 'Current', description: '', type: 'current', assumptions: DEFAULT_ASSUMPTIONS, result },
      { label: 'Option B', name: 'Do Nothing', description: '', type: 'pessimistic', assumptions: DEFAULT_ASSUMPTIONS, result: { ...result, totalGap: result.totalGap + 10_000 } },
      { label: 'Option C', name: 'Recommended', description: '', type: 'optimistic', assumptions: DEFAULT_ASSUMPTIONS, result: { ...result, totalGap: result.totalGap + 20_000 } },
    ];

    expect(resolveDecisionPackRecommendation(options, 'Option C').label).toBe('Option C');
  });
});
