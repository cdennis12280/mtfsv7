import React from 'react';
import { Plus, Trash2, AlertTriangle, Zap, Upload, Download, CheckCircle2, Save, ArrowRight } from 'lucide-react';
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
  WorkforcePost,
  GrowthProposal,
  ManualAdjustment,
  ImportMappingProfile,
} from '../../types/financial';

function fmtK(v: number) {
  return `£${Math.round(v).toLocaleString('en-GB')}k`;
}

type ImportStatus = { type: 'idle' | 'success' | 'error'; message: string };

const IDLE_IMPORT_STATUS: ImportStatus = { type: 'idle', message: '' };
const MAPPING_TARGET_FIELDS = [
  'councilTax', 'businessRates', 'coreGrants', 'feesAndCharges',
  'pay', 'nonPay', 'ascDemandLed', 'cscDemandLed', 'otherServiceExp',
  'generalFundReserves', 'earmarkedReserves', 'reservesMinimumThreshold',
] as const;

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
    assumptions,
    updatePayAwardByFundingSource,
    updatePayGroupSensitivity,
    setWorkforceModelEnabled,
    setWorkforceModelMode,
    addWorkforcePost,
    updateWorkforcePost,
    removeWorkforcePost,
    addGrowthProposal,
    updateGrowthProposal,
    removeGrowthProposal,
    addManualAdjustment,
    updateManualAdjustment,
    removeManualAdjustment,
    addImportMappingProfile,
    updateImportMappingProfile,
    removeImportMappingProfile,
    applyOverlayImport,
    clearOverlayImports,
    saveSnapshot,
    setActiveTab,
    setScenariosFocus,
  } = useMTFSStore();
  const [payImportStatus, setPayImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [contractImportStatus, setContractImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [i2sImportStatus, setI2sImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [incomeImportStatus, setIncomeImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [isPayTemplateLoading, setIsPayTemplateLoading] = React.useState(false);
  const [isContractTemplateLoading, setIsContractTemplateLoading] = React.useState(false);
  const [isI2sTemplateLoading, setIsI2sTemplateLoading] = React.useState(false);
  const [isIncomeTemplateLoading, setIsIncomeTemplateLoading] = React.useState(false);
  const [isGrowthTemplateLoading, setIsGrowthTemplateLoading] = React.useState(false);
  const [isOverrideTemplateLoading, setIsOverrideTemplateLoading] = React.useState(false);
  const [selectedMappingProfileId, setSelectedMappingProfileId] = React.useState<string>('');
  const [overlayImportStatus, setOverlayImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [a31Status, setA31Status] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [reconFilter, setReconFilter] = React.useState<'all' | 'variance' | 'unmapped' | 'missing_source' | 'matched'>('all');

  const formatA31Timestamp = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  const saveA31Snapshot = (
    sourceCard: string,
    sectionEnabled?: boolean,
    counts?: Record<string, number>
  ) => {
    const name = `A31 - ${sourceCard} - ${formatA31Timestamp()}`;
    const countText = Object.entries(counts ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    const description = `${sourceCard} | enabled=${sectionEnabled ?? 'n/a'}${countText ? ` | ${countText}` : ''}`;
    saveSnapshot(name, description, { sourceCard, sectionEnabled, counts });
    setA31Status({ type: 'success', message: `Saved snapshot: ${name}` });
  };

  const openA31Snapshots = () => {
    setActiveTab('scenarios');
    setScenariosFocus('snapshots');
  };

  const renderA31Actions = (
    sourceCard: string,
    sectionEnabled?: boolean,
    counts?: Record<string, number>
  ) => (
    <div className="flex items-center gap-2">
      <button
        className="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] text-[10px]"
        onClick={() => saveA31Snapshot(sourceCard, sectionEnabled, counts)}
        title="Save current state as a Model Snapshot (A31)."
      >
        <Save size={10} />
        Save Snapshot
      </button>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(16,185,129,0.12)] text-[#10b981] text-[10px]"
        onClick={openA31Snapshots}
        title="Open Scenarios and focus the Model Snapshots (A31) section."
      >
        <ArrowRight size={10} />
        Open A31
      </button>
    </div>
  );

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
      effectiveFromYear: 1,
      reviewMonth: 4,
      upliftMethod: 'cpi',
      fixedRate: 3,
      customRate: 3,
      phaseInMonths: 0,
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

  const addWorkforce = () => {
    const post: WorkforcePost = {
      id: `wf-${Date.now()}`,
      postId: `POST-${Date.now().toString().slice(-5)}`,
      service: 'Adults Services',
      fundingSource: 'general_fund',
      fte: 1,
      annualCost: 42000,
      payAssumptionGroup: 'default',
    };
    addWorkforcePost(post);
  };

  const addGrowth = () => {
    const proposal: GrowthProposal = {
      id: `gp-${Date.now()}`,
      name: 'Demand growth pressure',
      service: 'ASC',
      owner: 'Service Director',
      value: 500,
      deliveryYear: 1,
      isRecurring: true,
      confidence: 80,
      yearlyPhasing: [100, 100, 100, 100, 100],
      notes: '',
    };
    addGrowthProposal(proposal);
  };

  const addAdjustment = () => {
    const adj: ManualAdjustment = {
      id: `adj-${Date.now()}`,
      service: 'Corporate',
      year: 1,
      amount: 100,
      reason: 'Manual override',
    };
    addManualAdjustment(adj);
  };

  const handlePayImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readRowsFromImportFile(file);
      const headers = (rows[0] ?? []).map((h) => normalize(h));
      const looksLikeWorkforceImport =
        headers.includes('postid') &&
        headers.includes('service') &&
        headers.includes('fundingsource');

      if (looksLikeWorkforceImport) {
        const importedWorkforce = parseRows<WorkforcePost>(rows, (row, index) => {
          const postId = String(row.postid ?? row.post ?? '').trim();
          const service = String(row.service ?? '').trim();
          const fundingSourceRaw = normalize(row.fundingsource ?? row.funding ?? row.source);
          const fundingSource: WorkforcePost['fundingSource'] =
            fundingSourceRaw === 'grant'
              ? 'grant'
              : fundingSourceRaw === 'other'
                ? 'other'
                : 'general_fund';
          const fte = toNumber(row.fte);
          const annualCost = toNumber(row.annualcost ?? row.costperfte ?? row.cost);
          const groupRaw = normalize(row.payassumptiongroup ?? row.paygroup ?? row.group);
          const payAssumptionGroup: WorkforcePost['payAssumptionGroup'] =
            groupRaw === 'teachers' || groupRaw === 'njc' || groupRaw === 'senior' || groupRaw === 'other'
              ? groupRaw
              : 'default';
          if (!postId && !service && fte === 0 && annualCost === 0) return null;
          return {
            id: `wf-import-${Date.now()}-${index}`,
            postId: postId || `POST-${index}`,
            service: service || 'Imported Service',
            fundingSource,
            fte,
            annualCost,
            payAssumptionGroup,
          };
        });
        if (importedWorkforce.length === 0) throw new Error('No valid workforce rows found.');
        importedWorkforce.forEach((post) => addWorkforcePost(post));
        setPayImportStatus({
          type: 'success',
          message: `Imported ${importedWorkforce.length} workforce post${importedWorkforce.length === 1 ? '' : 's'} from ${file.name}`,
        });
        return;
      }

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
          effectiveFromYear: clampYear(row.effectivefromyear ?? row.effectiveyear),
          reviewMonth: Math.max(1, Math.min(12, Math.round(toNumber(row.reviewmonth, 4)))),
          upliftMethod: normalize(row.upliftmethod) === 'fixed'
            ? 'fixed'
            : normalize(row.upliftmethod) === 'custom' || normalize(row.upliftmethod) === 'bespoke'
              ? 'custom'
              : normalize(row.upliftmethod) === 'rpi'
                ? 'rpi'
                : 'cpi',
          fixedRate: toNumber(row.fixedrate ?? row.fixed, 3),
          customRate: toNumber(row.customrate ?? row.custom ?? row.bespokerate ?? row.bespoke, bespokeRate),
          phaseInMonths: Math.max(0, Math.min(12, Math.round(toNumber(row.phaseinmonths ?? row.phasein, 0)))),
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
        { name: 'Template_Blank', rows: [['grade', 'fte', 'spinePointCost', 'postId', 'service', 'fundingSource', 'annualCost', 'payAssumptionGroup'], ['', '', '', '', '', '', '', '']] },
        {
          name: 'Example_Dummy_Data',
          rows: [
            ['grade', 'fte', 'spinePointCost', 'postId', 'service', 'fundingSource', 'annualCost', 'payAssumptionGroup'],
            ['NJC SCP 23', 18, 32100, 'POST-1001', 'Adults Services', 'general_fund', 32100, 'njc'],
            ['NJC SCP 30', 12, 38900, 'POST-1002', 'Children Services', 'grant', 38900, 'njc'],
            ['NJC SCP 38', 7, 47200, 'POST-1003', 'Corporate', 'other', 47200, 'senior'],
          ],
        },
        {
          name: 'Workforce_Posts_Only',
          rows: [
            ['postId', 'service', 'fundingSource', 'fte', 'annualCost', 'payAssumptionGroup'],
            ['POST-2001', 'Adults Services', 'general_fund', 1, 42000, 'default'],
            ['POST-2002', 'Housing', 'grant', 2, 36500, 'default'],
            ['POST-2003', 'Regeneration', 'other', 1, 51000, 'other'],
          ],
        },
        {
          name: 'Instructions',
          rows: [
            ['Pay Spine Configurator Template - Instructions'],
            ['1) Complete Template_Blank with one row per grade/post'],
            ['2) Keep headers unchanged'],
            ['3) Existing pay-spine import uses: grade, fte, spinePointCost'],
            ['4) Workforce model fields are included for planning: postId, service, fundingSource, annualCost, payAssumptionGroup'],
            ['5) fundingSource must be: general_fund | grant | other'],
            ['6) Save as .xlsx/.xls or export as .csv'],
            ['7) Use Import CSV/XLSX in Pay Spine Configurator'],
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
        { name: 'Template_Blank', rows: [['name', 'value', 'clause', 'bespokeRate', 'effectiveFromYear', 'reviewMonth', 'upliftMethod', 'fixedRate', 'customRate', 'phaseInMonths'], ['', '', '', '', '', '', '', '', '', '']] },
        {
          name: 'Example_Dummy_Data',
          rows: [
            ['name', 'value', 'clause', 'bespokeRate', 'effectiveFromYear', 'reviewMonth', 'upliftMethod', 'fixedRate', 'customRate', 'phaseInMonths'],
            ['Waste Collection Contract', 2800, 'cpi', 0, 1, 4, 'cpi', 0, 0, 0],
            ['Facilities Management', 1450, 'rpi', 0, 2, 7, 'rpi', 0, 0, 3],
            ['Specialist Placement Framework', 950, 'bespoke', 4.25, 1, 10, 'custom', 0, 4.25, 6],
          ],
        },
        {
          name: 'Instructions',
          rows: [
            ['Contract Indexation Tracker Template - Instructions'],
            ['1) Complete Template_Blank with one row per contract'],
            ['2) clause must be one of: cpi, rpi, nmw, bespoke'],
            ['3) upliftMethod must be one of: cpi, rpi, fixed, custom'],
            ['4) effectiveFromYear is 1-5 and reviewMonth is 1-12'],
            ['5) phaseInMonths is 0-12 to phase indexation in year of effect'],
            ['6) bespokeRate/customRate used for bespoke/custom methods'],
            ['7) value is annual contract value in £000'],
            ['8) Save and import via Import CSV/XLSX'],
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

  const handleGrowthTemplateDownload = async () => {
    setIsGrowthTemplateLoading(true);
    await downloadTemplateWorkbook(
      'mtfs_growth_proposals_template.xlsx',
      [
        {
          name: 'Template_Blank',
          rows: [['name', 'service', 'owner', 'value', 'deliveryYear', 'isRecurring', 'confidence', 'year1', 'year2', 'year3', 'year4', 'year5', 'notes'], ['', '', '', '', '', '', '', '', '', '', '', '', '']],
        },
        {
          name: 'Example_Dummy_Data',
          rows: [
            ['name', 'service', 'owner', 'value', 'deliveryYear', 'isRecurring', 'confidence', 'year1', 'year2', 'year3', 'year4', 'year5', 'notes'],
            ['ASC market pressure', 'ASC', 'Director ASC', 1500, 1, 'true', 85, 100, 100, 100, 100, 100, 'Underlying annual market pressure'],
            ['SEND transport step-cost', 'Children', 'Director Children', 900, 2, 'false', 75, 0, 100, 0, 0, 0, 'One-off pressure in delivery year only'],
          ],
        },
        {
          name: 'Instructions',
          rows: [
            ['Growth Proposals Template - Instructions'],
            ['1) One proposal per row'],
            ['2) value is annual impact in £000'],
            ['3) isRecurring accepts true/false, yes/no, 1/0'],
            ['4) confidence is 0-100'],
            ['5) year1..year5 are phasing percentages (0-100)'],
            ['6) deliveryYear is 1-5'],
          ],
        },
      ],
      (message) => setIncomeImportStatus({ type: 'success', message }),
      (message) => setIncomeImportStatus({ type: 'error', message })
    );
    setIsGrowthTemplateLoading(false);
  };

  const handleOverrideTemplateDownload = async () => {
    setIsOverrideTemplateLoading(true);
    await downloadTemplateWorkbook(
      'mtfs_manual_overrides_template.xlsx',
      [
        { name: 'Template_Blank', rows: [['service', 'year', 'amount', 'reason'], ['', '', '', '']] },
        {
          name: 'Example_Dummy_Data',
          rows: [
            ['service', 'year', 'amount', 'reason'],
            ['Corporate', 2, 450, 'Known pension adjustment timing'],
            ['Adults Services', 3, -300, 'Expected one-off release'],
          ],
        },
        {
          name: 'Instructions',
          rows: [
            ['Manual Overrides Template - Instructions'],
            ['1) amount is £000 (positive = cost increase, negative = reduction)'],
            ['2) year must be 1-5'],
            ['3) reason is mandatory for governance traceability'],
          ],
        },
      ],
      (message) => setIncomeImportStatus({ type: 'success', message }),
      (message) => setIncomeImportStatus({ type: 'error', message })
    );
    setIsOverrideTemplateLoading(false);
  };

  const addMappingProfile = () => {
    const profile: ImportMappingProfile = {
      id: `map-${Date.now()}`,
      name: `Mapping ${baseline.importMappingProfiles.length + 1}`,
      mappings: {
        counciltax: 'councilTax',
        businessrates: 'businessRates',
        coregrants: 'coreGrants',
        feesandcharges: 'feesAndCharges',
      },
      createdAt: new Date().toISOString(),
    };
    addImportMappingProfile(profile);
    setSelectedMappingProfileId(profile.id);
  };

  const handleOverlayImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const profile = baseline.importMappingProfiles.find((p) => p.id === selectedMappingProfileId) ?? baseline.importMappingProfiles[0];
      if (!profile) throw new Error('Create/select a mapping profile before importing overlay data.');
      const rows = await readRowsFromImportFile(file);
      if (rows.length < 2) throw new Error('Overlay file requires header row and at least one data row.');
      const headers = rows[0].map((h) => normalize(h));
      const firstData = rows[1] ?? [];
      const mappedValues: Record<string, number> = {};
      const unmappedFields: string[] = [];
      Object.entries(profile.mappings).forEach(([sourceColumn, targetField]) => {
        const idx = headers.findIndex((h) => h === normalize(sourceColumn));
        if (idx < 0) {
          unmappedFields.push(sourceColumn);
          return;
        }
        const value = toNumber(firstData[idx], Number.NaN);
        if (!Number.isFinite(value)) {
          unmappedFields.push(sourceColumn);
          return;
        }
        mappedValues[targetField] = value;
      });
      if (Object.keys(mappedValues).length === 0) throw new Error('No mapped numeric values found in selected file/profile.');
      applyOverlayImport(file.name, mappedValues, unmappedFields);
      setOverlayImportStatus({
        type: 'success',
        message: `Overlay imported from ${file.name}: ${Object.keys(mappedValues).length} mapped, ${unmappedFields.length} unmapped.`,
      });
    } catch (error) {
      setOverlayImportStatus({ type: 'error', message: error instanceof Error ? error.message : 'Could not apply overlay import' });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {renderImportStatus(a31Status)}
      <div className="space-y-4">
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
              {renderA31Actions('Pay Spine Configurator', baseline.paySpineConfig.enabled, {
                paySpineRows: baseline.paySpineConfig.rows.length,
              })}
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
            <div className="flex items-center gap-1.5"><CardTitle>Workforce Funding Model</CardTitle><RichTooltip content="Model pay by post/funding source with pay mode controls." /></div>
            <div className="flex items-center gap-2">
              <button className="text-[11px] text-[#3b82f6] flex items-center gap-1" onClick={addWorkforce}><Plus size={12} />Add Post</button>
              {renderA31Actions('Workforce Funding Model', baseline.workforceModel.enabled, {
                workforcePosts: baseline.workforceModel.posts.length,
              })}
            </div>
          </CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={baseline.workforceModel.enabled} onChange={(e) => setWorkforceModelEnabled(e.target.checked)} />Enable workforce model</label>
            <div className="grid grid-cols-1 gap-1 px-1">
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Model Mode</p>
                <RichTooltip content="Choose pay source: Pay Spine only, Workforce Posts only, or Hybrid (both combined)." />
              </div>
            </div>
            <select className="input" value={baseline.workforceModel.mode} onChange={(e) => setWorkforceModelMode(e.target.value as 'pay_spine' | 'workforce_posts' | 'hybrid')}>
              <option value="pay_spine">Pay Spine</option>
              <option value="workforce_posts">Workforce Posts</option>
              <option value="hybrid">Hybrid</option>
            </select>
            {baseline.workforceModel.mode === 'hybrid' && (
              <div className="p-2 rounded border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] text-[#f59e0b] text-[10px]">
                Hybrid mode combines Pay Spine and Workforce Posts. Avoid duplicating the same posts in both datasets.
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 px-1">
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">GF %</p>
                <RichTooltip content="Annual pay award assumption (%) applied to general fund funded posts." />
              </div>
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Grant %</p>
                <RichTooltip content="Annual pay award assumption (%) applied to grant-funded posts." />
              </div>
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Other %</p>
                <RichTooltip content="Annual pay award assumption (%) for posts funded by other sources." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input className="input" type="number" value={assumptions.expenditure.payAwardByFundingSource.general_fund} onChange={(e) => updatePayAwardByFundingSource('general_fund', Number(e.target.value) || 0)} title="GF pay award %" />
              <input className="input" type="number" value={assumptions.expenditure.payAwardByFundingSource.grant} onChange={(e) => updatePayAwardByFundingSource('grant', Number(e.target.value) || 0)} title="Grant pay award %" />
              <input className="input" type="number" value={assumptions.expenditure.payAwardByFundingSource.other} onChange={(e) => updatePayAwardByFundingSource('other', Number(e.target.value) || 0)} title="Other funding pay award %" />
            </div>
            <div className="grid grid-cols-5 gap-2 px-1">
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Default pp</p>
                <RichTooltip content="Sensitivity stress in percentage points (pp) for default pay group assumptions." />
              </div>
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Teachers pp</p>
                <RichTooltip content="Sensitivity stress in pp applied to teachers pay group assumptions." />
              </div>
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">NJC pp</p>
                <RichTooltip content="Sensitivity stress in pp applied to NJC pay group assumptions." />
              </div>
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Senior pp</p>
                <RichTooltip content="Sensitivity stress in pp applied to senior pay group assumptions." />
              </div>
              <div className="flex items-center gap-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Other pp</p>
                <RichTooltip content="Sensitivity stress in pp applied to other pay group assumptions." />
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <input className="input" type="number" value={assumptions.expenditure.payGroupSensitivity.default} onChange={(e) => updatePayGroupSensitivity('default', Number(e.target.value) || 0)} title="Default group sensitivity (pp)" />
              <input className="input" type="number" value={assumptions.expenditure.payGroupSensitivity.teachers} onChange={(e) => updatePayGroupSensitivity('teachers', Number(e.target.value) || 0)} title="Teachers group sensitivity (pp)" />
              <input className="input" type="number" value={assumptions.expenditure.payGroupSensitivity.njc} onChange={(e) => updatePayGroupSensitivity('njc', Number(e.target.value) || 0)} title="NJC group sensitivity (pp)" />
              <input className="input" type="number" value={assumptions.expenditure.payGroupSensitivity.senior} onChange={(e) => updatePayGroupSensitivity('senior', Number(e.target.value) || 0)} title="Senior group sensitivity (pp)" />
              <input className="input" type="number" value={assumptions.expenditure.payGroupSensitivity.other} onChange={(e) => updatePayGroupSensitivity('other', Number(e.target.value) || 0)} title="Other group sensitivity (pp)" />
            </div>
            <div className="flex gap-2">
              <button className="px-2 py-1 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] text-[10px]" onClick={() => {
                updatePayGroupSensitivity('default', assumptions.expenditure.payGroupSensitivity.default + 1);
                updatePayGroupSensitivity('teachers', assumptions.expenditure.payGroupSensitivity.teachers + 1);
                updatePayGroupSensitivity('njc', assumptions.expenditure.payGroupSensitivity.njc + 1);
                updatePayGroupSensitivity('senior', assumptions.expenditure.payGroupSensitivity.senior + 1);
                updatePayGroupSensitivity('other', assumptions.expenditure.payGroupSensitivity.other + 1);
              }}>All Groups +1pp</button>
              <button className="px-2 py-1 rounded bg-[rgba(245,158,11,0.12)] text-[#f59e0b] text-[10px]" onClick={() => {
                updatePayGroupSensitivity('default', 0);
                updatePayGroupSensitivity('teachers', 0);
                updatePayGroupSensitivity('njc', 0);
                updatePayGroupSensitivity('senior', 0);
                updatePayGroupSensitivity('other', 0);
              }}>Reset Group Stress</button>
            </div>
            {baseline.workforceModel.posts.length > 0 && (
              <div className="grid grid-cols-[120px_1fr_70px_90px_100px_100px_auto] gap-2 px-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Post ID</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Service</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">FTE</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Funding</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Annual Cost</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Pay Group</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
              </div>
            )}
            {baseline.workforceModel.posts.map((p) => (
              <div key={p.id} className="grid grid-cols-[120px_1fr_70px_90px_100px_100px_auto] gap-2">
                <input className="input" value={p.postId} onChange={(e) => updateWorkforcePost(p.id, { postId: e.target.value })} />
                <input className="input" value={p.service} onChange={(e) => updateWorkforcePost(p.id, { service: e.target.value })} />
                <input className="input" type="number" value={p.fte} onChange={(e) => updateWorkforcePost(p.id, { fte: Number(e.target.value) || 0 })} />
                <select className="input" value={p.fundingSource} onChange={(e) => updateWorkforcePost(p.id, { fundingSource: e.target.value as WorkforcePost['fundingSource'] })}>
                  <option value="general_fund">GF</option><option value="grant">Grant</option><option value="other">Other</option>
                </select>
                <input className="input" type="number" value={p.annualCost} onChange={(e) => updateWorkforcePost(p.id, { annualCost: Number(e.target.value) || 0 })} />
                <select className="input" value={p.payAssumptionGroup} onChange={(e) => updateWorkforcePost(p.id, { payAssumptionGroup: e.target.value as WorkforcePost['payAssumptionGroup'] })}>
                  <option value="default">Default</option>
                  <option value="teachers">Teachers</option>
                  <option value="njc">NJC</option>
                  <option value="senior">Senior</option>
                  <option value="other">Other</option>
                </select>
                <button className="text-[#ef4444]" onClick={() => removeWorkforcePost(p.id)}><Trash2 size={12} /></button>
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
              {renderA31Actions('Contract Indexation Tracker', baseline.contractIndexationTracker.enabled, {
                contracts: baseline.contractIndexationTracker.contracts.length,
              })}
            </div>
          </CardHeader>
          <label className="text-[11px] text-[#8ca0c0] flex items-center gap-2 mb-2">
            <input type="checkbox" checked={baseline.contractIndexationTracker.enabled} onChange={(e) => setContractTrackerEnabled(e.target.checked)} />
            Enable contract tracker
          </label>
          <div className="space-y-2">
            {renderImportStatus(contractImportStatus)}
            {baseline.contractIndexationTracker.contracts.length > 0 && (
              <div className="grid grid-cols-[1fr_90px_100px_70px_70px_90px_70px_70px_auto] gap-2 px-1">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Contract</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Value (£k)</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Method</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Start Yr</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Month</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Rate %</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Phase m</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
              </div>
            )}
            {baseline.contractIndexationTracker.contracts.map((c) => (
              <div key={c.id} className="grid grid-cols-[1fr_90px_100px_70px_70px_90px_70px_70px_auto] gap-2">
                <input className="input" value={c.name} onChange={(e) => updateContractEntry(c.id, { name: e.target.value })} />
                <input className="input" type="number" value={c.value} onChange={(e) => updateContractEntry(c.id, { value: Number(e.target.value) || 0 })} />
                <select className="input" value={c.upliftMethod} onChange={(e) => updateContractEntry(c.id, { upliftMethod: e.target.value as ContractIndexationEntry['upliftMethod'] })}>
                  <option value="cpi">CPI</option>
                  <option value="rpi">RPI</option>
                  <option value="fixed">Fixed</option>
                  <option value="custom">Custom</option>
                </select>
                <select className="input" value={c.effectiveFromYear} onChange={(e) => updateContractEntry(c.id, { effectiveFromYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>
                  {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Y{y}</option>)}
                </select>
                <input className="input" type="number" min={1} max={12} value={c.reviewMonth} onChange={(e) => updateContractEntry(c.id, { reviewMonth: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} />
                <input
                  className="input"
                  type="number"
                  value={c.upliftMethod === 'fixed' ? c.fixedRate : c.customRate}
                  onChange={(e) => c.upliftMethod === 'fixed'
                    ? updateContractEntry(c.id, { fixedRate: Number(e.target.value) || 0 })
                    : updateContractEntry(c.id, { customRate: Number(e.target.value) || 0, bespokeRate: Number(e.target.value) || 0 })}
                />
                <input className="input" type="number" min={0} max={12} value={c.phaseInMonths} onChange={(e) => updateContractEntry(c.id, { phaseInMonths: Math.max(0, Math.min(12, Number(e.target.value) || 0)) })} />
                <button className="text-[#ef4444]" onClick={() => removeContractEntry(c.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
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
              {renderA31Actions('Invest-to-Save Modelling', baseline.investToSave.enabled, {
                proposals: baseline.investToSave.proposals.length,
              })}
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
              {renderA31Actions('Income Generation Workbook', baseline.incomeGenerationWorkbook.enabled, {
                incomeLines: baseline.incomeGenerationWorkbook.lines.length,
              })}
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Growth & Manual Overrides</CardTitle><RichTooltip content="Configure growth proposals and explicit manual adjustments with reasons." /></div>
            <div className="flex items-center gap-2">
              <button className="text-[11px] text-[#3b82f6] flex items-center gap-1" onClick={addGrowth}><Plus size={12} />Growth</button>
              <button className="text-[11px] text-[#f59e0b] flex items-center gap-1" onClick={addAdjustment}><Plus size={12} />Override</button>
              <button onClick={() => void handleGrowthTemplateDownload()} disabled={isGrowthTemplateLoading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Download size={11} />{isGrowthTemplateLoading ? 'Preparing...' : 'Growth Template'}</button>
              <button onClick={() => void handleOverrideTemplateDownload()} disabled={isOverrideTemplateLoading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] text-[#f59e0b] text-[11px] font-semibold hover:bg-[rgba(245,158,11,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Download size={11} />{isOverrideTemplateLoading ? 'Preparing...' : 'Override Template'}</button>
              {renderA31Actions('Growth & Manual Overrides', undefined, {
                growthProposals: baseline.growthProposals.length,
                manualAdjustments: baseline.manualAdjustments.length,
              })}
            </div>
          </CardHeader>
          <div className="space-y-2 text-[11px]">
            {baseline.growthProposals.map((g) => (
              <div key={g.id} className="p-2 rounded border border-[rgba(99,179,237,0.12)] space-y-2">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_80px_90px_90px_auto] gap-2">
                  <input className="input" placeholder="Proposal" value={g.name} onChange={(e) => updateGrowthProposal(g.id, { name: e.target.value })} />
                  <input className="input" placeholder="Service" value={g.service} onChange={(e) => updateGrowthProposal(g.id, { service: e.target.value })} />
                  <input className="input" placeholder="Owner" value={g.owner} onChange={(e) => updateGrowthProposal(g.id, { owner: e.target.value })} />
                  <input className="input" type="number" value={g.value} onChange={(e) => updateGrowthProposal(g.id, { value: Number(e.target.value) || 0 })} />
                  <select className="input" value={g.deliveryYear} onChange={(e) => updateGrowthProposal(g.id, { deliveryYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Y{y}</option>)}</select>
                  <select className="input" value={g.isRecurring ? 'yes' : 'no'} onChange={(e) => updateGrowthProposal(g.id, { isRecurring: e.target.value === 'yes' })}><option value="yes">Recurring</option><option value="no">One-off</option></select>
                  <button className="text-[#ef4444]" onClick={() => removeGrowthProposal(g.id)}><Trash2 size={12} /></button>
                </div>
                <div className="grid grid-cols-[90px_1fr_1fr_1fr_1fr_1fr] gap-2">
                  <input className="input" type="number" value={g.confidence} onChange={(e) => updateGrowthProposal(g.id, { confidence: Number(e.target.value) || 0 })} title="Confidence %" />
                  {([0, 1, 2, 3, 4] as const).map((i) => (
                    <input
                      key={`${g.id}-phase-${i}`}
                      className="input"
                      type="number"
                      value={g.yearlyPhasing[i]}
                      onChange={(e) => {
                        const next = [...g.yearlyPhasing] as [number, number, number, number, number];
                        next[i] = Number(e.target.value) || 0;
                        updateGrowthProposal(g.id, { yearlyPhasing: next });
                      }}
                      title={`Phasing Y${i + 1} (%)`}
                    />
                  ))}
                </div>
                <input className="input" placeholder="Notes" value={g.notes} onChange={(e) => updateGrowthProposal(g.id, { notes: e.target.value })} />
              </div>
            ))}
            {baseline.manualAdjustments.map((a) => (
              <div key={a.id} className="grid grid-cols-[1fr_70px_90px_1.3fr_auto] gap-2">
                <input className="input" value={a.service} onChange={(e) => updateManualAdjustment(a.id, { service: e.target.value })} />
                <select className="input" value={a.year} onChange={(e) => updateManualAdjustment(a.id, { year: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Y{y}</option>)}</select>
                <input className="input" type="number" value={a.amount} onChange={(e) => updateManualAdjustment(a.id, { amount: Number(e.target.value) || 0 })} />
                <input className="input" value={a.reason} onChange={(e) => updateManualAdjustment(a.id, { reason: e.target.value })} placeholder="Override reason" />
                <button className="text-[#ef4444]" onClick={() => removeManualAdjustment(a.id)}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Reserves Methodology</CardTitle><RichTooltip content="Selects how minimum reserves threshold is set for resilience checks." /></div>
            {renderA31Actions('Reserves Methodology')}
          </CardHeader>
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
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Treasury Indicators</CardTitle><RichTooltip content="Tracks prudential limits and flags potential treasury breaches." /></div>
            {renderA31Actions('Treasury Indicators', baseline.treasuryIndicators.enabled)}
          </CardHeader>
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
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>MRP Calculator</CardTitle><RichTooltip content="Applies selected MRP policy to calculate annual revenue charges." /></div>
            {renderA31Actions('MRP Calculator', baseline.mrpCalculator.enabled)}
          </CardHeader>
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
          <div className="flex items-center gap-1.5"><CardTitle>Overlay Import & Reconciliation</CardTitle><RichTooltip content="Non-destructive source overlay and model vs source variance outputs." /></div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] text-[11px]" onClick={addMappingProfile}>Add Mapping Profile</button>
            <label className="px-3 py-1.5 rounded bg-[rgba(16,185,129,0.12)] text-[#10b981] text-[11px] cursor-pointer">
              Import Overlay CSV/XLSX
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleOverlayImportFile} />
            </label>
            <button className="px-3 py-1.5 rounded bg-[rgba(239,68,68,0.12)] text-[#ef4444] text-[11px]" onClick={() => clearOverlayImports()}>Clear Overlays</button>
            {renderA31Actions('Overlay Import & Reconciliation', undefined, {
              mappingProfiles: baseline.importMappingProfiles.length,
              overlayImports: baseline.overlayImports.length,
              reconciliationRows: result.reconciliationRows.length,
            })}
          </div>
        </CardHeader>
        <div className="space-y-2 text-[11px]">
          {renderImportStatus(overlayImportStatus)}
          <div className="flex items-center gap-2">
            <span className="text-[#8ca0c0]">Profile</span>
            <select className="input max-w-[240px]" value={selectedMappingProfileId} onChange={(e) => setSelectedMappingProfileId(e.target.value)}>
              <option value="">Select profile</option>
              {baseline.importMappingProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {baseline.importMappingProfiles.map((p) => (
            <div key={p.id} className="p-2 rounded border border-[rgba(99,179,237,0.12)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input className="input max-w-[260px]" value={p.name} onChange={(e) => updateImportMappingProfile(p.id, { name: e.target.value })} />
                <button className="text-[#ef4444]" onClick={() => removeImportMappingProfile(p.id)}><Trash2 size={12} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(p.mappings).map(([source, target]) => (
                  <React.Fragment key={`${p.id}-${source}`}>
                    <input
                      className="input"
                      value={source}
                      onChange={(e) => {
                        const next = { ...p.mappings };
                        const currentTarget = next[source];
                        delete next[source];
                        next[normalize(e.target.value)] = currentTarget;
                        updateImportMappingProfile(p.id, { mappings: next });
                      }}
                    />
                    <select className="input" value={target} onChange={(e) => updateImportMappingProfile(p.id, { mappings: { ...p.mappings, [source]: e.target.value } })}>
                      {MAPPING_TARGET_FIELDS.map((field) => <option key={field} value={field}>{field}</option>)}
                    </select>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[#8ca0c0]">Reconciliation filter</span>
            <select className="input max-w-[180px]" value={reconFilter} onChange={(e) => setReconFilter(e.target.value as typeof reconFilter)}>
              <option value="all">All</option>
              <option value="variance">Variance</option>
              <option value="unmapped">Unmapped</option>
              <option value="missing_source">Missing Source</option>
              <option value="matched">Matched</option>
            </select>
          </div>
          <div className="grid grid-cols-[1fr_120px_120px_120px_90px_90px] gap-2 px-1 text-[10px] text-[#4a6080] uppercase tracking-widest">
            <p>Field</p><p className="text-right">Source</p><p className="text-right">Model</p><p className="text-right">Variance</p><p className="text-right">Var %</p><p className="text-right">Status</p>
          </div>
          {result.reconciliationRows
            .filter((r) => reconFilter === 'all' ? true : r.status === reconFilter)
            .map((r) => (
            <div key={r.field} className="grid grid-cols-[1fr_120px_120px_120px_90px_90px] gap-2">
              <p className="text-[#8ca0c0]">{r.field}</p>
              <p className="mono text-right">{r.sourceValue === null ? '-' : fmtK(r.sourceValue)}</p>
              <p className="mono text-right">{fmtK(r.modelValue)}</p>
              <p className="mono text-right">{r.variance === null ? '-' : fmtK(r.variance)}</p>
              <p className="mono text-right">{r.variancePct === null ? '-' : `${r.variancePct.toFixed(1)}%`}</p>
              <p className="text-right">{r.status}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5"><CardTitle>Named Stress Tests</CardTitle><RichTooltip content="Applies adverse shocks quickly to test downside resilience and governance readiness." /></div>
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-[#f59e0b]" />
            {renderA31Actions('Named Stress Tests')}
          </div>
        </CardHeader>
        <div className="grid grid-cols-4 gap-2">
          <button className="px-3 py-2 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] text-[11px] font-semibold" onClick={() => applyNamedStressTest('pay_settlement_plus2')} title="Increase pay award assumption by +2 percentage points.">
            Pay Assumption +2pp
          </button>
          <button className="px-3 py-2 rounded bg-[rgba(245,158,11,0.12)] text-[#f59e0b] text-[11px] font-semibold" onClick={() => applyNamedStressTest('asc_demand_shock')} title="Apply a +15% ASC demand shock to stress-test demand exposure.">
            ASC Assumption +15pp
          </button>
          <button className="px-3 py-2 rounded bg-[rgba(239,68,68,0.12)] text-[#ef4444] text-[11px] font-semibold" onClick={() => applyNamedStressTest('grant_reduction_year2')} title="Apply an all-years grant variation reduction of 3 percentage points.">
            Grant Variation -3pp
          </button>
          <button className="px-3 py-2 rounded bg-[rgba(239,68,68,0.2)] text-[#ef4444] text-[11px] font-bold border border-[rgba(239,68,68,0.35)]" onClick={() => applyNamedStressTest('worst_case')} title="Apply combined all-years adverse assumption shocks for downside testing.">
            Combined Worst Case
          </button>
        </div>
      </Card>
    </div>
  );
}
