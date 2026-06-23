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
  const dream = payload.dreamProgramId ? results.find(r => r.id === Number(payload.dreamProgramId)) : null;

  return (
    <div className="space-y-10 animate-in">
      <ResultsHero name={payload.name} category={payload.category} totalEligible={results.length} persisted={response?.persisted} />

      {dream && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-300 to-amber-500" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-700">★ Your dream college</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-300 to-amber-500" />
          </div>
          <DreamCard r={dream} />
        </section>
      )}

      <AllResults results={results} dreamId={dream?.id} />

      <DisclaimerCard />
    </div>
  );
}

/* ============= HERO ============= */
function ResultsHero({ name, category, totalEligible, persisted }) {
  const router = useRouter();
  const firstName = (name || '').split(' ')[0] || 'student';
  return (
    <div className="card p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-200 to-fuchsia-200 blur-3xl opacity-50 -translate-y-12 translate-x-12" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Predictions for</div>
          <div className="font-display text-3xl sm:text-5xl text-slate-900 leading-none mt-1">
            {name || 'You'}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <span className="badge badge-good">{category}</span>
            <span className="text-sm text-slate-600">{totalEligible.toLocaleString()} eligible programs · ranked by probability</span>
            {persisted && <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">● saved</span>}
          </div>
        </div>
        <button onClick={() => router.push('/')} className="btn-ghost px-4 py-2 text-sm">
          ← Edit my scores
        </button>
      </div>
    </div>
  );
}

/* ============= DREAM (hero card) ============= */
function DreamCard({ r }) {
  const p = r.probability.p ?? 0;
  const tone = r.probability.verdict?.tone || 'unknown';
  return (
    <div className="card-solid border-2 border-amber-300 shadow-[0_24px_60px_-20px_rgba(245,158,11,0.35)] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="font-display text-2xl sm:text-3xl text-slate-900 leading-tight">{r.college}</div>
          <div className="text-sm sm:text-base text-slate-600 mt-0.5">{r.program}</div>
          <div className="mt-2 text-[11px] text-slate-500">
            Formula · <span className="font-mono">{r.formula.desc}</span>
          </div>
        </div>
        <Verdict tone={tone} label={r.probability.verdict?.label} emoji={r.probability.verdict?.emoji} big />
      </div>

      {/* Probability mega-display */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-end">
        <div>
          <div className="text-xs text-slate-500 mb-1">Admission probability</div>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-7xl sm:text-8xl text-slate-900 leading-none tabular-nums">
              {r.probability.p == null ? '—' : Math.round(r.probability.p)}
            </div>
            <div className="text-3xl text-slate-400 font-light">%</div>
          </div>
          <div className={`bar bar-${toneToBar(tone)} mt-3`}>
            <div style={{ width: `${p}%` }} />
          </div>
        </div>
        <div className="text-right space-y-1.5 text-xs text-slate-500">
          <div>Confidence in this prediction:</div>
          <div className="text-2xl text-slate-900 font-semibold tabular-nums">{r.projection.confidence}%</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <BigStat label="Your composite" value={r.yourComposite?.toFixed(2)} sub={`of ${r.outOf}`} />
        <BigStat label="2026 most likely" value={r.projection.mostLikely?.toFixed(0)} sub={`± ${r.projection.sigma?.toFixed(0)}`} />
        <BigStat label="Margin" value={(r.probability.margin >= 0 ? '+' : '') + r.probability.margin?.toFixed(1)}
                 sub={r.probability.margin >= 0 ? 'above cutoff' : 'below cutoff'} positive={r.probability.margin >= 0} />
      </div>

      {/* Projection band */}
      <ProjectionRow r={r} />
      <FactorReveal r={r} />
    </div>
  );
}

/* ============= LIST ============= */
function AllResults({ results, dreamId }) {
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('PROB');
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    let arr = results.filter(r => r.id !== dreamId);
    if (filter === 'SAFE')  arr = arr.filter(r => (r.probability.p ?? 0) >= 75);
    if (filter === 'MID')   arr = arr.filter(r => { const p = r.probability.p ?? -1; return p >= 50 && p < 75; });
    if (filter === 'RISKY') arr = arr.filter(r => (r.probability.p ?? 0) < 50);
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
    <section className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3 items-end">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl text-slate-900">All eligible programs</h2>
          <p className="text-sm text-slate-500 mt-1">{items.length.toLocaleString()} programs · sorted by your admission probability</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search college / course…" className="field !py-2 text-sm w-56" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="field !py-2 text-sm">
            <option value="ALL">All chances</option>
            <option value="SAFE">🟢 Safe (≥75%)</option>
            <option value="MID">🟡 Moderate (50–75%)</option>
            <option value="RISKY">🔴 Risky (&lt;50%)</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="field !py-2 text-sm">
            <option value="PROB">Sort: Probability</option>
            <option value="NAME">Sort: Name</option>
            <option value="SCORE">Sort: Composite</option>
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card-solid p-10 text-center text-slate-500">No programs match this filter.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((r, i) => <ResultCard key={r.id} r={r} idx={i} />)}
        </div>
      )}
    </section>
  );
}

/* ============= SINGLE CARD ============= */
function ResultCard({ r, idx }) {
  const [whatIf, setWhatIf] = useState(0);
  const p = r.probability.p ?? 0;
  const tone = r.probability.verdict?.tone || 'unknown';
  const simP = simulate(r, whatIf);

  return (
    <div className="card-solid p-5 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">#{idx + 1}</div>
          <div className="font-semibold text-slate-900 leading-tight">{r.college}</div>
          <div className="text-sm text-slate-600 leading-tight mt-0.5">{r.program}</div>
        </div>
        <Verdict tone={tone} label={r.probability.verdict?.label} emoji={r.probability.verdict?.emoji} />
      </div>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex items-end justify-between text-xs text-slate-500 mb-1">
          <span>Admission probability</span>
          <span className="text-xl font-bold text-slate-900 tabular-nums">{r.probability.p == null ? '—' : `${r.probability.p}%`}</span>
        </div>
        <div className={`bar bar-${toneToBar(tone)}`}><div style={{ width: `${p}%` }} /></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <SmallStat label="Your composite" value={r.yourComposite?.toFixed(2)} sub={`/${r.outOf}`} />
        <SmallStat label="Cutoff (mid)" value={r.projection.mostLikely?.toFixed(0)} sub={`±${r.projection.sigma?.toFixed(0)}`} />
        <SmallStat label="Margin" value={(r.probability.margin >= 0 ? '+' : '') + r.probability.margin?.toFixed(1)} positive={r.probability.margin >= 0} />
      </div>

      <ProjectionRow r={r} compact />

      {/* What-if */}
      <div className="mt-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">What-if: {whatIf >= 0 ? '+' : ''}{whatIf} marks</span>
          <span className="font-semibold text-slate-900 tabular-nums">→ {simP == null ? '—' : `${simP}%`}</span>
        </div>
        <input type="range" min="-50" max="100" step="1" value={whatIf} onChange={(e) => setWhatIf(Number(e.target.value))} className="w-full mt-1" />
      </div>

      <FactorReveal r={r} />
    </div>
  );
}

/* ============= REUSABLE BITS ============= */
function ProjectionRow({ r, compact }) {
  const proj = r.projection;
  return (
    <div className={`rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-3 ${compact ? 'text-[11px]' : 'text-xs'} mt-3 space-y-1`}>
      <Row label="Conservative" v={proj.conservative?.toFixed(1)} />
      <Row label="Most likely" v={proj.mostLikely?.toFixed(1)} bold accent />
      <Row label="Aggressive" v={proj.aggressive?.toFixed(1)} />
      <div className="h-px bg-slate-200 my-1.5" />
      <Row label={`2025 actual cutoff (${r.category})`} v={r.cutoff2025?.toFixed(1)} muted />
      <Row label="Prediction confidence" v={`${proj.confidence}%`} muted />
      {proj.tier && proj.tier !== 'general' && (
        <Row label="Selectivity tier" v={proj.tier === 'top-elite' ? '🏆 Top elite' : '⭐ Elite'} muted />
      )}
    </div>
  );
}
function Row({ label, v, bold, accent, muted }) {
  return (
    <div className={`flex justify-between ${muted ? 'text-slate-500' : ''}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${accent ? 'text-indigo-700' : 'text-slate-900'}`}>{v ?? '—'}</span>
    </div>
  );
}

function FactorReveal({ r }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        className="mt-3 text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
        {open ? '▾' : '▸'} How was this calculated?
      </button>
      {open && (
        <div className="mt-2 text-xs text-slate-600 space-y-2.5 border-l-2 border-indigo-200 pl-3">
          <div>
            <div className="font-semibold text-slate-800 mb-1">Composite breakdown</div>
            <ul className="space-y-0.5">
              {r.breakdown.map((b, i) => (
                <li key={i} className="flex justify-between tabular-nums">
                  <span className="font-mono text-slate-500">{b.code}</span>
                  <span className="text-slate-700">{b.role}</span>
                  <span className="font-medium text-slate-900">{b.score.toFixed(2)}</span>
                </li>
              ))}
              <li className="flex justify-between tabular-nums border-t border-slate-200 mt-1 pt-1 font-bold">
                <span>Composite</span><span></span><span>{r.yourComposite?.toFixed(2)}</span>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-slate-800 mb-1">Cutoff factor contributions</div>
            <ul className="space-y-1.5">
              {r.projection.factors.map((f, i) => (
                <li key={i} className="text-slate-600">
                  <div className="flex justify-between items-baseline gap-2">
                    <span><b className="text-slate-800">{f.id}</b> · {f.name}</span>
                    <span className="font-mono whitespace-nowrap text-slate-800">
                      {f.contribution > 0 ? '+' : ''}{f.contribution?.toFixed(2) ?? '0'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{f.note}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-slate-500">
            Composite percentile ≈ <b className="text-slate-700">{r.percentile}%ile</b> ·
            Logistic steepness k = <span className="font-mono">{r.probability.k}</span> ·
            Seats considered = {r.probability.seatsConsidered ?? 'n/a'}
          </div>
        </div>
      )}
    </>
  );
}

function Verdict({ tone, label, emoji, big }) {
  return (
    <div className={`badge badge-${tone} ${big ? '!text-sm !px-3 !py-1.5' : ''}`}>
      <span>{emoji}</span><span>{label}</span>
    </div>
  );
}

function BigStat({ label, value, sub, positive }) {
  return (
    <div className="rounded-xl bg-slate-50/60 border border-slate-200/70 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${positive === false ? 'text-rose-700' : positive ? 'text-emerald-700' : 'text-slate-900'}`}>
        {value ?? '—'}
      </div>
      <div className="text-[10px] text-slate-400">{sub}</div>
    </div>
  );
}
function SmallStat({ label, value, sub, positive }) {
  return (
    <div className="rounded-lg bg-slate-50/80 border border-slate-200/70 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${positive === false ? 'text-rose-700' : positive ? 'text-emerald-700' : 'text-slate-900'}`}>
        {value ?? '—'}
      </div>
      {sub && <div className="text-[9px] text-slate-400">{sub}</div>}
    </div>
  );
}

function simulate(r, delta) {
  const proj = r.projection;
  if (!proj.mostLikely || r.yourComposite == null) return null;
  const newScore = r.yourComposite + delta;
  const margin = newScore - proj.mostLikely;
  const sigma = proj.sigma;
  const k = 2.0 / sigma;
  const seats = r.probability.seatsConsidered;
  let kAdj = k;
  if (seats && seats > 0) {
    const seatAdj = Math.sqrt(40 / Math.max(seats, 5));
    kAdj *= Math.max(0.8, Math.min(1.6, seatAdj));
  }
  let p = 1 / (1 + Math.exp(-kAdj * margin));
  p = Math.max(0.01, Math.min(0.99, p)) * 100;
  return Math.round(p * 10) / 10;
}

function toneToBar(t) {
  return { safe: 'safe', good: 'good', mid: 'mid', risk: 'risk', reach: 'reach' }[t] || 'good';
}

function DisclaimerCard() {
  return (
    <div className="card p-5 bg-gradient-to-br from-amber-50/60 to-white border-amber-200">
      <div className="flex gap-3 items-start">
        <div className="text-2xl">⚠️</div>
        <div className="text-sm text-amber-900">
          <b>Statistical estimates only.</b> Projections come from real CUET 2025/2026 NTA data + DU 2025-26 Round 1 cutoffs. Actual 2026 cutoffs depend on who applies, preference orders, withdrawals, and DU/CSAS policy.
          Use as guidance — verify with the official DU Bulletin of Information.
        </div>
      </div>
    </div>
  );
}
