import React from 'react';
import { Plus, Trash2, AlertTriangle, Zap, Upload, Download, CheckCircle2, Save, ArrowRight, ChevronDown } from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { RichTooltip } from '../ui/RichTooltip';
import { buildPayTemplateSheets, fmtK } from '../../utils/payTemplate';
import { buildContractTemplateSheets } from '../../utils/contractTemplate';
import { legacyPaySpineRowToWorkforcePost } from '../../utils/workforcePay';
import type {
  ContractIndexationClause,
  MrpPolicy,
  ContractIndexationEntry,
  InvestToSaveProposal,
  IncomeGenerationLine,
  ReservesAdequacyMethod,
  WorkforcePost,
  GrowthProposal,
  ManualAdjustment,
  ImportMappingProfile,
} from '../../types/financial';

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

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = normalize(value);
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return fallback;
}

function clampYear(value: unknown): 1 | 2 | 3 | 4 | 5 {
  const n = Number(normalize(value).replace(/[^\d]/g, ''));
  const clamped = Math.min(5, Math.max(1, Number.isFinite(n) && n > 0 ? Math.round(n) : 1));
  return clamped as 1 | 2 | 3 | 4 | 5;
}

function setProfileYear(profile: { y1: number; y2: number; y3: number; y4: number; y5: number }, year: 1 | 2 | 3 | 4 | 5, value: number) {
  return { ...profile, [`y${year}`]: value };
}

function formatWholeNumber(value: number): string {
  return Math.round(value).toLocaleString('en-GB');
}

function statusStyle(status: 'good' | 'warning' | 'danger' | 'neutral') {
  if (status === 'good') return 'bg-[rgba(16,185,129,0.12)] text-[#10b981] border-[rgba(16,185,129,0.25)]';
  if (status === 'warning') return 'bg-[rgba(245,158,11,0.12)] text-[#f59e0b] border-[rgba(245,158,11,0.25)]';
  if (status === 'danger') return 'bg-[rgba(239,68,68,0.12)] text-[#ef4444] border-[rgba(239,68,68,0.25)]';
  return 'bg-[rgba(148,163,184,0.10)] text-[#8ca0c0] border-[rgba(148,163,184,0.20)]';
}

function methodExplanation(method: ReservesAdequacyMethod): string {
  if (method === 'pct_of_net_budget') return 'Threshold moves with the scale of the council net budget.';
  if (method === 'risk_based') return 'Threshold is driven by the risk-based reserves model and assessed exposure.';
  return 'A fixed cash floor is used as the minimum reserve requirement.';
}

function mrpPolicyExplanation(policy: MrpPolicy): string {
  if (policy === 'annuity') return 'Applies an annuity-style annual charge using the selected rate.';
  if (policy === 'straight-line') return 'Spreads the borrowing evenly across the asset life.';
  return 'Charges borrowing over the remaining asset life, increasing as life shortens.';
}

function fundingLabel(value: WorkforcePost['fundingSource']): string {
  if (value === 'grant') return 'Grant';
  if (value === 'other') return 'Other';
  return 'GF';
}

function splitValue(post: WorkforcePost, source: 'generalFundSplit' | 'grantFundSplit' | 'otherSplit') {
  if (typeof post[source] === 'number') return post[source] ?? 0;
  if (source === 'generalFundSplit') return post.fundingSource === 'general_fund' ? 100 : 0;
  if (source === 'grantFundSplit') return post.fundingSource === 'grant' ? 100 : 0;
  return post.fundingSource === 'other' ? 100 : 0;
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
    setContractTrackerEnabled,
    updateContractIndexAssumptions,
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
    snapshots,
    setActiveTab,
    setScenariosFocus,
  } = useMTFSStore();
  const [payImportStatus, setPayImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [contractImportStatus, setContractImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [i2sImportStatus, setI2sImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [incomeImportStatus, setIncomeImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [growthImportStatus, setGrowthImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
  const [overrideImportStatus, setOverrideImportStatus] = React.useState<ImportStatus>(IDLE_IMPORT_STATUS);
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
  const [sourceReconOpen, setSourceReconOpen] = React.useState(false);
  const [advancedReconOpen, setAdvancedReconOpen] = React.useState(false);

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

  const latestA31Snapshot = (sourceCard: string) => snapshots.find((snapshot) => snapshot.metadata.notes.includes(`source=${sourceCard}`));

  const isA31SnapshotChanged = (sourceCard: string) => {
    const snapshot = latestA31Snapshot(sourceCard);
    if (!snapshot) return false;
    if (sourceCard === 'Reserves Methodology') {
      return JSON.stringify(snapshot.baseline.reservesAdequacyMethodology) !== JSON.stringify(baseline.reservesAdequacyMethodology);
    }
    if (sourceCard === 'Treasury Indicators') {
      return JSON.stringify(snapshot.baseline.treasuryIndicators) !== JSON.stringify(baseline.treasuryIndicators);
    }
    if (sourceCard === 'MRP Calculator') {
      return JSON.stringify(snapshot.baseline.mrpCalculator) !== JSON.stringify(baseline.mrpCalculator);
    }
    return false;
  };

  const renderA31Actions = (
    sourceCard: string,
    sectionEnabled?: boolean,
    counts?: Record<string, number>
  ) => {
    const latest = latestA31Snapshot(sourceCard);
    const changed = isA31SnapshotChanged(sourceCard);
    const evidenceText = latest ? (changed ? 'Changed since snapshot' : 'Snapshot saved') : 'No evidence saved';
    const evidenceTone = latest ? (changed ? 'warning' : 'good') : 'neutral';
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span
          className={`px-2 py-1 rounded border text-[10px] ${statusStyle(evidenceTone)}`}
          title={latest ? `Last saved ${new Date(latest.createdAt).toLocaleString('en-GB')}` : 'No A31 evidence snapshot has been saved from this card.'}
        >
          {evidenceText}
        </span>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] text-[10px]"
          onClick={() => saveA31Snapshot(sourceCard, sectionEnabled, counts)}
          title="Save current state as a Model Snapshot (A31)."
        >
          <Save size={10} />
          Save Evidence Snapshot
        </button>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded bg-[rgba(16,185,129,0.12)] text-[#10b981] text-[10px]"
          onClick={openA31Snapshots}
          title="Open Scenarios and focus the Model Snapshots (A31) section."
        >
          <ArrowRight size={10} />
          Open Evidence / A31
        </button>
      </div>
    );
  };

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

  const addContract = () => {
    const c: ContractIndexationEntry = {
      id: `ct-${Date.now()}`,
      name: 'Major contract',
      supplier: 'Supplier',
      service: 'Corporate',
      fundingSource: 'general_fund',
      value: 1_000,
      clause: 'cpi',
      bespokeRate: 0,
      effectiveFromYear: 1,
      nextUpliftYear: 1,
      reviewMonth: 4,
      upliftMethod: 'cpi',
      fixedRate: 3,
      customRate: 3,
      phaseInMonths: 0,
      capRate: 8,
      collarRate: 0,
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
      vacancyFactor: 0,
      generalFundSplit: 100,
      grantFundSplit: 0,
      otherSplit: 0,
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
      status: 'Draft',
      evidenceNote: '',
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
            vacancyFactor: toNumber(row.vacancyfactor ?? row.vacancy, 0),
            generalFundSplit: toNumber(row.generalfundsplit ?? row.gfsplit, fundingSource === 'general_fund' ? 100 : 0),
            grantFundSplit: toNumber(row.grantfundsplit ?? row.grantsplit, fundingSource === 'grant' ? 100 : 0),
            otherSplit: toNumber(row.othersplit, fundingSource === 'other' ? 100 : 0),
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

      const imported = parseRows<WorkforcePost>(rows, (row, index) => {
        const grade = String(row.grade ?? row.name ?? '').trim();
        const fte = toNumber(row.fte);
        const spinePointCost = toNumber(row.spinepointcost ?? row.costperfte ?? row.spinecost ?? row.cost);
        if (!grade && fte === 0 && spinePointCost === 0) return null;
        return legacyPaySpineRowToWorkforcePost({
          id: `ps-import-${Date.now()}-${index}`,
          grade: grade || `Imported Grade ${index}`,
          fte,
          spinePointCost,
        }, index);
      });
      if (imported.length === 0) throw new Error('No valid workforce or legacy pay rows found.');
      imported.forEach((post) => addWorkforcePost(post));
      setPayImportStatus({ type: 'success', message: `Imported ${imported.length} legacy pay row${imported.length === 1 ? '' : 's'} as workforce posts from ${file.name}` });
    } catch (error) {
      setPayImportStatus({ type: 'error', message: error instanceof Error ? error.message : 'Could not import workforce posts file' });
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
          supplier: String(row.supplier ?? '').trim(),
          service: String(row.service ?? '').trim(),
          fundingSource: normalize(row.fundingsource ?? row.funding) === 'grant' ? 'grant' : normalize(row.fundingsource ?? row.funding) === 'other' ? 'other' : 'general_fund',
          value,
          clause,
          bespokeRate,
          effectiveFromYear: clampYear(row.effectivefromyear ?? row.effectiveyear),
          nextUpliftYear: clampYear(row.nextupliftyear ?? row.effectivefromyear ?? row.effectiveyear),
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
          capRate: toNumber(row.caprate ?? row.cap, 100),
          collarRate: toNumber(row.collarrate ?? row.collar, -100),
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

  const handleGrowthImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readRowsFromImportFile(file);
      const imported = parseRows<GrowthProposal>(rows, (row, index) => {
        const name = String(row.name ?? row.proposal ?? '').trim();
        const service = String(row.service ?? '').trim();
        const owner = String(row.owner ?? row.responsibleofficer ?? '').trim();
        const value = toNumber(row.value ?? row.amount);
        if (!name && !service && value === 0) return null;
        return {
          id: `growth-import-${Date.now()}-${index}`,
          name: name || `Imported Growth ${index}`,
          service: service || 'Imported Service',
          owner: owner || 'Unassigned',
          value,
          deliveryYear: clampYear(row.deliveryyear ?? row.startyear ?? row.startyr),
          isRecurring: toBoolean(row.isrecurring ?? row.recurring, true),
          confidence: Math.max(0, Math.min(100, toNumber(row.confidence, 80))),
          yearlyPhasing: [
            toNumber(row.year1 ?? row.y1, 100),
            toNumber(row.year2 ?? row.y2, 100),
            toNumber(row.year3 ?? row.y3, 100),
            toNumber(row.year4 ?? row.y4, 100),
            toNumber(row.year5 ?? row.y5, 100),
          ],
          notes: String(row.notes ?? '').trim(),
          status: 'Draft',
          evidenceNote: '',
        };
      });
      if (imported.length === 0) throw new Error('No valid growth proposal rows found.');
      imported.forEach((row) => addGrowthProposal(row));
      setGrowthImportStatus({ type: 'success', message: `Imported ${imported.length} growth proposal row${imported.length === 1 ? '' : 's'} from ${file.name}` });
    } catch (error) {
      setGrowthImportStatus({ type: 'error', message: error instanceof Error ? error.message : 'Could not import growth proposal file' });
    } finally {
      e.target.value = '';
    }
  };

  const handleOverrideImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readRowsFromImportFile(file);
      const imported = parseRows<ManualAdjustment>(rows, (row, index) => {
        const service = String(row.service ?? '').trim();
        const amount = toNumber(row.amount ?? row.value);
        const reason = String(row.reason ?? row.notes ?? '').trim();
        if (!service && amount === 0 && !reason) return null;
        return {
          id: `override-import-${Date.now()}-${index}`,
          service: service || 'Imported Service',
          year: clampYear(row.year ?? row.deliveryyear),
          amount,
          reason: reason || 'Imported manual override',
        };
      });
      if (imported.length === 0) throw new Error('No valid manual override rows found.');
      imported.forEach((row) => addManualAdjustment(row));
      setOverrideImportStatus({ type: 'success', message: `Imported ${imported.length} manual override row${imported.length === 1 ? '' : 's'} from ${file.name}` });
    } catch (error) {
      setOverrideImportStatus({ type: 'error', message: error instanceof Error ? error.message : 'Could not import manual override file' });
    } finally {
      e.target.value = '';
    }
  };

  const handlePayTemplateDownload = async () => {
    setIsPayTemplateLoading(true);
    await downloadTemplateWorkbook(
      'mtfs_workforce_posts_template.xlsx',
      buildPayTemplateSheets(),
      (message) => setPayImportStatus({ type: 'success', message }),
      (message) => setPayImportStatus({ type: 'error', message })
    );
    setIsPayTemplateLoading(false);
  };

  const handleContractTemplateDownload = async () => {
    setIsContractTemplateLoading(true);
    await downloadTemplateWorkbook(
      'mtfs_contract_tracker_template.xlsx',
      buildContractTemplateSheets(),
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
      (message) => setGrowthImportStatus({ type: 'success', message }),
      (message) => setGrowthImportStatus({ type: 'error', message })
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
      (message) => setOverrideImportStatus({ type: 'success', message }),
      (message) => setOverrideImportStatus({ type: 'error', message })
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

  const year5 = result.years[result.years.length - 1];
  const closingReserves = year5?.totalClosingReserves ?? 0;
  const reserveThreshold = result.effectiveMinimumReservesThreshold;
  const baseNetBudget = baseline.councilTax + baseline.businessRates + baseline.coreGrants + baseline.feesAndCharges;
  const reservesGapToThreshold = closingReserves - reserveThreshold;
  const reservesStatus = closingReserves < reserveThreshold
    ? { label: 'Below minimum', tone: 'danger' as const, soWhat: 'Closing reserves are below the selected policy threshold and need a mitigation plan.' }
    : closingReserves <= reserveThreshold * 1.1
      ? { label: 'Close to minimum', tone: 'warning' as const, soWhat: 'Closing reserves are above threshold but headroom is narrow for governance assurance.' }
      : { label: 'Above minimum', tone: 'good' as const, soWhat: 'Closing reserves are above the selected minimum threshold.' };
  const reserveValidation = [
    baseline.reservesAdequacyMethodology.method === 'fixed' && baseline.reservesAdequacyMethodology.fixedMinimum <= 0 ? 'Fixed minimum must be greater than £0k.' : '',
    baseline.reservesAdequacyMethodology.method === 'pct_of_net_budget' && (baseline.reservesAdequacyMethodology.pctOfNetBudget <= 0 || baseline.reservesAdequacyMethodology.pctOfNetBudget > 20) ? 'Percentage threshold should usually sit between 0% and 20% of net budget.' : '',
    reserveThreshold > 0 && baseNetBudget > 0 && reserveThreshold < baseNetBudget * 0.02 ? 'Effective threshold is below 2% of net budget; check this is defensible.' : '',
    baseline.reservesAdequacyMethodology.method === 'risk_based' && result.recommendedMinimumReserves <= 0 ? 'Risk-based method needs risk reserve inputs before it can evidence a threshold.' : '',
  ].filter(Boolean);

  const treasuryHeadroomOperational = baseline.treasuryIndicators.operationalBoundary - baseline.treasuryIndicators.netFinancingNeed;
  const treasuryHeadroomAuthorised = baseline.treasuryIndicators.authorisedLimit - baseline.treasuryIndicators.netFinancingNeed;
  const treasuryStatus = !baseline.treasuryIndicators.enabled
    ? { label: 'Not included', tone: 'neutral' as const, soWhat: 'Treasury indicators are not currently included in risk checks.' }
    : baseline.treasuryIndicators.operationalBoundary > baseline.treasuryIndicators.authorisedLimit || baseline.treasuryIndicators.netFinancingNeed > baseline.treasuryIndicators.authorisedLimit
      ? { label: 'Red', tone: 'danger' as const, soWhat: 'A prudential limit is breached; CFO/S151 review is required before relying on the pack.' }
      : baseline.treasuryIndicators.netFinancingNeed > baseline.treasuryIndicators.operationalBoundary
        ? { label: 'Amber', tone: 'warning' as const, soWhat: 'Net financing need is above the operational boundary but remains within the authorised limit.' }
        : { label: 'Green', tone: 'good' as const, soWhat: 'Net financing need sits within the operational boundary and authorised limit.' };
  const treasuryValidation = [
    baseline.treasuryIndicators.enabled && baseline.treasuryIndicators.authorisedLimit < 0 ? 'Authorised limit cannot be negative.' : '',
    baseline.treasuryIndicators.enabled && baseline.treasuryIndicators.operationalBoundary < 0 ? 'Operational boundary cannot be negative.' : '',
    baseline.treasuryIndicators.enabled && baseline.treasuryIndicators.netFinancingNeed < 0 ? 'Net financing need cannot be negative.' : '',
    baseline.treasuryIndicators.enabled && baseline.treasuryIndicators.operationalBoundary > baseline.treasuryIndicators.authorisedLimit ? 'Operational boundary should not exceed the authorised limit.' : '',
  ].filter(Boolean);

  const mrpYear1Impact = result.mrpCharges[0] ?? 0;
  const mrpTotalImpact = result.mrpCharges.reduce((sum, charge) => sum + charge, 0);
  const mrpValidation = [
    baseline.mrpCalculator.enabled && baseline.mrpCalculator.baseBorrowing < 0 ? 'Base borrowing cannot be negative.' : '',
    baseline.mrpCalculator.enabled && baseline.mrpCalculator.assetLifeYears <= 0 ? 'Asset life must be greater than zero.' : '',
    baseline.mrpCalculator.enabled && baseline.mrpCalculator.assetLifeYears > 120 ? 'Asset life looks unusually long; check the input is in years.' : '',
    baseline.mrpCalculator.enabled && (baseline.mrpCalculator.annuityRate < 0 || baseline.mrpCalculator.annuityRate > 20) ? 'Annuity rate should usually sit between 0% and 20%.' : '',
  ].filter(Boolean);
  const reconciliationSummary = {
    checks: result.reconciliationRows.length,
    matched: result.reconciliationRows.filter((row) => row.status === 'matched').length,
    variances: result.reconciliationRows.filter((row) => row.status === 'variance').length,
    missing: result.reconciliationRows.filter((row) => row.status === 'missing_source' || row.status === 'unmapped').length,
  };

  return (
    <div className="space-y-4">
      {renderImportStatus(a31Status)}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Workforce Funding Model</CardTitle><RichTooltip content="Model pay by individual post and funding source. Legacy pay spine imports are converted into workforce posts." /></div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#10b981] text-[11px] font-semibold cursor-pointer hover:bg-[rgba(16,185,129,0.2)] transition-colors" title="Import workforce posts from CSV or Excel. Legacy grade-level pay spine files are converted into workforce posts.">
                <Upload size={11} />
                Import CSV/XLSX
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handlePayImport} />
              </label>
              <button onClick={() => void handlePayTemplateDownload()} disabled={isPayTemplateLoading} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Download workforce posts template with example rows and instructions.">
                <Download size={11} />
                {isPayTemplateLoading ? 'Preparing...' : 'Download Workforce Template'}
              </button>
              {renderA31Actions('Workforce Funding Model', baseline.workforceModel.posts.length > 0, {
                workforcePosts: baseline.workforceModel.posts.length,
              })}
            </div>
          </CardHeader>
          <div className="space-y-3 text-[11px]">
            {renderImportStatus(payImportStatus)}
            <div className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(8,12,20,0.45)] p-3">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-2">Setup</p>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
                <p className="text-[10px] text-[#8ca0c0]">Workforce Posts are the only active pay model. Add or import posts to calculate pay pressure by funding source; an empty list falls back to the baseline pay budget.</p>
                <button
                  className="text-[11px] text-[#3b82f6] flex items-center justify-center gap-1 px-2 py-1 rounded bg-[rgba(59,130,246,0.12)]"
                  onClick={addWorkforce}
                  title="Add a workforce post."
                >
                  <Plus size={12} />Add Post
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(8,12,20,0.45)] p-3">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-2">Funding Source Pay Rates</p>
              <p className="text-[10px] text-[#8ca0c0] mb-2">Set annual pay award assumptions by funding source.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-[10px] text-[#8ca0c0]">General Fund Pay Award (%)</span>
                  <input className="input mt-1" type="number" value={assumptions.expenditure.payAwardByFundingSource.general_fund} onChange={(e) => updatePayAwardByFundingSource('general_fund', Number(e.target.value) || 0)} title="Annual pay award assumption (%) applied to general fund funded posts." />
                </label>
                <label className="block">
                  <span className="text-[10px] text-[#8ca0c0]">Grant-Funded Pay Award (%)</span>
                  <input className="input mt-1" type="number" value={assumptions.expenditure.payAwardByFundingSource.grant} onChange={(e) => updatePayAwardByFundingSource('grant', Number(e.target.value) || 0)} title="Annual pay award assumption (%) applied to grant-funded posts." />
                </label>
                <label className="block">
                  <span className="text-[10px] text-[#8ca0c0]">Other Funding Pay Award (%)</span>
                  <input className="input mt-1" type="number" value={assumptions.expenditure.payAwardByFundingSource.other} onChange={(e) => updatePayAwardByFundingSource('other', Number(e.target.value) || 0)} title="Annual pay award assumption (%) for posts funded by other sources." />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(8,12,20,0.45)] p-3">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-2">Pay Group Stress Controls</p>
              <p className="text-[10px] text-[#8ca0c0] mb-2">Apply sensitivity stress in percentage points (pp) by pay group.</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <label className="block">
                  <span className="text-[10px] text-[#8ca0c0]">Default Group Stress (pp)</span>
                  <input className="input mt-1" type="number" value={assumptions.expenditure.payGroupSensitivity.default} onChange={(e) => updatePayGroupSensitivity('default', Number(e.target.value) || 0)} title="Sensitivity stress in percentage points (pp) for default pay group assumptions." />
                </label>
                <label className="block">
                  <span className="text-[10px] text-[#8ca0c0]">Teachers Group Stress (pp)</span>
                  <input className="input mt-1" type="number" value={assumptions.expenditure.payGroupSensitivity.teachers} onChange={(e) => updatePayGroupSensitivity('teachers', Number(e.target.value) || 0)} title="Sensitivity stress in pp applied to teachers pay group assumptions." />
                </label>
                <label className="block">
                  <span className="text-[10px] text-[#8ca0c0]">NJC Group Stress (pp)</span>
                  <input className="input mt-1" type="number" value={assumptions.expenditure.payGroupSensitivity.njc} onChange={(e) => updatePayGroupSensitivity('njc', Number(e.target.value) || 0)} title="Sensitivity stress in pp applied to NJC pay group assumptions." />
                </label>
                <label className="block">
                  <span className="text-[10px] text-[#8ca0c0]">Senior Group Stress (pp)</span>
                  <input className="input mt-1" type="number" value={assumptions.expenditure.payGroupSensitivity.senior} onChange={(e) => updatePayGroupSensitivity('senior', Number(e.target.value) || 0)} title="Sensitivity stress in pp applied to senior pay group assumptions." />
                </label>
                <label className="block">
                  <span className="text-[10px] text-[#8ca0c0]">Other Group Stress (pp)</span>
                  <input className="input mt-1" type="number" value={assumptions.expenditure.payGroupSensitivity.other} onChange={(e) => updatePayGroupSensitivity('other', Number(e.target.value) || 0)} title="Sensitivity stress in pp applied to other pay group assumptions." />
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-2">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {[
                ['Active pay model', result.years[0]?.payBudgetReconciliation.activeModelMode ?? 'baseline'],
                ['Imported pay budget', result.years[0]?.payBudgetReconciliation.importedPayBudget ?? 0],
                ['Baseline pay budget', result.years[0]?.payBudgetReconciliation.baselinePay ?? 0],
                ['Pay variance', result.years[0]?.payBudgetReconciliation.variance ?? 0],
                ['General fund pay pressure Y1', result.years[0]?.generalFundPayPressure ?? 0],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(8,12,20,0.45)] p-2">
                  <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">{label}</p>
                  <p className="mono mt-1 text-[12px] font-bold text-[#f0f4ff]">
                    {typeof value === 'string' ? value.replaceAll('_', ' ') : fmtK(Number(value))}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(8,12,20,0.45)] p-3 space-y-2">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Workforce Posts</p>
              <p className="text-[10px] text-[#8ca0c0]">Manage individual posts used for workforce-based pay modelling.</p>
              {baseline.workforceModel.posts.length > 0 && (
                <div className="workforce-table-wrap" data-testid="workforce-posts-table">
                  <table className="workforce-table">
                    <colgroup>
                      <col style={{ width: '132px' }} />
                      <col style={{ width: '210px' }} />
                      <col style={{ width: '72px' }} />
                      <col style={{ width: '98px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '118px' }} />
                      <col style={{ width: '96px' }} />
                      <col style={{ width: '86px' }} />
                      <col style={{ width: '92px' }} />
                      <col style={{ width: '88px' }} />
                      <col style={{ width: '64px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {['Post ID', 'Service', 'FTE', 'Funding', 'Annual Cost', 'Pay Group', 'Vacancy %', 'GF %', 'Grant %', 'Other %', 'Action'].map((heading) => (
                          <th key={heading} className={['FTE', 'Annual Cost', 'Vacancy %', 'GF %', 'Grant %', 'Other %', 'Action'].includes(heading) ? 'workforce-table__number' : undefined}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {baseline.workforceModel.posts.map((p) => {
                        const gfSplit = splitValue(p, 'generalFundSplit');
                        const grantSplit = splitValue(p, 'grantFundSplit');
                        const otherSplit = splitValue(p, 'otherSplit');
                        const splitTotal = gfSplit + grantSplit + otherSplit;
                        const splitInvalid = Math.abs(splitTotal - 100) > 0.01;
                        return (
                          <React.Fragment key={p.id}>
                            <tr className={splitInvalid ? 'workforce-table__warning-row' : undefined}>
                              <td data-label="Post ID">
                                <input aria-label={`Post ID for ${p.postId}`} className="input workforce-table__input" value={p.postId} onChange={(e) => updateWorkforcePost(p.id, { postId: e.target.value })} />
                              </td>
                              <td data-label="Service">
                                <input aria-label={`Service for ${p.postId}`} className="input workforce-table__input" value={p.service} onChange={(e) => updateWorkforcePost(p.id, { service: e.target.value })} />
                              </td>
                              <td data-label="FTE" className="workforce-table__number">
                                <input aria-label={`FTE for ${p.postId}`} className="input workforce-table__input workforce-table__input--number" type="number" value={p.fte} onChange={(e) => updateWorkforcePost(p.id, { fte: Number(e.target.value) || 0 })} />
                              </td>
                              <td data-label="Funding">
                                <div className="workforce-table__select-wrap" data-short-label={fundingLabel(p.fundingSource)}>
                                  <select aria-label={`Funding source for ${p.postId}`} className="input workforce-table__select" value={p.fundingSource} onChange={(e) => updateWorkforcePost(p.id, { fundingSource: e.target.value as WorkforcePost['fundingSource'] })}>
                                    <option value="general_fund">GF</option><option value="grant">Grant</option><option value="other">Other</option>
                                  </select>
                                </div>
                              </td>
                              <td data-label="Annual Cost" className="workforce-table__number">
                                <div className="workforce-table__money-field">
                                  <span>£</span>
                                  <input aria-label={`Annual cost for ${p.postId}`} className="input workforce-table__input workforce-table__input--number" type="number" value={p.annualCost} onChange={(e) => updateWorkforcePost(p.id, { annualCost: Number(e.target.value) || 0 })} title={`£${formatWholeNumber(p.annualCost)}`} />
                                </div>
                              </td>
                              <td data-label="Pay Group">
                                <select aria-label={`Pay group for ${p.postId}`} className="input workforce-table__select" value={p.payAssumptionGroup} onChange={(e) => updateWorkforcePost(p.id, { payAssumptionGroup: e.target.value as WorkforcePost['payAssumptionGroup'] })}>
                                  <option value="default">Default</option>
                                  <option value="teachers">Teachers</option>
                                  <option value="njc">NJC</option>
                                  <option value="senior">Senior</option>
                                  <option value="other">Other</option>
                                </select>
                              </td>
                              <td data-label="Vacancy %" className="workforce-table__number">
                                <div className="workforce-table__percent-field">
                                  <input aria-label={`Vacancy percentage for ${p.postId}`} className="input workforce-table__input workforce-table__input--number" type="number" value={p.vacancyFactor ?? 0} onChange={(e) => updateWorkforcePost(p.id, { vacancyFactor: Number(e.target.value) || 0 })} />
                                  <span>%</span>
                                </div>
                              </td>
                              <td data-label="GF %" className="workforce-table__number">
                                <div className="workforce-table__percent-field">
                                  <input aria-label={`General Fund split percentage for ${p.postId}`} className={`input workforce-table__input workforce-table__input--number ${splitInvalid ? 'border-[#f59e0b]' : ''}`} type="number" value={gfSplit} onChange={(e) => updateWorkforcePost(p.id, { generalFundSplit: Number(e.target.value) || 0 })} title={splitInvalid ? `Funding split totals ${splitTotal}%` : `${gfSplit}% General Fund`} />
                                  <span>%</span>
                                </div>
                              </td>
                              <td data-label="Grant %" className="workforce-table__number">
                                <div className="workforce-table__percent-field">
                                  <input aria-label={`Grant split percentage for ${p.postId}`} className={`input workforce-table__input workforce-table__input--number ${splitInvalid ? 'border-[#f59e0b]' : ''}`} type="number" value={grantSplit} onChange={(e) => updateWorkforcePost(p.id, { grantFundSplit: Number(e.target.value) || 0 })} title={splitInvalid ? `Funding split totals ${splitTotal}%` : `${grantSplit}% Grant`} />
                                  <span>%</span>
                                </div>
                              </td>
                              <td data-label="Other %" className="workforce-table__number">
                                <div className="workforce-table__percent-field">
                                  <input aria-label={`Other funding split percentage for ${p.postId}`} className={`input workforce-table__input workforce-table__input--number ${splitInvalid ? 'border-[#f59e0b]' : ''}`} type="number" value={otherSplit} onChange={(e) => updateWorkforcePost(p.id, { otherSplit: Number(e.target.value) || 0 })} title={splitInvalid ? `Funding split totals ${splitTotal}%` : `${otherSplit}% Other`} />
                                  <span>%</span>
                                </div>
                              </td>
                              <td data-label="Action" className="workforce-table__action">
                                <button aria-label={`Remove workforce post ${p.postId}`} className="workforce-table__delete" onClick={() => removeWorkforcePost(p.id)} title={`Remove workforce post ${p.postId}`}><Trash2 size={13} /></button>
                              </td>
                            </tr>
                            {splitInvalid && (
                              <tr className="workforce-table__warning-detail">
                                <td colSpan={11}>Split total: {formatWholeNumber(splitTotal)}%. Adjust GF, Grant and Other so they total 100% before export.</td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {baseline.workforceModel.posts.some((p) => {
                const gfSplit = splitValue(p, 'generalFundSplit');
                const grantSplit = splitValue(p, 'grantFundSplit');
                const otherSplit = splitValue(p, 'otherSplit');
                return Math.abs(gfSplit + grantSplit + otherSplit - 100) > 0.01;
              }) && (
                <div className="rounded-lg border border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.08)] p-2 text-[10px] text-[#f59e0b]">
                  One or more post funding splits do not total 100%. The calculation normalises them, but the source data should be corrected before export.
                </div>
              )}
            </div>
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
            <div className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(8,12,20,0.45)] p-3 space-y-3">
              <div>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Index Assumptions</p>
                <p className="text-[10px] text-[#8ca0c0]">Year-level indices used by CPI, RPI, NMW, fixed and bespoke contract clauses.</p>
              </div>
              <div className="index-assumptions-wrap">
                <div className="index-assumptions-grid" data-testid="index-assumptions-grid">
                  <div className="index-assumptions-header">
                    <span>Index</span>
                    {[1, 2, 3, 4, 5].map((year) => <span key={year}>Y{year}</span>)}
                  </div>
                  {(['cpi', 'rpi', 'nmw', 'fixed', 'bespoke'] as const).map((indexKey) => (
                    <div key={indexKey} className="index-assumptions-row">
                      <p className="index-assumptions-label">{indexKey}</p>
                      {([1, 2, 3, 4, 5] as const).map((year) => (
                        <label key={year} className="index-assumptions-cell">
                          <span className="sr-only">{indexKey.toUpperCase()} Y{year} rate</span>
                          <div className="index-assumptions-rate">
                            <input
                              aria-label={`${indexKey.toUpperCase()} Y${year} rate`}
                              className="input"
                              type="number"
                              value={baseline.contractIndexationTracker.indexAssumptions[indexKey][`y${year}`]}
                              onChange={(e) => updateContractIndexAssumptions({
                                [indexKey]: setProfileYear(
                                  baseline.contractIndexationTracker.indexAssumptions[indexKey],
                                  year,
                                  Number(e.target.value) || 0,
                                ),
                              })}
                            />
                            <span>%</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                ['Contract baseline', baseline.contractIndexationTracker.contracts.reduce((sum, contract) => sum + contract.value, 0)],
                ['Non-pay baseline', baseline.nonPay],
                ['Y1 contract uplift', result.years[0]?.contractIndexationCost ?? 0],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(8,12,20,0.45)] p-2">
                  <p className="text-[9px] uppercase tracking-widest text-[#4a6080]">{label}</p>
                  <p className="mono mt-1 text-[12px] font-bold text-[#f0f4ff]">{fmtK(Number(value))}</p>
                </div>
              ))}
            </div>
            {baseline.contractIndexationTracker.contracts.length > 0 && (
              <div className="editable-table-wrap" data-testid="contract-indexation-table">
                <table className="editable-table editable-table--contracts">
                  <colgroup>
                    <col style={{ width: '210px' }} />
                    <col style={{ width: '150px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '92px' }} />
                    <col style={{ width: '96px' }} />
                    <col style={{ width: '112px' }} />
                    <col style={{ width: '86px' }} />
                    <col style={{ width: '82px' }} />
                    <col style={{ width: '86px' }} />
                    <col style={{ width: '82px' }} />
                    <col style={{ width: '92px' }} />
                    <col style={{ width: '64px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {['Contract', 'Supplier', 'Service', 'Funding', 'Value', 'Method', 'Start Yr', 'Month', 'Rate %', 'Cap %', 'Collar %', 'Action'].map((heading) => (
                        <th key={heading} className={['Value', 'Start Yr', 'Month', 'Rate %', 'Cap %', 'Collar %', 'Action'].includes(heading) ? 'editable-table__number' : undefined}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {baseline.contractIndexationTracker.contracts.map((c) => (
                      <tr key={c.id}>
                        <td data-label="Contract"><input aria-label={`Contract name for ${c.name}`} className="input editable-table__input" value={c.name} onChange={(e) => updateContractEntry(c.id, { name: e.target.value })} /></td>
                        <td data-label="Supplier"><input aria-label={`Supplier for ${c.name}`} className="input editable-table__input" value={c.supplier ?? ''} onChange={(e) => updateContractEntry(c.id, { supplier: e.target.value })} /></td>
                        <td data-label="Service"><input aria-label={`Service for ${c.name}`} className="input editable-table__input" value={c.service ?? ''} onChange={(e) => updateContractEntry(c.id, { service: e.target.value })} /></td>
                        <td data-label="Funding">
                          <select aria-label={`Funding for ${c.name}`} className="input editable-table__select" value={c.fundingSource ?? 'general_fund'} onChange={(e) => updateContractEntry(c.id, { fundingSource: e.target.value as ContractIndexationEntry['fundingSource'] })}>
                            <option value="general_fund">GF</option>
                            <option value="grant">Grant</option>
                            <option value="other">Other</option>
                          </select>
                        </td>
                        <td data-label="Value" className="editable-table__number"><input aria-label={`Value for ${c.name}`} className="input editable-table__input editable-table__input--number" type="number" value={c.value} onChange={(e) => updateContractEntry(c.id, { value: Number(e.target.value) || 0 })} /></td>
                        <td data-label="Method">
                          <select aria-label={`Uplift method for ${c.name}`} className="input editable-table__select" value={c.upliftMethod} onChange={(e) => updateContractEntry(c.id, { upliftMethod: e.target.value as ContractIndexationEntry['upliftMethod'] })}>
                            <option value="cpi">CPI</option>
                            <option value="rpi">RPI</option>
                            <option value="nmw">NMW</option>
                            <option value="bespoke">Bespoke</option>
                            <option value="fixed">Fixed</option>
                            <option value="custom">Custom</option>
                          </select>
                        </td>
                        <td data-label="Start Yr">
                          <select aria-label={`Start year for ${c.name}`} className="input editable-table__select" value={c.nextUpliftYear ?? c.effectiveFromYear} onChange={(e) => updateContractEntry(c.id, { nextUpliftYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5, effectiveFromYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>
                            {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Y{y}</option>)}
                          </select>
                        </td>
                        <td data-label="Month" className="editable-table__number"><input aria-label={`Review month for ${c.name}`} className="input editable-table__input editable-table__input--number" type="number" min={1} max={12} value={c.reviewMonth} onChange={(e) => updateContractEntry(c.id, { reviewMonth: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} /></td>
                        <td data-label="Rate %" className="editable-table__number"><input aria-label={`Rate percentage for ${c.name}`} className="input editable-table__input editable-table__input--number" type="number" value={c.upliftMethod === 'fixed' ? c.fixedRate : c.customRate} onChange={(e) => c.upliftMethod === 'fixed' ? updateContractEntry(c.id, { fixedRate: Number(e.target.value) || 0 }) : updateContractEntry(c.id, { customRate: Number(e.target.value) || 0, bespokeRate: Number(e.target.value) || 0 })} /></td>
                        <td data-label="Cap %" className="editable-table__number"><input aria-label={`Cap percentage for ${c.name}`} className="input editable-table__input editable-table__input--number" type="number" value={c.capRate ?? 0} onChange={(e) => updateContractEntry(c.id, { capRate: Number(e.target.value) || 0 })} /></td>
                        <td data-label="Collar %" className="editable-table__number"><input aria-label={`Collar percentage for ${c.name}`} className="input editable-table__input editable-table__input--number" type="number" value={c.collarRate ?? 0} onChange={(e) => updateContractEntry(c.id, { collarRate: Number(e.target.value) || 0 })} /></td>
                        <td data-label="Action" className="editable-table__action"><button aria-label={`Remove contract ${c.name}`} className="editable-table__delete" onClick={() => removeContractEntry(c.id)} title={`Remove contract ${c.name}`}><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(result.years[0]?.contractIndexationBreakdown?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-[rgba(99,179,237,0.12)] bg-[rgba(8,12,20,0.45)] p-3">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-2">Top Y1 Contract Pressures</p>
                <div className="space-y-1">
                  {[...(result.years[0]?.contractIndexationBreakdown ?? [])]
                    .sort((a, b) => b.upliftCost - a.upliftCost)
                    .slice(0, 10)
                    .map((contract) => (
                      <div key={contract.contractId} className="grid grid-cols-[1fr_70px_70px] gap-2 text-[11px]">
                        <span className="text-[#d8e4ff]">{contract.name}</span>
                        <span className="mono text-right text-[#8ca0c0]">{contract.appliedRate.toFixed(1)}%</span>
                        <span className="mono text-right text-[#f0f4ff]">{fmtK(contract.upliftCost)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
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
              <div className="editable-table-wrap" data-testid="invest-to-save-table">
                <table className="editable-table editable-table--compact">
                  <colgroup>
                    <col style={{ width: '260px' }} />
                    <col style={{ width: '116px' }} />
                    <col style={{ width: '116px' }} />
                    <col style={{ width: '96px' }} />
                    <col style={{ width: '86px' }} />
                    <col style={{ width: '64px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {['Proposal', 'Upfront (£k)', 'Saving (£k)', 'Payback', 'Start Yr', 'Action'].map((heading) => (
                        <th key={heading} className={heading === 'Proposal' ? undefined : 'editable-table__number'}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {baseline.investToSave.proposals.map((p) => (
                      <tr key={p.id}>
                        <td data-label="Proposal"><input aria-label={`Proposal name for ${p.name}`} className="input editable-table__input" value={p.name} onChange={(e) => updateInvestToSaveProposal(p.id, { name: e.target.value })} /></td>
                        <td data-label="Upfront (£k)" className="editable-table__number"><input aria-label={`Upfront cost for ${p.name}`} className="input editable-table__input editable-table__input--number" type="number" value={p.upfrontCost} onChange={(e) => updateInvestToSaveProposal(p.id, { upfrontCost: Number(e.target.value) || 0 })} /></td>
                        <td data-label="Saving (£k)" className="editable-table__number"><input aria-label={`Annual saving for ${p.name}`} className="input editable-table__input editable-table__input--number" type="number" value={p.annualSaving} onChange={(e) => updateInvestToSaveProposal(p.id, { annualSaving: Number(e.target.value) || 0 })} /></td>
                        <td data-label="Payback" className="editable-table__number"><input aria-label={`Payback years for ${p.name}`} className="input editable-table__input editable-table__input--number" type="number" value={p.paybackYears} onChange={(e) => updateInvestToSaveProposal(p.id, { paybackYears: Number(e.target.value) || 1 })} /></td>
                        <td data-label="Start Yr">
                          <select aria-label={`Start year for ${p.name}`} className="input editable-table__select" value={p.deliveryYear} onChange={(e) => updateInvestToSaveProposal(p.id, { deliveryYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>
                            {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Y{y}</option>)}
                          </select>
                        </td>
                        <td data-label="Action" className="editable-table__action"><button aria-label={`Remove invest-to-save proposal ${p.name}`} className="editable-table__delete" onClick={() => removeInvestToSaveProposal(p.id)} title={`Remove invest-to-save proposal ${p.name}`}><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              <div className="editable-table-wrap" data-testid="income-generation-table">
                <table className="editable-table editable-table--compact">
                  <colgroup>
                    <col style={{ width: '260px' }} />
                    <col style={{ width: '104px' }} />
                    <col style={{ width: '104px' }} />
                    <col style={{ width: '104px' }} />
                    <col style={{ width: '104px' }} />
                    <col style={{ width: '64px' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {['Line', 'Volume', 'Price', 'Vol %', 'Price %', 'Action'].map((heading) => (
                        <th key={heading} className={heading === 'Line' ? undefined : 'editable-table__number'}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {baseline.incomeGenerationWorkbook.lines.map((line) => (
                      <tr key={line.id}>
                        <td data-label="Line"><input aria-label={`Income line name for ${line.name}`} className="input editable-table__input" value={line.name} onChange={(e) => updateIncomeLine(line.id, { name: e.target.value })} /></td>
                        <td data-label="Volume" className="editable-table__number"><input aria-label={`Base volume for ${line.name}`} className="input editable-table__input editable-table__input--number" type="number" value={line.baseVolume} onChange={(e) => updateIncomeLine(line.id, { baseVolume: Number(e.target.value) || 0 })} /></td>
                        <td data-label="Price" className="editable-table__number"><input aria-label={`Base price for ${line.name}`} className="input editable-table__input editable-table__input--number" type="number" value={line.basePrice} onChange={(e) => updateIncomeLine(line.id, { basePrice: Number(e.target.value) || 0 })} /></td>
                        <td data-label="Vol %" className="editable-table__number"><input aria-label={`Volume growth for ${line.name}`} className="input editable-table__input editable-table__input--number" type="number" value={line.volumeGrowth} onChange={(e) => updateIncomeLine(line.id, { volumeGrowth: Number(e.target.value) || 0 })} /></td>
                        <td data-label="Price %" className="editable-table__number"><input aria-label={`Price growth for ${line.name}`} className="input editable-table__input editable-table__input--number" type="number" value={line.priceGrowth} onChange={(e) => updateIncomeLine(line.id, { priceGrowth: Number(e.target.value) || 0 })} /></td>
                        <td data-label="Action" className="editable-table__action"><button aria-label={`Remove income line ${line.name}`} className="editable-table__delete" onClick={() => removeIncomeLine(line.id)} title={`Remove income line ${line.name}`}><Trash2 size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Growth & Manual Overrides</CardTitle><RichTooltip content="Configure growth proposals and explicit manual adjustments with reasons." /></div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#10b981] text-[11px] font-semibold cursor-pointer hover:bg-[rgba(16,185,129,0.2)] transition-colors" title="Import growth proposals from CSV or Excel.">
                <Upload size={11} />
                Import Growth CSV/XLSX
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleGrowthImport} />
              </label>
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#10b981] text-[11px] font-semibold cursor-pointer hover:bg-[rgba(16,185,129,0.2)] transition-colors" title="Import manual overrides from CSV or Excel.">
                <Upload size={11} />
                Import Override CSV/XLSX
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleOverrideImport} />
              </label>
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
            {renderImportStatus(growthImportStatus)}
            {renderImportStatus(overrideImportStatus)}
            {baseline.growthProposals.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Growth Proposals</p>
                <div className="editable-table-wrap" data-testid="growth-proposals-table">
                  <table className="editable-table editable-table--growth">
                    <colgroup>
                      <col style={{ width: '190px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '96px' }} />
                      <col style={{ width: '86px' }} />
                      <col style={{ width: '112px' }} />
                      <col style={{ width: '104px' }} />
                      {[1, 2, 3, 4, 5].map((year) => <col key={year} style={{ width: '84px' }} />)}
                      <col style={{ width: '220px' }} />
                      <col style={{ width: '64px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {['Proposal', 'Service', 'Owner', 'Value', 'Start Yr', 'Recurrence', 'Confidence', 'Y1 %', 'Y2 %', 'Y3 %', 'Y4 %', 'Y5 %', 'Notes', 'Action'].map((heading) => (
                          <th key={heading} className={['Value', 'Start Yr', 'Confidence', 'Y1 %', 'Y2 %', 'Y3 %', 'Y4 %', 'Y5 %', 'Action'].includes(heading) ? 'editable-table__number' : undefined}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {baseline.growthProposals.map((g) => (
                        <tr key={g.id}>
                          <td data-label="Proposal"><input aria-label={`Growth proposal name for ${g.name}`} className="input editable-table__input" placeholder="Proposal" value={g.name} onChange={(e) => updateGrowthProposal(g.id, { name: e.target.value })} /></td>
                          <td data-label="Service"><input aria-label={`Service for growth proposal ${g.name}`} className="input editable-table__input" placeholder="Service" value={g.service} onChange={(e) => updateGrowthProposal(g.id, { service: e.target.value })} /></td>
                          <td data-label="Owner"><input aria-label={`Owner for growth proposal ${g.name}`} className="input editable-table__input" placeholder="Owner" value={g.owner} onChange={(e) => updateGrowthProposal(g.id, { owner: e.target.value })} /></td>
                          <td data-label="Value" className="editable-table__number"><input aria-label={`Value for growth proposal ${g.name}`} className="input editable-table__input editable-table__input--number" type="number" value={g.value} onChange={(e) => updateGrowthProposal(g.id, { value: Number(e.target.value) || 0 })} /></td>
                          <td data-label="Start Yr"><select aria-label={`Start year for growth proposal ${g.name}`} className="input editable-table__select" value={g.deliveryYear} onChange={(e) => updateGrowthProposal(g.id, { deliveryYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Y{y}</option>)}</select></td>
                          <td data-label="Recurrence"><select aria-label={`Recurrence for growth proposal ${g.name}`} className="input editable-table__select" value={g.isRecurring ? 'yes' : 'no'} onChange={(e) => updateGrowthProposal(g.id, { isRecurring: e.target.value === 'yes' })}><option value="yes">Recurring</option><option value="no">One-off</option></select></td>
                          <td data-label="Confidence" className="editable-table__number"><input aria-label={`Confidence for growth proposal ${g.name}`} className="input editable-table__input editable-table__input--number" type="number" value={g.confidence} onChange={(e) => updateGrowthProposal(g.id, { confidence: Number(e.target.value) || 0 })} /></td>
                          {([0, 1, 2, 3, 4] as const).map((i) => (
                            <td key={`${g.id}-phase-${i}`} data-label={`Y${i + 1} %`} className="editable-table__number">
                              <input
                                aria-label={`Year ${i + 1} phasing for growth proposal ${g.name}`}
                                className="input editable-table__input editable-table__input--number"
                                type="number"
                                value={g.yearlyPhasing[i]}
                                onChange={(e) => {
                                  const next = [...g.yearlyPhasing] as [number, number, number, number, number];
                                  next[i] = Number(e.target.value) || 0;
                                  updateGrowthProposal(g.id, { yearlyPhasing: next });
                                }}
                              />
                            </td>
                          ))}
                          <td data-label="Notes"><input aria-label={`Notes for growth proposal ${g.name}`} className="input editable-table__input" placeholder="Notes" value={g.notes} onChange={(e) => updateGrowthProposal(g.id, { notes: e.target.value })} /></td>
                          <td data-label="Action" className="editable-table__action"><button aria-label={`Remove growth proposal ${g.name}`} className="editable-table__delete" onClick={() => removeGrowthProposal(g.id)} title={`Remove growth proposal ${g.name}`}><Trash2 size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {baseline.manualAdjustments.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Manual Overrides</p>
                <div className="editable-table-wrap" data-testid="manual-overrides-table">
                  <table className="editable-table editable-table--manual">
                    <colgroup>
                      <col style={{ width: '200px' }} />
                      <col style={{ width: '86px' }} />
                      <col style={{ width: '112px' }} />
                      <col style={{ width: '320px' }} />
                      <col style={{ width: '64px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {['Service', 'Year', 'Amount', 'Reason', 'Action'].map((heading) => (
                          <th key={heading} className={['Year', 'Amount', 'Action'].includes(heading) ? 'editable-table__number' : undefined}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {baseline.manualAdjustments.map((a) => (
                        <tr key={a.id}>
                          <td data-label="Service"><input aria-label={`Service for manual override ${a.service}`} className="input editable-table__input" value={a.service} onChange={(e) => updateManualAdjustment(a.id, { service: e.target.value })} /></td>
                          <td data-label="Year"><select aria-label={`Year for manual override ${a.service}`} className="input editable-table__select" value={a.year} onChange={(e) => updateManualAdjustment(a.id, { year: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>{[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Y{y}</option>)}</select></td>
                          <td data-label="Amount" className="editable-table__number"><input aria-label={`Amount for manual override ${a.service}`} className="input editable-table__input editable-table__input--number" type="number" value={a.amount} onChange={(e) => updateManualAdjustment(a.id, { amount: Number(e.target.value) || 0 })} /></td>
                          <td data-label="Reason"><input aria-label={`Reason for manual override ${a.service}`} className="input editable-table__input" value={a.reason} onChange={(e) => updateManualAdjustment(a.id, { reason: e.target.value })} placeholder="Override reason" /></td>
                          <td data-label="Action" className="editable-table__action"><button aria-label={`Remove manual override ${a.service}`} className="editable-table__delete" onClick={() => removeManualAdjustment(a.id)} title={`Remove manual override ${a.service}`}><Trash2 size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Reserves Methodology</CardTitle><RichTooltip content="Selects how minimum reserves threshold is set for resilience checks." /></div>
            {renderA31Actions('Reserves Methodology')}
          </CardHeader>
          <div className="space-y-3 text-[11px]">
            <div className={`rounded-lg border p-3 ${statusStyle(reservesStatus.tone)}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-widest">Reserve assurance</p>
                <span className="mono text-[12px]">{reservesStatus.label}</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed opacity-90">{reservesStatus.soWhat}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">Method</p>
              <select className="input" value={baseline.reservesAdequacyMethodology.method} onChange={(e) => updateReservesAdequacyMethodology({ method: e.target.value as ReservesAdequacyMethod })}>
                <option value="fixed">Fixed minimum (£)</option>
                <option value="pct_of_net_budget">% of net budget</option>
                <option value="risk_based">Risk-based model</option>
              </select>
              <p className="mt-1 text-[10px] text-[#8ca0c0]">{methodExplanation(baseline.reservesAdequacyMethodology.method)}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">Fixed Minimum Threshold (£k)</p>
                <input className="input" type="number" value={baseline.reservesAdequacyMethodology.fixedMinimum} onChange={(e) => updateReservesAdequacyMethodology({ fixedMinimum: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">Threshold as % of Net Budget</p>
                <input className="input" type="number" value={baseline.reservesAdequacyMethodology.pctOfNetBudget} onChange={(e) => updateReservesAdequacyMethodology({ pctOfNetBudget: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="rounded-lg border border-[rgba(74,96,128,0.35)] overflow-hidden">
              {[
                ['Closing reserves', fmtK(closingReserves)],
                ['Effective threshold', fmtK(reserveThreshold)],
                ['Headroom / shortfall', fmtK(reservesGapToThreshold)],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[1fr_120px] gap-3 px-3 py-2 border-b border-[rgba(74,96,128,0.25)] last:border-b-0">
                  <span className="text-[#8ca0c0]">{label}</span>
                  <span className="mono text-right text-[#f0f4ff]">{value}</span>
                </div>
              ))}
            </div>
            {baseline.reservesAdequacyMethodology.method === 'risk_based' && (
              <p className="text-[10px] text-[#8ca0c0]">Risk-based source: recommended minimum reserves from assessed reserve risk components is <span className="mono text-[#f0f4ff]">{fmtK(result.recommendedMinimumReserves)}</span>.</p>
            )}
            {reserveValidation.length > 0 && (
              <div className="text-[10px] text-[#f59e0b] space-y-1">
                {reserveValidation.map((message) => <p key={message} className="flex items-start gap-1"><AlertTriangle size={10} className="mt-0.5 shrink-0" />{message}</p>)}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>Treasury Indicators</CardTitle><RichTooltip content="Tracks prudential limits and flags potential treasury breaches." /></div>
            {renderA31Actions('Treasury Indicators', baseline.treasuryIndicators.enabled)}
          </CardHeader>
          <div className="space-y-3 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={baseline.treasuryIndicators.enabled} onChange={(e) => updateTreasuryIndicators({ enabled: e.target.checked })} />Enable indicators</label>
            <div className={`rounded-lg border p-3 ${statusStyle(treasuryStatus.tone)}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-widest">Treasury status</p>
                <span className="mono text-[12px]">{treasuryStatus.label}</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed opacity-90">{treasuryStatus.soWhat}</p>
            </div>
            <div className="rounded-lg border border-[rgba(74,96,128,0.35)] overflow-hidden">
              <div className="grid grid-cols-[1fr_128px] gap-3 px-3 py-2 bg-[rgba(74,96,128,0.12)]">
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Indicator</p>
                <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Value</p>
              </div>
              {[
                { label: 'Authorised Limit', value: baseline.treasuryIndicators.authorisedLimit, update: (value: number) => updateTreasuryIndicators({ authorisedLimit: value }), aria: 'Authorised limit in thousands of pounds', editable: true },
                { label: 'Operational Boundary', value: baseline.treasuryIndicators.operationalBoundary, update: (value: number) => updateTreasuryIndicators({ operationalBoundary: value }), aria: 'Operational boundary in thousands of pounds', editable: true },
                { label: 'Net Financing Need', value: baseline.treasuryIndicators.netFinancingNeed, update: (value: number) => updateTreasuryIndicators({ netFinancingNeed: value }), aria: 'Net financing need in thousands of pounds', editable: true },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-[1fr_128px] gap-3 items-center px-3 py-2 border-t border-[rgba(74,96,128,0.25)]">
                  <p className="text-[10px] text-[#8ca0c0]">{row.label}</p>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-[10px] text-[#4a6080]">£</span>
                    <input className="input text-right" type="number" value={row.value} onChange={(e) => row.update(Number(e.target.value) || 0)} aria-label={row.aria} />
                    <span className="text-[10px] text-[#4a6080]">k</span>
                  </div>
                </div>
              ))}
              {[
                ['Headroom to operational boundary', fmtK(treasuryHeadroomOperational)],
                ['Headroom to authorised limit', fmtK(treasuryHeadroomAuthorised)],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[1fr_128px] gap-3 items-center px-3 py-2 border-t border-[rgba(74,96,128,0.25)]">
                  <p className="text-[10px] text-[#8ca0c0]">{label}</p>
                  <p className="mono text-right text-[#f0f4ff]">{value}</p>
                </div>
              ))}
            </div>
            {baseline.treasuryIndicators.enabled && result.treasuryBreaches.length > 0 && (
              <div className="text-[10px] text-[#ef4444] space-y-1">
                {result.treasuryBreaches.map((b) => <p key={b} className="flex items-center gap-1"><AlertTriangle size={10} />{b}</p>)}
              </div>
            )}
            {treasuryValidation.length > 0 && (
              <div className="text-[10px] text-[#f59e0b] space-y-1">
                {treasuryValidation.map((message) => <p key={message} className="flex items-start gap-1"><AlertTriangle size={10} className="mt-0.5 shrink-0" />{message}</p>)}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-1.5"><CardTitle>MRP Calculator</CardTitle><RichTooltip content="Applies selected MRP policy to calculate annual revenue charges." /></div>
            {renderA31Actions('MRP Calculator', baseline.mrpCalculator.enabled)}
          </CardHeader>
          <div className="space-y-3 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={baseline.mrpCalculator.enabled} onChange={(e) => updateMrpCalculator({ enabled: e.target.checked })} />Enable MRP</label>
            {!baseline.mrpCalculator.enabled && (
              <div className={`rounded-lg border p-3 ${statusStyle('neutral')}`}>
                <p className="text-[10px] uppercase tracking-widest">MRP excluded</p>
                <p className="mt-1 text-[10px] leading-relaxed">MRP is not currently included in the MTFS calculation.</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">MRP Policy</p>
              <select className="input" value={baseline.mrpCalculator.policy} onChange={(e) => updateMrpCalculator({ policy: e.target.value as MrpPolicy })}>
                <option value="asset-life">Asset life</option>
                <option value="annuity">Annuity</option>
                <option value="straight-line">Straight-line</option>
              </select>
              <p className="mt-1 text-[10px] text-[#8ca0c0]">{mrpPolicyExplanation(baseline.mrpCalculator.policy)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
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
            </div>
            {baseline.mrpCalculator.enabled && (
              <div className="rounded-lg border border-[rgba(74,96,128,0.35)] overflow-hidden">
                <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-[rgba(74,96,128,0.12)]">
                  {['Y1', 'Y2', 'Y3', 'Y4', 'Y5'].map((year) => <p key={year} className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">{year}</p>)}
                </div>
                <div className="grid grid-cols-5 gap-2 px-3 py-2">
                  {result.mrpCharges.map((v, idx) => <p key={idx} className="mono text-right text-[#f0f4ff]">{fmtK(v)}</p>)}
                </div>
                <div className="grid grid-cols-[1fr_120px] gap-3 px-3 py-2 border-t border-[rgba(74,96,128,0.25)]">
                  <span className="text-[#8ca0c0]">Y1 revenue gap impact</span>
                  <span className="mono text-right text-[#f0f4ff]">{fmtK(mrpYear1Impact)}</span>
                </div>
                <div className="grid grid-cols-[1fr_120px] gap-3 px-3 py-2 border-t border-[rgba(74,96,128,0.25)]">
                  <span className="text-[#8ca0c0]">Five-year MRP total</span>
                  <span className="mono text-right text-[#f0f4ff]">{fmtK(mrpTotalImpact)}</span>
                </div>
              </div>
            )}
            {mrpValidation.length > 0 && (
              <div className="text-[10px] text-[#f59e0b] space-y-1">
                {mrpValidation.map((message) => <p key={message} className="flex items-start gap-1"><AlertTriangle size={10} className="mt-0.5 shrink-0" />{message}</p>)}
              </div>
            )}
          </div>
        </Card>
      </div>

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

      <Card>
        <CardHeader>
          <button
            type="button"
            className="flex items-center gap-2 text-left"
            onClick={() => setSourceReconOpen((open) => !open)}
            aria-label="Assurance / Evidence"
            aria-expanded={sourceReconOpen}
            aria-controls="source-data-reconciliation"
          >
            <ChevronDown size={14} className={`text-[#8ca0c0] transition-transform ${sourceReconOpen ? 'rotate-180' : ''}`} />
            <div className="flex items-center gap-1.5"><CardTitle>Assurance / Evidence</CardTitle><RichTooltip content="Evidence tools that support reconciliation and pack assurance without changing the model." /></div>
          </button>
          <span className="rounded border border-[rgba(74,96,128,0.35)] px-2 py-1 text-[10px] text-[#8ca0c0]">
            {reconciliationSummary.checks} checks · {reconciliationSummary.matched} matched · {reconciliationSummary.variances} variances
          </span>
        </CardHeader>
        {sourceReconOpen && (
          <div id="source-data-reconciliation" className="space-y-3 text-[11px]">
            <div className="rounded-xl border border-[rgba(74,96,128,0.35)] bg-[rgba(11,18,32,0.35)] p-3 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 max-w-3xl">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Source Data Reconciliation</p>
                    <RichTooltip content="Compare imported source values to the model without overwriting model data." />
                  </div>
                  <p className="text-[#8ca0c0]">Use this to compare imported finance source values against the model without changing the model.</p>
                </div>
                {renderA31Actions('Source Data Reconciliation', undefined, {
                  mappingProfiles: baseline.importMappingProfiles.length,
                  overlayImports: baseline.overlayImports.length,
                  reconciliationRows: result.reconciliationRows.length,
                })}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  ['Checks', reconciliationSummary.checks],
                  ['Matched', reconciliationSummary.matched],
                  ['Variances', reconciliationSummary.variances],
                  ['Missing / unmapped', reconciliationSummary.missing],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[rgba(74,96,128,0.25)] px-3 py-2">
                    <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">{label}</p>
                    <p className="mono text-[16px] text-[#f0f4ff]">{value}</p>
                  </div>
                ))}
              </div>

              {renderImportStatus(overlayImportStatus)}

              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-[rgba(99,179,237,0.22)] px-3 py-2 text-[11px] text-[#8ca0c0] hover:text-[#f0f4ff]"
                onClick={() => setAdvancedReconOpen((open) => !open)}
                aria-expanded={advancedReconOpen}
                aria-controls="advanced-reconciliation-setup"
              >
                <ChevronDown size={13} className={`transition-transform ${advancedReconOpen ? 'rotate-180' : ''}`} />
                Advanced reconciliation setup
              </button>

              {advancedReconOpen && (
                <div id="advanced-reconciliation-setup" className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="px-3 py-1.5 rounded bg-[rgba(59,130,246,0.12)] text-[#3b82f6] text-[11px]" onClick={addMappingProfile}>Add Mapping Profile</button>
                    <label className="px-3 py-1.5 rounded bg-[rgba(16,185,129,0.12)] text-[#10b981] text-[11px] cursor-pointer">
                      Import Overlay CSV/XLSX
                      <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleOverlayImportFile} />
                    </label>
                    <button className="px-3 py-1.5 rounded bg-[rgba(239,68,68,0.12)] text-[#ef4444] text-[11px]" onClick={() => clearOverlayImports()}>Clear Overlays</button>
                  </div>
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
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
