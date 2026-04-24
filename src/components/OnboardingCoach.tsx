import React from 'react';
import { X } from 'lucide-react';

type CoachStep = {
  title: string;
  description: string;
  selector: string;
};

const STORAGE_KEY = 'mtfs_onboarding_v1_completed';

const STEPS: CoachStep[] = [
  {
    title: 'Assumption Engine',
    description: 'Use this panel to adjust funding, expenditure, and policy assumptions. Every change recalculates model outputs in real time.',
    selector: '#assumption-engine-sidebar',
  },
  {
    title: 'Navigation Tabs',
    description: 'Switch across Overview, Baseline, Gap, Reserves, Scenarios, and Governance to review the full financial story.',
    selector: '#header-tabs',
  },
  {
    title: 'KPI Rail',
    description: 'This rail shows your core headline metrics. Use Explain on each KPI for the calculation logic and drivers.',
    selector: '#kpi-rail',
  },
  {
    title: 'Main Workspace',
    description: 'The active panel appears here. Edit assumptions, test scenarios, and validate implications before exporting reports.',
    selector: '#main-workspace',
  },
];

function getRectForSelector(selector: string): DOMRect | null {
  const node = document.querySelector(selector);
  if (!node) return null;
  return node.getBoundingClientRect();
}

export function OnboardingCoach() {
  const [open, setOpen] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  React.useEffect(() => {
    const seen = window.localStorage.getItem(STORAGE_KEY) === 'true';
    if (!seen) setOpen(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    const recalc = () => setTargetRect(getRectForSelector(step.selector));
    recalc();
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);

    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [open, step.selector]);

  const closeCoach = React.useCallback((markComplete: boolean) => {
    if (markComplete) {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }
    setOpen(false);
  }, []);

  if (!open) return null;

  const coachStyle: React.CSSProperties = targetRect
    ? {
        top: Math.min(targetRect.bottom + 12, window.innerHeight - 220),
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 420)),
      }
    : { top: 96, left: 96 };

  return (
    <div className="coach-root" role="dialog" aria-label="Onboarding guide">
      <div className="coach-dim" />
      {targetRect && (
        <div
          className="coach-highlight"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      <div className="coach-card" style={coachStyle}>
        <div className="coach-head">
          <p className="coach-step">Step {stepIndex + 1} of {STEPS.length}</p>
          <button
            onClick={() => closeCoach(false)}
            className="coach-close"
            title="Close onboarding"
            aria-label="Close onboarding"
          >
            <X size={14} />
          </button>
        </div>

        <h3 className="coach-title">{step.title}</h3>
        <p className="coach-copy">{step.description}</p>

        <div className="coach-actions">
          <button
            onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
            disabled={stepIndex === 0}
            className="coach-btn coach-btn-secondary"
          >
            Back
          </button>

          <div className="coach-right-actions">
            <button onClick={() => closeCoach(true)} className="coach-btn coach-btn-secondary">
              Skip
            </button>
            {isLast ? (
              <button onClick={() => closeCoach(true)} className="coach-btn coach-btn-primary">
                Finish
              </button>
            ) : (
              <button
                onClick={() => setStepIndex((s) => Math.min(STEPS.length - 1, s + 1))}
                className="coach-btn coach-btn-primary"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
