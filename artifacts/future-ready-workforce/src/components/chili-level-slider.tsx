import type { Proficiency } from '@/domain/types';
import { levelLabel } from '@/components/workspace/ui';
import { ChiliIcon } from '@/components/chili-level-picker';

const levels: Proficiency[] = [1, 2, 3, 4, 5];
const sizeFor = (level: number) => 14 + (level - 1) * 4;

export function ChiliLevelSlider({
  value,
  onChange,
  label,
  testId,
  disabled = false,
}: {
  value: Proficiency | '';
  onChange(level: Proficiency): void;
  label: string;
  testId?: string;
  disabled?: boolean;
}) {
  const commit = (raw: string) => {
    const level = Number(raw) as Proficiency;
    if (level >= 1 && level <= 5) onChange(level);
  };
  return <div className={`chili-slider${disabled ? ' is-disabled' : ''}`} data-testid={testId}>
    <div className="chili-slider-track">
      {levels.map(level => <span className="chili-slider-step" key={level}>
        <ChiliIcon active={value !== '' && level <= value} size={sizeFor(level)} />
      </span>)}
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value === '' ? 1 : value}
        disabled={disabled}
        onChange={e => commit(e.target.value)}
        onPointerUp={e => commit(e.currentTarget.value)}
        onKeyUp={e => commit(e.currentTarget.value)}
        aria-label={label}
        aria-valuetext={value === '' ? 'Not set' : `${value}: ${levelLabel(value)}`}
        data-testid={testId ? `${testId}-range` : undefined}
      />
    </div>
    <output className="chili-level-caption" aria-live="polite">
      {value === '' ? 'Slide to choose level' : `${value} · ${levelLabel(value)}`}
    </output>
  </div>;
}
