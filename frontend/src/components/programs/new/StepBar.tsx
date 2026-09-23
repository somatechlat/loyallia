/**
 * Horizontal step indicator for the program creation wizard.
 * Shows step number, label, description, and completion state.
 * Supports clicking to jump to completed steps.
 */
'use client';
import { useI18n } from '@/lib/i18n';

interface StepConfig {
  labelKey: string;
  descKey: string;
}

const STEPS: StepConfig[] = [
  { labelKey: 'programs.step.type', descKey: 'programs.step.typeDesc' },
  { labelKey: 'programs.step.configure', descKey: 'programs.step.configureDesc' },
  { labelKey: 'programs.step.design', descKey: 'programs.step.designDesc' },
  { labelKey: 'programs.step.review', descKey: 'programs.step.reviewDesc' },
];

interface StepBarProps {
  step: number;
  onStepClick?: (step: number) => void;
}

export default function StepBar({ step, onStepClick }: StepBarProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-start gap-1 mb-8">
      {STEPS.map((s, i) => {
        const isCompleted = i < step;
        const isActive = i === step;
        const isClickable = isCompleted && onStepClick;

        return (
          <div key={i} className="flex items-start gap-1 flex-1 min-w-0">
            {/* Step circle + label */}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(i)}
              disabled={!isClickable}
              className={`flex items-center gap-2.5 min-w-0 ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
            >
              {/* Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>

              {/* Label + description */}
              <div className="min-w-0 hidden sm:block">
                <p className={`text-xs font-semibold truncate ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400 dark:text-neutral-500'
                }`}>
                  {t(s.labelKey)}
                </p>
                <p className={`text-[10px] truncate ${
                  isActive ? 'text-neutral-600 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-500'
                }`}>
                  {t(s.descKey)}
                </p>
              </div>
            </button>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 flex items-center pt-4 px-1">
                <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
                  isCompleted ? 'bg-emerald-400' : 'bg-neutral-200 dark:bg-neutral-700'
                }`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
