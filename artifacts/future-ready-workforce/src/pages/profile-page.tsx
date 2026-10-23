import { useEffect, useState } from 'react';
import { Link, Redirect, useLocation, useSearch } from 'wouter';
import { TwinSection } from '@/components/profile/twin-section';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Check, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ProfileCvImport } from '@/components/profile-cv-import';
import { useCvSession } from '@/domain/cv-session';
import { ChiliLevelSlider } from '@/components/chili-level-slider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useWorkspace } from '@/domain/workspace-context';
import { profileSchema } from '@/domain/storage';
import { mergeCvSkills } from '@/domain/demo-data';
import { useI18n } from '@/i18n/i18n-context';
import type { DemoProfile, ProfileSkill, Proficiency } from '@/domain/types';
import { RaccoonArt } from '@/components/brand/raccoon-art';
import { PageHead, SectionTitle, slug } from '@/components/workspace/ui';

type ProfileSection = 'skills' | 'twin';
const formSchema = profileSchema.extend({ interestsText: z.string().max(1200) }).superRefine((v, ctx) => {
  const list = v.interestsText.split(',').map(s => s.trim()).filter(Boolean);
  if (list.length > 10) ctx.addIssue({ code: 'custom', path: ['interestsText'], message: 'Up to 10 interests.' });
  if (list.some(s => s.length > 120)) ctx.addIssue({ code: 'custom', path: ['interestsText'], message: 'Each interest must be 120 characters or fewer.' });
});
type FormValues = z.infer<typeof formSchema>;
const toForm = (p: DemoProfile): FormValues => ({ ...p, interestsText: p.interests.join(', ') });
const normaliseSkillName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

export default function ProfilePage() {
  const { state, profile, saveProfile } = useWorkspace();
  const { phase: cvPhase, draft: cvDraft } = useCvSession();
  const { t } = useI18n();
  const audienceName = t(`audience.${state.audience}`);
  const [analysisPromptOpen, setAnalysisPromptOpen] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: toForm(profile) });
  const skills = useFieldArray({ control: form.control, name: 'skills' });
  const profileSkills = form.watch('skills') ?? [];
  const [saved, setSaved] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');
  const [skillError, setSkillError] = useState('');
  useEffect(() => { form.reset(toForm(profile)); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSaved(''); }, [state.audience]);

  const onSubmit = (v: FormValues) => {
    const { interestsText, ...rest } = v;
    saveProfile({ ...rest, interests: interestsText.split(',').map(s => s.trim()).filter(Boolean) } as DemoProfile);
    setSaved(t('profile.savedNotice'));
    if (cvDraft?.skills.length && v.skills.length) setAnalysisPromptOpen(true);
  };
  const applyCvImport = (imported: ProfileSkill[], detectedNames: string[]) => {
    const next = mergeCvSkills(form.getValues('skills'), imported, detectedNames);
    skills.replace(next.skills);
    if (imported.length && cvDraft?.skills.length) setAnalysisPromptOpen(true);
    setSaved(next.removed.length ? t('profile.cvAppliedRemoved', { count: imported.length, removed: next.removed.length }) : t('profile.cvApplied', { count: imported.length }));
  };
  const addSkill = () => {
    const name = newSkill.trim().replace(/\s+/g, ' ');
    const current = form.getValues('skills');
    if (!name) return setSkillError(t('profile.errEmpty'));
    if (name.length > 60) return setSkillError(t('profile.errLong'));
    if (current.length >= 50) return setSkillError(t('profile.errMax'));
    if (current.some(s => normaliseSkillName(s.name) === normaliseSkillName(name))) return setSkillError(t('profile.errDup', { name }));
    skills.append({ name, level: 2, category: newCategory.trim().slice(0, 120) || 'Custom' });
    setNewSkill(''); setSkillError(''); setSaved('');
  };
  const resetSkills = () => {
    saveProfile({ ...profile, skills: [] });
    skills.replace([]);
    form.reset({ ...form.getValues(), skills: [] });
    setNewSkill(''); setSkillError('');
    setSaved(t('profile.clearedNotice', { audience: audienceName }));
  };
  const canReset = profile.skills.length > 0 || profileSkills.length > 0 || newSkill.trim() !== '';
  const [, navigate] = useLocation();
  const sectionParam = new URLSearchParams(useSearch()).get('section');
  const section: ProfileSection = sectionParam === 'twin' ? 'twin' : 'skills';
  const openSection = (next: ProfileSection) => navigate(next === 'skills' ? '/my-profile' : `/my-profile?section=${next}`);
  const tabs: { key: ProfileSection; label: string }[] = [
    { key: 'skills', label: t('profile.tabSkills') }, { key: 'twin', label: t('profile.tabTwin') },
  ];
  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length].key;
    openSection(next);
    requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
  };

  if (sectionParam === 'roadmap') return <Redirect to="/learning-roadmap" replace />;
  return <>
    <PageHead eyebrow={t('profile.eyebrow', { audience: audienceName })} title={section === 'skills' ? t('profile.titleSkills') : t('profile.titleTwin')} subtitle={t('profile.subtitle')}
      action={<span className="art-doodle-row"><RaccoonArt name={section === 'skills' ? 'star' : 'heart'} size={56} /><RaccoonArt name="sparkles" size={30} /></span>} />
    <div className="profile-tabs" role="tablist" aria-label={t('profile.tabsLabel')}>
      {tabs.map((tab, i) => <button key={tab.key} id={`tab-${tab.key}`} role="tab" type="button" aria-selected={section === tab.key} aria-controls={`panel-${tab.key}`} tabIndex={section === tab.key ? 0 : -1}
        className={`profile-tab${section === tab.key ? ' active' : ''}`} onClick={() => openSection(tab.key)} onKeyDown={e => onTabKey(e, i)} data-testid={`tab-profile-${tab.key}`}>{tab.label}</button>)}
    </div>
    <div id="panel-twin" role="tabpanel" aria-labelledby="tab-twin" hidden={section !== 'twin'} data-testid="panel-profile-twin">{section === 'twin' && <>
      <TwinSection />
      <Link href="/learning-roadmap" className="text-link" data-testid="link-twin-roadmap">{t('profile.openRoadmap')} <ArrowRight size={12} /></Link>
    </>}</div>
    <div id="panel-skills" role="tabpanel" aria-labelledby="tab-skills" hidden={section !== 'skills'}>
    <ProfileCvImport existingSkills={profileSkills} onApply={applyCvImport} />
    {cvPhase === 'ready' && <p className="muted small"><Link href="/market-and-ai-impact?tab=ai-impact" className="text-link" data-testid="link-profile-cv-review">{t('profile.saveThenAnalyse')}</Link></p>}
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="stack" noValidate>
        <div className="panel panel-pad">
          <SectionTitle
            title={t('profile.skills')}
            note={t('profile.skillsNote', { count: skills.fields.length })}
            info={t('profile.skillsInfo')}
          />
          {skills.fields.length === 0 && <p className="muted" data-testid="text-no-skills">{t('profile.noSkills')}</p>}
          {skills.fields.map((f, i) => <div className="skill-edit" key={f.id} data-testid={`row-skill-${i}`}>
            <FormField control={form.control} name={`skills.${i}.name`} render={({ field }) => <FormItem className="field"><FormControl><div className="skill-name-control">
              <input className="fr-input" aria-label={t('profile.skillNameAria', { n: i + 1 })} maxLength={60} {...field} data-testid={`input-skill-name-${i}`} />
              {(profileSkills[i]?.cvDetected || profileSkills[i]?.category === 'CV detected') && <span className="cv-skill-check" title={t('cv.foundInCv')} role="img" aria-label={t('cv.foundInCv')}><Check size={12} /></span>}
            </div></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name={`skills.${i}.category`} render={({ field }) => <FormItem className="field"><FormControl><input className="fr-input" aria-label={t('profile.skillCategoryAria', { n: i + 1 })} {...field} data-testid={`input-skill-category-${i}`} /></FormControl></FormItem>} />
            <FormField control={form.control} name={`skills.${i}.level`} render={({ field }) => <FormItem className="field"><FormControl><ChiliLevelSlider
              value={Number(field.value) as Proficiency}
              onChange={field.onChange}
              label={t('profile.proficiencyFor', { name: f.name })}
              testId={`select-skill-level-${i}`}
            /></FormControl></FormItem>} />
            <button type="button" className="icon-button" onClick={() => skills.remove(i)} aria-label={t('profile.removeSkill', { name: f.name })} data-testid={`button-remove-skill-${i}`}><Trash2 size={14} /></button>
          </div>)}
          {form.formState.errors.skills?.root?.message && <p className="field-error" role="alert">{form.formState.errors.skills.root.message}</p>}
          {form.formState.errors.skills?.message && <p className="field-error" role="alert">{form.formState.errors.skills.message}</p>}
          <div className="row" style={{ marginTop: 14 }}>
            <input className="fr-input" style={{ maxWidth: 260 }} maxLength={80} value={newSkill} onChange={e => { setNewSkill(e.target.value); setSkillError(''); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} placeholder={t('profile.addSkillPlaceholder')} aria-label={t('profile.newSkillName')} data-testid="input-new-skill" />
            <input className="fr-input" style={{ maxWidth: 160 }} value={newCategory} onChange={e => setNewCategory(e.target.value)} aria-label={t('profile.newSkillCategory')} data-testid="input-new-skill-category" />
            <button type="button" className="btn btn-secondary btn-small" onClick={addSkill} data-testid="button-add-skill"><Plus size={12} /> {t('profile.addSkill')}</button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className="btn btn-danger btn-small" disabled={!canReset} data-testid="button-reset-skills"><RotateCcw size={12} /> {t('profile.resetSkills')}</button>
              </AlertDialogTrigger>
              <AlertDialogContent className="roadmap-reset-dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('profile.resetTitle', { audience: audienceName })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('profile.resetBody')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-reset-skills">{t('profile.keepSkills')}</AlertDialogCancel>
                  <AlertDialogAction className="btn-danger" onClick={resetSkills} data-testid="button-confirm-reset-skills">{t('profile.resetSkills')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {skillError && <p className="field-error" role="alert" data-testid="error-add-skill">{skillError}</p>}
        </div>

        <div className="profile-save-bar" role="region" aria-label={t('profile.saveControls')}>
          <span className="muted" role="status" data-testid="status-save">{saved && <><Check size={12} /> {saved}</>}{!saved && form.formState.isDirty && t('profile.unsaved')}</span>
          <button type="submit" className="btn btn-primary" data-testid="button-save-profile"><Save size={14} /> {t('profile.saveProfile')}</button>
        </div>
      </form>
    </Form>
    <AlertDialog open={analysisPromptOpen} onOpenChange={setAnalysisPromptOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('profile.analysisTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('profile.analysisBody')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-stay-after-grading">{t('profile.stayHere')}</AlertDialogCancel>
          <button type="button" className="btn btn-primary" data-testid="button-open-analysis-after-grading" onClick={() => {
            void form.handleSubmit(v => { onSubmit(v); setAnalysisPromptOpen(false); navigate('/market-and-ai-impact?tab=ai-impact'); }, () => setAnalysisPromptOpen(false))();
          }}>{t('profile.saveAndOpen')}</button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  </>;
}
