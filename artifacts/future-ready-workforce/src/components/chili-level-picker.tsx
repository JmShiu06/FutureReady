import type { Proficiency } from '@/domain/types';
import { levelLabel } from '@/components/workspace/ui';

const levels: Proficiency[] = [1, 2, 3, 4, 5];

function ChiliIcon({ active }: { active: boolean }) {
  const body = active ? '#c84f1c' : '#f1e5db';
  const outline = active ? '#a83c14' : '#cdbdaf';
  const stem = active ? '#6d8a4c' : '#aaa995';
  return <svg className="chili-level-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M13.5 6.8c-1.1-1.4-.8-3.5.7-4.8 1.4 1.5 1.5 3.2.3 4.9" fill="none" stroke={stem} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M13.4 6.6c-2.8-.7-5.1.6-6.8 3.2-2.1 3.2-2.9 6.6-1.1 8.7 1.7 2 5.1 2.1 8.1.5 3.1-1.7 5.2-4.8 4.3-7.7-.7-2.3-2.5-4.1-4.5-4.7Z" fill={body} stroke={outline} strokeWidth="1.35" strokeLinejoin="round" />
    <path d="M7.1 11.2c1.5 1.3 3.5 1.9 5.4 1.8" fill="none" stroke={active ? '#e6814e' : '#dfd1c5'} strokeWidth="1.1" strokeLinecap="round" />
  </svg>;
}

export function ChiliLevelPicker({
  name,
  value,
  onChange,
  label,
  testId,
  disabled = false,
}: {
  name: string;
  value: Proficiency | '';
  onChange(level: Proficiency): void;
  label: string;
  testId?: string;
  disabled?: boolean;
}) {
  return <fieldset className="chili-level-picker" disabled={disabled} data-testid={testId}>
    <legend className="sr-only">{label}</legend>
    <div className="chili-level-options">
      {levels.map(level => <label className="chili-level-option" key={level} title={`${level} · ${levelLabel(level)}`}>
        <input
          type="radio"
          name={name}
          value={level}
          checked={value === level}
          onChange={() => onChange(level)}
          aria-label={`${level}: ${levelLabel(level)}`}
          data-testid={testId ? `${testId}-${level}` : undefined}
        />
        <ChiliIcon active={value !== '' && level <= value} />
      </label>)}
    </div>
    <output className="chili-level-caption" aria-live="polite">
      {value === '' ? 'Choose level' : `${value} · ${levelLabel(value)}`}
    </output>
  </fieldset>;
}
