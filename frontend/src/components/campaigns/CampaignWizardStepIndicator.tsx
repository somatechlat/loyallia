import { useI18n } from '@/lib/i18n';

interface CampaignWizardStepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export default function CampaignWizardStepIndicator({ steps, currentStep }: CampaignWizardStepIndicatorProps) {
  useI18n();
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
              ${i < currentStep
                ? 'bg-brand-500 text-white'
                : i === currentStep
                  ? 'bg-brand-500 text-white shadow-glow ring-2 ring-brand-200 dark:ring-brand-800'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-400'
              }`}
          >
            {i < currentStep ? '✓' : i + 1}
          </div>
          <span
            className={`text-xs font-medium hidden sm:block
              ${i <= currentStep ? 'text-surface-900 dark:text-white' : 'text-surface-400'}`}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 rounded-full transition-all duration-300 mx-1
                ${i < currentStep ? 'bg-brand-500' : 'bg-surface-200 dark:bg-surface-700'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
