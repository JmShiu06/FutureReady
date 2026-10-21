import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import type { CvProfileSuggestions } from '@workspace/api-client-react';
import { ProfileCvImport } from '@/components/profile-cv-import';
import { ChiliLevelPicker } from '@/components/chili-level-picker';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useWorkspace } from '@/domain/workspace-context';
import { profileSchema } from '@/domain/storage';
import { audienceLabels, skillCatalogue } from '@/domain/demo-data';
import type { DemoProfile, ProfileSkill } from '@/domain/types';
import { PageHead, SectionTitle, slug } from '@/components/workspace/ui';

const formSchema = profileSchema.extend({ interestsText: z.string().max(1200) }).superRefine((v, ctx) => {
  const list = v.interestsText.split(',').map(s => s.trim()).filter(Boolean);
  if (list.length > 10) ctx.addIssue({ code: 'custom', path: ['interestsText'], message: 'Up to 10 interests.' });
  if (list.some(s => s.length > 120)) ctx.addIssue({ code: 'custom', path: ['interestsText'], message: 'Each interest must be 120 characters or fewer.' });
});
type FormValues = z.infer<typeof formSchema>;
const toForm = (p: DemoProfile): FormValues => ({ ...p, interestsText: p.interests.join(', ') });
const numberChange = (fn: (v: number | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => fn(e.target.value === '' ? null : Number(e.target.value));

export default function ProfilePage() {
  const { state, profile, saveProfile, resetProfile, loadSample } = useWorkspace();
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: toForm(profile) });
  const skills = useFieldArray({ control: form.control, name: 'skills' });
  const profileSkills = form.watch('skills') ?? [];
  const [saved, setSaved] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');
  const [skillError, setSkillError] = useState('');
  const [variant, setVariant] = useState<'default' | 'data'>('default');
  const graduate = state.audience === 'graduate' || state.audience === 'education';

  useEffect(() => { form.reset(toForm(profile)); }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (v: FormValues) => {
    const { interestsText, ...rest } = v;
    saveProfile({ ...rest, interests: interestsText.split(',').map(s => s.trim()).filter(Boolean) } as DemoProfile);
    setSaved('Profile updated for this session. Browser storage warnings, if any, are shown above.');
  };
  const applyCvImport = (imported: ProfileSkill[], details: CvProfileSuggestions) => {
    if (imported.length) skills.append(imported);
    const options = { shouldDirty: true, shouldValidate: true };
    let filled = 0;
    if (details.occupation !== undefined) { form.setValue('occupation', details.occupation, options); filled++; }
    if (details.experienceYears !== undefined) { form.setValue('experienceYears', details.experienceYears, options); filled++; }
    if (details.education !== undefined) { form.setValue('education', details.education, options); filled++; }
    if (details.qualification !== undefined) { form.setValue('qualification', details.qualification, options); filled++; }
    if (details.studyField !== undefined) { form.setValue('studyField', details.studyField, options); filled++; }
    if (details.interests !== undefined) { form.setValue('interestsText', details.interests.join(', '), options); filled++; }
    if (details.location !== undefined) { form.setValue('location', details.location, options); filled++; }
    if (details.workPreference !== undefined) { form.setValue('workPreference', details.workPreference, options); filled++; }
    if (details.learningHours !== undefined) { form.setValue('learningHours', details.learningHours, options); filled++; }
    if (details.budgetMYR !== undefined) { form.setValue('budgetMYR', details.budgetMYR, options); filled++; }
    if (details.goals !== undefined) { form.setValue('goals', details.goals, options); filled++; }
    const updates = [];
    if (filled) updates.push(`${filled} About You field${filled === 1 ? '' : 's'} filled`);
    if (imported.length) updates.push(`${imported.length} confirmed skill${imported.length === 1 ? '' : 's'} added`);
    setSaved(`${updates.join(' and ')} in the profile draft. Review the fields and save your profile to keep them.`);
  };
  const addSkill = () => {
    const name = newSkill.trim().replace(/\s+/g, ' ');
    const current = form.getValues('skills');
    if (!name) return setSkillError('Enter a skill name.');
    if (name.length > 60) return setSkillError('Skill names must be 60 characters or fewer.');
    if (current.length >= 50) return setSkillError('A profile can hold up to 50 skills.');
    const normalise = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
    if (current.some(s => normalise(s.name) === normalise(name))) return setSkillError(`"${name}" is already in your profile.`);
    skills.append({ name, level: 2, category: newCategory.trim().slice(0, 120) || 'Custom' });
    setNewSkill(''); setSkillError(''); setSaved('');
  };

  return <>
    <PageHead eyebrow={`${audienceLabels[state.audience]} · profile builder`} title="Your starting point." subtitle="Review suggested CV details or enter them manually. Each audience keeps its own profile." />
      <div className="source-note" style={{ marginBottom: 18 }}>
        Add only details that apply to you. Leave any field blank if it does not; About You details provide planning context and do not secretly change your score.
        Skill levels range from 1 (new to it) to 5 (can teach). Learning hours are a whole number from 1–40 per week; the budget is your total approximate learning budget in MYR.
        Save your edits before switching audiences or pages.
    </div>
    <ProfileCvImport existingSkills={profileSkills} onApply={applyCvImport} />
    <div className="grid-2">
      <div className="panel panel-pad">
        <SectionTitle title="Fictional sample profiles" note="REPLACES THIS AUDIENCE ONLY" />
        <div className="row">
          <select className="select-field" value={variant} onChange={e => setVariant(e.target.value as 'default' | 'data')} aria-label="Choose sample profile" data-testid="select-sample-variant">
            <option value="default">Default sample (operations)</option><option value="data">Data-leaning sample</option>
          </select>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => { loadSample(variant); setSaved('Sample profile loaded for this audience.'); }} data-testid="button-load-sample">Load sample</button>
        </div>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Reset" note="BLANKS ABOUT YOU + RESTORES DEFAULT SKILLS" />
        <AlertDialog>
          <AlertDialogTrigger asChild><button type="button" className="btn btn-danger btn-small" data-testid="button-reset-profile"><RotateCcw size={12} /> Reset this profile</button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Reset the {audienceLabels[state.audience]} profile?</AlertDialogTitle>
              <AlertDialogDescription>This clears About You values, restores the default demo skills and clears roadmap completion for this audience only. Other audience profiles are kept.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { resetProfile(); setSaved('Profile reset to the default sample.'); }} data-testid="button-confirm-reset">Reset</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="stack" noValidate>
          <div className="panel panel-pad profile-about-you">
          <SectionTitle title="About you" note="BACKGROUND AND CONSTRAINTS" />
          <div className="form-grid">
            <FormField control={form.control} name="occupation" render={({ field }) => <FormItem className="field"><FormLabel>{graduate ? 'Study programme or occupation' : 'Occupation'}</FormLabel><FormControl><input className="fr-input" placeholder="e.g., Operations coordinator" {...field} data-testid="input-occupation" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="experienceYears" render={({ field }) => <FormItem className="field"><FormLabel>Years of experience</FormLabel><FormControl><input type="number" min={0} max={60} step="any" className="fr-input" name={field.name} ref={field.ref} onBlur={field.onBlur} value={field.value ?? ''} onChange={numberChange(field.onChange)} placeholder="e.g., 4" data-testid="input-experience" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="education" render={({ field }) => <FormItem className="field"><FormLabel>Education</FormLabel><FormControl><input className="fr-input" placeholder="e.g., Diploma in Business" {...field} data-testid="input-education" /></FormControl><FormMessage /></FormItem>} />
            {graduate && <>
              <FormField control={form.control} name="qualification" render={({ field }) => <FormItem className="field"><FormLabel>Qualification</FormLabel><FormControl><input className="fr-input" placeholder="e.g., Diploma" {...field} data-testid="input-qualification" /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="studyField" render={({ field }) => <FormItem className="field"><FormLabel>Field of study</FormLabel><FormControl><input className="fr-input" placeholder="e.g., Business information systems" {...field} data-testid="input-study-field" /></FormControl><FormMessage /></FormItem>} />
            </>}
            <FormField control={form.control} name="interestsText" render={({ field }) => <FormItem className="field"><FormLabel>Interests (comma separated)</FormLabel><FormControl><input className="fr-input" placeholder="e.g., Data, service design" {...field} data-testid="input-interests" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="location" render={({ field }) => <FormItem className="field"><FormLabel>Location</FormLabel><FormControl><input className="fr-input" placeholder="e.g., Kuala Lumpur" {...field} data-testid="input-location" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="workPreference" render={({ field }) => <FormItem className="field"><FormLabel>Work preference</FormLabel><FormControl><select className={`fr-select${field.value === '' ? ' is-placeholder' : ''}`} {...field} data-testid="select-work-preference"><option value="">Choose a preference (e.g., Hybrid)</option>{['Any', 'Remote', 'Hybrid', 'On-site'].map(o => <option key={o} value={o}>{o}</option>)}</select></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="learningHours" render={({ field }) => <FormItem className="field"><FormLabel>Learning hours per week (1–40)</FormLabel><FormControl><input type="number" min={1} max={40} className="fr-input" name={field.name} ref={field.ref} onBlur={field.onBlur} value={field.value ?? ''} onChange={numberChange(field.onChange)} placeholder="e.g., 5" data-testid="input-learning-hours" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="budgetMYR" render={({ field }) => <FormItem className="field"><FormLabel>Learning budget (MYR)</FormLabel><FormControl><input type="number" min={0} className="fr-input" name={field.name} ref={field.ref} onBlur={field.onBlur} value={field.value ?? ''} onChange={numberChange(field.onChange)} placeholder="e.g., 200" data-testid="input-budget" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="goals" render={({ field }) => <FormItem className="field span-2"><FormLabel>Goals</FormLabel><FormControl><textarea className="fr-textarea" maxLength={500} placeholder="e.g., Move into a data analyst role" {...field} data-testid="input-goals" /></FormControl><FormMessage /></FormItem>} />
          </div>
        </div>

        <div className="panel panel-pad">
          <SectionTitle title="Skills" note={`${skills.fields.length} OF 50 · LEVELS 1–5`} />
          {skills.fields.length === 0 && <p className="muted">No skills yet. Add one below.</p>}
          {skills.fields.map((f, i) => <div className="skill-edit" key={f.id} data-testid={`row-skill-${i}`}>
            <FormField control={form.control} name={`skills.${i}.name`} render={({ field }) => <FormItem className="field"><FormControl><div className="skill-name-control">
              <input className="fr-input" aria-label={`Skill ${i + 1} name`} maxLength={60} {...field} data-testid={`input-skill-name-${i}`} />
              {(profileSkills[i]?.cvDetected || profileSkills[i]?.category === 'CV detected') && <span className="cv-skill-check" title="Found in CV" role="img" aria-label="Found in CV"><Check size={12} /></span>}
            </div></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name={`skills.${i}.category`} render={({ field }) => <FormItem className="field"><FormControl><input className="fr-input" aria-label={`Skill ${i + 1} category`} {...field} data-testid={`input-skill-category-${i}`} /></FormControl></FormItem>} />
            <FormField control={form.control} name={`skills.${i}.level`} render={({ field }) => <FormItem className="field"><FormControl><ChiliLevelPicker
              name={field.name}
              value={Number(field.value) as 1 | 2 | 3 | 4 | 5}
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

        <div className="spread">
          <span className="muted" role="status" data-testid="status-save">{saved && <><Check size={12} /> {saved}</>}{!saved && form.formState.isDirty && 'Unsaved changes'}</span>
          <button type="submit" className="btn btn-primary" data-testid="button-save-profile"><Save size={14} /> Save profile</button>
        </div>
      </form>
    </Form>
  </>;
}
