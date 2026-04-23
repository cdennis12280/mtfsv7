# West Northants-Sized Unitary Authority Template Pack

This folder contains **fully populated, import-ready templates** for every current import area in the MTFS app, plus a fully populated scenario/snapshot workbook.

These files are intentionally stored in-repo only and are **not wired into web-app download buttons**.

## Scale assumptions used

The data is calibrated to a unitary authority at approximately West Northamptonshire Council scale:
- Population: ~430,000 residents
- Annual budget envelope: ~£1.02bn gross / ~£464m net revenue (excluding DSG) with total service spend >£1.3bn

For modelling in this app, values are mostly expressed in `£000`.

## Files

- `baseline_configuration_import.csv`
- `savings_programme_import.csv`
- `named_reserves_schedule_import.csv`
- `grant_schedule_builder_import.csv`
- `pay_spine_configurator_import.csv`
- `contract_indexation_tracker_import.csv`
- `invest_to_save_modelling_import.csv`
- `income_generation_workbook_import.csv`
- `model_snapshot_scenario_template_west_northants_sized.xlsx`

## Import mapping

Each CSV matches the accepted headers in the corresponding parser in:
- `src/components/panels/BaselineEditor.tsx`
- `src/components/panels/SavingsProgramme.tsx`
- `src/components/panels/NamedReservesManager.tsx`
- `src/components/panels/HighValuePanel.tsx`
- `src/components/panels/EnhancementPanel.tsx`

The snapshot workbook matches the editable import structure in:
- `src/utils/snapshotExcel.ts`
