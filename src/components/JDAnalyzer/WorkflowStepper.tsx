import type { WorkflowStep } from '../../types/jd';

const STEPS: { key: WorkflowStep; label: string }[] = [
  { key: 'input', label: 'Input' },
  { key: 'analyzed', label: 'Analyzed' },
  { key: 'tailor-preview', label: 'Tailor' },
  { key: 'scanning', label: 'ATS Scan' },
  { key: 'results', label: 'Results' },
];

const STEP_ORDER: WorkflowStep[] = ['input', 'analyzed', 'tailoring', 'tailor-preview', 'scanning', 'results'];

function stepIndex(step: WorkflowStep): number {
  // tailoring maps to tailor-preview position
  if (step === 'tailoring') return STEP_ORDER.indexOf('tailor-preview');
  return STEP_ORDER.indexOf(step);
}

export function WorkflowStepper({ current }: { current: WorkflowStep }) {
  const currentIdx = stepIndex(current);

  return (
    <div className="wf-stepper">
      {STEPS.map((s, i) => {
        const sIdx = stepIndex(s.key);
        let cls = 'wf-step';
        if (current === s.key || (current === 'tailoring' && s.key === 'tailor-preview')) cls += ' active';
        else if (sIdx < currentIdx) cls += ' done';

        return (
          <div key={s.key} className={cls}>
            <div className="wf-step-dot">
              {sIdx < currentIdx ? '\u2713' : i + 1}
            </div>
            <span className="wf-step-label">{s.label}</span>
            {i < STEPS.length - 1 && <div className="wf-step-line" />}
          </div>
        );
      })}
    </div>
  );
}
