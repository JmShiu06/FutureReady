import { useMemo, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowRight, Bookmark, Check, ChevronRight, Compass, Map, Plus, Sparkles, X } from "lucide-react";
import "./careerpathway.css";

type Route = {
  id: string;
  title: string;
  family: string;
  distance: string;
  color: string;
  match: number;
  summary: string;
  known: string[];
  next: string[];
  horizon: string;
};

const routes: Route[] = [
  {
    id: "service", title: "Service design", family: "PEOPLE × SYSTEMS", distance: "A nearby turn", color: "#d45f45", match: 78,
    summary: "Shape better services by joining customer insight to the work happening behind the scenes.",
    known: ["Customer research", "Project coordination"], next: ["Service blueprinting", "Facilitation"], horizon: "4–8 weeks",
  },
  {
    id: "workforce", title: "Workforce insights", family: "DATA × PEOPLE", distance: "A bolder move", color: "#366c62", match: 64,
    summary: "Turn people and skills data into decisions that help teams prepare for what comes next.",
    known: ["Customer research", "Data storytelling"], next: ["Workforce planning", "Excel"], horizon: "2–4 months",
  },
  {
    id: "learning", title: "Learning experience", family: "GROWTH × DESIGN", distance: "A fresh direction", color: "#bc8b2e", match: 58,
    summary: "Build practical learning journeys that make career growth visible and connected to real work.",
    known: ["Project coordination"], next: ["Learning design", "Digital fluency"], horizon: "3–6 months",
  },
];
const initialSkills = ["Customer research", "Project coordination", "Data storytelling"];

export function CareerPathway() {
  const [skills, setSkills] = useState(initialSkills);
  const [selected, setSelected] = useState("service");
  const [saved, setSaved] = useState<string[]>([]);
  const [showSkills, setShowSkills] = useState(false);
  const [copied, setCopied] = useState(false);
  const active = routes.find((route) => route.id === selected) ?? routes[0];
  const overlap = (route: Route) => Math.round((route.known.filter((skill) => skills.includes(skill)).length / route.known.length) * 100);
  const missing = useMemo(() => active.next.filter((skill) => !skills.includes(skill)), [active, skills]);
  const toggleSkill = (skill: string) => setSkills((current) => current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]);
  const saveRoute = () => setSaved((current) => current.includes(active.id) ? current.filter((id) => id !== active.id) : [...current, active.id]);
  const sharePlan = async () => {
    const text = `${active.title} pathway: build ${missing.join(" + ") || "your next skill"}.`;
    try { await navigator.clipboard.writeText(text); } catch { /* Clipboard may be unavailable in preview. */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="atlas">
      <header className="atlas-top">
        <a className="atlas-brand" href="#top" aria-label="FutureReady home">
          <span className="atlas-brand-mark"><Compass size={19} strokeWidth={1.8} /></span>
          <span>FutureReady<small>CAREER &amp; SKILLS INSIGHTS</small></span>
        </a>
        <div className="atlas-top-right"><span className="atlas-demo-dot" />LOCAL EXPLORATION <span className="atlas-top-divider" /> <span>01 / 03</span></div>
      </header>

      <section className="atlas-intro" id="top">
        <div className="atlas-intro-copy">
          <div className="atlas-kicker"><span>FIELD GUIDE 01</span><i /> CAREER PATHWAYS</div>
          <h1>There’s more than<br />one way <em>forward.</em></h1>
          <p>Follow the skills you already carry. Find a direction worth exploring, then make the next step your own.</p>
          <a className="atlas-scroll" href="#routes"><span>SCROLL TO EXPLORE</span><ArrowDown size={14} /></a>
        </div>
        <div className="atlas-map-art" aria-hidden="true">
          <div className="atlas-map-label">YOUR STARTING POINT</div>
          <div className="atlas-map-orbit orbit-one" /><div className="atlas-map-orbit orbit-two" />
          <svg viewBox="0 0 520 370" className="atlas-map-lines">
            <path d="M260 183 C220 133 160 118 102 75" /><path d="M260 183 C312 135 362 111 423 74" />
            <path d="M260 183 C312 229 365 265 426 301" /><path d="M260 183 C203 227 153 266 95 302" />
            <path d="M101 75 C140 55 169 56 196 71" className="atlas-route-dash" />
          </svg>
          <span className="atlas-map-point center-point"><Compass size={21} /></span>
          <span className="atlas-map-point point-a"><span>01</span></span><span className="atlas-map-point point-b"><span>02</span></span>
          <span className="atlas-map-point point-c"><span>03</span></span><span className="atlas-map-point point-d"><span>04</span></span>
          <span className="atlas-map-caption cap-a">WHAT YOU KNOW</span><span className="atlas-map-caption cap-b">WHERE IT CAN GO</span>
          <span className="atlas-map-stamp">SKILLS<br />ARE<br />PORTABLE</span>
        </div>
      </section>

      <section className="atlas-workspace" id="routes">
        <aside className="atlas-origin">
          <div className="atlas-section-index">01 <span>THE START</span></div>
          <h2>Your starting<br />coordinates.</h2>
          <p>Pick the skills that feel like yours. They’re a compass—not a scorecard.</p>
          <div className="atlas-skill-list">
            {skills.map((skill, index) => <button className="atlas-skill" key={skill} onClick={() => toggleSkill(skill)} aria-label={`Remove ${skill}`}>
              <span className="atlas-skill-index">0{index + 1}</span><span>{skill}</span><X size={13} />
            </button>)}
            {skills.length === 0 && <div className="atlas-skills-empty">No skills selected yet. Add one to plot your routes.</div>}
          </div>
          <button className="atlas-add-skill" onClick={() => setShowSkills((value) => !value)}><Plus size={14} /> {showSkills ? "Close skill list" : "Add a skill"}</button>
          {showSkills && <div className="atlas-skill-picker">{["Facilitation", "Service blueprinting", "Workforce planning", "Excel", "Learning design", "Digital fluency"].map((skill) =>
            <button key={skill} onClick={() => toggleSkill(skill)} className={skills.includes(skill) ? "picked" : ""}>{skills.includes(skill) && <Check size={12} />}{skill}</button>
          )}</div>}
          <div className="atlas-private-note"><span className="atlas-lock">◇</span><span><strong>On this device</strong><br />Your profile stays local in this demo.</span></div>
        </aside>

        <div className="atlas-route-area">
          <div className="atlas-route-heading">
            <div><div className="atlas-section-index">02 <span>CHOOSE A DIRECTION</span></div><h2>Three routes from here.</h2></div>
            <span className="atlas-route-count">ROLES ARE EXAMPLES · NOT PREDICTIONS</span>
          </div>
          <div className="atlas-route-choices">
            {routes.map((route, index) => <button className={`atlas-route-choice ${selected === route.id ? "is-active" : ""}`} key={route.id} onClick={() => setSelected(route.id)} style={{ "--route-color": route.color } as CSSProperties}>
              <span className="atlas-choice-top"><span>0{index + 1}</span><span>{route.family}</span></span>
              <strong>{route.title}</strong><span className="atlas-choice-bottom">{route.distance}<ChevronRight size={14} /></span>
              <span className="atlas-choice-rule" />
            </button>)}
          </div>

          <article className="atlas-route-detail" key={active.id} style={{ "--route-color": active.color } as CSSProperties}>
            <div className="atlas-detail-left">
              <div className="atlas-detail-meta"><span>YOUR ROUTE, MAPPED</span><span className="atlas-detail-bullet">·</span><span>{active.family}</span></div>
              <h3>{active.title}</h3>
              <p>{active.summary}</p>
              <div className="atlas-overlap">
                <div className="atlas-overlap-number">{overlap(active)}<small>%</small></div>
                <div className="atlas-overlap-copy"><strong>Skills you can bring with you</strong><span>{active.known.filter((skill) => skills.includes(skill)).length} of {active.known.length} starting skills already connect</span></div>
                <div className="atlas-overlap-bar"><i style={{ width: `${overlap(active)}%` }} /></div>
              </div>
              <div className="atlas-detail-actions">
                <button className="atlas-primary-action" onClick={sharePlan}>{copied ? <><Check size={14} /> Path copied</> : <>Take this path <ArrowRight size={14} /></>}</button>
                <button className={`atlas-save-action ${saved.includes(active.id) ? "saved" : ""}`} onClick={saveRoute}><Bookmark size={14} fill={saved.includes(active.id) ? "currentColor" : "none"} />{saved.includes(active.id) ? "Saved" : "Save route"}</button>
              </div>
            </div>
            <div className="atlas-detail-right">
              <div className="atlas-next-label"><Sparkles size={13} /> THE NEXT WAYPOINT</div>
              <div className="atlas-waypoint-label">A skill to explore</div>
              {missing.length ? missing.map((skill, index) => <div className="atlas-waypoint" key={skill}><span className="atlas-waypoint-number">0{index + 1}</span><strong>{skill}</strong><span className="atlas-waypoint-status">TO BUILD</span></div>) :
                <div className="atlas-waypoint"><span className="atlas-waypoint-number">✓</span><strong>All route skills are in your profile</strong></div>}
              <div className="atlas-horizon"><span>ESTIMATED LEARNING HORIZON</span><strong>{active.horizon}</strong></div>
              <div className="atlas-not-a-score">Overlap helps explain the connection. It isn’t a chance of getting hired.</div>
            </div>
          </article>
          <div className="atlas-bottom-note"><Map size={15} /><span>Routes are illustrative. The best direction depends on your interests, context, and what you want work to feel like.</span><span className="atlas-note-mark">FUTUREREADY / FIELD NOTES</span></div>
        </div>
      </section>

      <footer className="atlas-footer"><span>FUTUREREADY</span><span>EXPLORE WITH CURIOSITY <span className="atlas-footer-star">✳</span></span><span>01 — PATHWAYS</span></footer>
    </main>
  );
}

export default CareerPathway;
