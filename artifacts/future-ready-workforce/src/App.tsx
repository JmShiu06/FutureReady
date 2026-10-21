import { lazy, Suspense, useMemo, useState, type ReactNode, type ChangeEvent } from 'react';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, BookOpen,
  BriefcaseBusiness, Check, ChevronRight, CircleHelp, Compass, FileText,
  GraduationCap, Info, Leaf, MapPin, Plus, ShieldCheck, Sparkles,
  Target, TrendingUp, Users, X,
} from 'lucide-react';

import { CareerMatcher } from '@/components/career-matcher';
import type { CareerMatch } from '@workspace/api-client-react';
import '@/components/job-search.css';

const JobSearchPage = lazy(() => import('@/components/job-search-page'));
const JobDetailsPage = lazy(() => import('@/components/job-details-page'));

type Skill = { name: string; level: number; trend: string; category: string };
type Role = {
  id: string; title: string; match: number; salary: string; location: string;
  skillsRequired: string[]; skillsPresent: string[]; skillsMissing: string[];
  sdg: string; description: string;
};
type Course = { id: string; title: string; provider: string; skills: string[]; duration: string };
type TeamMember = { id: string; name: string; role: string; skills: string[] };
type TrendScenario = { id: string; label: string; description: string; skills: string[] };

const initialSkills: Skill[] = [
  { name: 'Project coordination', level: 4, trend: '+12%', category: 'Operations' },
  { name: 'Customer research', level: 3, trend: '+18%', category: 'People & insight' },
  { name: 'Data storytelling', level: 2, trend: '+24%', category: 'Digital' },
  { name: 'Process improvement', level: 4, trend: '+9%', category: 'Operations' },
];

const roles: Role[] = [
  {
    id: 'service-designer', title: 'Service design associate', match: 84,
    salary: '$68k–$84k', location: 'Remote · North America',
    skillsRequired: ['Customer research', 'Service blueprinting', 'Data storytelling', 'Facilitation'],
    skillsPresent: ['Customer research', 'Facilitation'], skillsMissing: ['Service blueprinting', 'Data storytelling'],
    sdg: 'Decent work & economic growth', description: 'Help teams shape better end-to-end experiences by connecting customer needs, operational realities, and measurable outcomes.',
  },
  {
    id: 'workforce-analyst', title: 'Workforce insights analyst', match: 77,
    salary: '$72k–$91k', location: 'Hybrid · Chicago, IL',
    skillsRequired: ['Data storytelling', 'Workforce planning', 'Research methods', 'Excel'],
    skillsPresent: ['Research methods', 'Excel'], skillsMissing: ['Data storytelling', 'Workforce planning'],
    sdg: 'Quality education', description: 'Turn people and skills data into clear decisions that help organizations prepare for what comes next.',
  },
  {
    id: 'learning-partner', title: 'Learning experience partner', match: 71,
    salary: '$64k–$79k', location: 'Hybrid · Remote eligible',
    skillsRequired: ['Learning design', 'Facilitation', 'Project coordination', 'Digital tools'],
    skillsPresent: ['Project coordination', 'Facilitation'], skillsMissing: ['Learning design', 'Digital tools'],
    sdg: 'Quality education', description: 'Build practical learning journeys that make career growth visible, accessible, and connected to real work.',
  },
];

const courses: Course[] = [
  { id: 'blueprint', title: 'Service blueprints: from insight to action', provider: 'OpenLearn Studio', skills: ['Service blueprinting'], duration: '4 weeks · 3 hrs/week' },
  { id: 'story', title: 'Tell a story with your data', provider: 'Civic Data Lab', skills: ['Data storytelling'], duration: '3 weeks · self-paced' },
  { id: 'facilitate', title: 'Facilitating collaborative teams', provider: 'Future Skills Network', skills: ['Facilitation'], duration: '2 weeks · 5 sessions' },
];

const members: TeamMember[] = [
  { id: 'maya', name: 'Maya Chen', role: 'People operations', skills: ['Project coordination', 'Employee listening', 'Excel'] },
  { id: 'jordan', name: 'Jordan Ellis', role: 'Customer support', skills: ['Customer research', 'Facilitation', 'CRM'] },
  { id: 'samira', name: 'Samira Patel', role: 'Operations lead', skills: ['Process improvement', 'Workforce planning', 'Excel'] },
  { id: 'leo', name: 'Leo Bennett', role: 'Learning coordinator', skills: ['Learning design', 'Project coordination', 'Digital tools'] },
];

const scenarios: TrendScenario[] = [
  { id: 'moderate', label: 'Moderate growth', description: 'AI adoption continues at a measured pace. Human judgment and coordination stay central as teams adapt role by role.', skills: ['Data storytelling', 'Digital fluency', 'Customer research', 'Process improvement', 'Facilitation', 'Workforce planning'] },
  { id: 'rapid', label: 'Rapid growth', description: 'AI capabilities spread quickly across common workflows. Teams need stronger data confidence, critical thinking, and change leadership.', skills: ['AI literacy', 'Critical thinking', 'Change leadership', 'Data storytelling', 'Human-centered design', 'Workforce planning'] },
];

const skillOptions = ['Service blueprinting', 'Facilitation', 'Workforce planning', 'Learning design', 'Digital fluency', 'Excel', 'AI literacy'];
const levelLabel = (level: number) => ['New to it', 'Exploring', 'Working knowledge', 'Confident', 'Can coach'][level - 1] || 'Working knowledge';

function useSavedSkills() {
  const [skills, setSkills] = useState<Skill[]>(() => {
    try { return JSON.parse(localStorage.getItem('frw-skills') || 'null') || initialSkills; }
    catch { return initialSkills; }
  });
  const save = (next: Skill[]) => {
    setSkills(next);
    localStorage.setItem('frw-skills', JSON.stringify(next));
  };
  return [skills, save] as const;
}

function Shell({ children, page }: { children: ReactNode; page: string }) {
  const [location] = useLocation();
  const nav = [
    { href: '/', label: 'My next step', icon: Compass, key: 'home' },
    { href: '/jobs', label: 'Job Search', icon: BriefcaseBusiness, key: 'jobs' },
    { href: '/team', label: 'Team planning', icon: Users, key: 'team' },
    { href: '/trends', label: 'Skills outlook', icon: BarChart3, key: 'trends' },
  ];
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" data-testid="link-brand">
        <span className="brand-mark"><Activity size={19} strokeWidth={2.4} /></span>
        <span className="brand-name">FutureReady<span>Workforce intelligence</span></span>
      </Link>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {nav.map(item => {
          const Icon = item.icon;
          const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
          return <Link key={item.key} href={item.href} data-testid={`link-nav-${item.key}`} className={`nav-link${active ? ' active' : ''}`}>
            <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>
          </Link>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="demo-note">
          <strong><ShieldCheck size={14} /> DEMO DATA</strong>
          <p>Market signals are illustrative examples, not live labor-market data. Your profile stays on this device.</p>
        </div>
        <div className="profile-chip"><span className="avatar">AL</span><div><strong>Alex Lee</strong><span>Career explorer</span></div></div>
      </div>
    </aside>
    <div className="main-wrap">
      <header className="topbar">
        <div className="crumb"><span>FutureReady</span><ChevronRight size={12} /><b>{page}</b></div>
        <div className="top-actions"><span><i className="live-dot" />Sample workspace</span><CircleHelp size={16} /></div>
      </header>
      <main className="main-content page-enter">{children}</main>
    </div>
  </div>;
}

function SectionTitle({ title, note, action }: { title: string; note?: string; action?: React.ReactNode }) {
  return <div className="section-head"><div><h2>{title}</h2>{note && <div className="section-kicker">{note}</div>}</div>{action}</div>;
}

function SkillMeter({ level }: { level: number }) {
  return <div className="skill-meter" aria-label={`Level ${level} of 5`}>{[1, 2, 3, 4, 5].map(n => <i className={n <= level ? 'on' : ''} key={n} />)}</div>;
}

function Dashboard({ skills, saveSkills }: { skills: Skill[]; saveSkills: (skills: Skill[]) => void }) {
  const [upload, setUpload] = useState('');
  const [feedback, setFeedback] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [topMatch, setTopMatch] = useState<CareerMatch | null>(null);
  const available = skillOptions.filter(item => !skills.some(skill => skill.name === item));
  const addSkill = (name: string) => {
    saveSkills([...skills, { name, level: 2, trend: '+16%', category: 'Emerging' }]);
    setAddingSkill(false);
  };
  const updateLevel = (name: string, level: number) => saveSkills(skills.map(skill => skill.name === name ? { ...skill, level } : skill));
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUpload(file.name);
    setFeedback(`“${file.name}” is ready for your review. No file was uploaded or analyzed; add skills manually to update your profile.`);
  };
  return <Shell page="My next step">
    <div className="page-head"><div><div className="eyebrow">Your career workspace · Tuesday, 18 June</div><h1>Make your next move<br />with a little more clarity.</h1><p className="page-subtitle">Explore where your skills could take you — and what might help you get there.</p></div>
      <button className="btn btn-secondary" onClick={() => document.getElementById('cv-upload')?.click()} data-testid="button-upload-cv"><FileText size={15} /> Add a CV</button>
    </div>
    <section className="hero-grid">
      <div className="welcome-card">
        <div className="eyebrow">A good place to start</div>
        <h1>Small skill steps can open bigger doors.</h1>
        <p>Your experience already travels. See a few roles that connect to what you know, then explore the skills that could make the move feel closer.</p>
        <div className="welcome-actions"><a href="#recommendations" className="btn btn-primary"><Compass size={14} /> Explore role matches <ArrowRight size={14} /></a><Link className="btn btn-quiet" href="/trends">View skills outlook</Link></div>
      </div>
      <div className="panel stat-card">
        <div className="stat-top"><span>Top dataset skill overlap</span><Target size={16} /></div>
        <div><div className="stat-number" data-testid="stat-top-overlap">{topMatch ? <>{topMatch.score}<span style={{fontSize:17}}>%</span></> : <>—</>}</div><div className="stat-foot">{topMatch ? <span>{topMatch.roleFamily} · {topMatch.matchedSkills.length} of {topMatch.skillsConsidered} skills</span> : <span>Add skills below to calculate</span>}</div></div>
        <div className="section-kicker">Skill overlap, not job probability</div>
      </div>
    </section>
    <section className="dashboard-grid" id="recommendations">
      <div className="panel panel-pad">
        <SectionTitle title="Roles that overlap with your skills" note="CALCULATED FROM A JOB-POSTING DATASET" />
        <CareerMatcher onTopMatch={setTopMatch} />
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Market signals" note="ILLUSTRATIVE, NOT LIVE" action={<Link href="/trends" className="text-link">See outlook <ArrowRight size={12} /></Link>} />
        <div className="signal-list">
          <div className="signal"><span className="signal-mark"><TrendingUp size={15} /></span><span><strong>Data storytelling</strong><small>Appearing across more teams</small></span><span className="signal-trend">+24%</span></div>
          <div className="signal"><span className="signal-mark"><Users size={15} /></span><span><strong>Customer research</strong><small>Human insight stays valuable</small></span><span className="signal-trend">+18%</span></div>
          <div className="signal"><span className="signal-mark"><Sparkles size={15} /></span><span><strong>AI literacy</strong><small>New baseline, not a specialty</small></span><span className="signal-trend">Emerging</span></div>
        </div>
        <div className="source-note" style={{marginTop:17}}><strong>Context matters.</strong> Signals are synthetic examples for exploration, not sourced from a live data feed.</div>
      </div>
    </section>
    <section className="dashboard-grid">
      <div className="panel panel-pad">
        <SectionTitle title="Your skills profile" note="EDIT YOUR STARTING POINT" action={<button className="text-link" onClick={() => setAddingSkill(v => !v)} data-testid="button-add-skill"><Plus size={13} /> Add skill</button>} />
        {addingSkill && <div className="filter-row" style={{marginBottom:12}}>{available.length ? available.map(skill => <button className="btn btn-secondary btn-small" key={skill} onClick={() => addSkill(skill)}>{skill} <Plus size={11} /></button>) : <span className="section-kicker">All suggested skills are in your profile.</span>}<button className="icon-button" aria-label="Close skill options" onClick={() => setAddingSkill(false)}><X size={14}/></button></div>}
        <div className="skill-grid">{skills.map(skill => <div className="skill-item" key={skill.name} data-testid={`skill-item-${skill.name.toLowerCase().replaceAll(' ','-')}`}>
          <div className="skill-top"><strong>{skill.name}</strong><select className="level-select" aria-label={`Set ${skill.name} level`} value={skill.level} onChange={e => updateLevel(skill.name, Number(e.target.value))} data-testid={`select-skill-${skill.name.toLowerCase().replaceAll(' ','-')}`}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} · {levelLabel(n)}</option>)}</select></div>
          <div className="skill-cat">{skill.category} <span style={{color:'#548365',float:'right'}}>{skill.trend} sample signal</span></div><SkillMeter level={skill.level} />
        </div>)}</div>
        <div className="upload-box"><span className="upload-icon"><FileText size={16}/></span><p><strong>{upload || 'Have a CV handy?'}</strong><br/>{feedback || 'Choose a file for a local-only demo check. You will add skills yourself.'}</p><button className="btn btn-quiet btn-small" onClick={() => document.getElementById('cv-upload')?.click()} data-testid="button-choose-file">{upload ? 'Choose another' : 'Choose file'}</button>
          <input id="cv-upload" type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFile} hidden data-testid="input-cv-file" /></div>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="A few skills to build" note="FOR YOUR TOP MATCH" />
        <div className="gap-list">{[
          { name:'Service blueprinting', why:'Connect customer needs to the work behind them', time:'4 weeks' },
          { name:'Data storytelling', why:'Make evidence easier to act on', time:'3 weeks' },
          { name:'Facilitation', why:'Already a strength to grow and share', time:'Build on it' },
        ].map((gap, i) => <div className="gap-row" key={gap.name}><span><strong>{gap.name}</strong><small>{gap.why}</small></span><span className="gap-tag">{i < 2 ? gap.time : 'Strength'}</span></div>)}</div>
        <Link href="/roles/service-designer" className="btn btn-secondary" style={{marginTop:18,width:'100%'}}>See a learning path <ArrowRight size={14}/></Link>
      </div>
    </section>
  </Shell>;
}

function RolePage() {
  const params = useParams<{ id: string }>();
  const role = roles.find(item => item.id === params.id) || roles[0];
  const [income, setIncome] = useState('Any range');
  const [location, setLocation] = useState('Any location');
  const [planned, setPlanned] = useState<string[]>(() => JSON.parse(localStorage.getItem('frw-learning-plan') || '[]'));
  const eligible = (income === 'Any range' || (income === '$70k+' ? role.salary.includes('7') || role.salary.includes('8') || role.salary.includes('9') : !role.salary.includes('7') && !role.salary.includes('8') && !role.salary.includes('9')))
    && (location === 'Any location' || (location === 'Remote' ? role.location.toLowerCase().includes('remote') : role.location.toLowerCase().includes('hybrid')));
  const filteredCourses = useMemo(() => courses.filter(course => {
    const skillMatches = course.skills.some(skill => role.skillsMissing.includes(skill) || role.skillsPresent.includes(skill));
    return skillMatches;
  }), [role]);
  const toggleCourse = (id: string) => {
    const next = planned.includes(id) ? planned.filter(item => item !== id) : [...planned, id];
    setPlanned(next);
    localStorage.setItem('frw-learning-plan', JSON.stringify(next));
  };
  return <Shell page="Role explanation">
    <div className="page-head"><div><div className="eyebrow">Role explorer / Match explanation</div><h1>Understand the opportunity.</h1><p className="page-subtitle">A role match is a starting point for your own research, not a hiring prediction.</p></div><Link className="btn btn-secondary" href="/"><ArrowDownRight size={14}/> Back to my profile</Link></div>
    <div className="role-hero"><div className="eyebrow">Suggested next role</div><h1>{role.title}</h1><p style={{color:'#62796c',fontSize:12,maxWidth:690,lineHeight:1.65}}>{role.description}</p><div className="role-meta"><span><BriefcaseBusiness size={14}/>{role.salary} sample range</span><span><MapPin size={14}/>{role.location}</span><span><Leaf size={14}/>{role.sdg}</span></div></div>
    <div className="detail-layout">
      <div>
        <div className="panel panel-pad" style={{marginBottom:18}}>
          <SectionTitle title="Why this could fit" note="EXPLAINABLE MATCH FACTORS" />
          <div className="match-score"><div className="score-ring">{role.match}%</div><div className="score-copy"><strong>A promising starting point</strong><span>Based on skills you have and skills you can build.</span></div></div>
          <div className="factor-list" style={{marginTop:20}}>
            {[['Relevant experience', 82],['Transferable skills', 76],['Learning runway', 91]].map(([name, value]) => <div className="factor-line" key={name as string}><span>{name}</span><div className="factor-track"><i style={{width:`${value}%`}}/></div><b>{value}%</b></div>)}
          </div>
          <div className="disclaimer"><Info size={14}/><span>These factors are illustrative demo logic, not a validated assessment. We show the skills behind the match so you can decide what feels relevant.</span></div>
        </div>
        <div className="panel panel-pad">
          <SectionTitle title="Your skills against the role" note="A CLEAR VIEW OF THE DISTANCE" />
          <div className="gap-list">{role.skillsRequired.map(skill => {
            const present = role.skillsPresent.includes(skill);
            return <div className="gap-row" key={skill}><span><strong>{skill}</strong><small>{present ? 'Already in your toolkit' : 'A skill to explore next'}</small></span><span className={`gap-tag ${present ? '' : ''}`} style={present ? {background:'#e5efdf',color:'#4c7c60'} : undefined}>{present ? 'Present' : 'Build next'}</span></div>;
          })}</div>
        </div>
      </div>
      <div>
        <div className="panel panel-pad" style={{marginBottom:18}}>
          <SectionTitle title="A learning path" note="PICK WHAT WORKS FOR YOU" />
          <div className="filter-row" style={{marginBottom:14}}>
            <select className="select-field" value={income} onChange={e => setIncome(e.target.value)} aria-label="Filter learning by salary range" data-testid="select-income-filter"><option>Any range</option><option>$70k+</option><option>Under $70k</option></select>
            <select className="select-field" value={location} onChange={e => setLocation(e.target.value)} aria-label="Filter by location" data-testid="select-location-filter"><option>Any location</option><option>Remote</option><option>Hybrid</option></select>
          </div>
          {!eligible && <div className="source-note" style={{marginBottom:12}}>This role's sample range or location does not fit the selected filters. Adjust the filters to explore another fit.</div>}
          <div className="course-list">{filteredCourses.map((course, i) => <div className="course" key={course.id}><span className="course-num">0{i+1}</span><div className="course-content"><strong>{course.title}</strong><span>{course.provider} · {course.duration}</span><div style={{marginTop:9}}><button className="plan-toggle" onClick={() => toggleCourse(course.id)} data-testid={`button-course-${course.id}`}>{planned.includes(course.id) ? <><Check size={12}/> Added to my plan</> : <><Plus size={12}/> Add to my plan</>}</button></div></div></div>)}
          {filteredCourses.length === 0 && <div className="empty-state">No sample courses fit these filters. Try another income range.</div>}
          </div>
          <div className="section-kicker" style={{marginTop:14}}>Course examples are illustrative; availability is not verified.</div>
        </div>
        <div className="panel panel-pad">
          <SectionTitle title="Wider impact" note="SUSTAINABLE DEVELOPMENT GOAL" />
          <div style={{display:'flex',gap:11,alignItems:'center'}}><span className="role-icon"><Leaf size={18}/></span><div><strong style={{fontSize:12}}>{role.sdg}</strong><p style={{fontSize:10,color:'#7e8b82',lineHeight:1.5,margin:'5px 0 0'}}>This role can contribute to more accessible pathways into meaningful, productive work.</p></div></div>
        </div>
      </div>
    </div>
  </Shell>;
}

function TeamPage() {
  const [plan, setPlan] = useState<string[]>(() => JSON.parse(localStorage.getItem('frw-team-plan') || '[]'));
  const actions = ['Map adjacent skills for customer support', 'Pair learning design with frontline insights', 'Set a monthly skills check-in'];
  const toggle = (action: string) => {
    const next = plan.includes(action) ? plan.filter(item => item !== action) : [...plan, action];
    setPlan(next); localStorage.setItem('frw-team-plan', JSON.stringify(next));
  };
  return <Shell page="Team planning">
    <div className="team-hero"><div className="eyebrow" style={{color:'#a9c2ad'}}>TEAM VIEW · SAMPLE ORGANIZATION</div><h1>Turn team strengths into<br/>a reskilling starting point.</h1><p>A small, fictional team profile to help make skills planning tangible. No employee data is connected.</p></div>
    <div className="team-stat-grid">
      {[['04','Sample team members','Illustrative profiles'],['12','Distinct skills','Across the team'],['03','Shared strengths','Coordination · research'],['05','Future skills','Priority areas to explore']].map(([value,title,foot])=><div className="panel team-stat" key={title}><span>{title}</span><strong>{value}</strong><small>{foot}</small></div>)}
    </div>
    <div className="dashboard-grid">
      <div className="panel panel-pad">
        <SectionTitle title="Team skills snapshot" note="SAMPLE EMPLOYEE SKILLS" action={<span className="match-pill">4 sample profiles</span>} />
        <div className="table-wrap"><table><thead><tr><th>Team member</th><th>Current strengths</th><th>Adjacent skills</th></tr></thead><tbody>{members.map(member => <tr key={member.id}><td><div className="person-cell"><span className="person-dot">{member.name.split(' ').map(n=>n[0]).join('')}</span><span><strong>{member.name}</strong><small>{member.role}</small></span></div></td><td><div className="skill-chips">{member.skills.slice(0,2).map(skill=><span className="chip" key={skill}>{skill}</span>)}</div></td><td><div className="skill-chips"><span className="chip gap">{member.skills[2]}</span></div></td></tr>)}</tbody></table></div>
        <div className="disclaimer"><Info size={14}/><span>All names and skills shown are fictional sample data. Use real, consented information and appropriate safeguards in a production setting.</span></div>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Future skills to watch" note="DEMO SCENARIO SIGNALS" />
        {[['AI literacy',76],['Change leadership',69],['Data storytelling',63],['Human-centered design',59],['Workforce planning',54]].map(([name, value])=><div className="trend-skill" key={name as string}><strong>{name}</strong><div className="trend-line"><i style={{width:`${value}%`}}/></div><b>{value}%</b></div>)}
        <div className="section-kicker">Relative illustrative signal · not a forecast</div>
      </div>
    </div>
    <div className="panel panel-pad" style={{marginTop:18}}>
      <SectionTitle title="A practical reskilling plan" note="SUGGESTED TEAM ACTIONS" action={<span className="section-kicker">{plan.length} of {actions.length} complete</span>} />
      <div className="skill-grid">{actions.map((action,i)=><div className="gap-row" style={{padding:'10px 0'}} key={action}><span style={{display:'flex',alignItems:'center',gap:11}}><span className="course-num">0{i+1}</span><span><strong>{action}</strong><small>{i===0?'Start with people who already handle customer conversations.':i===1?'Create a low-lift peer exchange across functions.':'Review learning goals together, not as a performance score.'}</small></span></span><button className={`btn ${plan.includes(action)?'btn-primary':'btn-secondary'} btn-small`} onClick={()=>toggle(action)} data-testid={`button-plan-${i}`}>{plan.includes(action)?<><Check size={13}/> Done</>:'Mark done'}</button></div>)}</div>
      <div className="disclaimer"><ShieldCheck size={14}/><span>Planning suggestions are generic examples. They should support—not replace—employee choice, conversation, and context.</span></div>
    </div>
  </Shell>;
}

function TrendsPage() {
  const [scenarioId, setScenarioId] = useState(() => localStorage.getItem('frw-scenario') || 'moderate');
  const scenario = scenarios.find(item => item.id === scenarioId) || scenarios[0];
  const changeScenario = (id: string) => { setScenarioId(id); localStorage.setItem('frw-scenario', id); };
  const current = scenarioId === 'moderate' ? [48,58,66,73,81,87] : [40,55,72,88,102,118];
  const comparison = scenarioId === 'moderate' ? [46,53,61,68,74,79] : [42,50,61,70,79,86];
  return <Shell page="Skills outlook">
    <div className="page-head"><div><div className="eyebrow">Skills outlook · Scenario explorer</div><h1>Plan for more than one future.</h1><p className="page-subtitle">A practical way to discuss uncertainty, not a prediction of what will happen.</p></div><span className="match-pill"><Info size={12}/> SAMPLE SCENARIOS</span></div>
    <div className="trend-hero"><div style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'flex-start',flexWrap:'wrap'}}><div><div className="eyebrow">Scenario in view</div><h1>{scenario.label}</h1><p>{scenario.description}</p></div><div className="scenario-tabs" role="tablist" aria-label="Choose AI growth scenario">{scenarios.map(item=><button className={`scenario-tab ${scenarioId===item.id?'active':''}`} onClick={()=>changeScenario(item.id)} key={item.id} role="tab" aria-selected={scenarioId===item.id} data-testid={`button-scenario-${item.id}`}>{item.label}</button>)}</div></div></div>
    <div className="dashboard-grid">
      <div className="panel chart-card">
        <SectionTitle title="Illustrative skill signal over time" note="INDEXED EXAMPLE · NO LIVE MARKET FEED" />
        <div className="chart">{['Today','+1 yr','+2 yr','+3 yr','+4 yr','+5 yr'].map((label,i)=><div className="chart-col" key={label}><div className="bar-pair"><span className="bar" style={{height:`${Math.min(current[i],125)}px`}}/><span className="bar alt" style={{height:`${Math.min(comparison[i],125)}px`}}/></div><label>{label}</label></div>)}</div>
        <div className="legend"><span><i/>Selected scenario</span><span><i className="alt-dot"/>Alternative path</span></div>
        <div className="source-note" style={{marginTop:18}}><strong>Read this as a discussion prompt.</strong> Both paths are hand-authored demo curves. They do not represent measured or forecast labor-market demand.</div>
      </div>
      <div className="panel panel-pad">
        <SectionTitle title="Skills in this scenario" note="WHAT MIGHT MATTER MORE" />
        {scenario.skills.map((skill,i)=><div className="trend-skill" key={skill}><strong>{skill}</strong><div className="trend-line"><i style={{width:`${86-i*9}%`}}/></div><b>{i<2?'Higher':'Rising'}</b></div>)}
        <div className="disclaimer"><Sparkles size={14}/><span>These labels illustrate possible areas of focus. They are not evidence of a particular job’s future or a worker’s value.</span></div>
      </div>
    </div>
    <div className="panel panel-pad" style={{marginTop:18}}>
      <SectionTitle title="Sources & boundaries" note="WHAT THIS DEMO DOES — AND DOES NOT — KNOW" />
      <div className="skill-grid">
        <div className="skill-item"><div className="skill-top"><strong>Sample market data</strong><ShieldCheck size={15} color="#57816b"/></div><div className="skill-cat" style={{fontSize:10,lineHeight:1.6}}>All market signals, role ranges, fit scores, growth curves, and course examples are synthetic and locally stored for demonstration.</div></div>
        <div className="skill-item"><div className="skill-top"><strong>No live verification</strong><Info size={15} color="#be7a58"/></div><div className="skill-cat" style={{fontSize:10,lineHeight:1.6}}>There are no connected labor-market sources or employer systems. Check current role details, pay, and learning options independently.</div></div>
      </div>
      <div style={{marginTop:16,display:'flex',gap:9,flexWrap:'wrap'}}><Link href="/" className="btn btn-primary"><Compass size={14}/> Return to my roles</Link><Link href="/team" className="btn btn-secondary"><Users size={14}/> Explore team planning</Link></div>
    </div>
  </Shell>;
}

function NotFoundPage() {
  return <Shell page="Not found"><div className="panel panel-pad"><div className="eyebrow">That page isn't here</div><h1>Let's get you back on track.</h1><p className="page-subtitle">Try one of the available workspaces.</p><Link href="/" className="btn btn-primary" style={{marginTop:16}}>Back to my next step <ArrowRight size={14}/></Link></div></Shell>;
}

function App() {
  const [skills, saveSkills] = useSavedSkills();
  const profileSkills = skills.map(skill => skill.name);
  return <Switch>
    <Route path="/" component={() => <Dashboard skills={skills} saveSkills={saveSkills}/>} />
    <Route path="/jobs" component={() => <Shell page="Job Search"><Suspense fallback={<div className="panel panel-pad" role="status">Loading job search…</div>}><JobSearchPage profileSkills={profileSkills}/></Suspense></Shell>} />
    <Route path="/jobs/:id" component={() => <Shell page="Job details"><Suspense fallback={<div className="panel panel-pad" role="status">Loading job details…</div>}><JobDetailsPage profileSkills={profileSkills}/></Suspense></Shell>} />
    <Route path="/roles/:id" component={RolePage} />
    <Route path="/team" component={TeamPage} />
    <Route path="/trends" component={TrendsPage} />
    <Route component={NotFoundPage} />
  </Switch>;
}

export default App;
