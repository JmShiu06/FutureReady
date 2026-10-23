import { useState } from 'react';
import { useWorkspace } from '@/domain/workspace-context';
import { fictionalProfile, pathwaySamples, sampleCvText } from '@/domain/pathway-samples';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
export function SampleCvLinks() {
  const download = (id: string) => {
    const url = URL.createObjectURL(new Blob([sampleCvText(id)], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `fictional-${id}-cv.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <details className="card-more"><summary>Download fictional sample CVs (TXT)</summary>
    <div className="pl-chips">{pathwaySamples.map(s => <button key={s.id} type="button" className="btn btn-secondary btn-small" onClick={() => download(s.id)}>Download {s.name}'s sample CV</button>)}</div>
  </details>;
}
export function FictionalSamples() {
  const { profile, saveProfile } = useWorkspace();
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  return <section className="panel panel-pad" style={{ marginBottom: 20 }} aria-label="Fictional sample profiles">
    <h2>Try a fictional sample</h2><p className="small">No real personal data. Load a sample, then pick a role in Careers & jobs. Existing roadmap history stays separate.</p>
    <div className="grid-2">{pathwaySamples.map(s => <div key={s.id}>
      <button type="button" className="btn btn-secondary" onClick={() => setSelected(s.id)} data-testid={`sample-profile-${s.id}`}>{s.label}</button>
      <p className="small">Fictional sample · {s.experience} years experience · {s.hours} hrs/week · MYR {s.budget} budget.<br />Interests: {s.interests.join(', ')}. Skills: {sampleStarting(s.id)}.</p>
    </div>)}</div>
    {status && <p role="status">{status}</p>}<SampleCvLinks />
    <AlertDialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Load this fictional sample?</AlertDialogTitle>
        <AlertDialogDescription>This replaces the skills and preferences in your current profile, including unsaved form edits. Existing roadmap snapshots, completions and other audiences are kept. Cancel to keep your current profile.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (selected) { saveProfile(fictionalProfile(profile, selected)); setStatus('Fictional sample loaded. Choose a target role to build its roadmap.'); } setSelected(null); }}>Load fictional sample</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
function sampleStarting(id: string) {
  const s = pathwaySamples.find(p => p.id === id)!;
  return s.skills.map((name, i) => `${name} ${s.levels[i]}/5`).join(', ');
}
