import React from 'react';
import {
  AlertTriangle, TrendingDown, PiggyBank, Percent,
  BarChart3, Activity
} from 'lucide-react';
import { useMTFSStore } from '../store/mtfsStore';
import { RichTooltip } from './ui/RichTooltip';

function fmt(n: number, prefix = '£', suffix = 'k') {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000) {
    return `${sign}${prefix}${(abs / 1_000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m`;
  }
  return `${sign}${prefix}${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}${suffix}`;
}

interface KPIProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  pulse?: boolean;
  tooltip?: string;
}

const statusColors: Record<string, string> = {
  good: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  neutral: '#3b82f6',
};

function KPI({ icon, label, value, sub, status = 'neutral', pulse, tooltip }: KPIProps) {
  const color = statusColors[status];
  return (
    <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 border-r border-[rgba(99,179,237,0.07)] last:border-r-0" title={tooltip ?? `${label}: ${value}`}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-[10px] text-[#4a6080] uppercase tracking-widest font-semibold truncate">{label}</p>
          {tooltip && <RichTooltip content={tooltip} />}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className="mono text-[15px] font-bold leading-tight"
            style={{ color }}
          >
            {value}
          </span>
          {pulse && (
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: color }} />
          )}
        </div>
        {sub && <p className="text-[9px] text-[#4a6080] truncate mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RiskGauge({ score }: { score: number }) {
  const color = score >= 65 ? '#ef4444' : score >= 45 ? '#f59e0b' : '#10b981';
  const label = score >= 65 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW';
  const width = `${score}%`;

  return (
    <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3" title="Composite risk indicator based on reserves, gap exposure, volatility, demand and savings delivery.">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Activity size={14} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-[#4a6080] uppercase tracking-widest font-semibold">Risk Score</p>
            <RichTooltip content="Composite risk indicator derived from reserves adequacy, gap exposure, funding volatility, demand pressure and savings delivery risk." />
          </div>
          <span className="mono text-[10px] font-bold" style={{ color }}>{label}</span>
        </div>
        <div className="h-1.5 bg-[rgba(99,179,237,0.08)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width, background: `linear-gradient(90deg, #10b981, ${color})` }}
          />
        </div>
        <p className="text-[9px] text-[#4a6080] mt-0.5">{score.toFixed(0)}/100</p>
      </div>
    </div>
  );
}

export function KPIBar() {
  const { result, audienceMode } = useMTFSStore();
  const {
    totalGap,
    yearReservesExhausted,
    requiredSavingsToBalance,
    councilTaxEquivalent,
    reservesToNetBudget,
    savingsAsBudgetPct,
    structuralDeficitFlag,
    overallRiskScore,
  } = result;

  const gapStatus = totalGap <= 0 ? 'good' : totalGap < 5000 ? 'warning' : 'critical';
  const reservesStatus = yearReservesExhausted ? 'critical' : reservesToNetBudget < 5 ? 'warning' : 'good';
  const ctStatus = councilTaxEquivalent < 2 ? 'good' : councilTaxEquivalent < 5 ? 'warning' : 'critical';
  const year1Gap = result.years[0]?.rawGap ?? 0;
  const ctSub = year1Gap > 0
    ? (audienceMode === 'members' ? 'Y1 shortfall as CT %' : 'Y1 gap vs CT income')
    : (audienceMode === 'members' ? 'No Y1 shortfall' : 'No Y1 gap (balanced/surplus)');

  return (
    <div id="kpi-rail" className="relative border-b border-[rgba(99,179,237,0.07)] bg-[#0a1120]">
      <div className="flex">
        <KPI
        icon={<AlertTriangle size={14} />}
        label={audienceMode === 'members' ? '5-Year Funding Shortfall' : '5-Year MTFS Gap'}
        value={totalGap <= 0 ? 'Balanced' : fmt(totalGap)}
        sub={structuralDeficitFlag ? (audienceMode === 'members' ? 'Ongoing yearly shortfall' : 'Structural deficit') : 'Manageable gap'}
        status={gapStatus}
        pulse={structuralDeficitFlag}
        tooltip="Total cumulative budget shortfall over 5 years after planned mitigations."
        />
        <KPI
        icon={<PiggyBank size={14} />}
        label={audienceMode === 'members' ? 'Safety Buffer' : 'Reserves Status'}
        value={yearReservesExhausted ? yearReservesExhausted : `${reservesToNetBudget.toFixed(1)}%`}
        sub={yearReservesExhausted ? (audienceMode === 'members' ? 'Buffer fully used' : 'Year exhausted') : 'of net budget'}
        status={reservesStatus}
        pulse={!!yearReservesExhausted}
        tooltip="Shows whether closing reserves remain at prudent levels through the planning period."
        />
        <KPI
        icon={<TrendingDown size={14} />}
        label={audienceMode === 'members' ? 'Annual Action Needed' : 'Required Savings'}
        value={fmt(requiredSavingsToBalance)}
        sub={audienceMode === 'members' ? 'Average each year to break even' : 'Annual average to balance'}
        status={savingsAsBudgetPct > 8 ? 'warning' : 'neutral'}
        tooltip="Average recurring savings required each year to maintain a balanced medium-term position."
        />
        <KPI
        icon={<Percent size={14} />}
        label={audienceMode === 'members' ? 'Council Tax Context' : 'CT Equivalent'}
        value={`${councilTaxEquivalent.toFixed(1)}%`}
        sub={ctSub}
        status={ctStatus}
        tooltip="Illustrative council tax percentage equivalent of the Year 1 shortfall."
        />
        <KPI
        icon={<BarChart3 size={14} />}
        label={audienceMode === 'members' ? 'Scale of Savings' : 'Savings Burden'}
        value={`${savingsAsBudgetPct.toFixed(1)}%`}
        sub="of 5yr expenditure"
        status={savingsAsBudgetPct > 8 ? 'warning' : 'good'}
        tooltip="Delivered savings as a share of total five-year expenditure."
        />
        <div>
          <RiskGauge score={overallRiskScore} />
        </div>
      </div>
    </div>
  );
}
