# MTFS Decision Support (v7)

Browser-based Medium Term Financial Strategy (MTFS) modelling workspace for local authority finance planning.

The app lets users adjust funding, expenditure, policy, and advanced modelling controls and immediately see the impact on 5-year gap, reserves resilience, and risk posture.

## What this project does

- Models a 5-year MTFS position from baseline and assumptions.
- Supports strategic and technical views for different audiences.
- Provides panel-based workflows across Overview, Baseline, Gap Analysis, Reserves, Savings Programme, Risk & Resilience, High Value, Enhancement, Scenarios, Insights, Technical Detail, S151 Assurance, and Governance.
- Captures assumptions history and audit trail of model runs.
- Saves snapshots locally and supports import/export in JSON and XLSX.

## Tech stack

- React 19 + TypeScript
- Vite 8
- Zustand (state management)
- Recharts (charting)
- Tailwind CSS 4
- `xlsx` (snapshot workbook import/export)

## Getting started

### Requirements

- Node.js 20+ (recommended)
- npm 10+

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Default Vite dev URL is typically `http://localhost:5173`.

### Build

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Routes

- Main app: `/`
- Help guide: `/#help-guide` (or `/help`)

## Data conventions

- Core financial values are in `£000` unless explicitly marked otherwise.
- Forecast horizon is 5 years.
- Snapshot data is persisted in browser local storage (`mtfs-snapshots-v1`) and can be exported/imported.

## Project structure

- `src/App.tsx`: app shell and panel composition
- `src/store/mtfsStore.ts`: central Zustand store, actions, snapshots/scenarios
- `src/engine/calculations.ts`: defaults + MTFS calculation engine
- `src/components/panels/*`: panel UIs and workflows
- `src/components/HelpGuide.tsx`: in-app user instruction manual
- `src/utils/snapshotExcel.ts`: XLSX snapshot export/import mapping

## Notes

- This is a decision-support modelling tool, not statutory accounting software.
- Defaults are demonstration-oriented and should be replaced with authority-specific data before governance use.
