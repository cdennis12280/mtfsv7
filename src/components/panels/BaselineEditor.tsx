import React, { useRef, useState } from 'react';
import {
  Upload, Plus, Trash2, Info, ChevronDown, ChevronRight,
  Database, AlertTriangle, CheckCircle, RefreshCw, Download,
} from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/SliderControl';
import { RichTooltip } from '../ui/RichTooltip';
import { parseBaselineCsv, parseBaselineSpreadsheet } from '../../engine/calculations';
import type { CustomServiceLine, InflationDriver } from '../../types/financial';

function fmtK(v: number) {
  return `£${v.toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`;
}

// ── Inline number edit cell ────────────────────────────────────────────────────
function NumCell({
  value,
  onChange,
  prefix = '£',
  suffix = 'k',
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1 bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-2 py-1">
      <span className="text-[10px] text-[#4a6080]">{prefix}</span>
      <input
        type="number"
        value={value}
        step={100}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 bg-transparent mono text-[11px] text-[#f0f4ff] font-semibold outline-none"
      />
      <span className="text-[10px] text-[#4a6080]">{suffix}</span>
    </div>
  );
}

// ── Section collapsible ────────────────────────────────────────────────────────
function EditorSection({
  title,
  accent = '#3b82f6',
  defaultOpen = true,
  tooltip,
  children,
}: {
  title: string;
  accent?: string;
  defaultOpen?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: accent }} />
          <span className="text-[12px] font-bold text-[#f0f4ff]">{title}</span>
          {tooltip && <RichTooltip content={tooltip} />}
        </div>
        {open ? <ChevronDown size={13} className="text-[#4a6080]" /> : <ChevronRight size={13} className="text-[#4a6080]" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </Card>
  );
}

// ── Baseline row ───────────────────────────────────────────────────────────────
function BaselineRow({
  label,
  fieldKey,
  tooltip,
}: {
  label: string;
  fieldKey: string;
  tooltip?: string;
}) {
  const { baseline, updateBaselineField } = useMTFSStore();
  const value = (baseline as unknown as Record<string, unknown>)[fieldKey] as number;
  return (
    <div className="flex items-center justify-between py-2 border-b border-[rgba(99,179,237,0.04)] last:border-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-[#8ca0c0]">{label}</span>
        {tooltip && (
          <div className="tooltip">
            <Info size={10} className="text-[#4a6080] cursor-help" />
            <div className="tooltip-content">{tooltip}</div>
          </div>
        )}
      </div>
      <NumCell
        value={value}
        onChange={(v) => updateBaselineField(fieldKey as keyof typeof baseline, v)}
      />
    </div>
  );
}

// ── Inflation driver label ────────────────────────────────────────────────────
const DRIVER_LABELS: Record<InflationDriver, string> = {
  cpi: 'Non-Pay CPI',
  pay: 'Pay Award',
  manual: 'Manual Rate',
  'asc-demand': 'ASC Demand',
  'csc-demand': 'CSC Demand',
};

const CATEGORY_COLORS: Record<string, string> = {
  pay: '#3b82f6',
  'non-pay': '#f59e0b',
  'demand-led': '#f97316',
  income: '#10b981',
  other: '#8b5cf6',
};

// ── Custom service line row ───────────────────────────────────────────────────
function CustomLineRow({ line }: { line: CustomServiceLine }) {
  const { updateCustomLine, removeCustomLine } = useMTFSStore();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[rgba(99,179,237,0.08)] rounded-lg mb-2 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[rgba(99,179,237,0.03)]"
        onClick={() => setExpanded(!expanded)}
        title="Click to expand or collapse detailed settings for this service line."
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: CATEGORY_COLORS[line.category] ?? '#8b5cf6' }}
          />
          <span className="text-[12px] font-semibold text-[#f0f4ff]">{line.name || 'Unnamed line'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(99,179,237,0.08)] text-[#8ca0c0] capitalize">
            {line.category}
          </span>
          <span className="text-[10px] text-[#4a6080] mono">{fmtK(line.baseValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${CATEGORY_COLORS[line.category] ?? '#8b5cf6'}18`, color: CATEGORY_COLORS[line.category] ?? '#8b5cf6' }}>
            {DRIVER_LABELS[line.inflationDriver]}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); removeCustomLine(line.id); }}
            title="Remove this custom service line from the baseline."
            className="p-1 rounded bg-[rgba(239,68,68,0.08)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.2)] transition-colors"
          >
            <Trash2 size={10} />
          </button>
          {expanded ? <ChevronDown size={12} className="text-[#4a6080]" /> : <ChevronRight size={12} className="text-[#4a6080]" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 bg-[rgba(99,179,237,0.02)]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Line Name</label>
              <input
                type="text"
                value={line.name}
                onChange={(e) => updateCustomLine(line.id, { name: e.target.value })}
                title="Service line label used in analysis and reporting."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none focus:border-[rgba(59,130,246,0.5)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Category</label>
              <select
                value={line.category}
                onChange={(e) => updateCustomLine(line.id, { category: e.target.value as CustomServiceLine['category'] })}
                title="Category determines how the line is interpreted in analysis."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none"
              >
                {['pay', 'non-pay', 'demand-led', 'income', 'other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Base Value (£000s)</label>
              <input
                type="number"
                value={line.baseValue}
                step={100}
                onChange={(e) => updateCustomLine(line.id, { baseValue: parseFloat(e.target.value) || 0 })}
                title="Base-year value in £000s before inflation and demand uplifts."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] mono text-[#f0f4ff] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Inflation Driver</label>
              <select
                value={line.inflationDriver}
                onChange={(e) => updateCustomLine(line.id, { inflationDriver: e.target.value as InflationDriver })}
                title="Select the inflation/demand driver applied annually to this line."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none"
              >
                {(Object.keys(DRIVER_LABELS) as InflationDriver[]).map((d) => (
                  <option key={d} value={d}>{DRIVER_LABELS[d]}</option>
                ))}
              </select>
            </div>
            {line.inflationDriver === 'manual' && (
              <div>
                <label className="text-[10px] text-[#4a6080] block mb-1">Manual Rate (%)</label>
                <input
                  type="number"
                  value={line.manualInflationRate}
                  step={0.1}
                  onChange={(e) => updateCustomLine(line.id, { manualInflationRate: parseFloat(e.target.value) || 0 })}
                  title="Manual annual uplift (%) when driver is set to Manual."
                  className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] mono text-[#f0f4ff] outline-none"
                />
              </div>
            )}
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Additional Demand Growth (%)</label>
              <input
                type="number"
                value={line.demandGrowthRate}
                step={0.1}
                onChange={(e) => updateCustomLine(line.id, { demandGrowthRate: parseFloat(e.target.value) || 0 })}
                title="Additional annual demand growth (%) added on top of inflation."
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] mono text-[#f0f4ff] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Toggle
              label="Recurring expenditure"
              value={line.isRecurring}
              tooltip="Recurring lines contribute to the structural deficit. One-off lines are excluded from the structural gap calculation."
              onChange={(v) => updateCustomLine(line.id, { isRecurring: v })}
            />
          </div>

          <div>
            <label className="text-[10px] text-[#4a6080] block mb-1">Notes</label>
            <input
              type="text"
              value={line.notes}
              placeholder="e.g. Highways maintenance contract — CPI-linked from 2024"
              onChange={(e) => updateCustomLine(line.id, { notes: e.target.value })}
              title="Capture local assumptions, caveats, or contract references."
              className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none placeholder:text-[#4a6080]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSV Import panel ───────────────────────────────────────────────────────────
function CsvImportPanel() {
  const { importBaselinePartial } = useMTFSStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({ type: 'idle', message: '' });
  const [isBuildingTemplate, setIsBuildingTemplate] = useState(false);

  const downloadImportTemplate = async () => {
    setIsBuildingTemplate(true);
    try {
      const { utils, write } = await import('xlsx');
      const headers = [
        'councilTax',
        'businessRates',
        'coreGrants',
        'feesAndCharges',
        'pay',
        'nonPay',
        'ascDemandLed',
        'cscDemandLed',
        'otherServiceExp',
        'generalFundReserves',
        'earmarkedReserves',
        'reservesMinimumThreshold',
      ];

      const blankSheet = utils.aoa_to_sheet([
        headers,
        Array(headers.length).fill(''),
      ]);

      const exampleSheet = utils.aoa_to_sheet([
        headers,
        [52500, 38100, 27450, 13300, 118750, 49700, 30250, 17650, 14100, 18200, 31900, 12000],
      ]);

      const longFormatExampleSheet = utils.aoa_to_sheet([
        ['lineName', '2026/27', '2027/28', '2028/29', '2029/30', '2030/31'],
        ['councilTax', 52500, 55120, 57870, 60760, 63800],
        ['businessRates', 38100, 38860, 39640, 40430, 41240],
        ['coreGrants', 27450, 27720, 27990, 28270, 28550],
        ['feesAndCharges', 13300, 13630, 13970, 14320, 14680],
        ['pay', 118750, 122910, 127210, 131660, 136270],
        ['nonPay', 49700, 51340, 53030, 54780, 56590],
        ['ascDemandLed', 30250, 31570, 32950, 34390, 35890],
        ['cscDemandLed', 17650, 18300, 18970, 19670, 20390],
        ['otherServiceExp', 14100, 14450, 14810, 15180, 15560],
        ['generalFundReserves', 18200, 17600, 16900, 16100, 15200],
        ['earmarkedReserves', 31900, 30400, 28900, 27400, 26000],
        ['reservesMinimumThreshold', 12000, 12150, 12300, 12450, 12600],
      ]);

      const instructionsSheet = utils.aoa_to_sheet([
        ['MTFS Baseline Import Template - Instructions'],
        [''],
        ['What this file contains'],
        ['1) Template_Blank: empty import template (preferred for data entry).'],
        ['2) Example_DummyData: fully populated dummy example using the same headers.'],
        ['3) Example_LongFormat: alternative row-based multi-year layout also supported by importer.'],
        [''],
        ['How to use'],
        ['1) Open Template_Blank and replace row 2 values with your authority baseline values.'],
        ['2) Keep header names unchanged. Values should be numeric and in £000s (thousands).'],
        ['3) Save as .xlsx/.xls or export as .csv.'],
        ['4) In MTFS app, go to Baseline Configuration > CSV Import and upload your file.'],
        [''],
        ['Accepted fields (header row format)'],
        [headers.join(', ')],
        [''],
        ['Notes'],
        ['- Import reads the first sheet for spreadsheet uploads.'],
        ['- If using long-format input, the first column should contain field names and year columns should contain numbers.'],
        ['- For long-format uploads, importer uses the first numeric year value per line as baseline.'],
      ]);

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, blankSheet, 'Template_Blank');
      utils.book_append_sheet(workbook, exampleSheet, 'Example_DummyData');
      utils.book_append_sheet(workbook, longFormatExampleSheet, 'Example_LongFormat');
      utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

      const array = write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([array], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mtfs_baseline_import_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);

      setStatus({
        type: 'success',
        message: 'Template downloaded: mtfs_baseline_import_template.xlsx',
      });
    } catch {
      setStatus({
        type: 'error',
        message: 'Could not generate template workbook. Please try again.',
      });
    } finally {
      setIsBuildingTemplate(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const result = await parseBaselineSpreadsheet(file);
      if (result.success && result.baseline) {
        importBaselinePartial(result.baseline);
        setStatus({ type: 'success', message: `Imported ${Object.keys(result.baseline).length} fields from ${file.name}` });
      } else {
        setStatus({ type: 'error', message: result.errors.join('; ') });
      }
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseBaselineCsv(text);
      if (result.success && result.baseline) {
        importBaselinePartial(result.baseline);
        setStatus({ type: 'success', message: `Imported ${Object.keys(result.baseline).length} fields from ${file.name}` });
      } else {
        setStatus({ type: 'error', message: result.errors.join('; ') });
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(59,130,246,0.04)] border border-[rgba(59,130,246,0.12)]">
        <Info size={13} className="text-[#3b82f6] mt-0.5 shrink-0" />
        <div className="text-[10px] text-[#8ca0c0] leading-relaxed">
          <p className="font-semibold text-[#f0f4ff] mb-1">CSV Format</p>
          <p>Upload CSV or Excel (.xlsx/.xls). Use headers + one data row, or line-name rows with year columns (£000s).</p>
          <p className="mt-1">Use the download button below to get a ready-to-fill template with instructions and dummy example data.</p>
          <p className="mt-1 mono text-[9px] bg-[#080c14] p-1.5 rounded mt-1">
            councilTax,businessRates,coreGrants,feesAndCharges,pay,nonPay,ascDemandLed,cscDemandLed,otherServiceExp,generalFundReserves,earmarkedReserves,reservesMinimumThreshold
          </p>
        </div>
      </div>

      <button
        onClick={downloadImportTemplate}
        disabled={isBuildingTemplate}
        title="Download a baseline import workbook with blank template, dummy example, and instructions."
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={12} />
        {isBuildingTemplate ? 'Preparing Template...' : 'Download Import Template (.xlsx)'}
      </button>

      <div
        className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-[rgba(99,179,237,0.15)] cursor-pointer hover:border-[rgba(59,130,246,0.4)] hover:bg-[rgba(59,130,246,0.03)] transition-all"
        onClick={() => fileRef.current?.click()}
        title="Upload CSV or Excel to populate baseline fields automatically."
      >
        <Upload size={20} className="text-[#4a6080]" />
        <p className="text-[11px] text-[#8ca0c0] font-medium">Click to upload baseline file</p>
        <p className="text-[9px] text-[#4a6080]">.csv, .xlsx, .xls</p>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" title="Select a baseline import file." />
      </div>

      {status.type !== 'idle' && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-[11px]"
          style={{
            background: status.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}
        >
          {status.type === 'success'
            ? <CheckCircle size={12} className="text-[#10b981] mt-0.5 shrink-0" />
            : <AlertTriangle size={12} className="text-[#ef4444] mt-0.5 shrink-0" />
          }
          <span style={{ color: status.type === 'success' ? '#10b981' : '#ef4444' }}>{status.message}</span>
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export function BaselineEditor() {
  const { baseline, addCustomLine, resetToDefaults } = useMTFSStore();
  const [activeSection, setActiveSection] = useState<'core' | 'custom' | 'csv'>('core');
  const [priorYearActuals, setPriorYearActuals] = useState({
    councilTax: baseline.councilTax,
    businessRates: baseline.businessRates,
    coreGrants: baseline.coreGrants,
    feesAndCharges: baseline.feesAndCharges,
    pay: baseline.pay,
    nonPay: baseline.nonPay,
    ascDemandLed: baseline.ascDemandLed,
    cscDemandLed: baseline.cscDemandLed,
    otherServiceExp: baseline.otherServiceExp,
  });

  const handleAddLine = () => {
    const newLine: CustomServiceLine = {
      id: `csl-${Date.now()}`,
      name: '',
      category: 'non-pay',
      baseValue: 1000,
      inflationDriver: 'cpi',
      manualInflationRate: 3.0,
      demandGrowthRate: 0,
      isRecurring: true,
      notes: '',
    };
    addCustomLine(newLine);
  };

  const tabs = [
    { id: 'core', label: 'Core Budget Lines' },
    { id: 'custom', label: `Custom Lines (${baseline.customServiceLines.length})` },
    { id: 'csv', label: 'CSV Import' },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.15)]">
        <Database size={16} className="text-[#3b82f6] mt-0.5 shrink-0" />
        <div>
          <p className="text-[12px] font-semibold text-[#f0f4ff]">Baseline Configuration</p>
          <p className="text-[10px] text-[#8ca0c0] mt-1 leading-relaxed">
            Enter your authority's actual budget figures here. All values are in £000s (thousands). Changes take effect immediately.
            Use <strong>Custom Lines</strong> to add disaggregated service lines beyond the core structure, each with its own inflation driver.
            Use <strong>CSV Import</strong> to bulk-populate from your existing MTFS spreadsheet.
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          title="Reset baseline and assumptions to default demo values."
          className="shrink-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[rgba(99,179,237,0.08)] text-[#4a6080] text-[10px] hover:text-[#8ca0c0] border border-[rgba(99,179,237,0.1)] transition-colors"
        >
          <RefreshCw size={10} />
          Reset
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 border-b border-[rgba(99,179,237,0.08)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSection(t.id)}
            title={`Open ${t.label}`}
            className={`px-4 py-2 text-[11px] font-medium border-b-2 transition-all ${
              activeSection === t.id
                ? 'text-[#3b82f6] border-[#3b82f6]'
                : 'text-[#4a6080] border-transparent hover:text-[#8ca0c0]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Core Budget Lines */}
      {activeSection === 'core' && (
        <div className="space-y-4">
          <EditorSection title="Funding Streams" accent="#3b82f6" tooltip="Core baseline income used as Year 0 in MTFS projections.">
            <BaselineRow label="Council Tax" fieldKey="councilTax" tooltip="Base year council tax income (£000s). This is the total yield before any annual increase is applied." />
            <BaselineRow label="Business Rates" fieldKey="businessRates" tooltip="Retained business rates income. Reflects the authority's share of local business rates after central government top-slicing." />
            <BaselineRow label="Core Grants" fieldKey="coreGrants" tooltip="Core central government grant funding including Revenue Support Grant and any other core allocations." />
            <BaselineRow label="Fees & Charges" fieldKey="feesAndCharges" tooltip="Income from fees, charges, and traded services. Does not include funding grants or council tax." />
          </EditorSection>

          <EditorSection title="Pay Expenditure" accent="#3b82f6" tooltip="Workforce pay base before annual pay awards are applied.">
            <BaselineRow label="Pay" fieldKey="pay" tooltip="Total pay expenditure including all NJC and locally negotiated pay. This is the largest expenditure driver and is separately modelled." />
          </EditorSection>

          <EditorSection title="Non-Pay Expenditure" accent="#f59e0b" tooltip="Non-pay cost base for inflation and contract pressure modelling.">
            <BaselineRow label="Non-Pay" fieldKey="nonPay" tooltip="Non-pay running costs: energy, supplies, services, IT, transport. Modelled with the non-pay inflation driver." />
            <BaselineRow label="Other Service Expenditure" fieldKey="otherServiceExp" tooltip="Residual service expenditure not captured in pay, non-pay, or demand-led categories." />
          </EditorSection>

          <EditorSection title="Demand-Led Services" accent="#f97316" tooltip="Demand-sensitive services where cost growth can outpace inflation.">
            <BaselineRow label="Adult Social Care" fieldKey="ascDemandLed" tooltip="Gross ASC expenditure in the base year. This is demand-led and grows using the ASC demand growth driver." />
            <BaselineRow label="Children's Social Care" fieldKey="cscDemandLed" tooltip="Gross CSC expenditure in the base year. Includes looked-after children, referrals, SEND placements." />
          </EditorSection>

          <EditorSection title="Reserves" accent="#8b5cf6" tooltip="Opening balances and minimum prudent threshold for financial resilience checks.">
            <BaselineRow label="General Fund Reserves" fieldKey="generalFundReserves" tooltip="Opening general fund reserve balance. These are unearmarked reserves available for the S151 Officer to deploy." />
            <BaselineRow label="Earmarked Reserves" fieldKey="earmarkedReserves" tooltip="Opening total of all earmarked reserves. Use the Named Reserves tab in the Reserves panel for granular breakdown." />
            <BaselineRow label="Minimum Threshold" fieldKey="reservesMinimumThreshold" tooltip="The minimum prudent level of general fund reserves assessed by the S151 Officer. Below this level the authority is considered financially at risk." />
          </EditorSection>

          <EditorSection title="Prior-Year Validation" accent="#10b981" tooltip="Compares current baseline against prior-year actuals and flags material variance.">
            <div className="text-[10px] text-[#4a6080] leading-relaxed mb-3">
              Enter prior-year actuals to validate baseline inputs. Variances above 15% are flagged for S151 review.
            </div>
            <div className="space-y-2">
              {[
                ['Council Tax', 'councilTax'],
                ['Business Rates', 'businessRates'],
                ['Core Grants', 'coreGrants'],
                ['Fees & Charges', 'feesAndCharges'],
                ['Pay', 'pay'],
                ['Non-Pay', 'nonPay'],
                ['ASC Demand-Led', 'ascDemandLed'],
                ['CSC Demand-Led', 'cscDemandLed'],
                ['Other Service Expenditure', 'otherServiceExp'],
              ].map(([label, key]) => {
                const typedKey = key as keyof typeof priorYearActuals;
                const actual = priorYearActuals[typedKey] || 0;
                const current = (baseline as unknown as Record<string, number>)[key];
                const variancePct = actual === 0 ? 0 : ((current - actual) / actual) * 100;
                const breached = Math.abs(variancePct) > 15;
                return (
                  <div key={key} className="grid grid-cols-[1.8fr_1fr_1fr_1fr] gap-2 items-center py-1.5 border-b border-[rgba(99,179,237,0.04)] last:border-0">
                    <span className="text-[11px] text-[#8ca0c0]">{label}</span>
                    <NumCell value={actual} onChange={(v) => setPriorYearActuals((s) => ({ ...s, [typedKey]: v }))} />
                    <span className="mono text-[11px] text-[#f0f4ff] text-right">{fmtK(current)}</span>
                    <span
                      className="mono text-[10px] font-semibold text-right"
                      style={{ color: breached ? '#ef4444' : Math.abs(variancePct) > 8 ? '#f59e0b' : '#10b981' }}
                    >
                      {variancePct >= 0 ? '+' : ''}{variancePct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </EditorSection>
        </div>
      )}

      {/* Custom Service Lines */}
      {activeSection === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-[#f0f4ff]">Custom Budget Lines</p>
              <p className="text-[10px] text-[#4a6080] mt-0.5">
                Add disaggregated service lines with individual inflation drivers. These are additive to the core budget structure.
              </p>
            </div>
            <button
              onClick={handleAddLine}
              title="Add a new disaggregated service line to improve modelling fidelity."
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] transition-colors"
            >
              <Plus size={12} />
              Add Service Line
            </button>
          </div>

          {/* Driver legend */}
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-[rgba(99,179,237,0.03)] border border-[rgba(99,179,237,0.08)]">
            <span className="text-[9px] text-[#4a6080] font-semibold uppercase tracking-widest self-center mr-1">Drivers:</span>
            {(Object.entries(DRIVER_LABELS) as [InflationDriver, string][]).map(([key, label]) => (
              <span key={key} className="text-[9px] px-2 py-0.5 rounded-full bg-[rgba(99,179,237,0.08)] text-[#8ca0c0]">
                {label}
              </span>
            ))}
          </div>

          {baseline.customServiceLines.length === 0 ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-[rgba(99,179,237,0.12)]">
              <Plus size={24} className="text-[#4a6080] mx-auto mb-2" />
              <p className="text-[12px] text-[#4a6080]">No custom lines added yet</p>
              <p className="text-[10px] text-[#4a6080] mt-1">
                Examples: Highways, Housing, Planning, Leisure, Waste, SEND transport
              </p>
            </div>
          ) : (
            <div>
              {baseline.customServiceLines.map((line) => (
                <CustomLineRow key={line.id} line={line} />
              ))}

              {/* Summary */}
              <div className="mt-3 p-3 rounded-lg bg-[rgba(99,179,237,0.04)] border border-[rgba(99,179,237,0.08)]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#4a6080]">Total custom line base value</span>
                  <span className="mono font-bold text-[#f0f4ff]">
                    {fmtK(baseline.customServiceLines.reduce((s, l) => s + l.baseValue, 0))}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] mt-1">
                  <span className="text-[#4a6080]">Recurring lines</span>
                  <span className="mono text-[#8ca0c0]">
                    {baseline.customServiceLines.filter((l) => l.isRecurring).length} of {baseline.customServiceLines.length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Import */}
      {activeSection === 'csv' && <CsvImportPanel />}
    </div>
  );
}
