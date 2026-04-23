# MTFS Financial Resilience Studio — Development Backlog

> **Section 151 Officer Enhancement Programme**
> All items are designed to move the system from a demonstration tool to a production-grade statutory financial planning instrument.

---

## End-User Instructions

### Getting Started
1. **Launch the application** by running `npm run dev` in the project directory, then open `http://localhost:5173` in your browser
2. **Configure your authority** — open the sidebar and expand the **Authority Configuration** section (top of sidebar). Enter your authority name and Section 151 Officer name. This branding appears in all exported reports
3. **Set your baseline** — navigate to the **Baseline Editor** tab. Replace the illustrative figures with your authority's actual budget lines. You can also import a CSV file using the format described in the Baseline Editor panel
4. **Adjust assumptions** — use the **Assumption Engine** sidebar (left panel) to set financial drivers for your planning period. Hover over the ℹ icon beside each control for guidance on appropriate values. Use the **Quick Presets** buttons for a fast optimistic/pessimistic comparison
5. **Build your savings programme** — navigate to the **Savings Programme** tab and add individual proposals with gross value, category, delivery year, achievement risk, and recurring/one-off classification
6. **Configure your reserves** — navigate to the **Reserves** tab and use the **Named Reserves** section to enter individual reserve balances (General Fund, Insurance Reserve, Transformation Reserve, etc.)
7. **Review the MTFS gap** — the **KPI Bar** at the top of the screen updates live. Green = balanced/surplus; Amber = manageable gap; Red = structural deficit or reserves breach
8. **Explore scenarios** — use the **Scenarios** tab to save the current assumption set as a named scenario (e.g. "Base Case"), apply the Pessimistic preset, save again, then compare side-by-side
9. **Assess risk** — the **Risk & Resilience** tab provides the multi-factor risk score, sustainability tests, and sensitivity analysis. Review all FAIL flags before presenting to governance
10. **Review S151 assurance** — the **S151 Assurance** tab runs the statutory compliance checks against LGA 2003 s.25 and s.26 duties. All FAIL or AT RISK items must be addressed before submitting the MTFS to Full Council
11. **Generate your report** — go to the **Governance** tab and click **Export Committee Report**. This produces a formatted narrative export suitable for presenting to Cabinet, Finance Committee, or Full Council

### Key Concepts
- **Structural deficit**: A deficit where recurring expenditure exceeds recurring funding. Cannot be solved by one-off reserves use. The model flags this automatically when two or more years show a deficit driven by recurring items
- **Reserves minimum threshold**: The lowest prudent level of reserves the authority should hold. Shown as a red dashed line on the Reserves Depletion chart. Set this to your authority's own assessed minimum in the Baseline Editor
- **Savings delivery risk**: Not all savings programmes are delivered on time or in full. The achievement rate slider (default 85%) applies a haircut to the gross savings target. Set per-proposal rates in the Savings Programme builder for greater accuracy
- **Council Tax equivalent**: The percentage CT increase that would close the Year 1 gap if no other action were taken. Useful for contextualising the scale of the problem for elected members
- **Real terms toggle**: When enabled, all figures are deflated by the assumed inflation rate to show purchasing power rather than cash amounts. Useful for longer-horizon planning but most MTFS reporting uses nominal (cash) figures

### View Modes
- **Strategic View**: Shows only the panels most relevant to non-technical audiences — Overview, Gap Analysis, Reserves, Insights, Scenarios, S151 Assurance. Use this when presenting to elected members or Corporate Leadership Team
- **Technical View**: Shows all nine panels including the full financial model detail, sensitivity analysis, and governance/methodology documentation. Use this when working with finance professionals or for audit committee submissions

### Keyboard / Navigation
- Click any tab in the top navigation bar to switch panels
- All sidebar sliders update calculations in real time — no save button required
- Scenario saves are held in browser memory for the current session only (persistence planned for Phase 2)
- Use the **Reset to Defaults** button at the bottom of the sidebar to restore illustrative baseline assumptions

---

## Unit Test Specifications

> Tests should be written using Vitest. Run with `npm run test`. Test file location: `src/engine/__tests__/calculations.test.ts`

### Core Engine Tests

```
CALC-001: Year 1 funding total equals sum of all four funding streams
CALC-002: Council tax compounds correctly — £48,500k at 4.99% for 5 years ≈ £61,897k
CALC-003: Pay expenditure grows by compounding pay award rate each year
CALC-004: ASC demand pressure grows at configured rate from baseline
CALC-005: Delivered savings = target × (delivery risk / 100) × ramp factor
CALC-006: Savings ramp in Year 1 = 60% of (target × delivery risk)
CALC-007: Net expenditure = gross expenditure before savings − delivered savings
CALC-008: Raw gap = total expenditure − total funding (positive = deficit)
CALC-009: Reserves drawdown cannot exceed total available reserves
CALC-010: General fund closing balance never goes below zero
CALC-011: reservesBelowThreshold flag is true when closing reserves < minimum threshold
CALC-012: structuralDeficit flag is true when raw gap > 0 AND reserves drawdown > 0
CALC-013: yearReservesExhausted returns null when reserves remain positive throughout
CALC-014: yearReservesExhausted returns correct year label when exhausted
CALC-015: Real terms mode deflates Year 5 value by (1 + rate)^−5
CALC-016: Zero savings target produces zero delivered savings
CALC-017: Zero reserves usage with deficit produces positive netGap
CALC-018: 100% savings delivery risk returns target × ramp as delivered savings
CALC-019: Optimistic preset produces a smaller gap than pessimistic preset
CALC-020: totalGap equals sum of positive rawGap values across all 5 years
```

### Sensitivity Tests
```
SENS-001: +1% council tax produces a negative (improving) change in Year 1 gap
SENS-002: +1% pay award produces a positive (worsening) change in Year 1 gap
SENS-003: -10% savings delivery produces a positive (worsening) gap change
SENS-004: Sensitivity perturbations are symmetric — increasing then decreasing a parameter returns to baseline
```

### Risk Scoring Tests
```
RISK-001: Overall risk score is between 0 and 100
RISK-002: Risk score is higher in pessimistic scenario than optimistic scenario
RISK-003: reservesAdequacy risk factor level = 'critical' when Year 5 closing reserves < minimum threshold
RISK-004: Each risk factor weight sums to 1.0 across all factors
```

### Custom Service Lines Tests
```
CUST-001: Custom service line expenditure is included in gross expenditure total
CUST-002: Per-service inflation rate is applied independently per line
CUST-003: One-off savings are excluded from recurring structural gap calculation
CUST-004: Recurring savings reduce the structural deficit in all future years
CUST-005: CSV import correctly maps column headers to baseline fields
```

### Named Reserves Tests
```
RES-001: Sum of named reserve opening balances equals total opening reserves
RES-002: Planned drawdown from a named reserve reduces its closing balance
RES-003: Named reserve closing balance never goes below zero
RES-004: Reserves below minimum threshold flag considers total of all named reserves
```

---

## Implementation Backlog

---

### 🔴 IMMEDIATE Priority
*Items enabling real authority data and governance-ready outputs*

- [x] **Item 1** — Editable baseline data panel: Replace hardcoded illustrative figures with an in-app table where the S151 Officer inputs their authority's actual budget lines (council tax base, rate income, grant allocations, service budgets) with validation against prior-year actuals
- [x] **Item 2** — Multi-year baseline import: Upload a CSV/Excel file of the authority's existing MTFS spreadsheet to auto-populate the baseline, preserving the line structure finance teams already use
- [x] **Item 3** — Budget line disaggregation: Allow the S151 Officer to define custom service expenditure lines (e.g. Highways, Housing, Planning) rather than just Pay/Non-Pay/ASC/CSC — with each line carrying its own inflation driver and demand assumption
- [x] **Item 6** — Per-service inflation drivers: Assign different inflation rates to individual budget lines (e.g. energy contracts at 8%, care contracts linked to NMW uplifts, IT contracts linked to CPI) rather than a single non-pay rate
- [x] **Item 10** — One-off vs recurring flag: For every assumption and savings line, toggle whether it is recurring (structural) or one-off (non-recurrent), with the model automatically separating structural and managed deficits in the gap analysis
- [x] **Item 11** — Savings programme builder: Enter individual savings proposals with name, gross value, delivery year, category (efficiency/income/demand management/service reduction), RAG status, and officer responsible — aggregating to the total programme with delivery risk applied per proposal
- [x] **Item 15** — Granular reserves schedule: Allow the S151 Officer to define named earmarked reserves (Insurance Fund, Transformation Reserve, SEND Reserve, etc.) with opening balances, planned contributions, planned drawdowns, and purpose — rather than one earmarked lump sum
- [x] **Item 22** — Named authority branding: Enter the authority name, S151 Officer name, and reporting period to brand all outputs for use in Cabinet/Full Council reports
- [x] **Item 23** — Committee report generator: One-click export of a formatted, narrative-rich report structured for Full Council budget setting: executive summary, MTFS table, gap analysis, reserves position, risk assessment, S151 statutory statement

---

### 🟠 HIGH VALUE Priority
*Core S151 statutory obligations and CIPFA guidance alignment*

- [x] **Item 4** — Council tax base configurator: Input Band D equivalent dwellings, collection rate, parish precept requirements, and calculate the yield from any % increase, including the 2%/3% split between core and ASC precept
- [x] **Item 5** — Grant schedule builder: Enter individual grants by name, value, certainty level (confirmed/indicative/assumed), and end date — with automatic flagging when grants expire mid-MTFS
- [x] **Item 7** — Demand model by cohort: For ASC, configure demand growth separately for 18–64 (working age) and 65+ (older people), with prevalence rates and average unit cost assumptions, matching the SALT/ASCOF data structure
- [x] **Item 12** — Savings slippage modelling: For each savings proposal, set a slippage assumption (% delivery in Year 1, Year 2, Year 3) rather than a single authority-wide risk rate, reflecting the realistic ramp-up profile of transformation programmes
- [x] **Item 17** — Risk-based reserves calculator: An embedded tool that quantifies reserve requirements against specific risks (demand volatility, savings non-delivery, funding uncertainty, litigation), summing to a recommended minimum balance the S151 Officer can adopt or override
- [x] **Item 18** — Reserves rebuilding plan: When reserves fall below threshold, automatically model a recovery plan: what annual contribution is needed to restore reserves to the target level by a specified year
- [x] **Item 19** — Capital financing costs: Input the authority's capital programme (borrowing requirement by year) and apply MRP/interest assumptions to show the revenue impact of capital decisions on the MTFS
- [x] **Item 24** — Assumptions version history: Timestamp and store every change to assumptions with a description so the S151 Officer can demonstrate due diligence and show how the MTFS has evolved
- [x] **Item 25** — Audit trail log: Every model run appended to an immutable log showing date/time, user description, key outputs — exportable for audit committee scrutiny
- [x] **Item 26** — Draft s.114 notice trigger assessment: A dedicated check that evaluates whether current model outputs would require the S151 Officer to consider issuing a s.114 notice, with the specific statutory tests displayed clearly

---

### 🟡 ENHANCEMENT Priority
*Deeper modelling fidelity for complex authorities*

- [x] **Item 8** — Pay spine configurator: Enter the authority's pay structure (spine points, NJC/local pay, number of FTEs at each grade) to calculate pay award costs precisely rather than applying a single percentage to a pay lump sum
- [x] **Item 9** — Contract indexation tracker: Log individual major contracts (value, indexation clause: CPI, RPI, NMW, bespoke), and auto-calculate uplift cost each year with override capability
- [x] **Item 13** — Invest-to-save modelling: Input capital investment proposals with upfront cost, payback period, and projected revenue saving, showing the net position year by year and internal rate of return
- [x] **Item 14** — Income generation workbook: A dedicated sub-panel for commercial/income activity: traded services, property income, new fees and charges lines — each with volume and price assumptions separate from the base fees & charges growth rate
- [x] **Item 16** — Reserves adequacy methodology selector: Choose the reserves assessment approach: fixed minimum (£), percentage of net revenue budget, or CIPFA risk-based scoring model
- [x] **Item 20** — Treasury management indicators: Display CIPFA Prudential Code indicators: Authorised Limit, Operational Boundary, Net Financing Need — with user-inputted values and breach flagging
- [x] **Item 21** — Minimum Revenue Provision calculator: Select MRP policy (asset life, annuity, straight-line) and calculate the MRP charge for each year of the MTFS, feeding into the expenditure model automatically
- [x] **Item 27** — Named stress test library: Pre-built stress scenarios the S151 Officer can apply with one click — e.g. "Statutory Pay Settlement +2% above assumption", "ASC demand shock +15% in Year 1", "Grant reduction of £Xm from Year 2"
- [x] **Item 28** — Combined stress test (worst case): A single button that applies all adverse assumptions simultaneously to show the maximum credible downside position, required under CIPFA's financial resilience guidance

---

### 🔵 PHASE 2 Priority
*Advanced analytics requiring external data or simulation*

- [x] **Item 29** — Monte Carlo simulation: Apply probability distributions to key assumptions and run 10,000 simulations to show the probability distribution of outcomes — replacing point estimates with confidence intervals
- [x] **Item 30** — Peer benchmarking overlay: Input or fetch CIPFA benchmark data for the authority's statistical neighbour group, overlaying benchmarks on gap and reserves charts so the S151 Officer can contextualise their position against comparable authorities

---

## Progress Summary

| Priority | Total | Completed | Remaining |
|---|---|---|---|
| 🔴 Immediate | 9 | 9 | 0 |
| 🟠 High Value | 10 | 10 | 0 |
| 🟡 Enhancement | 9 | 9 | 0 |
| 🔵 Phase 2 | 2 | 2 | 0 |
| **Total** | **30** | **30** | **0** |

---

*Last updated: April 2026 · MTFS DSS v7.0*

---

## Additional Functionality Backlog (Accessibility + Member Communication)

### 🔴 Immediate
- [x] **A1** — Elected Member View mode with plain-English labels and reduced technical jargon
- [x] **A2** — Traffic-light storyboard by year with explicit reason text for each RAG outcome
- [x] **A3** — "If we do nothing" comparator showing gap without savings or planned reserves usage
- [x] **A4** — Interactive glossary with hover/focus definitions for key finance terminology
- [x] **A5** — Accessibility presets: large text, high contrast, dyslexia-friendly reading mode
- [x] **A6** — Side-by-side scenario explainer that decomposes why scenarios differ
- [x] **A31** — Snapshot persistence workflow: save a full model snapshot (baseline + assumptions + proposals + reserves + metadata), export/import snapshots as JSON, and reload later to continue editing

### 🟠 High Impact
- [x] **A7** — One-page member briefing export with headline risks, funding gap and asks
- [ ] **A8** — Ward-level impact narrative placeholders linked to service lines
- [x] **A9** — Decision packs that compare 3 recommended options with trade-offs
- [ ] **A10** — Automatic "key message" generator for Cabinet and Full Council slides
- [ ] **A11** — Service impact heatmap to connect savings options with resident-facing outcomes
- [ ] **A12** — Explain uncertainty ranges for major assumptions (best/base/worst narrative bands)
- [ ] **A13** — Budget strategy timeline with key statutory deadlines and decision points
- [ ] **A14** — Public-facing summary mode suitable for publication and consultation
- [ ] **A15** — Funding shock playbook templates (grant loss, demand shock, inflation shock)
- [ ] **A16** — Member Q&A mode with prepared answers sourced from current model outputs

### 🟡 Medium
- [ ] **A17** — Multilingual summary cards for key headlines
- [ ] **A18** — Audio narration of dashboard headlines for accessibility
- [ ] **A19** — Print-optimized layouts for committee papers
- [ ] **A20** — Readability scoring for generated narrative text
- [ ] **A21** — Meeting mode with large-screen simplified controls and guided flow
- [ ] **A22** — Scenario bookmarks for common committee questions
- [ ] **A23** — "What changed since last meeting" timeline with auto highlights
- [ ] **A24** — Context notes per assumption to capture rationale and caveats

### 🔵 Low
- [ ] **A25** — Theme presets for publication branding packs
- [ ] **A26** — Embedded training walkthrough for new members
- [ ] **A27** — Keyboard shortcuts palette for power users
- [ ] **A28** — Optional map overlays for service demand storytelling
- [ ] **A29** — Voice command support for navigation
- [ ] **A30** — Shareable read-only links with expiring access tokens

---

## Professionalisation Backlog (New Authority Readiness)

### Top Priorities Added
- [x] **P1** — Onboarding docs for new local authorities
- [x] **P2** — Quick start guide

### Top 10 Other High-Value Actions
- [ ] **P3** — Role-based access control (RBAC) for finance, analyst, and read-only users
- [ ] **P4** — SSO integration (Microsoft Entra ID/Azure AD or equivalent)
- [ ] **P5** — Full audit logging for assumption changes, scenario runs, and exports
- [ ] **P6** — Data validation and input guardrails on all financial assumptions
- [ ] **P7** — Automated test suite (unit, integration, and end-to-end smoke tests)
- [ ] **P8** — CI/CD pipeline with lint, test, build, and release checks
- [ ] **P9** — Environment-based configuration and secure secret handling
- [ ] **P10** — Performance optimisation for large scenario sets and slower devices
- [ ] **P11** — Accessibility pass to meet WCAG 2.2 AA baseline
- [ ] **P12** — Backup/recovery and data retention policy for snapshots and exports

### Additional Backlog Summary
| Category | Total | Completed | Remaining |
|---|---|---|---|
| 🔴 Immediate | 7 | 7 | 0 |
| 🟠 High Impact | 10 | 2 | 8 |
| 🟡 Medium | 8 | 0 | 8 |
| 🔵 Low | 6 | 0 | 6 |
| **Total** | **31** | **9** | **22** |
