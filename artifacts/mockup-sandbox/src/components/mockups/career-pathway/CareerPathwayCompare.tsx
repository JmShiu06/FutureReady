import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowDownUp, ArrowRight, Bookmark, Check, ChevronDown, Compass, Plus, Sparkles, X } from "lucide-react";
import "./careerpathwaycompare.css";

type Pathway = {
  id: string;
  name: string;
  family: string;
  color: string;
  summary: string;
  skills: string[];
  build: string[];
  horizon: string;
  tradeoff: string;
  opens: string;
};

const pathways: Pathway[] = [
  {
    id: "service",
    name: "Service design",
    family: "PEOPLE × SYSTEMS",
    color: "#c45e43",
    summary: "Shape better services by joining customer insight to the work happening behind the scenes.",
    skills: ["Customer research", "Project coordination", "Facilitation"],
    build: ["Service blueprinting", "Facilitation"],
    horizon: "4–8 weeks",
    tradeoff: "More workshops and ambiguity; less time spent on a single, defined deliverable.",
    opens: "Service designer · Experience strategist",
  },
  {
    id: "workforce",
    name: "Workforce insights",
    family: "DATA × PEOPLE",
    color: "#397064",
    summary: "Turn people and skills data into decisions that help teams prepare for what comes next.",
    skills: ["Customer research", "Data storytelling", "Excel"],
    build: ["Workforce planning", "Excel"],
    horizon: "2–4 months",
    tradeoff: "More time validating data and building models; fewer direct customer-facing moments.",
    opens: "Workforce analyst · Skills strategist",
  },
  {
    id: "learning",
    name: "Learning experience",
    family: "GROWTH × DESIGN",
    color: "#a77d32",
    summary: "Build practical learning journeys that make career growth visible and connected to real work.",
    skills: ["Project coordination", "Facilitation", "Digital fluency"],
    build: ["Learning design", "Digital fluency"],
    horizon: "3–6 months",
    tradeoff: "More iteration with learners and subject experts; outcomes take time to measure.",
    opens: "Learning designer · Enablement partner",
  },
];
const initialSkills = ["Customer research", "Project coordination", "Data storytelling"];
const skillOptions = ["Facilitation", "Service blueprinting", "Workforce planning", "Excel", "Learning design", "Digital fluency"];

export function CareerPathwayCompare() {
  const [leftId, setLeftId] = useState("service");
  const [rightId, setRightId] = useState("workforce");
  const [skills, setSkills] = useState(initialSkills);
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const left = pathways.find((item) => item.id === leftId) ?? pathways[0];
  const right = pathways.find((item) => item.id === rightId) ?? pathways[1];
  const shared = useMemo(() => left.skills.filter((skill) => right.skills.includes(skill)), [left, right]);
  const leftOnly = left.skills.filter((skill) => !right.skills.includes(skill));
  const rightOnly = right.skills.filter((skill) => !left.skills.includes(skill));
  const fit = (path: Pathway) => Math.round((path.skills.filter((skill) => skills.includes(skill)).length / path.skills.length) * 100);
  const toggleSkill = (skill: string) => setSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
  const changePath = (side: "left" | "right", next: string) => {
    if (side === "left") {
      setLeftId(next);
      if (next === rightId) setRightId(leftId);
    } else {
      setRightId(next);
      if (next === leftId) setLeftId(rightId);
    }
  };
  const swap = () => { setLeftId(rightId); setRightId(leftId); };
  const toggleSaved = (id: string) => setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const share = async () => {
    const text = `${left.name} vs ${right.name}: ${shared.length} transferable skills in common.`;
    try { await navigator.clipboard.writeText(text); } catch { /* Clipboard may be unavailable in preview. */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const renderPath = (path: Pathway, side: "left" | "right", unique: string[]) => (
    <article className="cpc-path" style={{ "--path-color": path.color } as CSSProperties}>
      <div className="cpc-path-overline"><span>{side === "left" ? "PATH A" : "PATH B"}</span><span>{path.family}</span></div>
      <label className="cpc-select-wrap">
        <span className="cpc-sr-only">Choose {side === "left" ? "first" : "second"} career pathway</span>
        <select value={path.id} onChange={(event) => changePath(side, event.target.value)}>
          {pathways.map((option) => <option value={option.id} key={option.id}>{option.name}</option>)}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </label>
      <p className="cpc-path-summary">{path.summary}</p>
      <div className="cpc-fit">
        <div className="cpc-fit-head"><span>YOUR TRANSFERABLE SKILLS</span><strong>{fit(path)}<small>%</small></strong></div>
        <div className="cpc-meter"><i style={{ width: `${fit(path)}%` }} /></div>
        <span className="cpc-fit-caption">{path.skills.filter((skill) => skills.includes(skill)).length} of {path.skills.length} core skills already connect</span>
      </div>
      <div className="cpc-path-skills">
        <div className="cpc-mini-heading">SKILLS THIS PATH USES</div>
        <div className="cpc-tags">{path.skills.map((skill) => {
          const kind = shared.includes(skill) ? "shared" : unique.includes(skill) ? "unique" : "neutral";
          return <span className={`cpc-tag ${kind}`} key={skill}>{kind === "shared" && <Check size={11} />}{skill}</span>;
        })}</div>
      </div>
      <div className="cpc-path-footer">
        <div><span className="cpc-mini-heading">LEARNING HORIZON</span><strong>{path.horizon}</strong></div>
        <button className={`cpc-save ${saved.includes(path.id) ? "is-saved" : ""}`} onClick={() => toggleSaved(path.id)} aria-label={`${saved.includes(path.id) ? "Remove" : "Save"} ${path.name}`}>
          <Bookmark size={14} fill={saved.includes(path.id) ? "currentColor" : "none"} />{saved.includes(path.id) ? "Saved" : "Save"}
        </button>
      </div>
      <div className="cpc-tradeoff"><span className="cpc-mini-heading">THE TRADE-OFF</span><p>{path.tradeoff}</p></div>
      <div className="cpc-opens"><span className="cpc-mini-heading">POSSIBLE NEXT ROLES</span><strong>{path.opens}</strong><button onClick={() => toggleSaved(path.id)}>{saved.includes(path.id) ? "Added to shortlist" : "Add to shortlist"} <ArrowRight size={13} /></button></div>
    </article>
  );

  return (
    <main className="cpc-shell">
      <header className="cpc-topbar">
        <a href="#compare" className="cpc-brand"><span className="cpc-brand-mark"><Compass size={17} /></span><span>FutureReady<small>CAREER &amp; SKILLS INSIGHTS</small></span></a>
        <div className="cpc-top-status"><i /> PERSONAL FIELD GUIDE <span>02 / 03</span></div>
      </header>
      <section className="cpc-heading" id="compare">
        <div>
          <div className="cpc-kicker"><span>FIELD GUIDE 02</span><i /> CAREER PATHWAYS</div>
          <h1>Two ways forward.<br /><em>One you.</em></h1>
          <p>Compare what travels with you, what you’d need to learn, and what each move asks in return.</p>
        </div>
        <div className="cpc-heading-note"><span className="cpc-note-mark">A / B</span><span>Not a verdict.<br />A clearer view.</span></div>
      </section>

      <section className="cpc-profile">
        <div className="cpc-profile-intro">
          <div className="cpc-section-no">01 <span>YOUR STARTING POINT</span></div>
          <strong>Skills you<br />already carry.</strong>
          <span>Use the skills that feel like yours. They’re a compass, not a scorecard.</span>
        </div>
        <div className="cpc-profile-main">
          <div className="cpc-profile-tools">
            <div className="cpc-skill-pills">{skills.map((skill) => <button className="cpc-profile-skill" key={skill} onClick={() => toggleSkill(skill)} aria-label={`Remove ${skill}`}>{skill}<X size={12} /></button>)}
              {!skills.length && <span className="cpc-no-skills">Add a skill to see how each route connects.</span>}
            </div>
            <button className="cpc-add-skill" onClick={() => setAdding((current) => !current)}><Plus size={14} />{adding ? "Done" : "Add skill"}</button>
          </div>
          {adding && <div className="cpc-picker">{skillOptions.map((skill) => <button key={skill} className={skills.includes(skill) ? "picked" : ""} onClick={() => toggleSkill(skill)}>{skills.includes(skill) && <Check size={12} />}{skill}</button>)}</div>}
        </div>
        <div className="cpc-local-note"><span>◇</span>Profile stays on this device</div>
      </section>

      <section className="cpc-comparison">
        <div className="cpc-compare-head">
          <div><div className="cpc-section-no">02 <span>THE SIDE-BY-SIDE</span></div><h2>Where could your skills take you?</h2></div>
          <button className="cpc-swap" onClick={swap}><ArrowDownUp size={14} /> Swap pathways</button>
        </div>
        <div className="cpc-columns">
          {renderPath(left, "left", leftOnly)}
          <div className="cpc-middle">
            <div className="cpc-vs">VS</div>
            <div className="cpc-shared">
              <span className="cpc-shared-number">{shared.length.toString().padStart(2, "0")}</span>
              <span className="cpc-mini-heading">TRANSFERABLE<br />SKILLS</span>
              <div className="cpc-shared-list">{shared.length ? shared.map((skill) => <span key={skill}><Check size={11} />{skill}</span>) : <span className="cpc-no-shared">No direct overlap yet</span>}</div>
            </div>
            <div className="cpc-distinction"><Sparkles size={13} /><span>What makes each<br />path distinct</span></div>
            <div className="cpc-unique-list"><span><i className="cpc-dot-a" />{left.name}: {leftOnly.length ? leftOnly.join(", ") : "shared strengths"}</span><span><i className="cpc-dot-b" />{right.name}: {rightOnly.length ? rightOnly.join(", ") : "shared strengths"}</span></div>
          </div>
          {renderPath(right, "right", rightOnly)}
        </div>
        <div className="cpc-note"><span>THE HONEST COMPARISON</span><p>Skill overlap shows what can transfer—not your odds of getting hired. The trade-offs are prompts for reflection, not predictions.</p><button onClick={share}>{copied ? <><Check size={13} /> Comparison copied</> : <>Share comparison <ArrowRight size={13} /></>}</button></div>
      </section>
      <footer className="cpc-footer"><span>FUTUREREADY / FIELD NOTES</span><span>EXPLORE WITH CURIOSITY <b>✳</b></span><span>02 — COMPARE</span></footer>
    </main>
  );
}

export default CareerPathwayCompare;
