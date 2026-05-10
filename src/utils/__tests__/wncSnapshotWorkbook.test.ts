/// <reference types="node" />

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCalculations } from '../../engine/calculations';
import { importSnapshotFromWorkbookFile } from '../snapshotExcel';

describe('West Northamptonshire A31 demo snapshot workbook', () => {
  it('imports the repo demo workbook and populates the finance modelling sections', async () => {
    const workbookPath = path.resolve(process.cwd(), 'demo-data/west-northamptonshire-a31-model-snapshot.xlsx');
    const bytes = fs.readFileSync(workbookPath);
    const file = new File([bytes], 'west-northamptonshire-a31-model-snapshot.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const imported = await importSnapshotFromWorkbookFile(file);

    expect(imported.success).toBe(true);
    if (!imported.success) return;

    const { snapshot } = imported;
    const result = runCalculations(snapshot.assumptions, snapshot.baseline, snapshot.savingsProposals);

    expect(snapshot.authorityConfig.authorityName).toBe('West Northamptonshire Council');
    expect(snapshot.baseline.workforceModel.enabled).toBe(true);
    expect(snapshot.baseline.workforceModel.posts).toHaveLength(45);
    expect(snapshot.baseline.namedReserves).toHaveLength(14);
    expect(snapshot.savingsProposals).toHaveLength(29);
    expect(snapshot.baseline.contractIndexationTracker.contracts).toHaveLength(18);
    expect(snapshot.baseline.grantSchedule).toHaveLength(10);
    expect(snapshot.scenarios).toHaveLength(4);
    expect(result.years[0].payBudgetReconciliation.activeModelMode).toBe('workforce_posts');
    expect(result.years[0].reserveCategoryClosingBalances.general_fund).toBeGreaterThan(0);
    expect(result.requiredSavingsToBalance).toBeGreaterThanOrEqual(0);
  });
});
