import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Check, CloudUpload, FileText, Info, Loader2, X } from 'lucide-react';
import { extractCvSkills } from '@workspace/api-client-react';
import type { ProfileSkill, Proficiency } from '@/domain/types';
import { ChiliLevelSlider } from '@/components/chili-level-slider';
import './profile-cv-import.css';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'jpg', 'jpeg', 'png'];

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
    : 'We could not read skills from that CV. Please try another file or add skills manually.';
}

function skillKey(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function ProfileCvImport({
  existingSkills,
  onApply,
}: {
  existingSkills: Pick<ProfileSkill, 'name'>[];
  onApply: (skills: ProfileSkill[]) => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'review' | 'error'>('idle');
  const [reviewSkills, setReviewSkills] = useState<ReviewSkill[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [linkedInPreviewOpen, setLinkedInPreviewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reviewDialogRef = useRef<HTMLDialogElement>(null);
  const linkedInPreviewRef = useRef<HTMLDialogElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    const dialog = reviewDialogRef.current;
    if (!dialog) return;
    if (reviewDialogOpen && !dialog.open) dialog.showModal();
    else if (!reviewDialogOpen && dialog.open) dialog.close();
  }, [reviewDialogOpen]);
  useEffect(() => {
    const dialog = linkedInPreviewRef.current;
    if (!dialog) return;
    if (linkedInPreviewOpen && !dialog.open) dialog.showModal();
    else if (!linkedInPreviewOpen && dialog.open) dialog.close();
  }, [linkedInPreviewOpen]);

  const extract = async (file: File) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setReviewDialogOpen(false);
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
      setReviewDialogOpen(true);
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

  const applyCvData = () => {
    if (!canApply) return;
    const importedSkills = selectedSkills.map(skill => ({
      name: skill.name,
      level: skill.level as Proficiency,
      category: 'CV detected',
      cvDetected: true,
    }));
    onApply(importedSkills);
    setReviewSkills([]);
    setWarnings([]);
    setPhase('idle');
    setReviewDialogOpen(false);
    setAnnouncement(`${importedSkills.length} confirmed skill${importedSkills.length === 1 ? '' : 's'} added to your profile. Review and save your skills.`);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  return <section className="panel panel-pad profile-cv-card" aria-labelledby="profile-cv-title" data-testid="card-cv-import">
    <div className="profile-cv-heading">
      <span className="profile-cv-icon"><CloudUpload size={18} /></span>
      <div>
        <h2 id="profile-cv-title">Find skills from your CV</h2>
        <p>Review each recognized skill and choose its proficiency before adding it to your profile.</p>
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
      <div className="profile-cv-actions">
        <button type="button" className="btn btn-secondary btn-small" onClick={() => inputRef.current?.click()} disabled={phase === 'extracting'} data-testid="button-choose-cv">
          Choose a file
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setLinkedInPreviewOpen(true)} data-testid="button-linkedin-import">
          Import from LinkedIn
        </button>
      </div>
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

    <p className="profile-cv-privacy"><Info size={14} /> Your CV and extracted text are processed by this app and are not saved. Only skills you review and apply can be saved in your browser profile.</p>

    {phase === 'error' && <p className="profile-cv-error" role="alert" data-testid="error-profile-cv">{error}</p>}
    {phase === 'extracting' && <p className="profile-cv-status" role="status">Extracting recognizable skills. This can take a short while for scanned documents.</p>}
    {announcement && <span className="sr-only" role="status" aria-live="polite">{announcement}</span>}

    {phase === 'review' && <div className="profile-cv-result" role="status" data-testid="status-profile-cv-review">
      <div>
        <strong>{reviewSkills.length ? 'Skills ready to review' : 'CV review ready'}</strong>
        <span>{reviewSkills.length} skill{reviewSkills.length === 1 ? '' : 's'} detected</span>
      </div>
      <button type="button" className="btn btn-secondary btn-small" onClick={() => setReviewDialogOpen(true)} data-testid="button-open-cv-review">
        Review CV details
      </button>
    </div>}

    <dialog
      ref={reviewDialogRef}
      className="profile-cv-dialog"
      aria-labelledby="profile-cv-review-title"
      aria-describedby="profile-cv-review-description"
      onCancel={() => setReviewDialogOpen(false)}
      onClose={() => setReviewDialogOpen(false)}
      onClick={event => { if (event.target === event.currentTarget) setReviewDialogOpen(false); }}
      data-testid="dialog-cv-review"
    >
      <button type="button" className="profile-cv-dialog-close" aria-label="Close CV skill review" onClick={() => setReviewDialogOpen(false)}><X size={16} /></button>
      <header className="profile-cv-dialog-header">
        <h2 id="profile-cv-review-title">Review skills from your CV</h2>
        <p id="profile-cv-review-description">Select recognized skills and set your own proficiency. The CV does not set or change proficiency automatically.</p>
      </header>
      {warnings.length > 0 && <ul className="profile-cv-warnings" data-testid="warnings-profile-cv">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
      {reviewSkills.length === 0
        ? <div className="profile-cv-empty" data-testid="empty-profile-cv">No career-catalogue skills were recognized. Return to Skills to add one manually.</div>
        : <>
          <div className="profile-cv-dialog-review-head">
            <strong>Skills from your CV</strong>
            <span>{reviewSkills.length} detected · {selectedSkills.length} selected</span>
          </div>
          {remainingSlots === 0 && <p className="profile-cv-level-note">Your profile already has 50 skills. Remove one from the profile before adding more.</p>}
          <div className="profile-cv-dialog-skills">
            {reviewSkills.map((skill, index) => <div className="profile-cv-dialog-row" key={skill.name}>
              <label className="profile-cv-dialog-skill-name">
                <input
                  type="checkbox"
                  checked={skill.alreadyInProfile || skill.selected}
                  disabled={skill.alreadyInProfile || (!skill.selected && selectedSkills.length >= remainingSlots)}
                  onChange={event => toggleSkill(index, event.target.checked)}
                  aria-label={`Add ${skill.name} to profile`}
                />
                <strong>{skill.name}</strong>
                <span className="cv-skill-check" title="Found in CV" role="img" aria-label="Found in CV"><Check size={12} /></span>
              </label>
              {skill.alreadyInProfile
                ? <span className="profile-cv-existing"><Check size={12} /> Already in profile</span>
                : <ChiliLevelSlider
                  value={skill.level}
                  disabled={!skill.selected}
                  onChange={level => setSkillLevel(index, String(level))}
                  label={`Proficiency level for ${skill.name}`}
                  testId={`cv-skill-level-${index}`}
                />}
            </div>)}
          </div>
          {!canApply && <p className="profile-cv-level-note" role="status">Select at least one new skill and choose its level to continue.</p>}
        </>}
      <div className="profile-cv-dialog-footer">
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setReviewDialogOpen(false)}>Back to profile</button>
        {reviewSkills.length > 0 && <button type="button" className="btn btn-primary btn-small" onClick={() => applyCvData()} disabled={!canApply} data-testid="button-apply-cv-skills">
          <Check size={14} /> Add selected skills
        </button>}
      </div>
    </dialog>
    <dialog
      ref={linkedInPreviewRef}
      className="profile-cv-dialog profile-linkedin-dialog"
      aria-labelledby="linkedin-preview-title"
      aria-describedby="linkedin-preview-description"
      onCancel={() => setLinkedInPreviewOpen(false)}
      onClose={() => setLinkedInPreviewOpen(false)}
      data-testid="dialog-linkedin-preview"
    >
      <button type="button" className="profile-cv-dialog-close" aria-label="Close LinkedIn import preview" onClick={() => setLinkedInPreviewOpen(false)}><X size={16} /></button>
      <header className="profile-cv-dialog-header">
        <h2 id="linkedin-preview-title">LinkedIn import preview</h2>
        <p id="linkedin-preview-description">LinkedIn import is a UI preview only. No account connection or profile data access is configured. Use the CV upload or enter your details manually.</p>
      </header>
      <div className="profile-linkedin-preview">
        <strong>Import from LinkedIn</strong>
        <span>Connection unavailable in demo mode</span>
      </div>
      <div className="profile-cv-dialog-footer">
        <button type="button" className="btn btn-primary btn-small" onClick={() => setLinkedInPreviewOpen(false)} data-testid="button-close-linkedin-preview">Close</button>
      </div>
    </dialog>
  </section>;
}
