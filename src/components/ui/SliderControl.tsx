import { Info } from 'lucide-react';

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  tooltip?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  colorClass?: string;
  impactText?: string;
  impactTone?: 'neutral' | 'positive' | 'negative';
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit = '%',
  tooltip,
  format,
  onChange,
  colorClass = 'text-[#3b82f6]',
  impactText,
  impactTone = 'neutral',
}: SliderControlProps) {
  const display = format ? format(value) : `${value > 0 ? '+' : ''}${value.toFixed(step < 1 ? 1 : 0)}${unit}`;
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#8ca0c0] font-medium">{label}</span>
          {tooltip && (
            <div className="tooltip">
              <span title={tooltip}>
                <Info size={10} className="text-[#4a6080] cursor-help" />
              </span>
              <div className="tooltip-content">{tooltip}</div>
            </div>
          )}
        </div>
        <span className={`mono text-[11px] font-semibold ${colorClass}`}>{display}</span>
      </div>
      <div className="relative group">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          title={tooltip ?? `${label}: adjust between ${min}${unit} and ${max}${unit}`}
          aria-label={label}
          style={{
            background: `linear-gradient(to right, #3b82f6 ${pct}%, rgba(99,179,237,0.15) ${pct}%)`,
          }}
          className="hover:brightness-110 active:scale-[1.01]"
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-[#4a6080]">{min}{unit}</span>
        <span className="text-[9px] text-[#4a6080]">{max}{unit}</span>
      </div>
      {impactText && (
        <p
          className="text-[9px] mt-1"
          style={{
            color: impactTone === 'positive' ? '#10b981' : impactTone === 'negative' ? '#ef4444' : '#4a6080',
          }}
        >
          {impactText}
        </p>
      )}
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  onChange: (v: number) => void;
  impactText?: string;
  impactTone?: 'neutral' | 'positive' | 'negative';
}

export function NumberInput({
  label,
  value,
  step = 100,
  prefix = '£',
  suffix = 'k',
  tooltip,
  onChange,
  impactText,
  impactTone = 'neutral',
}: NumberInputProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#8ca0c0] font-medium">{label}</span>
          {tooltip && (
            <div className="tooltip">
              <span title={tooltip}>
                <Info size={10} className="text-[#4a6080] cursor-help" />
              </span>
              <div className="tooltip-content">{tooltip}</div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 bg-[#080c14] border border-[rgba(99,179,237,0.1)] rounded-lg px-3 py-1.5 hover:border-[rgba(59,130,246,0.35)]">
        <span className="text-[11px] text-[#4a6080]">{prefix}</span>
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          title={tooltip ?? `${label}: numeric input`}
          aria-label={label}
          className="flex-1 bg-transparent text-[12px] text-[#f0f4ff] mono font-medium outline-none min-w-0"
        />
        <span className="text-[11px] text-[#4a6080]">{suffix}</span>
      </div>
      {impactText && (
        <p
          className="text-[9px] mt-1"
          style={{
            color: impactTone === 'positive' ? '#10b981' : impactTone === 'negative' ? '#ef4444' : '#4a6080',
          }}
        >
          {impactText}
        </p>
      )}
    </div>
  );
}

interface ToggleProps {
  label: string;
  value: boolean;
  tooltip?: string;
  onChange: (v: boolean) => void;
  impactText?: string;
  impactTone?: 'neutral' | 'positive' | 'negative';
}

export function Toggle({ label, value, tooltip, onChange, impactText, impactTone = 'neutral' }: ToggleProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#8ca0c0] font-medium">{label}</span>
          {tooltip && (
            <div className="tooltip">
              <span title={tooltip}>
                <Info size={10} className="text-[#4a6080] cursor-help" />
              </span>
              <div className="tooltip-content">{tooltip}</div>
            </div>
          )}
        </div>
        <button
          onClick={() => onChange(!value)}
          title={tooltip ?? `${label}: currently ${value ? 'enabled' : 'disabled'}`}
          aria-label={label}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            value ? 'bg-[#3b82f6]' : 'bg-[rgba(99,179,237,0.15)] hover:bg-[rgba(99,179,237,0.22)]'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              value ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {impactText && (
        <p
          className="text-[9px] mt-1"
          style={{
            color: impactTone === 'positive' ? '#10b981' : impactTone === 'negative' ? '#ef4444' : '#4a6080',
          }}
        >
          {impactText}
        </p>
      )}
    </div>
  );
}
