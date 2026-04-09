import type { ThicknessPreset } from '../drawing/StrokeRenderer';

const PRESETS: ThicknessPreset[] = ['thin', 'medium', 'thick'];

const LABELS: Record<ThicknessPreset, string> = {
  thin: 'Thin',
  medium: 'Medium',
  thick: 'Thick',
};

interface ThicknessToggleProps {
  disabled: boolean;
  selected: ThicknessPreset;
  onSelect: (preset: ThicknessPreset) => void;
}

export function ThicknessToggle({
  disabled,
  selected,
  onSelect,
}: ThicknessToggleProps) {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-3 md:gap-1"
      aria-label="Brush thickness"
    >
      {PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          data-preset={preset}
          className={`rounded border px-[10px] py-1 text-xs transition ${
            disabled
              ? 'cursor-not-allowed border-neutral-400 bg-white text-neutral-700 opacity-55'
              : selected === preset
                ? 'cursor-pointer border-neutral-800 bg-neutral-800 text-white'
                : 'cursor-pointer border-neutral-400 bg-white text-neutral-700 hover:bg-neutral-200'
          }`}
          disabled={disabled}
          onClick={() => onSelect(preset)}
        >
          {LABELS[preset]}
        </button>
      ))}
    </div>
  );
}
