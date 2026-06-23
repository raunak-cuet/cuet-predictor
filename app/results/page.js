'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cuet:results');
      if (!raw) { router.replace('/'); return; }
      setData(JSON.parse(raw));
    } catch { router.replace('/'); }
    setLoaded(true);
  }, []);

  if (!loaded) return null;
  if (!data) return <div className="text-center text-slate-600">No results found. Redirecting…</div>;

  const { payload, response } = data;
  const results = response?.results || [];
  const dream = payload.dreamProgramId
    ? results.find(r => r.id === Number(payload.dreamProgramId))
    : null;

  return (
    <div className="space-y-8">
      <ResultsHero name={payload.name} category={payload.category} totalEligible={results.length} persisted={response?.persisted} />

      {dream && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-brand-600 font-bold mb-2">⭐ Your dream college</h2>
          <ResultCard r={dream} highlighted />
        </section>
      )}

      <AllResults results={results} dreamId={dream?.id} />

      <DisclaimerCard />
    </div>
  );
}

// ---------------------------------------------------------------- Hero
function ResultsHero({ name, category, totalEligible, persisted }) {
  const router = useRouter();
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">Predictions for</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {name?.trim() ? `${name}` : 'Anonymous candidate'}
            <span className="ml-2 align-middle text-xs font-semibold bg-brand-100 text-brand-800 px-2 py-1 rounded-full">{category}</span>
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {totalEligible.toLocaleString()} eligible programs ranked by admission probability
            {persisted ? ' · saved' : ' · local'}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>router.push('/')}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 hover:bg-slate-50">
            ← Edit my scores
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- List + filters
function AllResults({ results, dreamId }) {
  const [filter, setFilter] = useState('ALL');     // ALL | SAFE | MID | RISKY
  const [sort, setSort] = useState('PROB');        // PROB | NAME | SCORE
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    let arr = results.filter(r => r.id !== dreamId);
    if (filter === 'SAFE') arr = arr.filter(r => (r.probability.p ?? 0) >= 75);
    if (filter === 'MID')  arr = arr.filter(r => { const p = r.probability.p ?? -1; return p >= 50 && p < 75; });
    if (filter === 'RISKY')arr = arr.filter(r => (r.probability.p ?? 0) < 50);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(r => (r.college + ' ' + r.program).toLowerCase().includes(q));
    }
    arr = [...arr];
    if (sort === 'PROB')  arr.sort((a,b)=>(b.probability.p??-1)-(a.probability.p??-1));
    if (sort === 'NAME')  arr.sort((a,b)=>(a.college+a.program).localeCompare(b.college+b.program));
    if (sort === 'SCORE') arr.sort((a,b)=>(b.yourComposite??0)-(a.yourComposite??0));
    return arr;
  }, [results, filter, sort, search, dreamId]);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">All eligible programs</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search college / course…"
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm w-56" />
          <select value={filter} onChange={(e)=>setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm">
            <option value="ALL">Show all</option>
            <option value="SAFE">🟢 Safe (≥75%)</option>
            <option value="MID">🟡 Moderate (50–75%)</option>
            <option value="RISKY">🔴 Risky (&lt;50%)</option>
          </select>
          <select value={sort} onChange={(e)=>setSort(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm">
            <option value="PROB">Sort: Probability</option>
            <option value="NAME">Sort: College name</option>
            <option value="SCORE">Sort: Your composite</option>
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-6 text-center text-slate-500">No programs match this filter.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map(r => <ResultCard key={r.id} r={r} />)}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Single result card
function ResultCard({ r, highlighted }) {
  const [open, setOpen] = useState(false);
  const [whatIf, setWhatIf] = useState(0);

  const p = r.probability.p ?? 0;
  const tone = r.probability.verdict?.tone || 'unknown';
  const verdictLabel = r.probability.verdict?.label || '—';
  const verdictEmoji = r.probability.verdict?.emoji || '⚪';

  const proj = r.projection;
  const margin = r.probability.margin;

  // What-if simulated probability:
  const simP = simulateProb(r, whatIf);

  return (
    <div className={`card p-5 ${highlighted ? 'ring-2 ring-brand-500 shadow-glow' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{r.college}</div>
          <div className="text-sm text-slate-600 leading-tight">{r.program}</div>
          <div className="mt-1 text-[11px] text-slate-400">
            Formula: <span className="font-mono">{r.formula.desc}</span>
          </div>
        </div>
        <div className={`shrink-0 px-2 py-1 rounded-full text-xs font-semibold tone-${tone}`}>
          {verdictEmoji} {verdictLabel}
        </div>
      </div>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex items-end justify-between text-xs text-slate-500 mb-1">
          <span>Admission probability</span>
          <span className="text-lg font-bold text-slate-900">{r.probability.p == null ? '—' : `${r.probability.p}%`}</span>
        </div>
        <div className="bar">
          <div style={{ width: `${p}%` }} className={`bg-gradient-to-r ${
            p >= 80 ? 'from-emerald-400 to-emerald-600' :
            p >= 60 ? 'from-blue-400 to-blue-600' :
            p >= 40 ? 'from-amber-400 to-amber-600' :
            p >= 20 ? 'from-orange-400 to-orange-600' :
                       'from-rose-400 to-rose-600'
          }`}></div>
        </div>
      </div>

      {/* Score row */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <Stat label="Your composite" value={r.yourComposite?.toFixed(2)} sub={`/ ${r.outOf}`} />
        <Stat label="2026 most likely" value={proj.mostLikely?.toFixed(0)} sub={`band ±${proj.sigma?.toFixed(0)}`} />
        <Stat label="Margin" value={(margin>=0?'+':'')+margin?.toFixed(1)}
              sub={margin>=0 ? 'above cutoff' : 'below cutoff'} tone={margin>=0?'safe':'reach'} />
      </div>

      {/* Projection band */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
        <div className="flex justify-between"><span className="text-slate-500">Conservative</span><b>{proj.conservative?.toFixed(1) ?? '—'}</b></div>
        <div className="flex justify-between"><span className="text-slate-500">Most likely</span><b className="text-brand-700">{proj.mostLikely?.toFixed(1) ?? '—'}</b></div>
        <div className="flex justify-between"><span className="text-slate-500">Aggressive</span><b>{proj.aggressive?.toFixed(1) ?? '—'}</b></div>
        <div className="flex justify-between mt-1 pt-1 border-t border-slate-200">
          <span className="text-slate-500">2025 actual cutoff ({r.category})</span><b>{r.cutoff2025?.toFixed(1)}</b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Prediction confidence</span><b>{proj.confidence}%</b>
        </div>
      </div>

      {/* What-if slider */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500">
          <span>What if I scored {whatIf >= 0 ? '+' : ''}{whatIf} marks more?</span>
          <span className="font-semibold text-slate-700">→ {simP == null ? '—' : `${simP}%`}</span>
        </div>
        <input type="range" min="-50" max="100" step="1" value={whatIf} onChange={(e)=>setWhatIf(Number(e.target.value))}
          className="w-full mt-1" />
      </div>

      {/* Reveal: factor breakdown */}
      <button onClick={()=>setOpen(o=>!o)} className="mt-3 text-xs text-brand-700 font-semibold hover:underline">
        {open ? '▾ Hide calculation' : '▸ How was this calculated?'}
      </button>
      {open && (
        <div className="mt-2 text-xs text-slate-600 space-y-1">
          <div className="font-semibold text-slate-700">Composite breakdown</div>
          <ul className="list-disc list-inside pl-1">
            {r.breakdown.map((b,i)=>(<li key={i}><span className="font-mono">{b.code}</span> · {b.role}: <b>{b.score.toFixed(2)}</b></li>))}
          </ul>
          <div className="font-semibold text-slate-700 mt-2">Factor contributions to 2026 cutoff</div>
          <ul className="space-y-0.5">
            {proj.factors.map((f,i)=>(
              <li key={i} className="flex justify-between gap-3">
                <span><b>{f.id}</b> · {f.name}: <span className="text-slate-500">{f.note}</span></span>
                <span className="font-mono whitespace-nowrap">{(f.contribution ?? 0) >= 0 ? '+' : ''}{(f.contribution ?? 0).toFixed(2)}{f.multiplier ? ` ×${f.multiplier.toFixed(3)}` : ''}{f.scale ? ` ×${f.scale.toFixed(3)}` : ''}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 text-slate-500">
            Percentile of your composite within this program's distribution:&nbsp;
            <b className="text-slate-700">~{r.percentile}%ile</b>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }) {
  const cls = tone === 'safe' ? 'text-emerald-700' : tone === 'reach' ? 'text-rose-700' : 'text-slate-900';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-base sm:text-lg font-bold ${cls}`}>{value ?? '—'}</div>
      <div className="text-[10px] text-slate-400">{sub}</div>
    </div>
  );
}

// Quick client-side what-if (logistic curve replication)
function simulateProb(r, delta) {
  const proj = r.projection;
  if (!proj.mostLikely || r.yourComposite == null) return null;
  const newScore = r.yourComposite + delta;
  const margin = newScore - proj.mostLikely;
  const sigma  = proj.sigma;
  const k = 1.6 / sigma * (r.probability.seatFactor || 1);
  let p = 1 / (1 + Math.exp(-k * margin));
  p = Math.max(0.02, Math.min(0.98, p)) * 100;
  return Math.round(p * 10) / 10;
}

function DisclaimerCard() {
  return (
    <div className="card p-5 bg-gradient-to-br from-amber-50 to-white border-amber-200">
      <div className="flex gap-3 items-start">
        <div className="text-2xl">⚠️</div>
        <div className="text-sm text-amber-900">
          <b>Estimates only.</b> Projections are based on real CUET 2025 + 2026 data trends and DU 2025-26 Round 1 cutoffs.
          Actual 2026 cutoffs depend on who applies, preference orders, withdrawals, and DU/CSAS policy changes.
          Use this as a guide — not a guarantee. Always verify with the official DU Bulletin of Information.
        </div>
      </div>
    </div>
  );
}
