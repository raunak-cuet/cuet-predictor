'use client';

import { useEffect, useMemo, useState } from 'react';
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

  const [subjectsTaken, setSubjectsTaken] = useState(['101','319','309','305','501']);
  const [scores, setScores] = useState({});
  const [category, setCategory] = useState('UR');
  const [name, setName] = useState('');
  const [dreamId, setDreamId] = useState('');
  const [searchDream, setSearchDream] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Compute eligible dream-college options based on subjects taken
  const dreamOptions = useMemo(() => eligibleProgramsForSubjects(subjectsTaken), [subjectsTaken]);

  const filteredDreams = useMemo(() => {
    const q = searchDream.trim().toLowerCase();
    if (!q) return dreamOptions.slice(0, 200);
    return dreamOptions.filter(d => d.label.toLowerCase().includes(q)).slice(0, 200);
  }, [searchDream, dreamOptions]);

  const toggleSubject = (code) => {
    setSubjectsTaken(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
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

  const canSubmit = subjectsTaken.length >= 1 &&
    subjectsTaken.every(c => typeof scores[c] === 'number');

  async function submit() {
    setErr('');
    if (!canSubmit) { setErr('Please enter a valid 0–250 score for every subject you appeared in.'); return; }
    setBusy(true);
    try {
      const dream = dreamOptions.find(d => String(d.id) === String(dreamId));
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, category, scores, subjectsTaken,
          dreamProgramId: dream ? dream.id : null,
          dreamLabel: dream ? dream.label : null
        })
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error || 'Server error'); setBusy(false); return; }

      // Stash in sessionStorage for the results page
      sessionStorage.setItem('cuet:results', JSON.stringify({
        payload: { name, category, scores, subjectsTaken,
                   dreamProgramId: dream ? dream.id : null,
                   dreamLabel: dream ? dream.label : null },
        response: json
      }));
      router.push('/results');
    } catch (e) {
      setErr('Network error. Please try again.');
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
            <p className="text-sm text-slate-500 mb-3">Only check the subjects you actually took. Eligible courses adapt automatically.</p>
            <SubjectsGrid groupTitle="Languages (List A)"  list={LANGUAGES} selected={subjectsTaken} toggle={toggleSubject} accent="from-amber-400 to-pink-500" />
            <SubjectsGrid groupTitle="Domain Subjects (List B)" list={DOMAINS} selected={subjectsTaken} toggle={toggleSubject} accent="from-emerald-400 to-cyan-500" />
            <SubjectsGrid groupTitle="General Aptitude" list={GAT} selected={subjectsTaken} toggle={toggleSubject} accent="from-brand-400 to-brand-700" />
          </Step>

          {/* STEP 2 ============================= */}
          <Step n={2} title="Enter your NTA normalised scores">
            {subjectsTaken.length === 0 ? (
              <div className="text-sm text-slate-500">Select subjects in Step 1 to enter scores.</div>
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

          {/* STEP 4 ============================= */}
          <Step n={4} title="Your name (optional)">
            <input type="text" value={name} onChange={(e)=>setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white" />
            <p className="text-xs text-slate-400 mt-1.5">Used only to personalise your results card.</p>
          </Step>

          {/* STEP 5 ============================= */}
          <Step n={5} title="Your dream college + course (optional)">
            <input type="text" value={searchDream} onChange={(e)=>setSearchDream(e.target.value)}
              placeholder="Search e.g. SSCBS, Hindu B.A. Eco, SRCC B.Com…"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white mb-2" />
            <select value={dreamId} onChange={(e)=>setDreamId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white max-h-72">
              <option value="">— No specific dream (rank all) —</option>
              {filteredDreams.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              {dreamOptions.length.toLocaleString()} programs match your subject combination.
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
