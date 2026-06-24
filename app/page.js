'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { LANGUAGES, DOMAINS, GAT, SUBJECT_BY_CODE } from '@/lib/subjects';
import { eligibleProgramsForSubjects } from '@/lib/engine';

const CATEGORIES = [
  { id: 'UR',   label: 'General',  sub: 'UR'        },
  { id: 'OBC',  label: 'OBC-NCL',  sub: 'Non-creamy'},
  { id: 'SC',   label: 'SC',       sub: ''          },
  { id: 'ST',   label: 'ST',       sub: ''          },
  { id: 'EWS',  label: 'EWS',      sub: ''          },
  { id: 'PwBD', label: 'PwBD',     sub: ''          }
];

export default function Home() {
  const router = useRouter();

  const [subjectsTaken, setSubjectsTaken] = useState([]);
  const [scores, setScores] = useState({});
  const [category, setCategory] = useState('UR');
  const [name, setName] = useState('');
  const [dreamId, setDreamId] = useState('');
  const [dreamLabel, setDreamLabel] = useState('');
  const [searchDream, setSearchDream] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const dreamOptions = useMemo(() => eligibleProgramsForSubjects(subjectsTaken), [subjectsTaken]);
  const filteredDreams = useMemo(() => {
    const q = searchDream.trim().toLowerCase();
    if (!q) return dreamOptions;
    const tokens = q.split(/\s+/).filter(Boolean);
    return dreamOptions.filter(d => {
      const hay = d.label.toLowerCase();
      return tokens.every(t => hay.includes(t));
    });
  }, [searchDream, dreamOptions]);

  // Hard-cap rendered DOM nodes to 80 for smooth 60fps. The user can
  // always type more characters to narrow the visible list further.
  const displayedDreams = useMemo(() => filteredDreams.slice(0, 80), [filteredDreams]);

  const toggleSubject = (code) => {
    setSubjectsTaken(prev => {
      // If already selected → always allow turning OFF
      if (prev.includes(code)) {
        setDreamId(''); setDreamLabel(''); setSearchDream('');
        return prev.filter(c => c !== code);
      }

      // Trying to ADD — enforce CUET 2026 rules
      const subj = SUBJECT_BY_CODE[code];
      if (!subj) return prev;

      const currentLangs   = prev.filter(c => SUBJECT_BY_CODE[c]?.group === 'LANG').length;
      const currentDomains = prev.filter(c => SUBJECT_BY_CODE[c]?.group === 'DOMAIN').length;
      const currentGAT     = prev.filter(c => SUBJECT_BY_CODE[c]?.group === 'GAT').length;
      const total          = prev.length;

      // Hard rule 1: total ≤ 5
      if (total >= 5) return prev;

      // Group-specific caps
      if (subj.group === 'LANG'   && currentLangs   >= 2) return prev;
      if (subj.group === 'GAT'    && currentGAT     >= 1) return prev;
      if (subj.group === 'DOMAIN') {
        // 1 language → max 3 domains; 2 languages → max 2 domains
        const maxDomains = currentLangs >= 2 ? 2 : 3;
        if (currentDomains >= maxDomains) return prev;
      }

      // Also enforce: adding a 2nd language while you already have 3 domains
      // would push total over the budget for the 2-lang track. Block it.
      if (subj.group === 'LANG' && currentLangs === 1 && currentDomains >= 3) return prev;

      setDreamId(''); setDreamLabel(''); setSearchDream('');
      return [...prev, code];
    });
  };

  // Compute which subjects are currently "blocked" for display (greyed out)
  const blockedCodes = useMemo(() => {
    const blocked = new Set();
    const total = subjectsTaken.length;
    const currentLangs   = subjectsTaken.filter(c => SUBJECT_BY_CODE[c]?.group === 'LANG').length;
    const currentDomains = subjectsTaken.filter(c => SUBJECT_BY_CODE[c]?.group === 'DOMAIN').length;
    const currentGAT     = subjectsTaken.filter(c => SUBJECT_BY_CODE[c]?.group === 'GAT').length;

    for (const s of [...LANGUAGES, ...DOMAINS, ...GAT]) {
      if (subjectsTaken.includes(s.code)) continue;       // selected items are never "blocked"
      if (total >= 5)                          { blocked.add(s.code); continue; }
      if (s.group === 'LANG'   && currentLangs   >= 2) blocked.add(s.code);
      if (s.group === 'GAT'    && currentGAT     >= 1) blocked.add(s.code);
      if (s.group === 'DOMAIN') {
        const maxDomains = currentLangs >= 2 ? 2 : 3;
        if (currentDomains >= maxDomains) blocked.add(s.code);
      }
      if (s.group === 'LANG' && currentLangs === 1 && currentDomains >= 3) blocked.add(s.code);
    }
    return blocked;
  }, [subjectsTaken]);

  // Friendly hint text shown beneath the chips
  const selectionHint = useMemo(() => {
    const total = subjectsTaken.length;
    const langs   = subjectsTaken.filter(c => SUBJECT_BY_CODE[c]?.group === 'LANG').length;
    const domains = subjectsTaken.filter(c => SUBJECT_BY_CODE[c]?.group === 'DOMAIN').length;
    const gat     = subjectsTaken.filter(c => SUBJECT_BY_CODE[c]?.group === 'GAT').length;
    if (total === 0) return null;
    if (total >= 5)  return 'You\'ve hit the 5-subject CUET limit.';
    const maxDomains = langs >= 2 ? 2 : 3;
    const parts = [];
    if (langs   < 2)            parts.push(`${2 - langs} more language${2-langs===1?'':'s'} allowed`);
    if (domains < maxDomains)   parts.push(`${maxDomains - domains} more domain${maxDomains-domains===1?'':'s'} allowed`);
    if (gat === 0)              parts.push('GAT optional');
    return parts.join(' · ');
  }, [subjectsTaken]);
  const onScore = (code, val) => {
    if (val === '' || val == null) { const c = { ...scores }; delete c[code]; setScores(c); return; }
    const n = Number(val);
    if (Number.isNaN(n) || n < 0 || n > 250) return;
    setScores({ ...scores, [code]: n });
  };
  const selectDream = (opt) => {
    setDreamId(String(opt.id)); setDreamLabel(opt.label);
    setSearchDream(opt.label); setShowDropdown(false);
  };
  const clearDream = () => { setDreamId(''); setDreamLabel(''); setSearchDream(''); };

  const allScoresValid = subjectsTaken.every(c => typeof scores[c] === 'number');
  const canSubmit = name.trim().length >= 2 && subjectsTaken.length >= 1 && allScoresValid;

  async function submit() {
    setErr('');
    if (name.trim().length < 2)    { setErr('Please enter your name to continue.'); return; }
    if (subjectsTaken.length < 1)  { setErr('Please select at least one subject you appeared for.'); return; }
    if (!allScoresValid)           { setErr('Please enter a valid score (0–250) for every selected subject.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), category, scores, subjectsTaken,
          dreamProgramId: dreamId ? Number(dreamId) : null,
          dreamLabel: dreamLabel || null
        })
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error || 'Server error'); setBusy(false); return; }
      sessionStorage.setItem('cuet:results', JSON.stringify({
        payload: { name: name.trim(), category, scores, subjectsTaken,
                   dreamProgramId: dreamId ? Number(dreamId) : null, dreamLabel: dreamLabel || null },
        response: json
      }));
      router.push('/results');
    } catch {
      setErr('Network error. Please check your internet and try again.'); setBusy(false);
    }
  }

  return (
    <div className="space-y-10 animate-in">
      {/* ============= HERO ============= */}
      <section className="text-center pt-4 pb-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-50 via-white to-amber-50 border border-amber-200 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">
            Now projecting 2026 DU cutoffs
          </span>
        </div>
        <h1 className="mt-6 font-display text-[2.25rem] sm:text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.15] sm:leading-[1.1] text-slate-900 mx-auto px-2">
          Stop guessing your DU rank.<br />
          <span className="italic">Let{' '}
            <span className="relative inline-block">
              data science
              <svg className="absolute -bottom-1 sm:-bottom-2 left-0 w-full h-[5px] sm:h-[14px]" viewBox="0 0 300 14" fill="none" preserveAspectRatio="none">
                <path d="M2 9c50-6 100-6 150 0s100 6 146 0" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" />
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="300" y2="0">
                    <stop stopColor="#4f46e5"/><stop offset="0.5" stopColor="#a855f7"/><stop offset="1" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
              </svg>
            </span>{' '}calculate{/* mobile-only line break before "your real odds." */}
            <br className="sm:hidden" />{' '}
            your real odds.
          </span>
        </h1>
        <p className="mt-6 text-[13px] leading-[1.55] sm:text-lg sm:leading-normal text-slate-600 max-w-3xl mx-auto px-3">
          A 12-factor statistical engine that <b className="text-slate-900">projects 2026 cutoffs</b> and your real admission chances across <b className="text-slate-900">1,526 college-program combinations</b> at Delhi University.
        </p>
        <div className="mt-7 text-xs text-slate-500 leading-[1.9]">
          {/* Mobile: forced 2-line split (2+2). Desktop: single line. */}
          <div className="sm:hidden flex flex-col items-center gap-y-0.5">
            <div className="flex items-center gap-x-2">
              <Stat>1,526 programs</Stat>·<Stat>67 colleges</Stat>
            </div>
            <div className="flex items-center gap-x-2">
              <Stat>12-factor engine</Stat>·<Stat>all categories</Stat>
            </div>
          </div>
          <div className="hidden sm:flex flex-wrap items-center justify-center gap-x-2">
            <Stat>1,526 programs</Stat>·<Stat>67 colleges</Stat>·<Stat>12-factor engine</Stat>·<Stat>all categories</Stat>
          </div>
        </div>
      </section>

      {/* ============= EXPECTED 2026 CUTOFFS — LIVE TICKER ============= */}
      <CutoffTicker />

      {/* ============= FORM GRID ============= */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8">

        {/* ===== Left column: 5 steps ===== */}
        <div className="space-y-6">

          {/* STEP 1 */}
          <Step n={1} title="Subjects you appeared for" subtitle="Pick only what you actually took. Courses will auto-filter.">
            <div className="space-y-7">
              <SubjectGroup title="Languages"        list={LANGUAGES} selected={subjectsTaken} blocked={blockedCodes} toggle={toggleSubject} accent="amber" />
              <SubjectGroup title="Domain Subjects"  list={DOMAINS}   selected={subjectsTaken} blocked={blockedCodes} toggle={toggleSubject} accent="emerald" />
              <SubjectGroup title="General Aptitude" list={GAT}       selected={subjectsTaken} blocked={blockedCodes} toggle={toggleSubject} accent="indigo" />
            </div>
            {subjectsTaken.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                  ✓ {subjectsTaken.length} of 5 subjects selected
                </div>
                {selectionHint && (
                  <div className="text-xs text-slate-500">{selectionHint}</div>
                )}
              </div>
            )}
          </Step>

          {/* STEP 2 */}
          <Step n={2} title="NTA normalised scores" subtitle="Enter the exact score from your scorecard. Decimals supported.">
            {subjectsTaken.length === 0 ? (
              <EmptyState text="Select subjects in Step 1 to enter your scores here." />
            ) : (
              <div className="grid sm:grid-cols-2 gap-2.5 min-w-0">
                {subjectsTaken.map(code => {
                  const s = SUBJECT_BY_CODE[code];
                  if (!s) return null;
                  const v = scores[code];
                  return (
                    <div key={code} className="group relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition px-3 py-2.5 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">{code}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">{s.name}</div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-400">{s.group}</div>
                        </div>
                        <input type="number" min="0" max="250" step="0.0001"
                          value={v ?? ''} onChange={(e) => onScore(code, e.target.value)}
                          placeholder="0–250"
                          className={`shrink-0 w-20 sm:w-24 text-right tabular-nums px-3 py-1.5 rounded-lg border bg-slate-50
                            ${typeof v === 'number' ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900 font-semibold' : 'border-slate-200'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Step>

          {/* STEP 3 */}
          <Step n={3} title="Category" subtitle="Used to pick the right reservation cutoffs.">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORIES.map(c => {
                const on = category === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                    className={`group relative px-3 py-3 rounded-xl border text-center transition-all
                      ${on
                        ? 'border-transparent text-white bg-gradient-to-br from-indigo-600 to-violet-600 shadow-[0_8px_20px_-6px_rgba(79,70,229,0.6)]'
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'}`}>
                    <div className={`text-sm font-semibold ${on ? 'text-white' : 'text-slate-900'}`}>{c.label}</div>
                    {c.sub && <div className={`text-[10px] ${on ? 'text-indigo-100' : 'text-slate-400'}`}>{c.sub}</div>}
                  </button>
                );
              })}
            </div>
          </Step>

          {/* STEP 4 */}
          <Step n={4} title={<>Your name <span className="text-rose-500">*</span></>} subtitle="Required. Personalises the results card.">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className={`field ${name.trim().length >= 2 ? 'field-ok' : ''}`} />
            <div className="mt-1.5 text-xs">
              {name.trim().length >= 2
                ? <span className="text-emerald-700">✓ Looks good, {name.trim().split(' ')[0]}.</span>
                : <span className="text-slate-400">At least 2 characters.</span>}
            </div>
          </Step>

          {/* STEP 5 — searchable dropdown with FULL college names */}
          <Step n={5} title="Dream college + course (optional)" subtitle="Type to search OR scroll the full list. Both work.">
            <SearchableDream
              dreamOptions={dreamOptions}
              filteredDreams={filteredDreams}
              displayedDreams={displayedDreams}
              subjectsTaken={subjectsTaken}
              searchDream={searchDream}
              setSearchDream={setSearchDream}
              showDropdown={showDropdown}
              setShowDropdown={setShowDropdown}
              dreamId={dreamId}
              dreamLabel={dreamLabel}
              selectDream={selectDream}
              clearDream={clearDream}
            />
            {dreamLabel && dreamId && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                ✓ Dream selected · <span className="font-normal">{dreamLabel}</span>
              </div>
            )}
          </Step>

          {/* ===== SUBMIT ===== */}
          {err && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {err}
            </div>
          )}

          <button onClick={submit} disabled={!canSubmit || busy}
            className="btn-primary w-full py-4 text-base sm:text-lg">
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Crunching the numbers…
              </span>
            ) : (
              <span>Calculate my chances →</span>
            )}
          </button>

          {!canSubmit && (
            <div className="text-center text-xs text-slate-500 -mt-2 space-x-2">
              {name.trim().length < 2 && <span>· Enter your name</span>}
              {subjectsTaken.length === 0 && <span>· Pick subjects</span>}
              {subjectsTaken.length > 0 && !allScoresValid && <span>· Fill all scores</span>}
            </div>
          )}
        </div>

        {/* ===== Right column: SIDEBAR ===== */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <SidebarIcon><BarsIcon /></SidebarIcon>
              <h3 className="font-semibold text-slate-900">What's in the model</h3>
            </div>
            <ul className="text-[13px] text-slate-700 space-y-2.5">
              <Li>1,526 DU 2025-26 Round 1 cutoffs across all 67 colleges</Li>
              <Li>NTA 2025 + 2026 subject-wise max-score data</Li>
              <Li>Category-pool growth (UR/OBC/SC/ST/EWS/PwBD)</Li>
              <Li>Top-end density (100%-ile holders ↑20% YoY)</Li>
              <Li>Structural changes (e.g. <b>BFIA +1 domain in 2026</b>)</Li>
              <Li>Seat scarcity premium for tiny UR/EWS pools</Li>
            </ul>
          </div>

          <div id="how" className="card p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <SidebarIcon><SigmaIcon /></SidebarIcon>
              <h3 className="font-semibold text-slate-900">The math, in plain English</h3>
            </div>
            <ol className="text-[13px] text-slate-700 space-y-2 list-none counter-reset-step">
              <Mi n="1">2025 cutoff = score of last-admitted student → corresponds to a fixed percentile of the pool</Mi>
              <Mi n="2">Project that <i>same percentile</i> onto the 2026 composite scale (with formula &amp; subject inflation)</Mi>
              <Mi n="3">Adjust upward for pool growth × category competition × top-end density</Mi>
              <Mi n="4">Probability = sigmoid((you − cutoff) / σ), where σ is tier-aware</Mi>
              <Mi n="5">Confidence ↓ when structure changed or 2026 data sparse</Mi>
            </ol>
          </div>

          <div className="card p-5 bg-gradient-to-br from-violet-50 via-fuchsia-50/40 to-white">
            <h3 className="font-semibold text-slate-900 mb-1.5 text-sm">🔒 Your data stays yours</h3>
            <p className="text-[12px] text-slate-600 leading-relaxed">
              Scores are stored to improve the model year-on-year only. Never sold, never marketed to. Read-only for the platform owner.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* =================== Components =================== */

function Step({ n, title, subtitle, children }) {
  return (
    <section className="card p-5 sm:p-7">
      <div className="flex items-start gap-4 mb-5">
        <div className="shrink-0 h-9 w-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white grid place-items-center text-sm font-semibold shadow-sm">
          {n}
        </div>
        <div>
          <h2 className="font-display text-2xl text-slate-900 leading-none">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function SubjectGroup({ title, list, selected, blocked, toggle, accent }) {
  const accentClass = { amber: 'chip-on-amber', emerald: 'chip-on-emerald', indigo: 'chip-on-indigo', rose: 'chip-on-rose' }[accent];
  const accentDot   = { amber: 'bg-amber-500',   emerald: 'bg-emerald-500',   indigo: 'bg-indigo-500',   rose: 'bg-rose-500'   }[accent];
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`h-1.5 w-1.5 rounded-full ${accentDot}`} />
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{title}</div>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      <div className="flex flex-wrap gap-2.5">
        {list.map(s => {
          const on        = selected.includes(s.code);
          const isBlocked = blocked?.has(s.code);
          return (
            <button
              key={s.code} type="button"
              onClick={() => toggle(s.code)}
              disabled={isBlocked && !on}
              title={isBlocked && !on ? 'Selection limit reached — deselect another to pick this' : undefined}
              className={`chip ${on ? `chip-on ${accentClass}` : ''} ${isBlocked && !on ? 'chip-blocked' : ''}`}
            >
              <span>{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-sm text-slate-500 text-center">
      <div className="mx-auto mb-2 h-8 w-8 rounded-full bg-slate-200/70 grid place-items-center text-slate-500" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </div>
      {text}
    </div>
  );
}

function Stat({ children }) {
  return <span className="text-slate-700 font-medium">{children}</span>;
}
function Li({ children }) {
  return <li className="flex gap-2"><span className="text-indigo-500 mt-1">▸</span><span>{children}</span></li>;
}
function Mi({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 h-5 w-5 rounded-full bg-cyan-100 text-cyan-700 grid place-items-center text-[10px] font-semibold">{n}</span>
      <span>{children}</span>
    </li>
  );
}

/* Dark slate badge to match the step-number circles in the form */
function SidebarIcon({ children }) {
  return (
    <div className="shrink-0 h-8 w-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white grid place-items-center shadow-sm">
      {children}
    </div>
  );
}
function BarsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="5"  y1="20" x2="5"  y2="14" />
      <line x1="12" y1="20" x2="12" y2="9"  />
      <line x1="19" y1="20" x2="19" y2="4"  />
    </svg>
  );
}
function SigmaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M17 5H7l6 7-6 7h10" />
    </svg>
  );
}

/* =====================================================================
   CutoffTicker — Grandeur showcase. Announces that the platform covers
   every flagship DU program WITHOUT revealing numeric cutoffs (so
   students don't self-disqualify before entering their scores).
   ===================================================================== */
function CutoffTicker() {
  const items = useMemo(() => ([
    { college: 'Shri Ram College of Commerce',                   program: 'B.Com (Hons.)' },
    { college: 'Shri Ram College of Commerce',                   program: 'B.A. (Hons.) Economics' },
    { college: 'Hindu College',                                  program: 'B.A. (Hons.) Economics' },
    { college: 'Hindu College',                                  program: 'B.Com (Hons.)' },
    { college: 'St. Stephen\'s College',                         program: 'B.A. Economics' },
    { college: 'Shaheed Sukhdev College of Business Studies',    program: 'BBA (Financial Investment Analysis)' },
    { college: 'Shaheed Sukhdev College of Business Studies',    program: 'Bachelor of Management Studies' },
    { college: 'Lady Shri Ram College for Women',                program: 'B.A. (Hons.) Economics' },
    { college: 'Hansraj College',                                program: 'B.Com (Hons.)' },
    { college: 'Miranda House',                                  program: 'B.Sc (Hons.) Physics' },
    { college: 'Kirori Mal College',                             program: 'B.Com (Hons.)' },
    { college: 'Sri Venkateswara College',                       program: 'B.Com (Hons.)' },
    { college: 'Atma Ram Sanatan Dharma College',                program: 'B.A. (Hons.) Economics' },
    { college: 'Daulat Ram College',                             program: 'B.Sc (Hons.) Chemistry' },
    { college: 'Ramjas College',                                 program: 'B.A. (Hons.) English' },
    { college: 'Gargi College',                                  program: 'B.A. (Hons.) Political Science' },
  ]), []);

  return (
    <div className="ticker-wrap">
      <div className="ticker-headline">
        <div className="ticker-badge">
          <span className="ticker-dot" />
          <span>NEW · CUET 2026</span>
        </div>
        <h2 className="ticker-title">
          We project the <span className="ticker-grad">Expected 2026 Cutoffs</span> for every Delhi University program.
        </h2>
        <p className="ticker-sub">
          Enter your scores below to see yours.
        </p>
      </div>

      <div className="ticker-viewport">
        <div className="ticker-track">
          {[...items, ...items].map((it, i) => (
            <div key={i} className="ticker-item">
              <span className="ticker-star">✦</span>
              <span className="ticker-college">{it.college}</span>
              <span className="ticker-sep">—</span>
              <span className="ticker-program">{it.program}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   SearchableDream — Portal-based dropdown.
   Renders the dropdown panel directly into <body>, bypassing every
   CSS stacking context (cards, sticky nav, gradients). Position is
   recomputed against the input on open / resize / scroll.
   ===================================================================== */
function SearchableDream({
  dreamOptions, filteredDreams, displayedDreams, subjectsTaken,
  searchDream, setSearchDream, showDropdown, setShowDropdown,
  dreamId, dreamLabel, selectDream, clearDream
}) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Recompute position whenever opened, or on scroll / resize while open
  useLayoutEffect(() => {
    if (!showDropdown || !inputRef.current) return;
    function position() {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const panelH = 360; // matches max-height ~22rem
      const openUp = spaceBelow < 220 && rect.top > panelH;
      setCoords({
        top:  openUp ? rect.top + window.scrollY - 8 : rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: rect.width,
        openUp
      });
    }
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [showDropdown]);

  // Click outside closes
  useEffect(() => {
    function onClick(e) {
      if (!wrapperRef.current) return;
      // wrapper contains the input; portal panel is outside, so check its own ref via class.
      const insideInput = wrapperRef.current.contains(e.target);
      const insidePanel = e.target.closest?.('.dropdown-portal');
      if (!insideInput && !insidePanel) setShowDropdown(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [setShowDropdown]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text" value={searchDream}
        onFocus={() => setShowDropdown(true)}
        onChange={(e) => { setSearchDream(e.target.value); setShowDropdown(true); if (!e.target.value) clearDream(); }}
        placeholder={subjectsTaken.length === 0
          ? "Pick subjects in Step 1 first…"
          : "Search e.g. Shaheed Sukhdev, Shri Ram College of Commerce, Hindu College, Hansraj…"}
        disabled={subjectsTaken.length === 0}
        className="field pr-10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
      />
      {searchDream && (
        <button type="button" onClick={clearDream}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 grid place-items-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs">×</button>
      )}

      {mounted && showDropdown && subjectsTaken.length > 0 && createPortal(
        <div
          className="dropdown-portal"
          style={{
            top: coords.openUp ? coords.top - 360 : coords.top,
            left: coords.left,
            width: coords.width
          }}
        >
          <div className="sticky top-0 px-4 py-2.5 bg-slate-100 border-b border-slate-200 text-[11px] text-slate-600 font-semibold uppercase tracking-wider z-10">
            {searchDream
              ? `${filteredDreams.length.toLocaleString()} of ${dreamOptions.length.toLocaleString()} match · showing first ${Math.min(80, filteredDreams.length)}`
              : `${dreamOptions.length.toLocaleString()} eligible · showing first 80 — type to narrow`}
          </div>
          {displayedDreams.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500 text-center">
              No programs match "{searchDream}". Try fewer words or check spelling.
            </div>
          ) : (
            displayedDreams.map(o => (
              <button key={o.id} type="button" onClick={() => selectDream(o)}
                className={`w-full text-left px-4 py-2.5 text-sm border-b border-slate-100 last:border-0
                  ${String(o.id) === dreamId
                    ? 'bg-indigo-50 text-indigo-900 font-medium'
                    : 'text-slate-800 hover:bg-indigo-50/60'}`}>
                <div className="truncate">{o.label}</div>
              </button>
            ))
          )}
          {filteredDreams.length > 80 && (
            <div className="px-4 py-2.5 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200 text-center">
              + {filteredDreams.length - 80} more programs hidden — type to narrow
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
