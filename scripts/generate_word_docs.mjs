import fs from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const today = new Date().toISOString().slice(0, 10);

function h(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { before: 200, after: 120 } });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 120 },
  });
}

function bullet(text) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    text,
    numbering: { reference: "main-numbering", level },
    spacing: { after: 80 },
  });
}

function makeTable(headers, rows) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "D9D9D9" };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(
          (header) =>
            new TableCell({
              borders: { top: border, bottom: border, left: border, right: border },
              children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
            })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  borders: { top: border, bottom: border, left: border, right: border },
                  children: [new Paragraph(String(cell))],
                })
            ),
          })
      ),
    ],
  });
}

function cover(title, subtitle) {
  return [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 300 },
    }),
    new Paragraph({
      text: subtitle,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      text: `Issue Date: ${today}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: "MTFS Decision Support System (v7)",
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
  ];
}

async function generateOnboardingDoc() {
  const children = [
    ...cover(
      "Onboarding Handbook for New Local Authorities",
      "Comprehensive Implementation and Governance Guide"
    ),
    h("Document Control"),
    makeTable(
      ["Field", "Value"],
      [
        ["Document Owner", "Section 151 Officer / Corporate Finance Lead"],
        ["Audience", "Finance Team, Programme Team, Service Leads, Internal Audit"],
        ["Purpose", "Controlled onboarding and first-live use of MTFS DSS"],
        ["Review Frequency", "Quarterly or after major model/process change"],
      ]
    ),
    h("1. Onboarding Objectives"),
    p("This handbook defines the mandatory steps to onboard a new authority safely, consistently, and in a governance-ready manner."),
    bullet("Establish a controlled baseline dataset and assumptions set."),
    bullet("Define roles, approval points, and decision logs before first governance use."),
    bullet("Produce evidence-quality outputs suitable for Cabinet/Committee/Full Council cycles."),
    h("2. Roles and Responsibilities"),
    makeTable(
      ["Role", "Mandatory Responsibilities", "Approval Authority"],
      [
        ["Section 151 Officer", "Final sign-off of assumptions, reserves methodology, statutory assurance narrative", "Yes"],
        ["Finance Lead Analyst", "Model setup, data import, scenario preparation, reconciliation evidence", "No"],
        ["Service Finance Business Partners", "Validate service pressures and savings realism", "No"],
        ["Governance Secretariat", "Control versioning, issue logs, committee pack publication", "No"],
        ["Internal Audit Liaison", "Sampling of audit trail and model change evidence", "No"],
      ]
    ),
    h("3. Entry Criteria Before Configuration"),
    numbered("Confirm authority reporting period and governance timetable."),
    numbered("Confirm owner list and delegated authorities for model changes."),
    numbered("Gather source packs: approved budget, prior-year outturn, current MTFS, reserves policy, savings tracker."),
    numbered("Create controlled working folder structure for all imports/exports."),
    numbered("Define naming convention for snapshots and scenarios."),
    h("4. Technical Setup Checklist"),
    numbered("Install Node.js (v20+) and npm (v10+)."),
    numbered("Run `npm install` in project root."),
    numbered("Run `npm run dev` and verify application launches."),
    numbered("Run `npm run lint`, `npm run test`, and `npm run build`; archive outputs."),
    numbered("Record software version, date, and setup owner in implementation log."),
    h("5. Data Onboarding Procedure (Prescriptive)"),
    p("Perform the following in order. Do not skip sign-off points."),
    numbered("Load baseline data using the Baseline Configuration import template."),
    numbered("Reconcile imported totals to source budget lines (difference tolerance: zero unless documented)."),
    numbered("Populate authority metadata (name, S151 officer, reporting period)."),
    numbered("Configure reserves methodology and thresholds per approved local policy."),
    numbered("Input savings proposals with owner, phasing, and RAG confidence."),
    numbered("Configure demand and inflation assumptions with evidence references."),
    numbered("Save first controlled snapshot as `01_BASELINE_LOCKED_[date]`."),
    h("6. Validation and Quality Gates"),
    makeTable(
      ["Gate", "Test", "Pass Rule", "Evidence Required"],
      [
        ["G1", "Arithmetic integrity", "No calculation errors, all panels render", "Build/test/lint logs"],
        ["G2", "Data reconciliation", "Imported totals tie to source packs", "Reconciliation worksheet"],
        ["G3", "Assumption governance", "Assumptions approved by S151 delegate", "Signed assumption register"],
        ["G4", "Scenario comparability", "At least Base/Optimistic/Pessimistic scenarios prepared", "Scenario summary export"],
        ["G5", "Output suitability", "Committee/Premium brief readable and complete", "PDF outputs archived"],
      ]
    ),
    h("7. Mandatory Scenario Set"),
    bullet("Base Case: approved central assumptions."),
    bullet("Optimistic Case: controlled upside assumptions, still plausible."),
    bullet("Pessimistic Case: downside stress assumptions with explicit risk notes."),
    bullet("Combined Stress Case: concurrent adverse movements for resilience testing."),
    h("8. Governance Runbook"),
    numbered("Freeze assumptions cut-off date before committee cycle."),
    numbered("Generate Decision Pack PDF and governance exports from frozen snapshot only."),
    numbered("Review all red/amber items with responsible officer actions attached."),
    numbered("Publish pack with version identifier and issue log reference."),
    numbered("Post-committee: save approved snapshot and action-tracker scenario."),
    h("9. Audit and Records Management"),
    bullet("Store all imports, exports, and snapshots in controlled folders."),
    bullet("Retain signed assumption register and reconciliation workbook."),
    bullet("Maintain immutable change log for all material assumption updates."),
    bullet("Retain committee pack source snapshot ID in minutes record."),
    h("10. First 30 Days Plan"),
    makeTable(
      ["Week", "Mandatory Deliverables"],
      [
        ["Week 1", "Technical setup complete, baseline import template populated, G1 pass"],
        ["Week 2", "Reconciliation complete, assumptions drafted, G2/G3 pass"],
        ["Week 3", "Scenarios completed, stress tests run, G4 pass"],
        ["Week 4", "Governance outputs generated, dry-run review completed, G5 pass"],
      ]
    ),
    h("11. Common Failure Modes and Controls"),
    makeTable(
      ["Failure Mode", "Impact", "Control"],
      [
        ["Uncontrolled assumption edits", "Inconsistent committee outputs", "Snapshot freeze + delegated approval"],
        ["One-off savings treated as structural", "Misstated sustainability", "Mandatory recurring flag review"],
        ["Reserves threshold misconfigured", "False assurance signal", "Policy cross-check + second reviewer"],
        ["Unlabeled imports", "Audit gap", "Template-only import policy"],
      ]
    ),
    h("12. Final Sign-Off Statement Template"),
    p("Use this text in local records:"),
    p(
      "“The onboarding process for MTFS DSS has been completed in line with the authority onboarding handbook. Data reconciliation, assumptions approval, scenario preparation, and governance output checks have passed the defined quality gates. The model is approved for controlled governance use from [date].”"
    ),
  ];

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "main-numbering",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve("docs/Onboarding_Docs_New_Local_Authorities.docx");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buffer);
}

async function generateQuickStartDoc() {
  const children = [
    ...cover(
      "Quick Start Guide",
      "MTFS Decision Support System - Prescriptive User Procedure"
    ),
    h("Document Purpose"),
    p("This guide is a practical, step-by-step procedure to move from first launch to governance-ready output in one controlled session."),
    h("1. Pre-Run Checklist (Required)"),
    numbered("Confirm you are working from the latest approved snapshot or approved baseline file."),
    numbered("Confirm reporting period and authority branding values are current."),
    numbered("Confirm all users understand values are in £000 unless explicitly marked."),
    numbered("Confirm snapshot naming convention for this run."),
    h("2. Launch and Access"),
    numbered("Run `npm install` (first run only)."),
    numbered("Run `npm run dev`."),
    numbered("Open the local URL shown in terminal (typically `http://localhost:5173`)."),
    numbered("Set Strategic or Technical view as required for audience."),
    h("3. Configure Core Inputs (in Order)"),
    numbered("Baseline Configuration: import approved baseline workbook/template."),
    numbered("High Value Panel: validate ASC cohorts, capital financing, reserves method."),
    numbered("Savings Programme Builder: import savings file or complete proposals manually."),
    numbered("Enhancement Panel: confirm treasury and MRP inputs if applicable."),
    numbered("Scenario Planning: create and name Base/Optimistic/Pessimistic scenarios."),
    h("4. Minimum Quality Rules"),
    bullet("No blank critical fields: council tax, pay, non-pay, ASC, CSC, reserves threshold."),
    bullet("No unexplained negative values in baseline core lines."),
    bullet("Every savings proposal must have: owner, category, phasing, and RAG."),
    bullet("All governance exports must come from a saved snapshot."),
    h("5. 15-Minute Operational Flow"),
    makeTable(
      ["Minute", "Action", "Output"],
      [
        ["0-3", "Load baseline template and verify totals", "Baseline loaded + validated"],
        ["3-6", "Load savings template and review RAG profile", "Programme loaded + risk view"],
        ["6-9", "Set assumptions and generate 3 scenarios", "Comparable options"],
        ["9-12", "Review risks, reserves, and statutory indicators", "Assurance position drafted"],
        ["12-15", "Export decision/governance PDFs and save snapshot", "Pack ready for circulation"],
      ]
    ),
    h("6. Export Workflow (Mandatory Sequence)"),
    numbered("Save snapshot (`RUN_[date]_[stage]`)."),
    numbered("Export Decision Pack PDF."),
    numbered("Export Committee Report PDF."),
    numbered("Export One-Page Member Brief PDF."),
    numbered("Export Premium Brief PDF."),
    numbered("Archive exports alongside snapshot ID and timestamp."),
    h("7. Prescriptive Review Checklist Before Issuing Pack"),
    numbered("Check 5-year gap, structural gap, and reserves exhaustion narrative are aligned across all exports."),
    numbered("Check top risk factors match the action narrative and owners."),
    numbered("Check assumptions summary matches approved register."),
    numbered("Check authority name, S151 details, and reporting period are correct."),
    numbered("Check file names include date and authority identifier."),
    h("8. Troubleshooting"),
    makeTable(
      ["Issue", "Likely Cause", "Immediate Fix"],
      [
        ["Import rejected", "Template headers changed", "Re-download template and copy values only"],
        ["Unexpected output shifts", "Loaded wrong snapshot", "Reload approved snapshot and re-run exports"],
        ["High risk score spike", "Assumptions/stress changes", "Compare scenario deltas before issuing"],
        ["Lint/test failure", "Code changes not validated", "Run lint/test/build and fix before governance use"],
      ]
    ),
    h("9. Definition of Done"),
    bullet("All mandatory quality checks passed."),
    bullet("Snapshots saved with controlled naming."),
    bullet("All required PDF outputs generated and archived."),
    bullet("S151 review completed and recorded."),
    h("10. Quick Reference Commands"),
    makeTable(
      ["Command", "Purpose"],
      [
        ["npm run dev", "Run local application"],
        ["npm run lint", "Code quality checks"],
        ["npm run test", "Automated test suite"],
        ["npm run build", "Compile production build"],
      ]
    ),
  ];

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "main-numbering",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve("docs/Quick_Start_Guide_MTFS_DSS.docx");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buffer);
}

await generateOnboardingDoc();
await generateQuickStartDoc();
