import type { PaySpineRow, WorkforcePost } from '../types/financial';

export function legacyPaySpineRowToWorkforcePost(row: PaySpineRow, index = 0): WorkforcePost {
  const stableId = row.id || `legacy-${index}`;
  const label = row.grade || `Legacy Grade ${index + 1}`;
  return {
    id: `wf-legacy-${stableId}`,
    postId: label,
    service: 'Legacy pay spine migration',
    fundingSource: 'general_fund',
    fte: Number.isFinite(row.fte) ? row.fte : 0,
    annualCost: Number.isFinite(row.spinePointCost) ? row.spinePointCost : 0,
    payAssumptionGroup: 'default',
    vacancyFactor: 0,
    generalFundSplit: 100,
    grantFundSplit: 0,
    otherSplit: 0,
  };
}

export function migratePaySpineRowsToWorkforcePosts(
  rows: PaySpineRow[] | undefined,
  existingPosts: WorkforcePost[] = []
): WorkforcePost[] {
  const existingIds = new Set(existingPosts.map((post) => post.id));
  return (rows ?? [])
    .map((row, index) => legacyPaySpineRowToWorkforcePost(row, index))
    .filter((post) => !existingIds.has(post.id));
}
