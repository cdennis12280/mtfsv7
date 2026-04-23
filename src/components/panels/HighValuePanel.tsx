import React from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle2, History, FileClock, Scale, Upload, Download } from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { RichTooltip } from '../ui/RichTooltip';
import type { GrantScheduleEntry, GrantCertainty } from '../../types/financial';

function fmtK(v: number) {
  return `£${Math.round(v).toLocaleString('en-GB')}k`;
}

export function HighValuePanel() {
  const {
    baseline,
    result,
    updateCouncilTaxBaseConfig,
    addGrantScheduleEntry,
    updateGrantScheduleEntry,
    removeGrantScheduleEntry,
    updateAscCohortModel,
    updateCapitalFinancing,
    updateRiskBasedReserves,
    updateReservesRecoveryPlan,
    assumptionHistory,
    auditTrail,
  } = useMTFSStore();

  const {
    councilTaxBaseConfig,
    grantSchedule,
    ascCohortModel,
    capitalFinancing,
    riskBasedReserves,
    reservesRecoveryPlan,
  } = baseline;
  const [grantImportStatus, setGrantImportStatus] = React.useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [isGrantTemplateLoading, setIsGrantTemplateLoading] = React.useState(false);

  const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const toNumber = (value: unknown, fallback = 0) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    const parsed = Number(String(value ?? '').replace(/[£,\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const toCertainty = (value: unknown): GrantCertainty => {
    const n = normalize(value);
    if (!n) return 'indicative';
    if (n.startsWith('confirm')) return 'confirmed';
    if (n.startsWith('assum')) return 'assumed';
    return 'indicative';
  };
  const toEndYear = (value: unknown): 1 | 2 | 3 | 4 | 5 => {
    const n = normalize(value);
    const parsed = Number(n.replace(/[^\d]/g, ''));
    const clamped = Math.min(5, Math.max(1, Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 3));
    return clamped as 1 | 2 | 3 | 4 | 5;
  };

  const parseGrantRows = (rows: (string | number)[][]): GrantScheduleEntry[] => {
    if (rows.length < 2) return [];
    const headers = rows[0].map((h) => normalize(h));
    const parsed: GrantScheduleEntry[] = [];
    for (let i = 1; i < rows.length; i += 1) {
      const rowValues = rows[i];
      if (!rowValues || rowValues.every((v) => String(v ?? '').trim() === '')) continue;
      const row: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        row[header] = rowValues[idx];
      });
      const pick = (...keys: string[]) => {
        for (const key of keys) {
          if (key in row) return row[key];
        }
        return undefined;
      };
      const name = String(pick('name', 'grantname', 'grant') ?? '').trim();
      const value = toNumber(pick('value', 'valuek', 'annualvalue', 'amount'));
      if (!name && value === 0) continue;
      parsed.push({
        id: `grant-import-${Date.now()}-${i}`,
        name: name || `Imported Grant ${i}`,
        value,
        certainty: toCertainty(pick('certainty', 'confidence')),
        endYear: toEndYear(pick('endyear', 'endy', 'yearend', 'ends')),
      });
    }
    return parsed;
  };

  const addGrant = () => {
    const entry: GrantScheduleEntry = {
      id: `grant-${Date.now()}`,
      name: '',
      value: 500,
      certainty: 'indicative',
      endYear: 3,
    };
    addGrantScheduleEntry(entry);
  };

  const handleGrantImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { read, utils } = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = read(data, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error('Import file contains no sheets');
      const rows = utils.sheet_to_json<(string | number)[]>(workbook.Sheets[firstSheet], { header: 1 });
      const imported = parseGrantRows(rows);
      if (imported.length === 0) throw new Error('No valid grant rows found. Check headers and values.');
      imported.forEach((g) => addGrantScheduleEntry(g));
      setGrantImportStatus({
        type: 'success',
        message: `Imported ${imported.length} grant entr${imported.length === 1 ? 'y' : 'ies'} from ${file.name}`,
      });
    } catch (error) {
      setGrantImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not import grant schedule file',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleGrantTemplateDownload = async () => {
    setIsGrantTemplateLoading(true);
    try {
      const { utils, write } = await import('xlsx');
      const headers = ['name', 'value', 'certainty', 'endYear'];
      const templateRows = [headers, ['', '', '', '']];
      const exampleRows = [
        headers,
        ['Public Health Grant', 4200, 'confirmed', 5],
        ['Household Support Fund', 1800, 'indicative', 2],
        ['Transformation Grant', 1250, 'assumed', 3],
        ['Supporting Families Grant', 900, 'indicative', 4],
      ];
      const instructionsRows = [
        ['Grant Schedule Builder Template - Instructions'],
        [''],
        ['Workbook tabs'],
        ['1) Template_Blank: complete this sheet and import it'],
        ['2) Example_Dummy_Data: sample completed entries'],
        ['3) Instructions: guidance and field definitions'],
        [''],
        ['How to use'],
        ['1) Keep header names exactly as supplied'],
        ['2) Enter one grant per row in Template_Blank'],
        ['3) certainty values: confirmed, indicative, assumed'],
        ['4) endYear values: 1 to 5 (MTFS year grant ends)'],
        ['5) Save as .xlsx/.xls or export as .csv'],
        ['6) In Grant Schedule Builder click Import CSV/XLSX and choose your file'],
        [''],
        ['Field definitions'],
        ['- name: grant label used in model and reports'],
        ['- value: annual grant value in £000'],
        ['- certainty: confidence weighting applied in funding calculations'],
        ['- endYear: final year grant remains available'],
        [''],
        ['Note'],
        ['- Import appends entries to existing grants; remove existing rows if replacing data.'],
      ];

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, utils.aoa_to_sheet(templateRows), 'Template_Blank');
      utils.book_append_sheet(workbook, utils.aoa_to_sheet(exampleRows), 'Example_Dummy_Data');
      utils.book_append_sheet(workbook, utils.aoa_to_sheet(instructionsRows), 'Instructions');

      const bytes = write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mtfs_grant_schedule_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      setGrantImportStatus({ type: 'success', message: 'Template downloaded: mtfs_grant_schedule_template.xlsx' });
    } catch {
      setGrantImportStatus({ type: 'error', message: 'Could not generate grant schedule template workbook. Please try again.' });
    } finally {
      setIsGrantTemplateLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle>Council Tax Base Configurator</CardTitle>
            <RichTooltip content="Builds council tax yield from tax base inputs and precept assumptions." />
          </div>
        </CardHeader>
        <div className="grid grid-cols-3 gap-3 text-[11px]">
          <label className="flex items-center gap-2 text-[#8ca0c0]">
            <input type="checkbox" checked={councilTaxBaseConfig.enabled} onChange={(e) => updateCouncilTaxBaseConfig({ enabled: e.target.checked })} title="Enable tax-base-driven council tax calculations." />
            Enable Band D model
          </label>
          <div>
            <p className="text-[#4a6080] mb-1">Band D Dwellings</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.bandDEquivalentDwellings} onChange={(e) => updateCouncilTaxBaseConfig({ bandDEquivalentDwellings: Number(e.target.value) || 0 })} title="Band D equivalent tax base." />
          </div>
          <div>
            <p className="text-[#4a6080] mb-1">Band D Charge (£)</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.bandDCharge} onChange={(e) => updateCouncilTaxBaseConfig({ bandDCharge: Number(e.target.value) || 0 })} title="Band D annual charge in pounds." />
          </div>
          <div>
            <p className="text-[#4a6080] mb-1">Collection Rate %</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.collectionRate} onChange={(e) => updateCouncilTaxBaseConfig({ collectionRate: Number(e.target.value) || 0 })} title="Expected collection performance percentage." />
          </div>
          <div>
            <p className="text-[#4a6080] mb-1">Core Precept %</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.corePreceptPct} onChange={(e) => updateCouncilTaxBaseConfig({ corePreceptPct: Number(e.target.value) || 0 })} title="Core council tax increase percentage." />
          </div>
          <div>
            <p className="text-[#4a6080] mb-1">ASC Precept %</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.ascPreceptPct} onChange={(e) => updateCouncilTaxBaseConfig({ ascPreceptPct: Number(e.target.value) || 0 })} title="Adult social care precept percentage." />
          </div>
          <div>
            <p className="text-[#4a6080] mb-1">Parish Precepts (£k)</p>
            <input type="number" className="w-full input" value={councilTaxBaseConfig.parishPrecepts} onChange={(e) => updateCouncilTaxBaseConfig({ parishPrecepts: Number(e.target.value) || 0 })} title="Total parish and town precepts in thousands of pounds." />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle>Grant Schedule Builder</CardTitle>
            <RichTooltip content="Models grant certainty and expiry over the MTFS horizon." />
          </div>
          <div className="flex items-center gap-2">
            <label
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#10b981] text-[11px] font-semibold cursor-pointer hover:bg-[rgba(16,185,129,0.2)] transition-colors"
              title="Import grant schedule from CSV or Excel."
            >
              <Upload size={11} />
              Import CSV/XLSX
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleGrantImportFile} />
            </label>
            <button
              onClick={() => void handleGrantTemplateDownload()}
              disabled={isGrantTemplateLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Download grant schedule import template with dummy example and instructions."
            >
              <Download size={11} />
              {isGrantTemplateLoading ? 'Preparing...' : 'Download Template'}
            </button>
            <button onClick={addGrant} className="text-[11px] text-[#3b82f6] flex items-center gap-1" title="Add a new grant line."><Plus size={12} />Add Grant</button>
          </div>
        </CardHeader>
        <div className="space-y-2">
          <p className="text-[10px] text-[#4a6080]">
            Grant schedule lines are added on top of the baseline <span className="text-[#8ca0c0] font-semibold">Core Grants</span> value.
          </p>
          {grantImportStatus.type !== 'idle' && (
            <div
              className="flex items-start gap-2 p-2.5 rounded-lg text-[11px]"
              style={{
                background: grantImportStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${grantImportStatus.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}
            >
              {grantImportStatus.type === 'success'
                ? <CheckCircle2 size={12} className="text-[#10b981] mt-0.5 shrink-0" />
                : <AlertTriangle size={12} className="text-[#ef4444] mt-0.5 shrink-0" />
              }
              <span style={{ color: grantImportStatus.type === 'success' ? '#10b981' : '#ef4444' }}>{grantImportStatus.message}</span>
            </div>
          )}
          {grantSchedule.length === 0 && <p className="text-[11px] text-[#4a6080]">No grants configured.</p>}
          {grantSchedule.length > 0 && (
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center px-1">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Grant</p>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Value (£k)</p>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Certainty</p>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">End Year</p>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Action</p>
            </div>
          )}
          {grantSchedule.map((g) => (
            <div key={g.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
              <input className="input" placeholder="Grant name" value={g.name} onChange={(e) => updateGrantScheduleEntry(g.id, { name: e.target.value })} title="Grant label used in reports." />
              <input type="number" className="input" value={g.value} onChange={(e) => updateGrantScheduleEntry(g.id, { value: Number(e.target.value) || 0 })} title="Annual grant value in £000s." />
              <select className="input" value={g.certainty} onChange={(e) => updateGrantScheduleEntry(g.id, { certainty: e.target.value as GrantCertainty })} title="Confidence level used in weighted funding calculations.">
                <option value="confirmed">Confirmed</option>
                <option value="indicative">Indicative</option>
                <option value="assumed">Assumed</option>
              </select>
              <select className="input" value={g.endYear} onChange={(e) => updateGrantScheduleEntry(g.id, { endYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })} title="Final MTFS year this grant is assumed to continue.">
                {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Ends Y{y}</option>)}
              </select>
              <button onClick={() => removeGrantScheduleEntry(g.id)} className="text-[#ef4444]" title="Remove this grant line."><Trash2 size={12} /></button>
            </div>
          ))}
          {result.grantsExpiringInYears.length > 0 && (
            <p className="text-[10px] text-[#f59e0b]">Expiring during MTFS: {result.grantsExpiringInYears.join(', ')}</p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>ASC Demand by Cohort</CardTitle><RichTooltip content="Separates demand assumptions for working-age and older adult cohorts." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={ascCohortModel.enabled} onChange={(e) => updateAscCohortModel({ enabled: e.target.checked })} />Enable cohort model</label>
            <div className="grid grid-cols-[1fr_120px] gap-2 px-1">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Measure</p>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Value</p>
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Population 18-64</p>
              <input className="input text-right" type="number" value={ascCohortModel.population18to64} onChange={(e) => updateAscCohortModel({ population18to64: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Population 65+</p>
              <input className="input text-right" type="number" value={ascCohortModel.population65plus} onChange={(e) => updateAscCohortModel({ population65plus: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Prevalence 18-64 (%)</p>
              <input className="input text-right" type="number" value={ascCohortModel.prevalence18to64} onChange={(e) => updateAscCohortModel({ prevalence18to64: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Prevalence 65+ (%)</p>
              <input className="input text-right" type="number" value={ascCohortModel.prevalence65plus} onChange={(e) => updateAscCohortModel({ prevalence65plus: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Unit Cost 18-64 (£)</p>
              <input className="input text-right" type="number" value={ascCohortModel.unitCost18to64} onChange={(e) => updateAscCohortModel({ unitCost18to64: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Unit Cost 65+ (£)</p>
              <input className="input text-right" type="number" value={ascCohortModel.unitCost65plus} onChange={(e) => updateAscCohortModel({ unitCost65plus: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Growth 18-64 (%)</p>
              <input className="input text-right" type="number" value={ascCohortModel.growth18to64} onChange={(e) => updateAscCohortModel({ growth18to64: Number(e.target.value) || 0 })} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2 items-center">
              <p className="text-[10px] text-[#8ca0c0]">Growth 65+ (%)</p>
              <input className="input text-right" type="number" value={ascCohortModel.growth65plus} onChange={(e) => updateAscCohortModel({ growth65plus: Number(e.target.value) || 0 })} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Capital Financing Costs</CardTitle><RichTooltip content="Adds borrowing, interest and MRP effects into the revenue forecast." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={capitalFinancing.enabled} onChange={(e) => updateCapitalFinancing({ enabled: e.target.checked })} />Enable capital financing</label>
            <div>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest mb-1">Borrowing by Year (£k)</p>
              <div className="grid grid-cols-5 gap-1 px-1">
                {[1, 2, 3, 4, 5].map((y) => (
                  <p key={y} className="text-[9px] text-[#4a6080] text-center uppercase tracking-widest">Y{y}</p>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {capitalFinancing.borrowingByYear.map((v, i) => (
                <input
                  key={i}
                  className="input"
                  type="number"
                  value={v}
                  onChange={(e) => {
                    const arr = [...capitalFinancing.borrowingByYear] as [number, number, number, number, number];
                    arr[i] = Number(e.target.value) || 0;
                    updateCapitalFinancing({ borrowingByYear: arr });
                  }}
                  aria-label={`Borrowing year ${i + 1} in thousands of pounds`}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 px-1">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Interest Rate (%)</p>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">MRP Rate (%)</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="number" value={capitalFinancing.interestRate} onChange={(e) => updateCapitalFinancing({ interestRate: Number(e.target.value) || 0 })} />
              <input className="input" type="number" value={capitalFinancing.mrpRate} onChange={(e) => updateCapitalFinancing({ mrpRate: Number(e.target.value) || 0 })} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Risk-Based Reserves Calculator</CardTitle><RichTooltip content="Builds recommended reserves from explicit quantified risk pots." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={riskBasedReserves.enabled} onChange={(e) => updateRiskBasedReserves({ enabled: e.target.checked })} />Enable risk pot calculation</label>
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={riskBasedReserves.adoptAsMinimumThreshold} onChange={(e) => updateRiskBasedReserves({ adoptAsMinimumThreshold: e.target.checked })} />Adopt as minimum threshold</label>
            <div className="grid grid-cols-[1fr_130px] gap-2 px-1">
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest">Risk Pot</p>
              <p className="text-[10px] text-[#4a6080] uppercase tracking-widest text-right">Value (£k)</p>
            </div>
            {(['demandVolatility', 'savingsNonDelivery', 'fundingUncertainty', 'litigationRisk'] as const).map((k) => (
              <div key={k} className="grid grid-cols-[1fr_130px] gap-2 items-center">
                <span className="text-[#8ca0c0]">{k}</span>
                <input className="input text-right" type="number" value={riskBasedReserves[k]} onChange={(e) => updateRiskBasedReserves({ [k]: Number(e.target.value) || 0 })} />
              </div>
            ))}
            <p className="text-[10px] text-[#8ca0c0]">Recommended minimum: <span className="mono text-[#f0f4ff]">{fmtK(result.recommendedMinimumReserves)}</span></p>
          </div>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Reserves Rebuilding Plan</CardTitle><RichTooltip content="Models contributions needed to restore reserves by target year." /></div></CardHeader>
          <div className="space-y-2 text-[11px]">
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={reservesRecoveryPlan.enabled} onChange={(e) => updateReservesRecoveryPlan({ enabled: e.target.checked })} />Enable rebuild plan</label>
            <label className="flex items-center gap-2 text-[#8ca0c0]"><input type="checkbox" checked={reservesRecoveryPlan.autoCalculate} onChange={(e) => updateReservesRecoveryPlan({ autoCalculate: e.target.checked })} />Auto-calculate annual contribution</label>
            <div className="grid grid-cols-2 gap-2">
              <select className="input" value={reservesRecoveryPlan.targetYear} onChange={(e) => updateReservesRecoveryPlan({ targetYear: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}>
                {[1, 2, 3, 4, 5].map((y) => <option key={y} value={y}>Target by Y{y}</option>)}
              </select>
              <input className="input" type="number" value={reservesRecoveryPlan.targetLevel} onChange={(e) => updateReservesRecoveryPlan({ targetLevel: Number(e.target.value) || 0 })} placeholder="Target level £000s" />
              <input className="input col-span-2" type="number" value={reservesRecoveryPlan.annualContribution} onChange={(e) => updateReservesRecoveryPlan({ annualContribution: Number(e.target.value) || 0 })} placeholder="Manual annual contribution £000s" />
            </div>
            <p className="text-[10px] text-[#8ca0c0]">Effective threshold used in engine: <span className="mono text-[#f0f4ff]">{fmtK(result.effectiveMinimumReservesThreshold)}</span></p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5"><CardTitle>Draft s.114 Trigger Assessment</CardTitle><RichTooltip content="Flags statutory warning indicators based on modeled sustainability risks." /></div>
          {result.s114Triggered ? <AlertTriangle size={14} className="text-[#ef4444]" /> : <CheckCircle2 size={14} className="text-[#10b981]" />}
        </CardHeader>
        <div className="text-[11px] text-[#8ca0c0]">
          <p className={result.s114Triggered ? 'text-[#ef4444] font-semibold' : 'text-[#10b981] font-semibold'}>
            {result.s114Triggered ? 'AT RISK: s.114 consideration likely required' : 'No immediate s.114 trigger under current tests'}
          </p>
          {result.s114Reasons.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.s114Reasons.map((reason) => (
                <li key={reason} className="flex items-center gap-2"><Scale size={10} className="text-[#f59e0b]" />{reason}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Assumptions Version History</CardTitle><RichTooltip content="Chronological record of assumptions snapshots for due-diligence evidence." /></div><History size={14} className="text-[#4a6080]" /></CardHeader>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {[...assumptionHistory].reverse().slice(0, 30).map((h) => (
              <div key={h.id} className="text-[10px] py-1 border-b border-[rgba(99,179,237,0.06)]">
                <p className="text-[#f0f4ff]">{h.description}</p>
                <p className="text-[#4a6080] mono">{new Date(h.timestamp).toLocaleString('en-GB')}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-1.5"><CardTitle>Audit Trail Log</CardTitle><RichTooltip content="Immutable run log of outcomes and timestamps for governance scrutiny." /></div><FileClock size={14} className="text-[#4a6080]" /></CardHeader>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {[...auditTrail].reverse().slice(0, 50).map((a) => (
              <div key={a.id} className="text-[10px] py-1 border-b border-[rgba(99,179,237,0.06)]">
                <p className="text-[#f0f4ff]">{a.description}</p>
                <p className="text-[#8ca0c0] mono">Gap {fmtK(a.totalGap)} · Structural {fmtK(a.totalStructuralGap)} · Risk {a.overallRiskScore.toFixed(0)}</p>
                <p className="text-[#4a6080] mono">{new Date(a.timestamp).toLocaleString('en-GB')}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
