/**
 * @description Horizontal step indicator for the program creation wizard.
 * @param {Object} props - Component props
 * @param {number} props.step - Current active step index
 * @returns JSX.Element
 */
const steps = ['Tipo', 'Configurar', 'Diseño', 'Revisar'];

export default function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
            transition-all duration-300
            ${i < step ? 'bg-brand-500 text-white' :
              i === step ? 'bg-brand-500 text-white shadow-glow' :
              'bg-surface-100 text-surface-400'}`}>
            {i < step ? '✓' : i + 1}
          </div>
          <span className={`text-xs font-semibold hidden sm:block
            ${i <= step ? 'text-surface-900 dark:text-white' : 'text-surface-400'}`}>{label}</span>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full transition-all duration-300 mx-1
              ${i < step ? 'bg-brand-500' : 'bg-surface-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
