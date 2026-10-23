import { useId, useState } from 'react';
import type { AiSkillSuggestion } from '@workspace/api-client-react';
import type { ProfileSkill, Proficiency } from '@/domain/types';
import { useI18n } from '@/i18n/i18n-context';

export function AiSkillSuggestions({ suggestions, onApply }: {
  suggestions: AiSkillSuggestion[];
  onApply: (skills: ProfileSkill[]) => string | undefined;
}) {
  const { ui } = useI18n();
  const id = useId();
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [levels, setLevels] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const selected = suggestions.filter(s => confirmed[s.skill] && !applied.includes(s.skill));
  const ready = selected.length > 0 && selected.every(s => /^[1-5]$/.test(levels[s.skill] ?? ''));
  return <fieldset className="ai-suggestion-review">
    <legend>{ui('Confirm suggestions and self-rate proficiency')}</legend>
    <p>{ui('These suggestions describe a fictional learner. Add only skills that genuinely apply to you. This does not confirm a CV detection or assess your proficiency.')}</p>
    {suggestions.map((suggestion, index) => <div className="ai-suggestion-row" key={suggestion.skill}>
      <label className="ai-suggestion-choice">
        <input type="checkbox" checked={Boolean(confirmed[suggestion.skill])} disabled={applied.includes(suggestion.skill)}
          onChange={event => setConfirmed(current => ({ ...current, [suggestion.skill]: event.target.checked }))}
          data-testid={`confirm-ai-skill-${index}`} />
        <span><strong>{suggestion.skill}</strong><span className="ai-suggestion-rationale">{suggestion.rationale}</span></span>
      </label>
      <div>
        <label htmlFor={`${id}-${index}`}>{ui('Your proficiency')}</label>
        <select id={`${id}-${index}`} value={levels[suggestion.skill] ?? ''} disabled={applied.includes(suggestion.skill)}
          onChange={event => setLevels(current => ({ ...current, [suggestion.skill]: event.target.value }))}
          data-testid={`level-ai-skill-${index}`}>
          <option value="">{ui('Choose a level')}</option>
          <option value="1">{ui('1 — New to it')}</option><option value="2">{ui('2 — Basic')}</option>
          <option value="3">{ui('3 — Working knowledge')}</option><option value="4">{ui('4 — Advanced')}</option>
          <option value="5">{ui('5 — Can teach it')}</option>
        </select>
      </div>
      {applied.includes(suggestion.skill) && <span>{ui('Added to draft')}</span>}
    </div>)}
    <button type="button" className="btn btn-secondary" disabled={!ready} data-testid="button-apply-ai-skills" onClick={() => {
      if (!ready) return;
      const error = onApply(selected.map(s => ({ name: s.skill, level: Number(levels[s.skill]) as Proficiency, category: 'AI suggested' })));
      if (error) return setMessage(error);
      setApplied(current => [...current, ...selected.map(s => s.skill)]);
      setMessage(ui('Added to the profile draft only. Review your skills and use Save profile to keep the changes.'));
    }}>{ui('Add confirmed skills to profile draft')}</button>
    <p role="status" data-testid="status-ai-skill-addition">{ui(message)}</p>
  </fieldset>;
}
