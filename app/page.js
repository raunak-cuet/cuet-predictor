'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LANGUAGES, DOMAINS, GAT, SUBJECT_BY_CODE } from '@/lib/subjects';
import { eligibleProgramsForSubjects } from '@/lib/engine';

const CATEGORIES = [
  { id: 'UR',   label: 'General (UR)' },
  { id: 'OBC',  label: 'OBC-NCL'     },
  { id: 'SC',   label: 'SC'          },
  { id: 'ST',   label: 'ST'          },
  { id: 'EWS',  label: 'EWS'         },
  { id: 'PwBD', label: 'PwBD'        }
];

export default function Home() {
  const router = useRouter();

  // NOTHING preselected anymore — student picks everything fresh.
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
  const dropdownRef = useRef(null);

  // Compute eligible dream-college options based on subjects taken
  const dreamOptions = useMemo(() => eligibleProgramsForSubjects(subjectsTaken), [subjectsTaken]);

  // PROPER search: filters across ALL eligible programs (no 200-cap until display).
  const filteredDreams = useMemo(() => {
    const q = searchDream.trim().toLowerCase();
    let arr = dreamOptions;
    if (q) {
      // Token-based match — every word in the query must appear
      const tokens = q.split(/\s+/).filter(Boolean);
      arr = arr.filter(d => {
        const hay = d.label.toLowerCase();
        return tokens.every(t => hay.includes(t));
      });
    }
    return arr.slice(0, 150);   // cap *displayed* list, not search corpus
  }, [searchDream, dreamOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggleSubject = (code) => {
    setSubjectsTaken(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      // Reset dream pick if the selection invalidates it
      setDreamId(''); setDreamLabel(''); setSearchDream('');
      return next;
    });
  };

  const onScore = (code, val) => {
    if (val === '' || val == null) {
      const c = { ...scores }; delete c[code]; setScores(c); return;
    }
    const n = Number(val);
    if (Number.isNaN(n)) return;
    if (n < 0 || n > 250) return;
    setScores({ ...scores, [code]: n });
  };

  const selectDream = (opt) => {
    setDreamId(String(opt.id));
    setDreamLabel(opt.label);
    setSearchDream(opt.label);
    setShowDropdown(false);
  };

  const clearDream = () => {
    setDreamId(''); setDreamLabel(''); setSearchDream('');
  };

  // NAME IS NOW REQUIRED
  const canSubmit = name.trim().length >= 2 &&
                    subjectsTaken.length >= 1 &&
                    subjectsTaken.every(c => typeof scores[c] === 'number');

  async function submit() {
    setErr('');
    if (name.trim().length < 2) { setErr('Please enter your full name to continue.'); return; }
    if (subjectsTaken.length < 1) { setErr('Please select at least one subject you appeared for.'); return; }
    if (!subjectsTaken.every(c => typeof scores[c] === 'number')) {
      setErr('Please enter a valid 0–250 score for every selected subject.'); return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
                   dreamProgramId: dreamId ? Number(dreamId) : null,
                   dreamLabel: dreamLabel || null },
        response: json
      }));
      router.push('/results');
    } catch (e) {
      setErr('Network error. Please check your internet and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* ===== HERO ===== */}
      <section className="text-center pt-2 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-semibold">
          ✦ CUET 2026 final scores released · model updated for 2026 trends
        </div>
        <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
          CUET 2026 → <span className="bg-gradient-to-r from-brand-500 to-brand-800 bg-clip-text text-transparent">DU Admission Predictor</span>
        </h1>
        <p className="mt-2 text-slate-600 text-base sm:text-lg">Know your real chances. Instantly. Across <b>1,526</b> college-program combinations.</p>
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ===== FORM ===== */}
        <div className="lg:col-span-2 space-y-6">

          {/* STEP 1 ============================= */}
          <Step n={1} title="Which subjects did you appear for?">
            <p className="text-sm text-slate-500 mb-3">Pick only the subjects you actually took. Eligible courses adapt automatically.</p>
            <SubjectsGrid groupTitle="Languages (List A)"  list={LANGUAGES} selected={subjectsTaken} toggle={toggleSubject} accent="from-amber-400 to-pink-500" />
            <SubjectsGrid groupTitle="Domain Subjects (List B)" list={DOMAINS} selected={subjectsTaken} toggle={toggleSubject} accent="from-emerald-400 to-cyan-500" />
            <SubjectsGrid groupTitle="General Aptitude" list={GAT} selected={subjectsTaken} toggle={toggleSubject} accent="from-brand-400 to-brand-700" />
            {subjectsTaken.length > 0 && (
              <p className="mt-2 text-xs text-brand-700 font-medium">
                ✓ {subjectsTaken.length} subject{subjectsTaken.length === 1 ? '' : 's'} selected
              </p>
            )}
          </Step>

          {/* STEP 2 ============================= */}
          <Step n={2} title="Enter your NTA normalised scores">
            {subjectsTaken.length === 0 ? (
              <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg border border-slate-200">
                ⬆️ First select subjects in Step 1, then score inputs will appear here.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {subjectsTaken.map(code => {
                  const s = SUBJECT_BY_CODE[code];
                  if (!s) return null;
                  return (
                    <label key={code} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                      <div className="text-xs text-slate-500 w-12 font-mono">{code}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{s.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">{s.group}</div>
                      </div>
                      <input
                        type="number" min="0" max="250" step="0.0001"
                        placeholder="0 – 250"
                        value={scores[code] ?? ''}
                        onChange={(e)=>onScore(code, e.target.value)}
                        className="w-28 text-right px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </Step>

          {/* STEP 3 ============================= */}
          <Step n={3} title="Your category">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={()=>setCategory(c.id)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all
                    ${category===c.id
                      ? 'bg-brand-600 text-white border-brand-600 shadow-glow'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-brand-400 hover:bg-brand-50'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </Step>

          {/* STEP 4 ============================= NAME (REQUIRED) */}
          <Step n={4} title="Your name *">
            <input type="text" value={name} onChange={(e)=>setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className={`w-full px-4 py-2.5 rounded-xl border bg-white
                ${name.trim().length >= 2
                  ? 'border-emerald-300'
                  : 'border-slate-200'}`} />
            <p className="text-xs text-slate-500 mt-1.5">
              {name.trim().length >= 2
                ? <span className="text-emerald-700">✓ Looks good</span>
                : <span className="text-slate-400">Required — used to personalise your results.</span>}
            </p>
          </Step>

          {/* STEP 5 ============================= SEARCHABLE DREAM PICKER */}
          <Step n={5} title="Your dream college + course (optional)">
            <div ref={dropdownRef} className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchDream}
                  onFocus={()=>setShowDropdown(true)}
                  onChange={(e)=>{ setSearchDream(e.target.value); setShowDropdown(true); if (!e.target.value) clearDream(); }}
                  placeholder={subjectsTaken.length === 0 ? "Select subjects first…" : "Type to search e.g. SSCBS, SRCC, Hindu, Hansraj, B.Com Hons…"}
                  disabled={subjectsTaken.length === 0}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                />
                {searchDream && (
                  <button type="button" onClick={clearDream}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-lg">×</button>
                )}
              </div>

              {showDropdown && subjectsTaken.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {filteredDreams.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">No programs match "{searchDream}".</div>
                  ) : (
                    filteredDreams.map(o => (
                      <button key={o.id} type="button" onClick={()=>selectDream(o)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-50 border-b border-slate-100 last:border-0
                          ${String(o.id) === dreamId ? 'bg-brand-100 text-brand-900 font-medium' : 'text-slate-700'}`}>
                        {o.label}
                      </button>
                    ))
                  )}
                  {searchDream.trim() === '' && dreamOptions.length > 150 && (
                    <div className="px-4 py-2 text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                      Showing first 150 of {dreamOptions.length.toLocaleString()}. Type to search the rest.
                    </div>
                  )}
                </div>
              )}
            </div>

            {dreamLabel && dreamId && (
              <div className="mt-2 text-xs text-emerald-700 font-medium">
                ✓ Dream selected: {dreamLabel}
              </div>
            )}
            <p className="text-xs text-slate-400 mt-1.5">
              {subjectsTaken.length === 0
                ? 'Pick subjects in Step 1 to unlock the college list.'
                : `${dreamOptions.length.toLocaleString()} programs across DU match your subject combination.`}
            </p>
          </Step>

          {/* SUBMIT ============================= */}
          {err && <div className="card p-3 text-sm text-rose-600 border-rose-200 bg-rose-50">{err}</div>}
          <button onClick={submit} disabled={!canSubmit || busy}
            className="w-full py-4 rounded-2xl text-white font-semibold text-lg shadow-soft
              bg-gradient-to-r from-brand-500 to-brand-800 hover:from-brand-600 hover:to-brand-900
              disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? 'Crunching numbers…' : '🎯 Calculate my chances'}
          </button>
          {!canSubmit && (
            <p className="text-xs text-center text-slate-500">
              {name.trim().length < 2 && '· Enter your name '}
              {subjectsTaken.length === 0 && '· Pick at least 1 subject '}
              {subjectsTaken.length > 0 && !subjectsTaken.every(c => typeof scores[c] === 'number') && '· Fill in all scores '}
            </p>
          )}
        </div>

        {/* ===== SIDEBAR — Why trust this ===== */}
        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="font-bold text-slate-900 mb-2">📊 What goes into the model</h3>
            <ul className="text-sm text-slate-700 space-y-2">
              <Bullet>1,526 program-category cutoffs from <b>DU 2025-26 Round 1</b></Bullet>
              <Bullet>2025 + 2026 NTA <b>subject-wise max-score</b> shifts</Bullet>
              <Bullet>Category-wise <b>candidate pool</b> growth ({pct(1.086)})</Bullet>
              <Bullet>Top-end density: 100-percentile counts in 1–4 subjects</Bullet>
              <Bullet>Structural changes (e.g. <b>BFIA +1 domain</b> in 2026)</Bullet>
              <Bullet>Historical CUET-era cutoff drift</Bullet>
            </ul>
          </div>
          <div id="how" className="card p-5">
            <h3 className="font-bold text-slate-900 mb-2">🧮 How probability is computed</h3>
            <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1">
              <li>Composite = best subjects per program-specific formula</li>
              <li>2026 cutoff = 2025 × subject-shift × structural-scale + drift</li>
              <li>Probability = logistic((you − cutoff) / σ)</li>
              <li>Confidence ↓ when structural rules changed or 2026 data sparse</li>
            </ol>
          </div>
          <div className="card p-5 bg-gradient-to-br from-brand-50 to-white">
            <h3 className="font-bold text-slate-900 mb-1">🔒 Privacy</h3>
            <p className="text-sm text-slate-700">Your name &amp; scores are stored only to help our model improve year-on-year. No marketing, no resale.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-full bg-brand-600 text-white grid place-items-center font-bold text-sm shadow-glow">{n}</div>
        <h2 className="font-bold text-slate-900 text-lg">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SubjectsGrid({ groupTitle, list, selected, toggle, accent }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{groupTitle}</div>
      <div className="flex flex-wrap gap-1.5">
        {list.map(s => {
          const on = selected.includes(s.code);
          return (
            <button key={s.code} type="button" onClick={()=>toggle(s.code)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all
                ${on
                  ? `bg-gradient-to-r ${accent} text-white border-transparent shadow`
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}>
              <span className="font-mono text-[10px] opacity-70 mr-1">{s.code}</span>{s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Bullet({ children }) {
  return (<li className="flex gap-2"><span className="text-brand-500 mt-0.5">▸</span><span>{children}</span></li>);
}
function pct(x) { return `+${((x-1)*100).toFixed(1)}%`; }
