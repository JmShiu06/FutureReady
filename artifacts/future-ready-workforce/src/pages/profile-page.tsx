import { useEffect, useState } from 'react';
import { AiExplanationPanel } from '@/components/ai-explanation-panel';
import { useLocation, useSearch } from 'wouter';
import { RoadmapSection } from '@/components/profile/roadmap-section';
import { TwinSection } from '@/components/profile/twin-section';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import { ProfileCvImport } from '@/components/profile-cv-import';
import { ChiliLevelSlider } from '@/components/chili-level-slider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useWorkspace } from '@/domain/workspace-context';
import { profileSchema } from '@/domain/storage';
import { audienceLabels, skillCatalogue } from '@/domain/demo-data';
import type { DemoProfile, ProfileSkill, Proficiency } from '@/domain/types';
import { PageHead, SectionTitle, slug } from '@/components/workspace/ui';

type ProfileSection = 'skills' | 'roadmap' | 'twin';
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
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: toForm(profile) });
  const skills = useFieldArray({ control: form.control, name: 'skills' });
  const profileSkills = form.watch('skills') ?? [];
  const [saved, setSaved] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');
  const [skillError, setSkillError] = useState('');
  useEffect(() => { form.reset(toForm(profile)); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (v: FormValues) => {
    const { interestsText, ...rest } = v;
    saveProfile({ ...rest, interests: interestsText.split(',').map(s => s.trim()).filter(Boolean) } as DemoProfile);
    setSaved('Profile updated for this session. Browser storage warnings, if any, are shown above.');
  };
  const applyCvImport = (imported: ProfileSkill[]) => {
    if (!imported.length) return;
    skills.append(imported);
    setSaved(`${imported.length} confirmed CV skill${imported.length === 1 ? '' : 's'} added. Review and save your skills.`);
  };
  const applyAiSkills = (suggested: ProfileSkill[]) => {
    const current = form.getValues('skills');
    if (current.length + suggested.length > 50) return 'A profile can hold up to 50 skills. Remove an existing skill before adding these suggestions.';
    const duplicate = suggested.find(s => current.some(existing => normaliseSkillName(existing.name) === normaliseSkillName(s.name)));
    if (duplicate) return `"${duplicate.name}" is already in your profile draft. Its proficiency was not changed.`;
    skills.append(suggested);
    setSaved(`${suggested.length} confirmed AI suggestion${suggested.length === 1 ? '' : 's'} added to the draft. Review and save your profile.`);
    return undefined;
  };
  const addSkill = () => {
    const name = newSkill.trim().replace(/\s+/g, ' ');
    const current = form.getValues('skills');
    if (!name) return setSkillError('Enter a skill name.');
    if (name.length > 60) return setSkillError('Skill names must be 60 characters or fewer.');
    if (current.length >= 50) return setSkillError('A profile can hold up to 50 skills.');
    if (current.some(s => normaliseSkillName(s.name) === normaliseSkillName(name))) return setSkillError(`"${name}" is already in your profile.`);
    skills.append({ name, level: 2, category: newCategory.trim().slice(0, 120) || 'Custom' });
    setNewSkill(''); setSkillError(''); setSaved('');
  };
  const [, navigate] = useLocation();
  const sectionParam = new URLSearchParams(useSearch()).get('section');
  const section: ProfileSection = sectionParam === 'roadmap' || sectionParam === 'twin' ? sectionParam : 'skills';
  const openSection = (next: ProfileSection) => navigate(next === 'skills' ? '/profile' : `/profile?section=${next}`);
  const tabs: { key: ProfileSection; label: string }[] = [
    { key: 'skills', label: 'Skills profile' }, { key: 'roadmap', label: 'Learning roadmap' }, { key: 'twin', label: 'Digital twin & progress' },
  ];
  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length].key;
    openSection(next);
    requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
  };

  return <>
    <PageHead eyebrow={`${audienceLabels[state.audience]} · my profile`} title={section === 'skills' ? 'Your starting point.' : section === 'roadmap' ? 'One practical step at a time.' : 'See how far you have come.'} subtitle="Skills, learning roadmap and progress in one place. Each audience keeps its own profile." />
    <AiExplanationPanel key={section} feature={section === 'skills' ? 'profile-skills' : section === 'roadmap' ? 'learning-roadmap' : 'digital-twin'} onApplySkills={section === 'skills' ? applyAiSkills : undefined} />
    <div className="profile-tabs" role="tablist" aria-label="My profile sections">
      {tabs.map((t, i) => <button key={t.key} id={`tab-${t.key}`} role="tab" type="button" aria-selected={section === t.key} aria-controls={`panel-${t.key}`} tabIndex={section === t.key ? 0 : -1}
        className={`profile-tab${section === t.key ? ' active' : ''}`} onClick={() => openSection(t.key)} onKeyDown={e => onTabKey(e, i)} data-testid={`tab-profile-${t.key}`}>{t.label}</button>)}
    </div>
    <div id="panel-roadmap" role="tabpanel" aria-labelledby="tab-roadmap" hidden={section !== 'roadmap'} data-testid="panel-profile-roadmap">{section === 'roadmap' && <RoadmapSection onReview={() => openSection('twin')} />}</div>
    <div id="panel-twin" role="tabpanel" aria-labelledby="tab-twin" hidden={section !== 'twin'} data-testid="panel-profile-twin">{section === 'twin' && <TwinSection />}</div>
    <div id="panel-skills" role="tabpanel" aria-labelledby="tab-skills" hidden={section !== 'skills'}>
    <ProfileCvImport existingSkills={profileSkills} onApply={applyCvImport} />
    {section === 'skills' && <AiExplanationPanel feature="cv-analysis" />}

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="stack" noValidate>
        <div className="panel panel-pad">
          <SectionTitle
            title="Skills"
            note={`${skills.fields.length} OF 50 · LEVELS 1–5`}
            info="Set each level yourself: 1 is new to it and 5 means you can teach it. CV verification only confirms a skill name; it never sets proficiency."
          />
          {skills.fields.length === 0 && <p className="muted">No skills yet. Add one below.</p>}
          {skills.fields.map((f, i) => <div className="skill-edit" key={f.id} data-testid={`row-skill-${i}`}>
            <FormField control={form.control} name={`skills.${i}.name`} render={({ field }) => <FormItem className="field"><FormControl><div className="skill-name-control">
              <input className="fr-input" aria-label={`Skill ${i + 1} name`} maxLength={60} {...field} data-testid={`input-skill-name-${i}`} />
              {(profileSkills[i]?.cvDetected || profileSkills[i]?.category === 'CV detected') && <span className="cv-skill-check" title="Found in CV" role="img" aria-label="Found in CV"><Check size={12} /></span>}
            </div></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name={`skills.${i}.category`} render={({ field }) => <FormItem className="field"><FormControl><input className="fr-input" aria-label={`Skill ${i + 1} category`} {...field} data-testid={`input-skill-category-${i}`} /></FormControl></FormItem>} />
            <FormField control={form.control} name={`skills.${i}.level`} render={({ field }) => <FormItem className="field"><FormControl><ChiliLevelSlider
              value={Number(field.value) as Proficiency}
              onChange={field.onChange}
              label={`Proficiency for ${f.name}`}
              testId={`select-skill-level-${i}`}
            /></FormControl></FormItem>} />
            <button type="button" className="icon-button" onClick={() => skills.remove(i)} aria-label={`Remove skill ${f.name}`} data-testid={`button-remove-skill-${i}`}><Trash2 size={14} /></button>
          </div>)}
          {form.formState.errors.skills?.root?.message && <p className="field-error" role="alert">{form.formState.errors.skills.root.message}</p>}
          {form.formState.errors.skills?.message && <p className="field-error" role="alert">{form.formState.errors.skills.message}</p>}
          <div className="row" style={{ marginTop: 14 }}>
            <input className="fr-input" style={{ maxWidth: 260 }} list="skill-catalogue" maxLength={80} value={newSkill} onChange={e => { setNewSkill(e.target.value); setSkillError(''); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} placeholder="Add a skill" aria-label="New skill name" data-testid="input-new-skill" />
            <datalist id="skill-catalogue">{skillCatalogue.map(s => <option key={s} value={s} />)}</datalist>
            <input className="fr-input" style={{ maxWidth: 160 }} value={newCategory} onChange={e => setNewCategory(e.target.value)} aria-label="New skill category" data-testid="input-new-skill-category" />
            <button type="button" className="btn btn-secondary btn-small" onClick={addSkill} data-testid="button-add-skill"><Plus size={12} /> Add skill</button>
          </div>
          {skillError && <p className="field-error" role="alert" data-testid="error-add-skill">{skillError}</p>}
          <div className="row" style={{ marginTop: 10 }}>{skillCatalogue.filter(s => !skills.fields.some(f => f.name.toLowerCase() === s.toLowerCase())).slice(0, 8).map(s => <button type="button" key={s} className="chip" style={{ border: 0 }} onClick={() => setNewSkill(s)} data-testid={`button-suggest-${slug(s)}`}>{s}</button>)}</div>
        </div>

        <div className="profile-save-bar" role="region" aria-label="Profile save controls">
          <span className="muted" role="status" data-testid="status-save">{saved && <><Check size={12} /> {saved}</>}{!saved && form.formState.isDirty && 'Unsaved changes'}</span>
          <button type="submit" className="btn btn-primary" data-testid="button-save-profile"><Save size={14} /> Save profile</button>
        </div>
      </form>
    </Form>
    </div>
  </>;
}
