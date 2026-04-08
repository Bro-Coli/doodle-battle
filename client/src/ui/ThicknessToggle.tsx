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
    <div className="toolbar__group" id="thickness-toggle" aria-label="Brush thickness">
      {PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          data-preset={preset}
          className={selected === preset ? 'active' : undefined}
          disabled={disabled}
          onClick={() => onSelect(preset)}
        >
          {LABELS[preset]}
        </button>
      ))}
    </div>
  );
}
