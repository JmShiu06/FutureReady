import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Check, CloudUpload, FileText, Info, Sparkles, X } from 'lucide-react';
import { extractCvSkills } from '@workspace/api-client-react';
import type { ProfileSkill, Proficiency } from '@/domain/types';
import { ChiliLevelSlider } from '@/components/chili-level-slider';
import { useCvSession } from '@/domain/cv-session';
import { LIMITED_MESSAGE, NO_SKILLS_MESSAGE } from '@/components/cv-career-explanation';
import { useAiDrawer } from '@/components/ai-drawer';
import { RaccoonLoader } from '@/components/workspace/raccoon-loader';
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
  existingSkills: Pick<ProfileSkill, 'name' | 'cvDetected' | 'category'>[];
  onApply: (skills: ProfileSkill[], detectedNames: string[]) => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'extracting' | 'review' | 'error'>('idle');
  const [reviewSkills, setReviewSkills] = useState<ReviewSkill[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [linkedInPreviewOpen, setLinkedInPreviewOpen] = useState(false);
  const { open: openAiDrawer } = useAiDrawer();
  const inputRef = useRef<HTMLInputElement>(null);
  const reviewDialogRef = useRef<HTMLDialogElement>(null);
  const linkedInPreviewRef = useRef<HTMLDialogElement>(null);
  const session = useCvSession();
  const isCv = (skill: Pick<ProfileSkill, 'cvDetected' | 'category'>) => !!skill.cvDetected || skill.category === 'CV detected';
  const detectedKeys = new Set(reviewSkills.map(skill => skillKey(skill.name)));
  // Skills that stay after applying: all manual skills plus earlier CV skills detected again.
  const retainedCount = existingSkills.filter(skill => !isCv(skill) || detectedKeys.has(skillKey(skill.name))).length;
  const staleCvSkills = existingSkills.filter(skill => isCv(skill) && !detectedKeys.has(skillKey(skill.name)));
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

  const resetLocal = () => {
    setReviewDialogOpen(false);
    setReviewSkills([]);
    setWarnings([]);
  };

  useEffect(() => {
    // Session cleared elsewhere (audience switch, discard): drop local review copies too.
    if (!session.draft && phase === 'review') { resetLocal(); setPhase('idle'); }
  }, [session.draft, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const extract = async (file: File) => {
    const { signal, id } = session.beginUpload();
    resetLocal();
    setPhase('extracting');
    setError('');
    setWarnings([]);
    setReviewSkills([]);
    setAnnouncement('Reading your CV.');

    try {
      const result = await extractCvSkills({ file }, { signal });
      if (signal.aborted || !session.completeUpload(id, result)) return;
      const existing = new Set(existingSkills.map(skill => skillKey(skill.name)));
      const unique = [...new Set(result.skills.map(name => name.trim()).filter(Boolean))];
      const newKeys = new Set(unique.map(skillKey));
      const retained = existingSkills.filter(skill => !isCv(skill) || newKeys.has(skillKey(skill.name))).length;
      const remainingSlots = Math.max(0, 50 - retained);
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
      setAnnouncement(unique.length ? `${unique.length} recognizable skills found. Review them before adding them to your profile.` : NO_SKILLS_MESSAGE);
    } catch (caught) {
      if (signal.aborted) return;
      const message = getErrorMessage(caught);
      session.failUpload(id, message);
      setError(message);
      setPhase('error');
      setAnnouncement(message);
    }
  };

  const acceptFile = (file?: File) => {
    if (!file) return;
    const fail = (message: string) => {
      const { id } = session.beginUpload();
      session.failUpload(id, message);
      resetLocal();
      setError(message);
      setPhase('error');
      setAnnouncement(message);
    };
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ACCEPTED_EXTENSIONS.includes(extension)) {
      fail('Choose a PDF, DOCX, TXT, JPG, JPEG or PNG file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      fail('This file is larger than 5 MB. Choose a smaller file.');
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
    const capacity = Math.max(0, 50 - retainedCount);
    const selectedCount = reviewSkills.filter(skill => skill.selected && !skill.alreadyInProfile).length;
    if (selected && selectedCount >= capacity) return;
    setReviewSkills(current => current.map((skill, i) => i === index ? { ...skill, selected } : skill));
  };

  const setSkillLevel = (index: number, value: string) => {
    const level = value === '' ? '' : Number(value) as Proficiency;
    setReviewSkills(current => current.map((skill, i) => i === index ? { ...skill, level } : skill));
  };

  const selectedSkills = reviewSkills.filter(skill => skill.selected && !skill.alreadyInProfile);
  const remainingSlots = Math.max(0, 50 - retainedCount);
  const canApply = reviewSkills.length > 0 && (selectedSkills.length > 0 || staleCvSkills.length > 0) && selectedSkills.every(skill => skill.level !== '');

  const applyCvData = () => {
    if (!canApply) return;
    const importedSkills = selectedSkills.map(skill => ({
      name: skill.name,
      level: skill.level as Proficiency,
      category: session.draft?.categories[skill.name.trim().toLowerCase()] ?? 'CV detected',
      cvDetected: true,
    }));
    onApply(importedSkills, reviewSkills.map(skill => skill.name));
    setReviewSkills([]);
    setWarnings([]);
    setPhase('idle');
    setReviewDialogOpen(false);
    setAnnouncement(`${importedSkills.length} confirmed skill${importedSkills.length === 1 ? '' : 's'} applied. Earlier CV-derived skills were replaced; manual skills were kept. Save your skills to keep them.`);
  };
  const explainCvSkill = (skillName: string) => {
    setReviewDialogOpen(false);
    requestAnimationFrame(() => openAiDrawer({
      feature: 'cv-analysis',
      cvDetectedSkill: skillName,
      onClose: () => setReviewDialogOpen(true),
    }));
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
        <p>Review each recognized skill and choose its proficiency before adding it to your profile. Applying a new CV replaces skills from an earlier CV; skills you added manually stay.</p>
      </div>
    </div>

    <div
      className={`profile-cv-drop${dragging ? ' is-dragging' : ''}${phase === 'extracting' ? ' is-busy' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      data-testid="drop-cv-profile"
    >
      {phase === 'extracting' ? <RaccoonLoader /> : <FileText size={22} aria-hidden="true" />}
      <strong>{phase === 'extracting' ? 'Reading your CV' : 'Drop your CV here'}</strong>
      <span>PDF, DOCX, TXT, JPG or PNG · up to 5 MB</span>
      <div className="profile-cv-actions">
        <button type="button" className="btn btn-secondary btn-small" onClick={() => inputRef.current?.click()} disabled={phase === 'extracting'} data-testid="button-choose-cv">
          Choose a file
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

    <p className="profile-cv-privacy"><Info size={14} /> Your CV and extracted text are processed by this app and are not saved. A detected name appears temporarily in the lower-left profile area. Other CV details (education, work, projects) stay in this tab only and are cleared by the next upload. Only skills you review, apply and save are kept in your browser profile.</p>

    {phase === 'error' && <p className="profile-cv-error" role="alert" data-testid="error-profile-cv">{error}</p>}
    {phase === 'extracting' && <p className="profile-cv-status" role="status">Extracting recognizable skills. This can take a short while for scanned documents.</p>}
    {announcement && <span className="sr-only" role="status" aria-live="polite">{announcement}</span>}

    {phase === 'review' && <div className="profile-cv-result" role="status" data-testid="status-profile-cv-review">
      <div>
        <div className="profile-cv-result-title">
          <strong>{reviewSkills.length ? 'Skills ready to review' : 'CV review ready'}</strong>
          <Check size={14} aria-hidden="true" />
        </div>
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
        <h2 id="profile-cv-review-title">Review and explain CV skills</h2>
        <p id="profile-cv-review-description">Ask AI to explain any detected skill, or select skills and set your own proficiency before adding them. AI receives only the chosen skill name, never your CV.</p>
      </header>
      {session.draft?.extractionLimited && <p className="cvx-limited" role="note" data-testid="text-cv-limited">{LIMITED_MESSAGE}</p>}
      {warnings.length > 0 && <ul className="profile-cv-warnings" data-testid="warnings-profile-cv">{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}
      {reviewSkills.length === 0
        ? <div className="profile-cv-empty" data-testid="empty-profile-cv">{NO_SKILLS_MESSAGE}{existingSkills.length > 0 && ' Your existing profile skills, including any from an earlier CV, are unchanged. Remove them manually in Skills if they no longer apply.'}</div>
        : <>
          <div className="profile-cv-dialog-review-head">
            <strong>Skills from your CV</strong>
            <span>{reviewSkills.length} detected · {selectedSkills.length} selected</span>
          </div>
          {remainingSlots === 0 && <p className="profile-cv-level-note">Your profile already has 50 skills. Remove one from the profile before adding more.</p>}
          <div className="profile-cv-dialog-skills">
            {reviewSkills.map((skill, index) => <div className="profile-cv-dialog-row" key={skill.name}>
              <div className="profile-cv-dialog-skill-main">
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
                <button type="button" className="btn btn-secondary btn-small cv-skill-ai-button" aria-label={`Explain ${skill.name} with AI`} data-testid={`button-ai-explain-cv-skill-${index}`} onClick={() => explainCvSkill(skill.name)}>
                  <Sparkles size={12} aria-hidden="true" /> Explain
                </button>
              </div>
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
          {staleCvSkills.length > 0 && <p className="profile-cv-level-note" data-testid="text-cv-stale">Applying will remove {staleCvSkills.length} skill{staleCvSkills.length === 1 ? '' : 's'} from an earlier CV not found in this one: {staleCvSkills.map(s => s.name).join(', ')}. Skills found again keep your earlier rating; manual skills always stay.</p>}
          {!canApply && <p className="profile-cv-level-note" role="status">Choose a self-rated level for every selected new skill, or uncheck skills you do not want to add.</p>}
        </>}
      {session.draft && (session.draft.certifications.length > 0 || session.draft.languages.length > 0) && <div className="profile-cv-extra" data-testid="list-cv-extra">
        {session.draft.certifications.length > 0 && <div><strong>Certifications found</strong><ul>{session.draft.certifications.map(c => <li key={c.id}>{c.text}</li>)}</ul></div>}
        {session.draft.languages.length > 0 && <div><strong>Languages found</strong><ul>{session.draft.languages.map(c => <li key={c.id}>{c.text}</li>)}</ul></div>}
        <p>Shown separately from dataset skills. Languages are not required or shared in Skill analysis.</p>
      </div>}
      <div className="profile-cv-dialog-footer">
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setReviewDialogOpen(false)}>Back to profile</button>
        {reviewSkills.length > 0 && <button type="button" className="btn btn-primary btn-small" onClick={() => applyCvData()} disabled={!canApply} data-testid="button-apply-cv-skills">
          <Check size={14} /> Apply CV skills
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
