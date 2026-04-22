import React from 'react';
import { Plus, Trash2, AlertTriangle, Zap, Upload, Download, CheckCircle2 } from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { RichTooltip } from '../ui/RichTooltip';
import type {
  ContractIndexationClause,
  MrpPolicy,
  PaySpineRow,
  ContractIndexationEntry,
  InvestToSaveProposal,
  IncomeGenerationLine,
  ReservesAdequacyMethod,
} from '../../types/financial';

function fmtK(v: number) {
  return `£${Math.round(v).toLocaleString('en-GB')}k`;
}

type ImportStatus = { type: 'idle' | 'success' | 'error'; message: string };

const IDLE_IMPORT_STATUS: ImportStatus = { type: 'idle', message: '' };

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const parsed = Number(String(value ?? '').replace(/[£,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampYear(value: unknown): 1 | 2 | 3 | 4 | 5 {
  const n = Number(normalize(value).replace(/[^\d]/g, ''));
  const clamped = Math.min(5, Math.max(1, Number.isFinite(n) && n > 0 ? Math.round(n) : 1));
  return clamped as 1 | 2 | 3 | 4 | 5;
}

function mapClause(value: unknown): ContractIndexationClause {
  const n = normalize(value);
  if (n === 'rpi') return 'rpi';
  if (n === 'nmw') return 'nmw';
  if (n === 'bespoke') return 'bespoke';
  return 'cpi';
}

async function readRowsFromImportFile(file: File): Promise<(string | number)[][]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'csv') {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const delimiter = lines[0]?.includes('\t') ? '\t' : ',';
    return lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
  }
  const { read, utils } = await import('xlsx');
  const data = await file.arrayBuffer();
  const workbook = read(data, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error('Import file contains no sheets');
  return utils.sheet_to_json<(string | number)[]>(workbook.Sheets[firstSheet], { header: 1 });
}

function renderImportStatus(status: ImportStatus) {
  if (status.type === 'idle') return null;
  return (
    <div
      className="flex items-start gap-2 p-2.5 rounded-lg text-[11px]"
      style={{
        background: status.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${status.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}
    >
      {status.type === 'success'
        ? <CheckCircle2 size={12} className="text-[#10b981] mt-0.5 shrink-0" />
        : <AlertTriangle size={12} className="text-[#ef4444] mt-0.5 shrink-0" />
      }
      <span style={{ color: status.type === 'success' ? '#10b981' : '#ef4444' }}>{status.message}</span>
    </div>
  );
}

export function EnhancementPanel() {
  const {
    baseline,
    result,
    setPaySpineEnabled,
    addPaySpineRow,
    updatePaySpineRow,
    removePaySpineRow,
    setContractTrackerEnabled,
    addContractEntry,
    updateContractEntry,
    removeContractEntry,
    setInvestToSaveEnabled,
    addInvestToSaveProposal,
    updateInvestToSaveProposal,
    removeInvestToSaveProposal,
    setIncomeWorkbookEnabled,
    addIncomeLine,
    updateIncomeLine,
    removeIncomeLine,
    updateReservesAdequacyMethodology,
    updateTreasuryIndicators,
    updateMrpCalculator,
    applyNamedStressTest,
  } = useMTFSStore();
  const [payImportStatus, setPayImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [contractImportStatus, setContractImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [i2sImportStatus, setI2sImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [incomeImportStatus, setIncomeImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [isPayTemplateLoading, setIsPayTemplateLoading] = React.useState(false);
  const [isContractTemplateLoading, setIsContractTemplateLoading] = React.useState(false);
  const [isI2sTemplateLoading, setIsI2sTemplateLoading] = React.useState(false);
  const [isIncomeTemplateLoading, setIsIncomeTemplateLoading] = React.useState(false);

  const parseRows = <T,>(rows: (string | number)[][], mapper: (row: Record<string, unknown>, index: number) => T | null): T[] => {
    if (rows.length < 2) return [];
    const headers = rows[0].map((h) => normalize(h));
    const parsed: T[] = [];
    for (let i = 1; i < rows.length; i += 1) {
      const values = rows[i];
      if (!values || values.every((v) => String(v ?? '').trim() === '')) continue;
      const row: Record<string, unknown> = {};
      headers.forEach((header, colIdx) => {
        row[header] = values[colIdx];
      });
      const mapped = mapper(row, i);
      if (mapped) parsed.push(mapped);
    }
    return parsed;
  };

  const downloadTemplateWorkbook = async (
    filename: string,
    sheets: Array<{ name: string; rows: (string | number)[][] }>,
    onSuccess: (message: string) => void,
    onError: (message: string) => void
  ) => {
    try {
      const { utils, write } = await import('xlsx');
      const workbook = utils.book_new();
      sheets.forEach((sheet) => {
        utils.book_append_sheet(workbook, utils.aoa_to_sheet(sheet.rows), sheet.name);
      });
      const bytes = write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onSuccess(`Template downloaded: ${filename}`);
    } catch {
      onError('Could not generate template workbook. Please try again.');
    }
  };

  const addPayRow = () => {
    const row: PaySpineRow = {
      id: `ps-${Date.now()}`,
      grade: 'NJC SCP',
      fte: 10,
      spinePointCost: 32_000,
    };
    addPaySpineRow(row);
  };

  const addContract = () => {
    const c: ContractIndexationEntry = {
      id: `ct-${Date.now()}`,
      name: 'Major contract',
      value: 1_000,
      clause: 'cpi',
      bespokeRate: 0,
    };
    addContractEntry(c);
  };

  const addI2S = () => {
    const p: InvestToSaveProposal = {
      id: `i2s-${Date.now()}`,
      name: 'Digital automation',
      upfrontCost: 1_000,
      annualSaving: 350,
      paybackYears: 3,
      deliveryYear: 1,
    };
    addInvestToSaveProposal(p);
  };

  const addIncome = () => {
    const line: IncomeGenerationLine = {
      id: `inc-${Date.now()}`,
      name: 'Traded service',
      baseVolume: 2_000,
      basePrice: 120,
      volumeGrowth: 1.5,
      priceGrowth: 2.5,
    };
    addIncomeLine(line);
  };

  const handlePayImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readRowsFromImportFile(file);
      const imported = parseRows<PaySpineRow>(rows, (row, index) => {
        const grade = String(row.grade ?? row.name ?? '').trim();
        const fte = toNumber(row.fte);
        const spinePointCost = toNumber(row.spinepointcost ?? row.costperfte ?? row.spinecost ?? row.cost);
        if (!grade && fte === 0 && spinePointCost === 0) return null;
        return {
          id: `ps-import-${Date.now()}-${index}`,
          grade: grade || `Imported Grade ${index}`,
          fte,
          spinePointCost,
        };
      });
      if (imported.length === 0) throw new Error('No valid pay spine rows found.');
      imported.forEach((row) => addPaySpineRow(row));
      setPayImportStatus({ type: 'success', message: `Imported ${imported.length} pay spine row${imported.length === 1 ? '' : 's'} from ${file.name}` });
    } catch (error) {
      setPayImportStatus({ type: 'error', message: error instanceof Error ? error.message : 'Could not import pay spine file' });
    } finally {
      e.target.value = '';
    }
  };

  const handleContractImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readRowsFromImportFile(file);
      const imported = parseRows<ContractIndexationEntry>(rows, (row, index) => {
        const name = String(row.name ?? row.contract ?? '').trim();
        const value = toNumber(row.value ?? row.valuek);
        const clause = mapClause(row.clause);
        const bespokeRate = toNumber(row.bespokerate ?? row.bespoke);
        if (!name && value === 0 && bespokeRate === 0) return null;
        return {
          id: `ct-import-${Date.now()}-${index}`,
          name: name || `Imported Contract ${index}`,
          value,
          clause,
          bespokeRate,
        };
      });
      if (imported.length === 0) throw new Error('No valid contract rows found.');
      imported.forEach((row) => addContractEntry(row));
      setContractImportStatus({ type: 'success', message: `Imported ${imported.length} contract row${imported.length === 1 ? '' : 's'} from ${file.name}` });
    } catch (error) {
      setContractImportStatus({ type: 'error', message: error instanceof Error ? error.message : 'Could not import contract tracker file' });
    } finally {
      e.target.value = '';
    }
  };

  const handleI2sImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readRowsFromImportFile(file);
      const imported = parseRows<InvestToSaveProposal>(rows, (row, index) => {
        const name = String(row.name ?? row.proposal ?? '').trim();
        const upfrontCost = toNumber(row.upfrontcost ?? row.upfront);
        const annualSaving = toNumber(row.annualsaving ?? row.saving);
        const paybackYears = Math.max(1, Math.round(toNumber(row.paybackyears ?? row.payback, 1)));
        const deliveryYear = clampYear(row.deliveryyear ?? row.startyear ?? row.startyr);
        if (!name && upfrontCost === 0 && annualSaving === 0) return null;
        return {
          id: `i2s-import-${Date.now()}-${index}`,
          name: name || `Imported Proposal ${index}`,
          upfrontCost,
          annualSaving,
          paybackYears,
          deliveryYear,
        };
      });
      if (imported.length === 0) throw new Error('No valid invest-to-save rows found.');
      imported.forEach((row) => addInvestToSaveProposal(row));
      setI2sImportStatus({ type: 'success', message: `Imported ${imported.length} proposal row${imported.length === 1 ? '' : 's'} from ${file.name}` });
    } catch (error) {
      setI2sImportStatus({ type: 'error', message: error instanceof Error ? error.message : 'Could not import invest-to-save file' });
    } finally {
      e.target.value = '';
    }
  };

  const handleIncomeImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readRowsFromImportFile(file);
      const imported = parseRows<IncomeGenerationLine>(rows, (row, index) => {
        const name = String(row.name ?? row.line ?? '').trim();
        const baseVolume = toNumber(row.basevolume ?? row.volume);
        const basePrice = toNumber(row.baseprice ?? row.price);
        const volumeGrowth = toNumber(row.volumegrowth ?? row.volgrowth);
        const priceGrowth = toNumber(row.pricegrowth ?? row.prcgrowth);
        if (!name && baseVolume === 0 && basePrice === 0) return null;
        return {
          id: `inc-import-${Date.now()}-${index}`,
          name: name || `Imported Income Line ${index}`,
          baseVolume,
          basePrice,
          volumeGrowth,
          priceGrowth,
        };
      });
      if (imported.length === 0) throw new Error('No valid income workbook rows found.');
      imported.forEach((row) => addIncomeLine(row));
      setIncomeImportStatus({ type: 'success', message: `Imported ${imported.length} income row${imported.length === 1 ? '' : 's'} from ${file.name}` });
    } catch (error) {
      setIncomeImportStatus({ type: 'error', message: error instanceof Error ? error.message : 'Could not import income workbook file' });
    } finally {
      e.target.value = '';
    }
  };

  const handlePayTemplateDownload = async () => {
    setIsPayTemplateLoading(true);
    await downloadTemplateWorkbook(
      'mtfs_pay_spine_template.xlsx',
      [
        { name: 'Template_Blank', rows: [['grade', 'fte', 'spinePointCost'], ['', '', '']] },
        {
          name: 'Example_Dummy_Data',
          rows: [
            ['grade', 'fte', 'spinePointCost'],
            ['NJC SCP 23', 18, 32100],
            ['NJC SCP 30', 12, 38900],
            ['NJC SCP 38', 7, 47200],
          ],
        },
        {
          name: 'Instructions',
          rows: [
            ['Pay Spine Configurator Template - Instructions'],
            ['1) Complete Template_Blank with one row per grade'],
            ['2) Keep headers unchanged'],
            ['3) Values are: FTE headcount and annual cost per FTE in £'],
            ['4) Save as .xlsx/.xls or export as .csv'],
            ['5) Use Import CSV/XLSX in Pay Spine Configurator'],
            ['Note: import appends rows to existing entries.'],
          ],
        },
      ],
      (message) => setPayImportStatus({ type: 'success', message }),
      (message) => setPayImportStatus({ type: 'error', message })
    );
    setIsPayTemplateLoading(false);
  };

  const handleContractTemplateDownload = async () => {
    setIsContractTemplateLoading(true);
    await downloadTemplateWorkbook(
      'mtfs_contract_tracker_template.xlsx',
      [
        { name: 'Template_Blank', rows: [['name', 'value', 'clause', 'bespokeRate'], ['', '', '', '']] },
        {
          name: 'Example_Dummy_Data',
          rows: [
            ['name', 'value', 'clause', 'bespokeRate'],
            ['Waste Collection Contract', 2800, 'cpi', 0],
            ['Facilities Management', 1450, 'rpi', 0],
            ['Specialist Placement Framework', 950, 'bespoke', 4.25],
          ],
        },
        {
          name: 'Instructions',
          rows: [
            ['Contract Indexation Tracker Template - Instructions'],
            ['1) Complete Template_Blank with one row per contract'],
            ['2) clause must be one of: cpi, rpi, nmw, bespoke'],
            ['3) bespokeRate is used only when clause is bespoke'],
            ['4) value is annual contract value in £000'],
            ['5) Save and import via Import CSV/XLSX'],
            ['Note: import appends rows to existing entries.'],
          ],
        },
      ],
      (message) => setContractImportStatus({ type: 'success', message }),
      (message) => setContractImportStatus({ type: 'error', message })
    );
    setIsContractTemplateLoading(false);
  };

  const handleI2sTemplateDownload = async () => {
    setIsI2sTemplateLoading(true);
    await downloadTemplateWorkbook(
      'mtfs_invest_to_save_template.xlsx',
      [
        { name: 'Template_Blank', rows: [['name', 'upfrontCost', 'annualSaving', 'paybackYears', 'deliveryYear'], ['', '', '', '', '']] },
        {
          name: 'Example_Dummy_Data',
          rows: [
            ['name', 'upfrontCost', 'annualSaving', 'paybackYears', 'deliveryYear'],
            ['Digital Case Management', 1200, 420, 3, 1],
            ['Fleet Optimisation', 650, 210, 3, 2],
            ['Back Office Automation', 900, 360, 2, 1],
          ],
        },
        {
          name: 'Instructions',
          rows: [
            ['Invest-to-Save Modelling Template - Instructions'],
            ['1) One proposal per row in Template_Blank'],
            ['2) upfrontCost and annualSaving are in £000'],
            ['3) paybackYears must be at least 1'],
            ['4) deliveryYear must be between 1 and 5'],
            ['5) Save and import via Import CSV/XLSX'],
            ['Note: import appends rows to existing entries.'],
          ],
        },
      ],
      (message) => setI2sImportStatus({ type: 'success', message }),
      (message) => setI2sImportStatus({ type: 'error', message })
    );
    setIsI2sTemplateLoading(false);
  };

  const handleIncomeTemplateDownload = async () => {
    setIsIncomeTemplateLoading(true);
    await downloadTemplateWorkbook(
      'mtfs_income_workbook_template.xlsx',
      [
        { name: 'Template_Blank', rows: [['name', 'baseVolume', 'basePrice', 'volumeGrowth', 'priceGrowth'], ['', '', '', '', '']] },
        {
          name: 'Example_Dummy_Data',
          rows: [
            ['name', 'baseVolume', 'basePrice', 'volumeGrowth', 'priceGrowth'],
            ['Trade Waste', 3200, 145, 2.1, 3.5],
            ['Planning Pre-Apps', 1100, 280, 1.2, 2.8],
            ['Parking Permits', 5200, 96, 1.5, 2.2],
          ],
        },
        {
          name: 'Instructions',
          rows: [
            ['Income Generation Workbook Template - Instructions'],
            ['1) Enter one income stream per row'],
            ['2) baseVolume and basePrice build baseline income'],
            ['3) volumeGrowth and priceGrowth are annual percentages'],
            ['4) Save and import via Import CSV/XLSX'],
            ['Note: import appends rows to existing entries.'],
          ],
        },
      ],
      (message) => setIncomeImportStatus({ type: 'success', message }),
      (message) => setIncomeImportStatus({ type: 'error', message })
    );
    setIsIncomeTemplateLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Pay Spine Configurator</CardTitle><RichTooltip content="Models pay pressures from grade mix and FTE distribution instead of a single uplift." /></div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#10b981] text-[11px] font-semibold cursor-pointer hover:bg-[rgba(16,185,129,0.2)] transition-colors" title="Import pay spine rows from CSV or Excel.">
                <Upload size={11} />
                Import CSV/XLSX
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handlePayImport} />
              </label>
              <button onClick={() => void handlePayTemplateDownload()} disabled={isPayTemplateLoading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Download pay spine template with dummy example and instructions.">
                <Download size={11} />
                {isPayTemplateLoading ? 'Preparing...' : 'Download Template'}
              </button>
              <button className="text-[11px] text-[#3b82f6] flex items-center gap-1" onClick={addPayRow} title="Add a new pay spine row."><Plus size={12} />Add Row</button>
            </div>
          </CardHeader>
          <label className="text-[11px] text-[#8ca0c0] flex items-center gap-2 mb-2">
            <input type="checkbox" checked={baseline.paySpineConfig.enabled} onChange={(e) => setPaySpineEnabled(e.target.checked)} />
            Enable pay spine model
          </label>
          <div className="space-y-2">
            {renderImportStatus(payImportStatus)}
            {baseline.paySpineConfig.rows.length > 0 && (
              <div className="grid grid-cols-[1fr_90px_130px_auto] gap-2 px-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Grade</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">FTE</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Cost/FTE (£)</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
              </div>
            )}
            {baseline.paySpineConfig.rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_90px_130px_auto] gap-2">
                <input className="input" value={row.grade} onChange={(e) => updatePaySpineRow(row.id, { grade: e.target.value })} />
                <input className="input" type="number" value={row.fte} onChange={(e) => updatePaySpineRow(row.id, { fte: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={row.spinePointCost} onChange={(e) => updatePaySpineRow(row.id, { spinePointCost: Number(e.target.value) || 0 })} />
                <button className="text-[#ef4444]" onClick={() => removePaySpineRow(row.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Contract Indexation Tracker</CardTitle><RichTooltip content="Captures contract-specific inflation clauses and uplift exposure." /></div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#10b981] text-[11px] font-semibold cursor-pointer hover:bg-[rgba(16,185,129,0.2)] transition-colors" title="Import contracts from CSV or Excel.">
                <Upload size={11} />
                Import CSV/XLSX
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleContractImport} />
              </label>
              <button onClick={() => void handleContractTemplateDownload()} disabled={isContractTemplateLoading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Download contract tracker template with dummy example and instructions.">
                <Download size={11} />
                {isContractTemplateLoading ? 'Preparing...' : 'Download Template'}
              </button>
              <button className="text-[11px] text-[#3b82f6] flex items-center gap-1" onClick={addContract} title="Add a major indexed contract line."><Plus size={12} />Add Contract</button>
            </div>
          </CardHeader>
          <label className="text-[11px] text-[#8ca0c0] flex items-center gap-2 mb-2">
            <input type="checkbox" checked={baseline.contractIndexationTracker.enabled} onChange={(e) => setContractTrackerEnabled(e.target.checked)} />
            Enable contract tracker
          </label>
          <div className="space-y-2">
            {renderImportStatus(contractImportStatus)}
            {baseline.contractIndexationTracker.contracts.length > 0 && (
              <div className="grid grid-cols-[1fr_90px_110px_80px_auto] gap-2 px-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Contract</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Value (£k)</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Clause</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Bespoke %</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
              </div>
            )}
            {baseline.contractIndexationTracker.contracts.map((c) => (
              <div key={c.id} className="grid grid-cols-[1fr_90px_110px_80px_auto] gap-2">
                <input className="input" value={c.name} onChange={(e) => updateContractEntry(c.id, { name: e.target.value })} />
                <input className="input" type="number" value={c.value} onChange={(e) => updateContractEntry(c.id, { value: Number(e.target.value) || 0 })} />
                <select className="input" value={c.clause} onChange={(e) => updateContractEntry(c.id, { clause: e.target.value as ContractIndexationClause })}>
                  <option value="cpi">CPI</option>
                  <option value="rpi">RPI</option>
                  <option value="nmw">NMW</option>
                  <option value="bespoke">Bespoke</option>
                </select>
                <input className="input" type="number" value={c.bespokeRate} onChange={(e) => updateContractEntry(c.id, { bespokeRate: Number(e.target.value) || 0 })} />
                <button className="text-[#ef4444]" onClick={() => removeContractEntry(c.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Invest-to-Save Modelling</CardTitle><RichTooltip content="Assesses upfront cost, payback and recurring savings trajectory." /></div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#10b981] text-[11px] font-semibold cursor-pointer hover:bg-[rgba(16,185,129,0.2)] transition-colors" title="Import invest-to-save proposals from CSV or Excel.">
                <Upload size={11} />
                Import CSV/XLSX
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleI2sImport} />
              </label>
              <button onClick={() => void handleI2sTemplateDownload()} disabled={isI2sTemplateLoading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Download invest-to-save template with dummy example and instructions.">
                <Download size={11} />
                {isI2sTemplateLoading ? 'Preparing...' : 'Download Template'}
              </button>
              <button className="text-[11px] text-[#3b82f6] flex items-center gap-1" onClick={addI2S} title="Add an invest-to-save proposal."><Plus size={12} />Add Proposal</button>
            </div>
          </CardHeader>
          <label className="text-[11px] text-[#8ca0c0] flex items-center gap-2 mb-2">
            <input type="checkbox" checked={baseline.investToSave.enabled} onChange={(e) => setInvestToSaveEnabled(e.target.checked)} />
            Enable invest-to-save
          </label>
          <div className="space-y-2">
            {renderImportStatus(i2sImportStatus)}
            {baseline.investToSave.proposals.length > 0 && (
              <div className="grid grid-cols-[1fr_90px_90px_70px_70px_auto] gap-2 px-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Proposal</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Upfront (£k)</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Saving (£k)</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Payback</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Start Yr</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
              </div>
            )}
            {baseline.investToSave.proposals.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_90px_90px_70px_70px_auto] gap-2">
                <input className="input" value={p.name} onChange={(e) => updateInvestToSaveProposal(p.id, { name: e.target.value })} />
                <input className="input" type="number" value={p.upfrontCost} onChange={(e) => updateInvestToSaveProposal(p.id, { upfrontCost: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={p.annualSaving} onChange={(e) => updateInvestToSaveProposal(p.id, { annualSaving: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={p.paybackYears} onChange={(e) => updateInvestToSaveProposal(p.id, { paybackYears: Number(e.target.value) || 1 })} />
                <select className="input" value={p.deliveryYear} onChange={(e) => updateInvestToSaveProposal(p.id, { deliveryYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>
                  {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Y{y}</option>)}
                </select>
                <button className="text-[#ef4444]" onClick={() => removeInvestToSaveProposal(p.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Income Generation Workbook</CardTitle><RichTooltip content="Separates volume and price growth for income streams." /></div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#10b981] text-[11px] font-semibold cursor-pointer hover:bg-[rgba(16,185,129,0.2)] transition-colors" title="Import income workbook lines from CSV or Excel.">
                <Upload size={11} />
                Import CSV/XLSX
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleIncomeImport} />
              </label>
              <button onClick={() => void handleIncomeTemplateDownload()} disabled={isIncomeTemplateLoading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Download income workbook template with dummy example and instructions.">
                <Download size={11} />
                {isIncomeTemplateLoading ? 'Preparing...' : 'Download Template'}
              </button>
              <button className="text-[11px] text-[#3b82f6] flex items-center gap-1" onClick={addIncome} title="Add an income line."><Plus size={12} />Add Line</button>
            </div>
          </CardHeader>
          <label className="text-[11px] text-[#8ca0c0] flex items-center gap-2 mb-2">
            <input type="checkbox" checked={baseline.incomeGenerationWorkbook.enabled} onChange={(e) => setIncomeWorkbookEnabled(e.target.checked)} />
            Enable income workbook
          </label>
          <div className="space-y-2">
            {renderImportStatus(incomeImportStatus)}
            {baseline.incomeGenerationWorkbook.lines.length > 0 && (
              <div className="grid grid-cols-[1fr_80px_80px_80px_80px_auto] gap-2 px-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Line</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Volume</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Price</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Vol %</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Price %</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
              </div>
            )}
            {baseline.incomeGenerationWorkbook.lines.map((line) => (
              <div key={line.id} className="grid grid-cols-[1fr_80px_80px_80px_80px_auto] gap-2">
                <input className="input" value={line.name} onChange={(e) => updateIncomeLine(line.id, { name: e.target.value })} />
                <input className="input" type="number" value={line.baseVolume} onChange={(e) => updateIncomeLine(line.id, { baseVolume: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={line.basePrice} onChange={(e) => updateIncomeLine(line.id, { basePrice: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={line.volumeGrowth} onChange={(e) => updateIncomeLine(line.id, { volumeGrowth: Number(e.target.value) || 0 })} />
                <input className="input" type="number" value={line.priceGrowth} onChange={(e) => updateIncomeLine(line.id, { priceGrowth: Number(e.target.value) || 0 })} />
                <button className="text-[#ef4444]" onClick={() => removeIncomeLine(line.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Reserves Methodology</CardTitle><RichTooltip content="Selects how minimum reserves threshold is set for resilience checks." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <div>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">Method</p>
              <select className="input" value={baseline.reservesAdequacyMethodology.method} onChange={(e) => updateReservesAdequacyMethodology({ method: e.target.value as ReservesAdequacyMethod })}>
                <option value="fixed">Fixed minimum (£)</option>
                <option value="pct_of_net_budget">% of net budget</option>
                <option value="risk_based">Risk-based model</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">Fixed Minimum Threshold (£k)</p>
              <input className="input" type="number" value={baseline.reservesAdequacyMethodology.fixedMinimum} onChange={(e) => updateReservesAdequacyMethodology({ fixedMinimum: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">Threshold as % of Net Budget</p>
              <input className="input" type="number" value={baseline.reservesAdequacyMethodology.pctOfNetBudget} onChange={(e) => updateReservesAdequacyMethodology({ pctOfNetBudget: Number(e.target.value) || 0 })} />
            </div>
            <p className="text-[10px] text-[#8ca0c0]">Effective threshold: <span className="mono text-[#f0f4ff]">{fmtK(result.effectiveMinimumReservesThreshold)}</span></p>
          </div>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Treasury Indicators</CardTitle><RichTooltip content="Tracks prudential limits and flags potential treasury breaches." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={baseline.treasuryIndicators.enabled} onChange={(e) => updateTreasuryIndicators({ enabled: e.target.checked })} />Enable indicators</label>
            <div className="grid grid-cols-[1fr_130px] gap-2 px-1">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Indicator</p>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Value (£k)</p>
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Authorised Limit</p>
              <input className="input text-right" type="number" value={baseline.treasuryIndicators.authorisedLimit} onChange={(e) => updateTreasuryIndicators({ authorisedLimit: Number(e.target.value) || 0 })} aria-label="Authorised limit in thousands of pounds" />
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Operational Boundary</p>
              <input className="input text-right" type="number" value={baseline.treasuryIndicators.operationalBoundary} onChange={(e) => updateTreasuryIndicators({ operationalBoundary: Number(e.target.value) || 0 })} aria-label="Operational boundary in thousands of pounds" />
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Net Financing Need</p>
              <input className="input text-right" type="number" value={baseline.treasuryIndicators.netFinancingNeed} onChange={(e) => updateTreasuryIndicators({ netFinancingNeed: Number(e.target.value) || 0 })} aria-label="Net financing need in thousands of pounds" />
            </div>
            {result.treasuryBreaches.length > 0 && (
              <div className="text-[10px] text-[#ef4444] space-y-1">
                {result.treasuryBreaches.map((b) => <p key={b} className="flex items-center gap-1"><AlertTriangle size={10} />{b}</p>)}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>MRP Calculator</CardTitle><RichTooltip content="Applies selected MRP policy to calculate annual revenue charges." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={baseline.mrpCalculator.enabled} onChange={(e) => updateMrpCalculator({ enabled: e.target.checked })} />Enable MRP</label>
            <div>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">MRP Policy</p>
              <select className="input" value={baseline.mrpCalculator.policy} onChange={(e) => updateMrpCalculator({ policy: e.target.value as MrpPolicy })}>
                <option value="asset-life">Asset life</option>
                <option value="annuity">Annuity</option>
                <option value="straight-line">Straight-line</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">Base Borrowing (£k)</p>
              <input className="input" type="number" value={baseline.mrpCalculator.baseBorrowing} onChange={(e) => updateMrpCalculator({ baseBorrowing: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">Asset Life (Years)</p>
              <input className="input" type="number" value={baseline.mrpCalculator.assetLifeYears} onChange={(e) => updateMrpCalculator({ assetLifeYears: Number(e.target.value) || 1 })} />
            </div>
            <div>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">Annuity Rate (%)</p>
              <input className="input" type="number" value={baseline.mrpCalculator.annuityRate} onChange={(e) => updateMrpCalculator({ annuityRate: Number(e.target.value) || 0 })} />
            </div>
            <p className="text-[10px] text-[#8ca0c0]">Y1–Y5: {result.mrpCharges.map((v) => fmtK(v)).join(' · ')}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5"><CardTitle>Named Stress Tests</CardTitle><RichTooltip content="Applies adverse shocks quickly to test downside resilience and governance readiness." /></div>
          <Zap size={14} className="text-[#f59e0b]" />
        </CardHeader>
        <div className="grid grid-cols-4 gap-2">
          <button className="px-3 py-2 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] text-[11px] font-semibold" onClick={() => applyNamedStressTest('pay_settlement_plus2')} title="Increase pay award assumption by +2 percentage points.">
            Statutory Pay +2%
          </button>
          <button className="px-3 py-2 rounded bg-[rgba(245,158,11,0.12)] text-[#f59e0b] text-[11px] font-semibold" onClick={() => applyNamedStressTest('asc_demand_shock')} title="Apply a +15% ASC demand shock to stress-test demand exposure.">
            ASC Shock +15%
          </button>
          <button className="px-3 py-2 rounded bg-[rgba(239,68,68,0.12)] text-[#ef4444] text-[11px] font-semibold" onClick={() => applyNamedStressTest('grant_reduction_year2')} title="Apply grant reduction shock from year 2.">
            Grant Reduction
          </button>
          <button className="px-3 py-2 rounded bg-[rgba(239,68,68,0.2)] text-[#ef4444] text-[11px] font-bold border border-[rgba(239,68,68,0.35)]" onClick={() => applyNamedStressTest('worst_case')} title="Apply combined adverse shocks for maximum credible downside scenario.">
            Combined Worst Case
          </button>
        </div>
      </Card>
    </div>
  );
}
