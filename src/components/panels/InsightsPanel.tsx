import React from 'react';
import { useMTFSStore } from '../../store/mtfsStore';
import { Card } from '../ui/Card';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ArrowRight } from 'lucide-react';
import type { Insight } from '../../types/financial';

const insightConfig = {
  critical: {
    icon: <AlertCircle size={16} />,
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.25)',
    iconColor: '#ef4444',
    labelBg: 'rgba(239,68,68,0.15)',
    labelColor: '#ef4444',
    label: 'CRITICAL',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.25)',
    iconColor: '#f59e0b',
    labelBg: 'rgba(245,158,11,0.15)',
    labelColor: '#f59e0b',
    label: 'WARNING',
  },
  info: {
    icon: <Info size={16} />,
    bg: 'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.2)',
    iconColor: '#3b82f6',
    labelBg: 'rgba(59,130,246,0.15)',
    labelColor: '#3b82f6',
    label: 'INFO',
  },
  success: {
    icon: <CheckCircle size={16} />,
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.2)',
    iconColor: '#10b981',
    labelBg: 'rgba(16,185,129,0.15)',
    labelColor: '#10b981',
    label: 'POSITIVE',
  },
};

function InsightCard({ insight }: { insight: Insight }) {
  const cfg = insightConfig[insight.type];
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: cfg.labelBg, color: cfg.iconColor }}
        >
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: cfg.labelBg, color: cfg.iconColor }}
            >
              {cfg.label}
            </span>
          </div>
          <h4 className="text-[13px] font-semibold text-[#f0f4ff] mb-1.5">{insight.title}</h4>
          <p className="text-[11px] text-[#8ca0c0] leading-relaxed">{insight.body}</p>
          {insight.action && (
            <div
              className="flex items-start gap-2 mt-3 pt-3 rounded-lg px-3 py-2"
              style={{ background: `${cfg.iconColor}10`, border: `1px solid ${cfg.iconColor}20` }}
            >
              <ArrowRight size={11} style={{ color: cfg.iconColor }} className="mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed" style={{ color: cfg.iconColor }}>
                <span className="font-semibold">Recommended action: </span>
                {insight.action}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function InsightsPanel() {
  const { result } = useMTFSStore();
  const { insights } = result;

  const critical = insights.filter((i) => i.type === 'critical');
  const warnings = insights.filter((i) => i.type === 'warning');
  const infos = insights.filter((i) => i.type === 'info');
  const successes = insights.filter((i) => i.type === 'success');

  const prioritised = [...critical, ...warnings, ...infos, ...successes];

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Critical', count: critical.length, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
          { label: 'Warnings', count: warnings.length, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Information', count: infos.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
          { label: 'Positive', count: successes.length, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-3 text-center"
            style={{ background: item.bg, border: `1px solid ${item.color}20` }}
          >
            <p className="text-2xl font-bold mono" style={{ color: item.color }}>{item.count}</p>
            <p className="text-[10px] text-[#8ca0c0] mt-0.5 uppercase tracking-widest font-semibold">{item.label}</p>
          </div>
        ))}
      </div>

      {prioritised.length === 0 ? (
        <Card className="text-center py-12">
          <CheckCircle size={24} className="text-[#10b981] mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-[#f0f4ff]">No significant issues detected</p>
          <p className="text-[11px] text-[#4a6080] mt-1">The current MTFS assumptions appear sustainable</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {prioritised.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )}

      {/* Strategic summary */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full bg-[#3b82f6]" />
          <h4 className="text-[12px] font-semibold text-[#f0f4ff]">Strategic Summary — "So What?"</h4>
        </div>
        <div className="text-[12px] text-[#8ca0c0] leading-relaxed space-y-2">
          {result.totalGap <= 0 ? (
            <p>
              Under current assumptions, the authority's medium-term financial strategy is in balance.
              Expenditure growth is being offset by funding growth and the savings programme.
              Financial resilience is maintained provided assumptions hold.
            </p>
          ) : (
            <>
              <p>
                The MTFS projects a <span className="text-[#ef4444] font-semibold">
                  cumulative budget gap of £{(result.totalGap / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m
                </span> over the five-year period.
                {result.structuralDeficitFlag
                  ? ' This gap has structural characteristics — recurring expenditure exceeds recurring funding — and cannot be sustainably managed through reserves use alone.'
                  : ' The gap is manageable but requires active mitigation through savings delivery and demand management.'}
              </p>
              {result.requiredSavingsToBalance > 0 && (
                <p>
                  To balance the MTFS, the authority must deliver average annual savings of{' '}
                  <span className="text-[#f59e0b] font-semibold">
                    £{(result.requiredSavingsToBalance / 1000).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}m per annum
                  </span>, representing{' '}
                  <span className="font-semibold text-[#f0f4ff]">{result.savingsAsBudgetPct.toFixed(1)}%</span> of total expenditure.
                </p>
              )}
              {result.yearReservesExhausted && (
                <p>
                  <span className="text-[#ef4444] font-semibold">Critically</span>, reserves are projected to be exhausted by{' '}
                  <span className="text-[#ef4444] font-semibold">{result.yearReservesExhausted}</span>.
                  This represents an unlawful budget position that must be resolved before budget setting.
                </p>
              )}
            </>
          )}
          <p className="text-[11px] text-[#4a6080] pt-2 border-t border-[rgba(99,179,237,0.06)]">
            This assessment is based on the assumptions in the Assumption Engine panel.
            The model uses driver-based CIPFA-aligned methodology. All figures are in £000s.
          </p>
        </div>
      </Card>
    </div>
  );
}
