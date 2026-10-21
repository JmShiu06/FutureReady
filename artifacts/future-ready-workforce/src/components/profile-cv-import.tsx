import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AlertTriangle, Check, CloudUpload, FileText, Info, Loader2 } from 'lucide-react';
import { extractCvSkills } from '@workspace/api-client-react';
import type { ProfileSkill, Proficiency } from '@/domain/types';
import { levelLabel } from '@/components/workspace/ui';
import './profile-cv-import.css';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'jpg', 'jpeg', 'png'];
const proficiencyLevels: Proficiency[] = [1, 2, 3, 4, 5];

interface ReviewSkill {
  name: string;
  selected: boolean;
  level: Proficiency | '';
  alreadyInProfile: boolean;
}

function getErrorMessage(error: unknown) {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === 'string'
    ? data.error
    : 'We could not read that CV. Please try another file or enter your details manually.';
}

function skillKey(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function ProfileCvImport({
  existingSkills,
  onApplySkills,
}: {
  existingSkills: Pick<ProfileSkill, 'name'>[];
  onApplySkills: (skills: ProfileSkill[]) => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'review' | 'error'>('idle');
  const [reviewSkills, setReviewSkills] = useState<ReviewSkill[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const extract = async (file: File) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('extracting');
    setError('');
    setWarnings([]);
    setReviewSkills([]);
    setAnnouncement('Reading your CV.');

    try {
      const result = await extractCvSkills({ file }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const existing = new Set(existingSkills.map(skill => skillKey(skill.name)));
      const unique = [...new Set(result.skills.map(name => name.trim()).filter(Boolean))];
      const remainingSlots = Math.max(0, 50 - existingSkills.length);
      let selectedCount = 0;
      setReviewSkills(unique.map(name => {
        const alreadyInProfile = existing.has(skillKey(name));
        const selected = !alreadyInProfile && selectedCount < remainingSlots;
        if (selected) selectedCount += 1;
        return { name, selected, level: '', alreadyInProfile };
      }));
      setWarnings(result.warnings);
      setPhase('review');
      setAnnouncement(`${unique.length} recognizable skills found. Review them before adding them to your profile.`);
    } catch (caught) {
      if (controller.signal.aborted) return;
      const message = getErrorMessage(caught);
      setError(message);
      setPhase('error');
      setAnnouncement(message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const acceptFile = (file?: File) => {
    if (!file) return;
    abortRef.current?.abort();
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ACCEPTED_EXTENSIONS.includes(extension)) {
      setError('Choose a PDF, DOCX, TXT, JPG, JPEG or PNG file.');
      setPhase('error');
      setReviewSkills([]);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('This file is larger than 5 MB. Choose a smaller file.');
      setPhase('error');
      setReviewSkills([]);
      return;
    }
    void extract(file);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const toggleSkill = (index: number, selected: boolean) => {
    const capacity = Math.max(0, 50 - existingSkills.length);
    const selectedCount = reviewSkills.filter(skill => skill.selected && !skill.alreadyInProfile).length;
    if (selected && selectedCount >= capacity) return;
    setReviewSkills(current => current.map((skill, i) => i === index ? { ...skill, selected } : skill));
  };

  const setSkillLevel = (index: number, value: string) => {
    const level = value === '' ? '' : Number(value) as Proficiency;
    setReviewSkills(current => current.map((skill, i) => i === index ? { ...skill, level } : skill));
  };

  const selectedSkills = reviewSkills.filter(skill => skill.selected && !skill.alreadyInProfile);
  const remainingSlots = Math.max(0, 50 - existingSkills.length);
  const canApply = selectedSkills.length > 0 && selectedSkills.every(skill => skill.level !== '');

  const applySkills = () => {
    if (!canApply) return;
    onApplySkills(selectedSkills.map(skill => ({
      name: skill.name,
      level: skill.level as Proficiency,
      category: 'CV detected',
    })));
    setReviewSkills([]);
    setWarnings([]);
    setPhase('idle');
    setAnnouncement(`${selectedSkills.length} confirmed skills added to the profile draft. Save your profile to keep them.`);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  return <section className="panel panel-pad profile-cv-card" aria-labelledby="profile-cv-title" data-testid="card-cv-import">
    <div className="profile-cv-heading">
      <span className="profile-cv-icon"><CloudUpload size={18} /></span>
      <div>
        <h2 id="profile-cv-title">Add skills from your CV</h2>
        <p>Recognized skill names can be added to your profile after review.</p>
      </div>
    </div>

    <div
      className={`profile-cv-drop${dragging ? ' is-dragging' : ''}${phase === 'extracting' ? ' is-busy' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      data-testid="drop-cv-profile"
    >
      {phase === 'extracting' ? <Loader2 size={22} className="profile-cv-spinner" aria-hidden="true" /> : <FileText size={22} aria-hidden="true" />}
      <strong>{phase === 'extracting' ? 'Reading your CV' : 'Drop your CV here'}</strong>
      <span>PDF, DOCX, TXT, JPG or PNG · up to 5 MB</span>
      <button type="button" className="btn btn-secondary btn-small" onClick={() => inputRef.current?.click()} disabled={phase === 'extracting'} data-testid="button-choose-cv">
        Choose a file
      </button>
      <input
        ref={inputRef}
        className="profile-cv-input"
        type="file"
        accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
        onChange={onFileChange}
        aria-label="Choose a CV file"
        data-testid="input-profile-cv"
      />
    </div>

    <p className="profile-cv-privacy"><Info size={14} /> Your CV and extracted text are processed by this app and are not saved. Only skills you review and add can be saved in your browser profile.</p>
    <p className="profile-cv-limit"><AlertTriangle size={13} /> This processor detects skill names only. It does not fill occupation, education, experience, goals or proficiency levels.</p>

    {phase === 'error' && <p className="profile-cv-error" role="alert" data-testid="error-profile-cv">{error}</p>}
    {phase === 'extracting' && <p className="profile-cv-status" role="status">Extracting recognizable skills. This can take a short while for scanned documents.</p>}
    {announcement && <span className="sr-only" role="status" aria-live="polite">{announcement}</span>}

    {phase === 'review' && <>
      {warnings.length > 0 && <ul className="profile-cv-warnings" data-testid="warnings-profile-cv">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
      {reviewSkills.length === 0 ? <div className="profile-cv-empty" data-testid="empty-profile-cv">No skills from the career catalogue were recognized. You can add skills manually below.</div> : <>
        <div className="profile-cv-review-head"><strong>Review detected skills</strong><span>{reviewSkills.length} found · {selectedSkills.length} selected</span></div>
        {remainingSlots === 0 && <p className="profile-cv-level-note">Your profile already has 50 skills. Remove one from the profile before adding more.</p>}
        <div className="profile-cv-skill-list">
          {reviewSkills.map((skill, index) => <div className="profile-cv-skill" key={skill.name}>
            <label className="profile-cv-skill-name">
              <input
                type="checkbox"
                checked={skill.alreadyInProfile || skill.selected}
                disabled={skill.alreadyInProfile || (!skill.selected && selectedSkills.length >= remainingSlots)}
                onChange={event => toggleSkill(index, event.target.checked)}
                aria-label={`Add ${skill.name} to profile`}
              />
              <span>{skill.name}</span>
            </label>
            {skill.alreadyInProfile
              ? <span className="profile-cv-existing"><Check size={12} /> Already in profile</span>
              : <label className="profile-cv-level">
                <span className="sr-only">Proficiency level for {skill.name}</span>
                <select
                  className="fr-select"
                  value={skill.level}
                  disabled={!skill.selected}
                  onChange={event => setSkillLevel(index, event.target.value)}
                  aria-label={`Proficiency level for ${skill.name}`}
                >
                  <option value="">Choose level</option>
                  {proficiencyLevels.map(level => <option key={level} value={level}>{level} · {levelLabel(level)}</option>)}
                </select>
              </label>}
          </div>)}
        </div>
        {selectedSkills.length > 0 && selectedSkills.some(skill => skill.level === '') && <p className="profile-cv-level-note">Choose a proficiency level for every selected skill. The CV processor doesn’t guess your level.</p>}
        <button type="button" className="btn btn-primary btn-small" onClick={applySkills} disabled={!canApply} data-testid="button-apply-cv-skills">
          <Check size={14} /> Add selected skills to profile
        </button>
      </>}
    </>}
  </section>;
}
