import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, PiggyBank, Upload, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card } from '../ui/Card';
import type { NamedReserve, ReserveCategory } from '../../types/financial';

function fmtK(v: number) {
  return `£${Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: 0 })}k`;
}

const YEAR_LABELS = ['Yr 1', 'Yr 2', 'Yr 3', 'Yr 4', 'Yr 5'];
const RESERVE_CATEGORY_LABELS: Record<ReserveCategory, string> = {
  general_fund: 'General Fund',
  service_specific: 'Service Specific',
  ringfenced: 'Ringfenced',
  technical: 'Technical',
};

const RESERVE_CATEGORY_COLORS: Record<ReserveCategory, string> = {
  general_fund: '#3b82f6',
  service_specific: '#8b5cf6',
  ringfenced: '#10b981',
  technical: '#f59e0b',
};

function reserveCategory(reserve: NamedReserve): ReserveCategory {
  return reserve.category ?? (reserve.isEarmarked ? 'service_specific' : 'general_fund');
}

function ReserveRow({ reserve }: { reserve: NamedReserve }) {
  const { updateNamedReserve, removeNamedReserve, result } = useMTFSStore();
  const [expanded, setExpanded] = useState(false);

  // Find this reserve in year results
  const yearResults = result.years.map(
    (y) => y.namedReserveResults.find((r) => r.id === reserve.id)
  );
  const closingY5 = yearResults[4]?.closingBalance ?? reserve.openingBalance;
  const category = reserveCategory(reserve);

  return (
    <div className="border border-[rgba(99,179,237,0.08)] rounded-xl mb-2 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[rgba(99,179,237,0.02)]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: RESERVE_CATEGORY_COLORS[category] }} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#f0f4ff] truncate">{reserve.name || 'Unnamed reserve'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ color: RESERVE_CATEGORY_COLORS[category], background: `${RESERVE_CATEGORY_COLORS[category]}1f` }}>
                {RESERVE_CATEGORY_LABELS[category]}
              </span>
              {reserve.purpose && <span className="text-[9px] text-[#4a6080] truncate">{reserve.purpose}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="mono text-[11px] font-bold text-[#f0f4ff]">{fmtK(reserve.openingBalance)}</p>
            <p className="text-[9px] text-[#4a6080]">opening</p>
          </div>
          <div className="text-right">
            <p className={`mono text-[11px] font-bold ${closingY5 < reserve.minimumBalance && reserve.minimumBalance > 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
              {fmtK(closingY5)}
            </p>
            <p className="text-[9px] text-[#4a6080]">Y5 closing</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); removeNamedReserve(reserve.id); }}
            className="p-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.2)] transition-colors"
          >
            <Trash2 size={11} />
          </button>
          {expanded ? <ChevronDown size={13} className="text-[#4a6080]" /> : <ChevronRight size={13} className="text-[#4a6080]" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 bg-[rgba(99,179,237,0.02)]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Reserve Name</label>
              <input
                type="text"
                value={reserve.name}
                onChange={(e) => updateNamedReserve(reserve.id, { name: e.target.value })}
                placeholder="e.g. Insurance Reserve"
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none focus:border-[rgba(59,130,246,0.5)]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Purpose / Description</label>
              <input
                type="text"
                value={reserve.purpose}
                onChange={(e) => updateNamedReserve(reserve.id, { purpose: e.target.value })}
                placeholder="e.g. Self-insurance for property and liability claims"
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Opening Balance (£000s)</label>
              <input
                type="number"
                value={reserve.openingBalance}
                step={100}
                onChange={(e) => updateNamedReserve(reserve.id, { openingBalance: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] mono text-[#f0f4ff] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Minimum Balance (£000s)</label>
              <input
                type="number"
                value={reserve.minimumBalance}
                step={100}
                onChange={(e) => updateNamedReserve(reserve.id, { minimumBalance: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] mono text-[#f0f4ff] outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#4a6080] block mb-1">Reserve Category</label>
              <select
                className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-3 py-1.5 text-[11px] text-[#f0f4ff] outline-none"
                value={category}
                onChange={(e) => {
                  const next = e.target.value as ReserveCategory;
                  updateNamedReserve(reserve.id, { category: next, isEarmarked: next !== 'general_fund' });
                }}
              >
                <option value="general_fund">General Fund</option>
                <option value="service_specific">Service Specific</option>
                <option value="ringfenced">Ringfenced</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          </div>

          {/* Contributions by year */}
          <div>
            <label className="text-[10px] text-[#4a6080] block mb-2">Planned Contributions (£000s per year)</label>
            <div className="grid grid-cols-5 gap-2">
              {YEAR_LABELS.map((label, i) => (
                <div key={i}>
                  <p className="text-[9px] text-[#4a6080] text-center mb-1">{label}</p>
                  <input
                    type="number"
                    value={reserve.plannedContributions[i]}
                    step={100}
                    onChange={(e) => {
                      const arr = [...reserve.plannedContributions] as [number, number, number, number, number];
                      arr[i] = parseFloat(e.target.value) || 0;
                      updateNamedReserve(reserve.id, { plannedContributions: arr });
                    }}
                    className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-2 py-1.5 text-[11px] mono text-[#10b981] outline-none text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Drawdowns by year */}
          <div>
            <label className="text-[10px] text-[#4a6080] block mb-2">Planned Drawdowns (£000s per year)</label>
            <div className="grid grid-cols-5 gap-2">
              {YEAR_LABELS.map((label, i) => (
                <div key={i}>
                  <p className="text-[9px] text-[#4a6080] text-center mb-1">{label}</p>
                  <input
                    type="number"
                    value={reserve.plannedDrawdowns[i]}
                    step={100}
                    onChange={(e) => {
                      const arr = [...reserve.plannedDrawdowns] as [number, number, number, number, number];
                      arr[i] = parseFloat(e.target.value) || 0;
                      updateNamedReserve(reserve.id, { plannedDrawdowns: arr });
                    }}
                    className="w-full bg-[#080c14] border border-[rgba(99,179,237,0.12)] rounded-lg px-2 py-1.5 text-[11px] mono text-[#f59e0b] outline-none text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Projection table */}
          {yearResults.some(Boolean) && (
            <div className="overflow-x-auto">
              <table className="w-full premium-table text-[10px]">
                <thead>
                  <tr className="border-b border-[rgba(99,179,237,0.06)]">
                    <th className="text-left py-1.5 text-[#4a6080] font-semibold pr-3">Year</th>
                    <th className="text-right py-1.5 text-[#4a6080] font-semibold px-2">Opening</th>
                    <th className="text-right py-1.5 text-[#10b981] font-semibold px-2">Contribution</th>
                    <th className="text-right py-1.5 text-[#f59e0b] font-semibold px-2">Drawdown</th>
                    <th className="text-right py-1.5 text-[#4a6080] font-semibold">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {yearResults.map((yr, i) =>
                    yr ? (
                      <tr key={i} className="border-b border-[rgba(99,179,237,0.04)]">
                        <td className="py-1 pr-3 text-[#8ca0c0]">{result.years[i].label}</td>
                        <td className="py-1 text-right mono px-2 text-[#8ca0c0]">{fmtK(yr.openingBalance)}</td>
                        <td className="py-1 text-right mono px-2 text-[#10b981]">
                          {yr.contribution > 0 ? `+${fmtK(yr.contribution)}` : '—'}
                        </td>
                        <td className="py-1 text-right mono px-2 text-[#f59e0b]">
                          {yr.drawdown > 0 ? `-${fmtK(yr.drawdown)}` : '—'}
                        </td>
                        <td className={`py-1 text-right mono font-bold ${yr.closingBalance < reserve.minimumBalance && reserve.minimumBalance > 0 ? 'text-[#ef4444]' : 'text-[#f0f4ff]'}`}>
                          {fmtK(yr.closingBalance)}
                        </td>
                      </tr>
                    ) : null
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NamedReservesManager() {
  const { baseline, addNamedReserve, result } = useMTFSStore();
  const { namedReserves } = baseline;
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'idle'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);

  const handleAdd = () => {
    const id = `nr-${Date.now()}`;
    const newReserve: NamedReserve = {
      id,
      name: '',
      purpose: '',
      category: 'service_specific',
      openingBalance: 1000,
      plannedContributions: [0, 0, 0, 0, 0],
      plannedDrawdowns: [0, 0, 0, 0, 0],
      isEarmarked: true,
      minimumBalance: 0,
    };
    addNamedReserve(newReserve);
  };

  const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const toNumber = (value: unknown, fallback = 0) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    const cleaned = String(value ?? '').replace(/[£,\s]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const toBool = (value: unknown, fallback = true) => {
    const n = normalize(value);
    if (!n) return fallback;
    if (['true', 'yes', 'y', '1'].includes(n)) return true;
    if (['false', 'no', 'n', '0'].includes(n)) return false;
    return fallback;
  };
  const toCategory = (value: unknown, isEarmarked: boolean): ReserveCategory => {
    const n = normalize(value);
    if (['generalfund', 'general', 'gf', 'generalreserve'].includes(n)) return 'general_fund';
    if (['servicespecific', 'service', 'service reserve', 'servicereserve'].includes(n)) return 'service_specific';
    if (['ringfenced', 'ringfence', 'restricted'].includes(n)) return 'ringfenced';
    if (['technical', 'technicalreserve'].includes(n)) return 'technical';
    return isEarmarked ? 'service_specific' : 'general_fund';
  };

  const reserveFromRow = (row: Record<string, unknown>, idx: number): NamedReserve | null => {
    const pick = (...keys: string[]) => {
      for (const key of keys) {
        if (key in row) return row[key];
      }
      return undefined;
    };
    const name = String(pick('name', 'reservename') ?? '').trim();
    const openingBalance = toNumber(pick('openingbalance', 'opening'));
    if (!name && openingBalance === 0) return null;
    const isEarmarked = toBool(pick('isearmarked', 'earmarked'), true);
    const category = toCategory(pick('category', 'reservecategory'), isEarmarked);

    return {
      id: `nr-import-${Date.now()}-${idx}`,
      name: name || `Imported Reserve ${idx + 1}`,
      purpose: String(pick('purpose', 'description') ?? '').trim(),
      category,
      openingBalance,
      isEarmarked: category !== 'general_fund',
      minimumBalance: toNumber(pick('minimumbalance', 'minimum')),
      plannedContributions: [
        toNumber(pick('contriby1', 'contributiony1', 'y1contrib')),
        toNumber(pick('contriby2', 'contributiony2', 'y2contrib')),
        toNumber(pick('contriby3', 'contributiony3', 'y3contrib')),
        toNumber(pick('contriby4', 'contributiony4', 'y4contrib')),
        toNumber(pick('contriby5', 'contributiony5', 'y5contrib')),
      ],
      plannedDrawdowns: [
        toNumber(pick('drawy1', 'drawdowny1', 'y1draw')),
        toNumber(pick('drawy2', 'drawdowny2', 'y2draw')),
        toNumber(pick('drawy3', 'drawdowny3', 'y3draw')),
        toNumber(pick('drawy4', 'drawdowny4', 'y4draw')),
        toNumber(pick('drawy5', 'drawdowny5', 'y5draw')),
      ],
    };
  };

  const parseRows = (rows: (string | number)[][]): NamedReserve[] => {
    if (rows.length < 2) return [];
    const headers = rows[0].map((h) => normalize(h));
    const parsed: NamedReserve[] = [];
    for (let i = 1; i < rows.length; i += 1) {
      const values = rows[i];
      if (!values || values.every((v) => String(v ?? '').trim() === '')) continue;
      const row: Record<string, unknown> = {};
      headers.forEach((header, colIdx) => {
        row[header] = values[colIdx];
      });
      const reserve = reserveFromRow(row, i);
      if (reserve) parsed.push(reserve);
    }
    return parsed;
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      let rows: (string | number)[][] = [];
      if (ext === 'xlsx' || ext === 'xls') {
        const { read, utils } = await import('xlsx');
        const data = await file.arrayBuffer();
        const workbook = read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) throw new Error('Spreadsheet contains no sheets');
        rows = utils.sheet_to_json<(string | number)[]>(workbook.Sheets[firstSheet], { header: 1 });
      } else {
        const text = await file.text();
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) throw new Error('CSV must include header row and at least one data row');
        const delimiter = lines[0].includes('\t') ? '\t' : ',';
        rows = lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
      }

      const imported = parseRows(rows);
      if (imported.length === 0) {
        throw new Error('No valid reserve rows found. Check headers and values.');
      }
      imported.forEach((r) => addNamedReserve(r));
      setImportStatus({
        type: 'success',
        message: `Imported ${imported.length} named reserve${imported.length === 1 ? '' : 's'} from ${file.name}`,
      });
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not import named reserves file',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    setIsTemplateLoading(true);
    try {
      const { utils, write } = await import('xlsx');
      const headers = [
        'name',
        'purpose',
        'category',
        'openingBalance',
        'isEarmarked',
        'minimumBalance',
        'contribY1',
        'contribY2',
        'contribY3',
        'contribY4',
        'contribY5',
        'drawY1',
        'drawY2',
        'drawY3',
        'drawY4',
        'drawY5',
      ];
      const templateRows = [headers, Array(headers.length).fill('')];
      const good1Rows = [
        headers,
        ['General Fund Reserve', 'Core resilience buffer', 'general_fund', 12500, false, 8000, 250, 250, 300, 300, 300, 400, 450, 500, 500, 550],
        ['Insurance Reserve', 'Property and liability risk pool', 'technical', 7200, true, 4000, 100, 100, 100, 100, 100, 250, 250, 275, 300, 300],
        ['Transformation Reserve', 'Invest-to-save and digital change', 'service_specific', 6500, true, 1500, 200, 200, 150, 100, 100, 700, 850, 950, 900, 750],
      ];
      const good2Rows = [
        headers,
        ['General Fund Reserve', 'Core resilience buffer', 'general_fund', 14500, false, 9000, 350, 350, 400, 450, 450, 300, 350, 400, 450, 500],
        ['Adult Social Care Pressures Reserve', 'Demand volatility cover', 'service_specific', 5100, true, 2500, 50, 50, 50, 50, 50, 450, 450, 500, 550, 600],
        ['Capital Risk Reserve', 'Capital financing volatility', 'technical', 4300, true, 2000, 75, 75, 75, 75, 75, 200, 250, 250, 300, 350],
      ];
      const badRows = [
        headers,
        ['General Fund Reserve', 'Overstretched reserve position', 'general_fund', 4200, false, 8000, 0, 0, 0, 0, 0, 700, 800, 900, 1000, 1100],
        ['Insurance Reserve', 'Underfunded claims risk', 'technical', 2100, true, 3500, 0, 0, 0, 0, 0, 350, 400, 450, 500, 550],
        ['Transformation Reserve', 'Heavy drawdown with low replenishment', 'service_specific', 1800, true, 1200, 25, 25, 25, 25, 25, 500, 550, 600, 650, 700],
      ];
      const instructionsRows = [
        ['Named Reserves Schedule Template - Instructions'],
        [''],
        ['What this workbook includes'],
        ['1) Template_Blank: empty import template'],
        ['2) Example_Good_1: healthy reserve profile'],
        ['3) Example_Good_2: prudent and stable reserve profile'],
        ['4) Example_Bad_1: stressed reserve profile (for training and stress testing)'],
        [''],
        ['How to import'],
        ['1) Keep header names unchanged'],
        ['2) Enter one reserve per row in Template_Blank'],
        ['3) Save as .xlsx/.xls or export as .csv'],
        ['4) In Named Reserves Schedule click Import CSV/XLSX and select your file'],
        [''],
        ['Field guidance'],
        ['- category accepts general_fund, service_specific, ringfenced, technical'],
        ['- openingBalance, minimumBalance, contribY1..Y5, drawY1..Y5 are in £000'],
        ['- isEarmarked accepts true/false, yes/no, 1/0'],
        ['- contrib* are planned contributions into reserve'],
        ['- draw* are planned drawdowns from reserve'],
        [''],
        ['Note'],
        ['- Import appends reserves to existing list. Use manual delete if replacement is required.'],
      ];

      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, utils.aoa_to_sheet(templateRows), 'Template_Blank');
      utils.book_append_sheet(workbook, utils.aoa_to_sheet(good1Rows), 'Example_Good_1');
      utils.book_append_sheet(workbook, utils.aoa_to_sheet(good2Rows), 'Example_Good_2');
      utils.book_append_sheet(workbook, utils.aoa_to_sheet(badRows), 'Example_Bad_1');
      utils.book_append_sheet(workbook, utils.aoa_to_sheet(instructionsRows), 'Instructions');

      const bytes = write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mtfs_named_reserves_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      setImportStatus({ type: 'success', message: 'Template downloaded: mtfs_named_reserves_template.xlsx' });
    } catch {
      setImportStatus({ type: 'error', message: 'Could not generate named reserves template workbook. Please try again.' });
    } finally {
      setIsTemplateLoading(false);
    }
  };

  const totalOpening = namedReserves.reduce((s, r) => s + r.openingBalance, 0);
  const totalY5 = namedReserves.reduce((s, r) => {
    const yr = result.years[4]?.namedReserveResults.find((nr) => nr.id === r.id);
    return s + (yr?.closingBalance ?? r.openingBalance);
  }, 0);
  const categoryOpening = namedReserves.reduce<Record<ReserveCategory, number>>((acc, r) => {
    acc[reserveCategory(r)] += r.openingBalance;
    return acc;
  }, { general_fund: 0, service_specific: 0, ringfenced: 0, technical: 0 });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[rgba(139,92,246,0.06)] border border-[rgba(139,92,246,0.15)]">
        <PiggyBank size={16} className="text-[#8b5cf6] mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-[#f0f4ff]">Named Reserves Schedule</p>
          <p className="text-[10px] text-[#8ca0c0] mt-1 leading-relaxed">
            Define individual named reserves with opening balances, planned contributions, and planned drawdowns for each year.
            When named reserves are entered, they replace the flat general fund / earmarked split used by default.
            The minimum balance field flags reserves that would breach their restricted floor.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <label
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] text-[#10b981] text-[11px] font-semibold cursor-pointer hover:bg-[rgba(16,185,129,0.2)] transition-colors"
            title="Import named reserves from CSV or Excel."
          >
            <Upload size={12} />
            Import CSV/XLSX
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFile} />
          </label>
          <button
            onClick={() => void handleDownloadTemplate()}
            disabled={isTemplateLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] text-[#3b82f6] text-[11px] font-semibold hover:bg-[rgba(59,130,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Download named reserves template with examples and instructions."
          >
            <Download size={12} />
            {isTemplateLoading ? 'Preparing Template...' : 'Download Template'}
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(139,92,246,0.15)] border border-[rgba(139,92,246,0.3)] text-[#8b5cf6] text-[11px] font-semibold hover:bg-[rgba(139,92,246,0.25)] transition-colors"
          >
            <Plus size={12} />
            Add Reserve
          </button>
        </div>
      </div>

      {importStatus.type !== 'idle' && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-[11px]"
          style={{
            background: importStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${importStatus.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}
        >
          {importStatus.type === 'success'
            ? <CheckCircle size={12} className="text-[#10b981] mt-0.5 shrink-0" />
            : <AlertTriangle size={12} className="text-[#ef4444] mt-0.5 shrink-0" />
          }
          <span style={{ color: importStatus.type === 'success' ? '#10b981' : '#ef4444' }}>{importStatus.message}</span>
        </div>
      )}

      {namedReserves.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Opening', value: fmtK(totalOpening), color: '#3b82f6' },
            { label: 'General Fund', value: fmtK(categoryOpening.general_fund), color: RESERVE_CATEGORY_COLORS.general_fund },
            { label: 'Service Specific', value: fmtK(categoryOpening.service_specific), color: RESERVE_CATEGORY_COLORS.service_specific },
            { label: 'Ringfenced', value: fmtK(categoryOpening.ringfenced), color: RESERVE_CATEGORY_COLORS.ringfenced },
            { label: 'Technical', value: fmtK(categoryOpening.technical), color: RESERVE_CATEGORY_COLORS.technical },
            { label: 'Y5 Total Closing', value: fmtK(totalY5), color: totalY5 < totalOpening * 0.5 ? '#ef4444' : '#10b981' },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <p className="text-[9px] text-[#4a6080] uppercase tracking-widest font-semibold">{kpi.label}</p>
              <p className="mono text-[14px] font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
            </Card>
          ))}
        </div>
      )}

      {namedReserves.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-[rgba(99,179,237,0.12)]">
          <PiggyBank size={28} className="text-[#4a6080] mx-auto mb-3" />
          <p className="text-[13px] font-semibold text-[#f0f4ff]">No named reserves defined</p>
          <p className="text-[11px] text-[#4a6080] mt-1">
            The model uses the flat general fund / earmarked reserves from the Baseline Editor
          </p>
          <p className="text-[10px] text-[#4a6080] mt-2">
            Examples: General Fund, Service Specific, Ringfenced and Technical reserves
          </p>
        </div>
      ) : (
        <div>
          <p className="text-[10px] text-[#4a6080] uppercase tracking-widest font-semibold mb-3">
            {namedReserves.length} Named Reserve{namedReserves.length !== 1 ? 's' : ''}
          </p>
          {namedReserves.map((r) => <ReserveRow key={r.id} reserve={r} />)}
        </div>
      )}
    </div>
  );
}
