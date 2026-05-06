# Snapshot Artifacts

## WNC Full Snapshot

- File: `wnc_full_snapshot_2025-26_p7.xlsx`
- Purpose: tracked West Northamptonshire Council full-model snapshot workbook for A31 import/demo/governance working sessions.
- Format: `mtfs-snapshot-xlsx-v2` compatible sheet structure.

## Refresh

Run:

```bash
node scripts/generate-wnc-snapshot.mjs
```

Then re-import in app via `Scenarios > Model Snapshots (A31) > Import JSON/XLSX` to validate.
