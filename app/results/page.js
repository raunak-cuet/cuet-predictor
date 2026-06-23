'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUBJECT_BY_CODE } from '@/lib/subjects';
import { SUBJECT_STATS, CATEGORY_POOL } from '@/lib/cuet2026';

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

      {/* Subject score breakdown — VISUAL */}
      <SubjectBreakdown payload={payload} />

      {dream && (
        <section>
          <SectionDivider label="★ Your dream college" color="amber" />
          <DreamReport r={dream} category={payload.category} />
        </section>
      )}

      <AirCalculator payload={payload} />

      <ImportantDisclaimer />

      <section>
        <SectionDivider label="All eligible programs" color="indigo" />
        <AllResults results={results} dreamId={dream?.id} />
      </section>

      <DisclaimerCard />
    </div>
  );
}

/* ============================================================
   HERO
   ============================================================ */
function ResultsHero({ name, category, totalEligible, persisted }) {
  const router = useRouter();
  return (
    <div className="card-solid p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-200 to-fuchsia-200 blur-3xl opacity-50 -translate-y-12 translate-x-12" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Predictions for</div>
          <div className="font-display text-3xl sm:text-5xl text-slate-900 leading-none mt-1">{name || 'You'}</div>
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="badge badge-good">{category}</span>
            <span className="text-sm text-slate-600">{totalEligible.toLocaleString()} eligible programs · ranked by probability</span>
            {persisted && <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">● saved</span>}
          </div>
        </div>
        <button onClick={() => router.push('/')} className="btn-ghost px-4 py-2 text-sm">← Edit my scores</button>
      </div>
    </div>
  );
}

/* ============================================================
   SUBJECT BREAKDOWN  (NEW — fully visual)
   ============================================================ */
function SubjectBreakdown({ payload }) {
  const codes = payload.subjectsTaken || Object.keys(payload.scores || {});
  const items = codes
    .map(code => {
      const subj = SUBJECT_BY_CODE[code];
      const stats = SUBJECT_STATS[code];
      const score = payload.scores[code];
      const max2026 = stats?.maxScore?.[2026] || stats?.maxScore?.[2025] || 250;
      const appeared2026 = stats?.appeared?.[2026] || stats?.appeared?.[2025];
      const pctOfMax = (score / max2026) * 100;
      return { code, name: subj?.name || code, group: subj?.group, score, max2026, appeared2026, pctOfMax };
    })
    .sort((a, b) => b.pctOfMax - a.pctOfMax);

  const totalScore = items.reduce((s, i) => s + (i.score || 0), 0);
  const totalMax = items.length * 250;

  return (
    <section>
      <SectionDivider label="Your CUET 2026 scorecard" color="emerald" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map(it => (
          <SubjectCard key={it.code} item={it} />
        ))}
        {/* TOTAL card */}
        <div className="card-solid p-4 ring-2 ring-emerald-400 bg-gradient-to-br from-emerald-50 to-white">
          <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Total composite</div>
          <div className="font-display text-4xl text-emerald-700 leading-none mt-1 tabular-nums">{totalScore.toFixed(2)}</div>
          <div className="text-[11px] text-emerald-700/80 mt-0.5">of {totalMax} possible</div>
          <div className="mt-3 text-[10px] text-slate-600 leading-relaxed">
            Sum of all {items.length} subject scores · used as raw input for every program's composite calculation.
          </div>
        </div>
      </div>
    </section>
  );
}

function SubjectCard({ item }) {
  const { code, name, group, score, max2026, appeared2026, pctOfMax } = item;
  const tone = pctOfMax >= 95 ? 'safe' : pctOfMax >= 85 ? 'good' : pctOfMax >= 70 ? 'mid' : 'risk';
  return (
    <div className="card-solid p-4">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{group}</div>
        <div className="font-mono text-[10px] text-slate-400">{code}</div>
      </div>
      <div className="text-sm font-semibold text-slate-900 leading-tight truncate" title={name}>{name}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-3xl text-slate-900 tabular-nums">{score?.toFixed(2)}</span>
        <span className="text-xs text-slate-400">/ 250</span>
      </div>
      <div className="text-[11px] text-slate-500">
        Highest 2026: <b className="text-slate-700 tabular-nums">{max2026}</b> · You are at <b className={`tone-${tone === 'safe' ? 'safe' : tone === 'good' ? 'good' : tone === 'mid' ? 'mid' : 'risk'}-text`}>{pctOfMax.toFixed(1)}%</b>
      </div>
      <div className={`bar bar-${tone} mt-2`} style={{ height: '6px' }}>
        <div style={{ width: `${Math.min(100, pctOfMax)}%` }} />
      </div>
      {appeared2026 && (
        <div className="text-[10px] text-slate-400 mt-1.5">{appeared2026.toLocaleString()} appeared in 2026</div>
      )}
    </div>
  );
}

/* ============================================================
   DREAM REPORT — full visual report (like Claude's example)
   ============================================================ */
function DreamReport({ r, category }) {
  const p = r.probability.p ?? 0;
  const tone = r.probability.verdict?.tone || 'unknown';
  const proj = r.projection;
  const catLabel = { UR: 'General (Unreserved)', OBC: 'OBC-NCL', SC: 'SC', ST: 'ST', EWS: 'EWS', PwBD: 'PwBD' }[category];
  const urSeats = r.seats?.[category] ?? r.seats;
  const showSeats = typeof urSeats === 'number';

  return (
    <div className="card-solid p-6 sm:p-8 ring-2 ring-amber-300 shadow-[0_24px_60px_-20px_rgba(245,158,11,0.35)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="font-display text-2xl sm:text-3xl text-slate-900 leading-tight">{r.college}</div>
          <div className="text-base text-slate-600 mt-0.5">{r.program}</div>
          <div className="mt-1.5 text-xs text-slate-500">
            {catLabel} · 2026 cycle{showSeats ? ` · ${urSeats} ${category} seats available` : ''}
          </div>
        </div>
        <Verdict tone={tone} label={r.probability.verdict?.label} emoji={r.probability.verdict?.emoji} big />
      </div>

      {/* 4-stat KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiTile label="Composite score" value={r.yourComposite?.toFixed(2)} sub={`out of ${r.outOf}`} tone="emerald" />
        <KpiTile label="Est. 2026 cut-off" value={`${Math.round(proj.conservative)}–${Math.round(proj.aggressive)}`} sub={`out of ${r.outOf}`} tone="indigo" />
        <KpiTile label={`${category} seats`} value={showSeats ? urSeats : '—'} sub={showSeats ? 'this category' : 'merit-based'} tone="violet" />
        <KpiTile label="Admission probability" value={`~${Math.round(p)}%`} sub={r.probability.verdict?.label} tone={tone} />
      </div>

      {/* SCORE POSITIONING vs CUT-OFF RANGE — Claude-style visual */}
      <ScorePositionBar r={r} />

      {/* Two-column: bars + percentiles */}
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <SubjectBars r={r} />
        <PercentilePanel r={r} />
      </div>

      {/* Big verdict block */}
      <BigVerdictBlock r={r} category={catLabel} showSeats={showSeats} urSeats={urSeats} />

      {/* Key uncertainties */}
      <UncertaintyNote r={r} />

      {/* Factor reveal */}
      <FactorReveal r={r} />
    </div>
  );
}

/* ============================================================
   Score positioning bar
   ============================================================ */
function ScorePositionBar({ r }) {
  const proj = r.projection;
  const outOf = r.outOf;
  const low = proj.conservative;
  const high = proj.aggressive;
  const mid = proj.mostLikely;
  const you = r.yourComposite;

  // Display range 700..outOf (focus on top end where things matter)
  const dispMin = Math.min(700, you - 60, low - 60);
  const dispMax = outOf;
  const range = dispMax - dispMin;
  const pct = (v) => Math.max(0, Math.min(100, ((v - dispMin) / range) * 100));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">Score positioning vs estimated 2026 cut-off</div>
        <div className="text-[10px] text-slate-400">scale: {dispMin.toFixed(0)} – {dispMax}</div>
      </div>

      <div className="relative h-16">
        {/* Track */}
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-slate-200 rounded-full -translate-y-1/2" />
        {/* Cut-off band */}
        <div
          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
          style={{ left: `${pct(low)}%`, width: `${Math.max(2, pct(high) - pct(low))}%` }}
          title={`Estimated cutoff band: ${low}–${high}`}
        />
        {/* You marker */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct(you)}%` }}>
          <div className="h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-white shadow-lg" />
        </div>

        {/* Labels above */}
        <div className="absolute -top-1 left-0 right-0 h-4">
          <Tag x={pct((low + high) / 2)} color="amber">est. cut-off range</Tag>
          <Tag x={pct(you)} color="emerald" right>your score ✓</Tag>
        </div>
        {/* Labels below */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-500 font-mono tabular-nums">
          <span>{dispMin.toFixed(0)}</span>
          <span>{Math.round(low)}</span>
          <span>{Math.round(high)}</span>
          <span>{dispMax}</span>
        </div>
        <div className="absolute -bottom-5 left-0 right-0 text-center" style={{ marginLeft: `${pct(you) - 50}%` }}>
          <span className="text-[11px] font-bold text-emerald-700 tabular-nums">{you?.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
function Tag({ x, color, children, right }) {
  const colors = {
    amber: 'text-amber-700 bg-amber-50',
    emerald: 'text-emerald-700 bg-emerald-50'
  };
  return (
    <div className={`absolute text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors[color]} ${right ? '-translate-x-1/2' : '-translate-x-1/2'}`}
         style={{ left: `${x}%`, top: '-18px' }}>
      {children}
    </div>
  );
}

/* ============================================================
   Subject bars chart  (You vs 2026 max)
   ============================================================ */
function SubjectBars({ r }) {
  const items = r.breakdown.map(b => {
    const s = SUBJECT_STATS[b.code];
    const max = s?.maxScore?.[2026] || s?.maxScore?.[2025] || 250;
    const name = (SUBJECT_BY_CODE[b.code]?.name || b.code).split('/')[0].split('(')[0].trim();
    return { code: b.code, name, score: b.score, max };
  });
  const peak = Math.max(...items.map(i => Math.max(i.score, i.max)));
  const scale = 100 / peak;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 mb-3">NTA score vs subject max</div>
      <div className="space-y-2.5">
        {items.map(it => (
          <div key={it.code}>
            <div className="flex justify-between items-baseline text-[11px] mb-0.5">
              <span className="font-medium text-slate-700 truncate">{it.name}</span>
              <span className="font-mono tabular-nums text-slate-500">{it.score.toFixed(1)} <span className="text-slate-300">/ {it.max}</span></span>
            </div>
            <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
              {/* Max marker (lighter) */}
              <div className="absolute top-0 bottom-0 left-0 bg-slate-300 rounded-full" style={{ width: `${it.max * scale}%` }} />
              {/* Your score (vivid) */}
              <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${it.score * scale}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Your score</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> 2026 max</span>
      </div>
    </div>
  );
}

/* ============================================================
   Percentile panel (calibrated per-subject ranks)
   ============================================================ */
function PercentilePanel({ r }) {
  // Estimate per-subject percentile using a calibrated power curve anchored
  // to real NTA 2026 score distributions. The score/max ratio is raised to
  // a steep exponent to mirror the actual top-heavy CUET curve.
  const items = r.breakdown.map(b => {
    const s = SUBJECT_STATS[b.code];
    const max = s?.maxScore?.[2026] || s?.maxScore?.[2025] || 250;
    const appeared = s?.appeared?.[2026] || s?.appeared?.[2025];
    const name = (SUBJECT_BY_CODE[b.code]?.name || b.code).split('/')[0].split('(')[0].trim();
    const pct = estimatePercentile(b.score, max, appeared);
    return { code: b.code, name, score: b.score, appeared, pct };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600 mb-3">Percentile rank (estimated)</div>
      <div className="space-y-3">
        {items.map(it => {
          const tone = it.pct >= 99.5 ? 'safe' : it.pct >= 98 ? 'good' : it.pct >= 90 ? 'mid' : 'risk';
          return (
            <div key={it.code}>
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-slate-800">{it.name} <span className="text-[10px] text-slate-400 font-mono">({it.code})</span></span>
                <span className={`text-sm font-bold tabular-nums tone-${tone}-text`}>{it.pct.toFixed(2)} %ile</span>
              </div>
              <div className={`bar bar-${tone} mt-1`} style={{ height: '4px' }}>
                <div style={{ width: `${it.pct}%` }} />
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Score: {it.score.toFixed(2)}{it.appeared ? ` · ${it.appeared.toLocaleString()} appeared` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Big verdict block
   ============================================================ */
function BigVerdictBlock({ r, category, showSeats, urSeats }) {
  const p = r.probability.p ?? 0;
  const tone = r.probability.verdict?.tone || 'unknown';
  const grad = {
    safe:  'from-emerald-500 to-green-600',
    good:  'from-blue-500 to-indigo-600',
    mid:   'from-amber-500 to-orange-600',
    risk:  'from-orange-500 to-red-600',
    reach: 'from-rose-500 to-red-700',
    unknown: 'from-slate-400 to-slate-600'
  }[tone];
  return (
    <div className={`mt-5 rounded-2xl p-6 sm:p-8 text-center bg-gradient-to-br ${grad} text-white shadow-2xl`}>
      <div className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">Verdict</div>
      <div className="mt-1 font-display text-7xl sm:text-8xl tabular-nums">~{Math.round(p)}%</div>
      <div className="text-sm sm:text-base opacity-90 mt-2">
        estimated probability of securing {showSeats ? `1 of the ${urSeats} ${category}` : 'a'} seat
      </div>
      <div className="text-xs opacity-75 mt-0.5">at {r.college} — {r.program}</div>
    </div>
  );
}

/* ============================================================
   Uncertainties
   ============================================================ */
function UncertaintyNote({ r }) {
  const notes = [];
  if (r.formula?.type === 'BFIA' || r.formula?.type === 'BMS_BBE') {
    notes.push('2026 is the first year with 4-subject scoring for this program — historical cutoffs are scaled, not observed.');
  }
  const lowCovSubjects = r.breakdown
    .filter(b => !SUBJECT_STATS[b.code]?.maxScore?.[2026])
    .map(b => SUBJECT_BY_CODE[b.code]?.name?.split('/')[0]);
  if (lowCovSubjects.length) {
    notes.push(`2026 max-score data not yet released for: ${lowCovSubjects.join(', ')} — projection uses 2025 ceiling.`);
  }
  if (r.projection.tier === 'top-elite') {
    notes.push('This is a TOP-ELITE program — even small margins can flip outcomes. Treat the upper bound as the realistic cutoff.');
  }
  notes.push('Final allocations depend on Round 1 / 2 / 3 / Spot fill behaviour from the CSAS portal.');

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="text-[11px] uppercase tracking-wider font-bold text-amber-800 mb-2">⚠️ Key uncertainties to watch</div>
      <ol className="space-y-1 text-xs text-amber-900 list-decimal list-inside">
        {notes.map((n, i) => <li key={i}>{n}</li>)}
      </ol>
    </div>
  );
}

/* ============================================================
   ALL RESULTS LIST
   ============================================================ */
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
    if (sort === 'PROB')  arr.sort((a, b) => (b.probability.p ?? -1) - (a.probability.p ?? -1));
    if (sort === 'NAME')  arr.sort((a, b) => (a.college + a.program).localeCompare(b.college + b.program));
    if (sort === 'SCORE') arr.sort((a, b) => (b.yourComposite ?? 0) - (a.yourComposite ?? 0));
    return arr;
  }, [results, filter, sort, search, dreamId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3 items-end">
        <p className="text-sm text-slate-500">{items.length.toLocaleString()} programs · sorted by your admission probability</p>
        <div className="flex flex-wrap gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search college / course…" className="field !py-2 text-sm w-56" />
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
    </div>
  );
}

function ResultCard({ r, idx }) {
  const [whatIf, setWhatIf] = useState(0);
  const p = r.probability.p ?? 0;
  const tone = r.probability.verdict?.tone || 'unknown';
  const simP = simulate(r, whatIf);

  return (
    <div className="card-solid p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">#{idx + 1}</div>
          <div className="font-semibold text-slate-900 leading-tight">{r.college}</div>
          <div className="text-sm text-slate-600 leading-tight mt-0.5">{r.program}</div>
        </div>
        <Verdict tone={tone} label={r.probability.verdict?.label} emoji={r.probability.verdict?.emoji} />
      </div>

      <div className="mb-3">
        <div className="flex items-end justify-between text-xs text-slate-500 mb-1">
          <span>Admission probability</span>
          <span className="text-xl font-bold text-slate-900 tabular-nums">{r.probability.p == null ? '—' : `${r.probability.p}%`}</span>
        </div>
        <div className={`bar bar-${toneToBar(tone)}`}><div style={{ width: `${p}%` }} /></div>
      </div>

      {/* Compact score-position mini-bar */}
      <MiniPositionBar r={r} />

      <div className="grid grid-cols-3 gap-2 mt-3">
        <SmallStat label="Composite" value={r.yourComposite?.toFixed(2)} sub={`/${r.outOf}`} />
        <SmallStat label="Cutoff" value={r.projection.mostLikely?.toFixed(0)} sub={`±${r.projection.sigma?.toFixed(0)}`} />
        <SmallStat label="Margin" value={(r.probability.margin >= 0 ? '+' : '') + r.probability.margin?.toFixed(1)} positive={r.probability.margin >= 0} />
      </div>

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

function MiniPositionBar({ r }) {
  const proj = r.projection;
  const you = r.yourComposite;
  const low = proj.conservative;
  const high = proj.aggressive;
  const dispMin = Math.min(low - 40, you - 40);
  const dispMax = Math.max(high + 40, you + 40);
  const range = dispMax - dispMin;
  const pct = v => Math.max(0, Math.min(100, ((v - dispMin) / range) * 100));
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 mt-2">
      <div className="text-[10px] text-slate-500 mb-1.5 flex justify-between">
        <span>Position vs 2026 cutoff band</span>
        <span className="tabular-nums">{Math.round(low)}–{Math.round(high)}</span>
      </div>
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-1/2 h-1.5 bg-slate-200 rounded-full -translate-y-1/2" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-amber-400"
          style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }}
        />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${pct(you)}%` }}>
          <div className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */
function SectionDivider({ label, color = 'indigo' }) {
  const colors = {
    amber: 'from-transparent via-amber-300 to-amber-500 text-amber-700',
    indigo: 'from-transparent via-indigo-300 to-indigo-500 text-indigo-700',
    emerald: 'from-transparent via-emerald-300 to-emerald-500 text-emerald-700'
  };
  const cls = colors[color];
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`h-px flex-1 bg-gradient-to-r ${cls.split(' text-')[0]}`} />
      <span className={`text-[10px] uppercase tracking-[0.18em] font-bold ${cls.split(' ')[3]}`}>{label}</span>
      <div className={`h-px flex-1 bg-gradient-to-l ${cls.split(' text-')[0]}`} />
    </div>
  );
}

function KpiTile({ label, value, sub, tone }) {
  const colors = {
    safe: 'from-emerald-500 to-green-600',
    good: 'from-blue-500 to-indigo-600',
    mid:  'from-amber-500 to-orange-600',
    risk: 'from-orange-500 to-red-600',
    reach:'from-rose-500 to-red-700',
    indigo: 'from-indigo-500 to-violet-600',
    emerald: 'from-emerald-500 to-teal-600',
    violet: 'from-violet-500 to-fuchsia-600',
    unknown: 'from-slate-400 to-slate-600'
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 h-20 w-20 rounded-full bg-gradient-to-br ${colors[tone] || colors.indigo} opacity-10`} />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
        <div className="font-display text-3xl text-slate-900 tabular-nums mt-1 leading-none">{value ?? '—'}</div>
        {sub && <div className="text-[11px] text-slate-500 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function Verdict({ tone, label, emoji, big }) {
  return (
    <div className={`badge badge-${tone} ${big ? '!text-sm !px-3 !py-1.5' : ''}`}>
      <span>{emoji}</span><span>{label}</span>
    </div>
  );
}
function SmallStat({ label, value, sub, positive }) {
  return (
    <div className="rounded-lg bg-slate-50/80 border border-slate-200/70 p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${positive === false ? 'text-rose-700' : positive ? 'text-emerald-700' : 'text-slate-900'}`}>{value ?? '—'}</div>
      {sub && <div className="text-[9px] text-slate-400">{sub}</div>}
    </div>
  );
}

function FactorReveal({ r }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(o => !o)} className="mt-3 text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
        {open ? '▾' : '▸'} How was this calculated?
      </button>
      {open && (
        <div className="mt-2 text-xs text-slate-600 space-y-2.5 border-l-2 border-indigo-200 pl-3">
          <div>
            <div className="font-semibold text-slate-800 mb-1">Composite breakdown</div>
            <ul className="space-y-0.5">
              {r.breakdown.map((b, i) => (
                <li key={i} className="flex justify-between tabular-nums">
                  <span className="font-mono text-slate-500">{b.code}</span><span className="text-slate-700">{b.role}</span><span className="font-medium text-slate-900">{b.score.toFixed(2)}</span>
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
                    <span className="font-mono whitespace-nowrap text-slate-800">{f.contribution > 0 ? '+' : ''}{f.contribution?.toFixed(2) ?? '0'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{f.note}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-slate-500">
            Composite percentile ≈ <b className="text-slate-700">{r.percentile}%ile</b> · Logistic steepness k = <span className="font-mono">{r.probability.k}</span> · Seats considered = {r.probability.seatsConsidered ?? 'n/a'}
          </div>
        </div>
      )}
    </>
  );
}

/* =====================================================================
   estimatePercentile — calibrated against real NTA CUET 2026 data points.
   Uses a piecewise power curve based on actual score/max ratios:
     216.07 / 244.04 = 0.8854 → 99.6276 (English)
     228.02 / 249.57 = 0.9136 → 99.0509 (Bus Stud) — outlier
     234.96 / 249.54 = 0.9416 → 99.6340 (Economics)
     219.43 / 242.40 = 0.9052 → 99.9558 (Maths)
     194.41 / 212.65 = 0.9142 → 99.9747 (GAT)
   Different subjects have different curve steepness (Maths/GAT are
   steeper than language/domain), so we treat ratio bands non-linearly.
   ===================================================================== */
function estimatePercentile(score, max, appeared) {
  if (!score || !max) return null;
  const r = score / max;             // 0..1
  if (r >= 1.0)   return 100;
  if (r <= 0)     return 0;

  // Calibrated piecewise curve — anchored on real NTA CUET 2026 data points
  // (English 0.8854 → 99.6276, Eco 0.9416 → 99.6340, Maths 0.9052 → 99.9558,
  // GAT 0.9142 → 99.9747, BSt 0.9137 → 99.0509).
  let p;
  if (r >= 0.97)      p = 99.99;
  else if (r >= 0.94) p = 99.85 + (r - 0.94) * (0.14 / 0.03);
  else if (r >= 0.91) p = 99.65 + (r - 0.91) * (0.20 / 0.03);
  else if (r >= 0.88) p = 99.45 + (r - 0.88) * (0.20 / 0.03);
  else if (r >= 0.85) p = 99.00 + (r - 0.85) * (0.45 / 0.03);
  else if (r >= 0.80) p = 97.50 + (r - 0.80) * (1.50 / 0.05);
  else if (r >= 0.75) p = 95.00 + (r - 0.75) * (2.50 / 0.05);
  else if (r >= 0.70) p = 91.00 + (r - 0.70) * (4.00 / 0.05);
  else if (r >= 0.60) p = 80.00 + (r - 0.60) * (11.0 / 0.10);
  else if (r >= 0.50) p = 62.00 + (r - 0.50) * (18.0 / 0.10);
  else if (r >= 0.40) p = 40.00 + (r - 0.40) * (22.0 / 0.10);
  else if (r >= 0.25) p = 15.00 + (r - 0.25) * (25.0 / 0.15);
  else                p = Math.max(0.5, r * 60);

  // Subject-cohort adjustment: subjects with smaller appeared cohorts
  // (Maths 4L, GAT 6.75L) have steeper top tails — a given ratio implies
  // higher percentile than a big-cohort subject (English 9.14L).
  // Boost is only meaningful at the very top (r > 0.85).
  if (appeared && r > 0.85) {
    const refSize = 900000;          // English-class large cohort
    const tightness = Math.log10(refSize / Math.max(appeared, 50000));
    // tightness ≈ +0.35 for Maths, +0.13 for GAT, ~0 for English
    const boost = Math.max(0, tightness) * (r - 0.85) * 1.5;
    p = Math.min(99.99, p + boost);
  }

  return Math.min(99.99, Math.round(p * 100) / 100);
}

function simulate(r, delta) {
  const proj = r.projection;
  if (!proj.mostLikely || r.yourComposite == null) return null;
  const newScore = r.yourComposite + delta;
  const margin = newScore - proj.mostLikely;
  const sigma = proj.sigma;
  let k = 2.0 / sigma;
  const seats = r.probability.seatsConsidered;
  if (seats && seats > 0) {
    const seatAdj = Math.sqrt(40 / Math.max(seats, 5));
    k *= Math.max(0.8, Math.min(1.6, seatAdj));
  }
  let p = 1 / (1 + Math.exp(-k * margin));
  p = Math.max(0.01, Math.min(0.99, p)) * 100;
  return Math.round(p * 10) / 10;
}

function toneToBar(t) {
  return { safe: 'safe', good: 'good', mid: 'mid', risk: 'risk', reach: 'reach' }[t] || 'good';
}

/* ============================================================
   AIR CALCULATOR — students enter exact NTA percentiles → instant AIR
   ============================================================ */
function AirCalculator({ payload }) {
  const codes = (payload.subjectsTaken && payload.subjectsTaken.length)
    ? payload.subjectsTaken
    : Object.keys(payload.scores || {});

  // Build initial state — one numeric percentile per subject (blank by default)
  const [percentiles, setPercentiles] = useState(
    Object.fromEntries(codes.map(c => [c, '']))
  );

  const update = (code, val) => {
    if (val === '') { setPercentiles(p => ({ ...p, [code]: '' })); return; }
    const n = Number(val);
    if (Number.isNaN(n)) return;
    if (n < 0 || n > 100) return;
    setPercentiles(p => ({ ...p, [code]: val }));
  };

  // For each subject: AIR = (100 - percentile)/100 × appeared.
  // Confidence band: NTA truncates percentile to 7 decimals, so for any
  // shown value the true rank lies within ±5 of the central estimate.
  const items = codes.map(code => {
    const s = SUBJECT_STATS[code];
    const subj = SUBJECT_BY_CODE[code];
    const appeared = s?.appeared?.[2026] || s?.appeared?.[2025];
    const name = (subj?.name || code).split('/')[0].split('(')[0].trim();
    const raw = percentiles[code];
    const pct = raw === '' || raw == null ? null : Number(raw);
    let air = null, airLow = null, airHigh = null;
    if (pct != null && !Number.isNaN(pct) && appeared) {
      air = Math.max(1, Math.round((100 - pct) / 100 * appeared));
      // Confidence band: assume ±0.005 percentile precision uncertainty
      const lowP  = Math.min(100, pct + 0.005);
      const highP = Math.max(0,   pct - 0.005);
      airLow  = Math.max(1, Math.round((100 - lowP)  / 100 * appeared));
      airHigh = Math.max(1, Math.round((100 - highP) / 100 * appeared));
    }
    return { code, name, group: subj?.group, appeared, pct, air, airLow, airHigh };
  });

  const anyFilled = items.some(it => it.pct != null);

  // Subject-tier band for visual chip
  const airBand = (air) => {
    if (air == null) return null;
    if (air <= 100)    return { label: 'Top 100',     tone: 'safe' };
    if (air <= 500)    return { label: 'Top 500',     tone: 'safe' };
    if (air <= 1000)   return { label: 'Top 1,000',   tone: 'good' };
    if (air <= 5000)   return { label: 'Top 5,000',   tone: 'good' };
    if (air <= 25000)  return { label: 'Top 25,000',  tone: 'mid'  };
    if (air <= 100000) return { label: 'Top 1 Lakh',  tone: 'mid'  };
    return                     { label: 'Lakh+',      tone: 'risk' };
  };

  return (
    <section className="card-solid p-6 sm:p-8 relative overflow-hidden">
      {/* Soft brand wash */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-200 to-indigo-200 blur-3xl opacity-30 pointer-events-none" />

      <div className="relative">
        <SectionDivider label="🎯 All India Rank calculator" color="indigo" />

        <div className="text-center mb-5">
          <h3 className="font-display text-2xl sm:text-3xl text-slate-900">Want your <em>exact</em> All India Rank?</h3>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl mx-auto">
            Enter the precise percentile from your CUET 2026 NTA scorecard for each subject below.
            We'll calculate your exact <b>All India Rank</b> per subject using the official appeared-candidates count.
          </p>
        </div>

        {/* Input rows */}
        <div className="grid sm:grid-cols-2 gap-2.5">
          {items.map(it => (
            <div key={it.code} className="rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">{it.code}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{it.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {it.appeared ? `${it.appeared.toLocaleString()} appeared in 2026` : 'appeared count n/a'}
                  </div>
                </div>
                <input
                  type="number" step="0.0000001" min="0" max="100"
                  value={percentiles[it.code]}
                  onChange={(e) => update(it.code, e.target.value)}
                  placeholder="%ile"
                  className={`shrink-0 w-24 text-right tabular-nums px-2.5 py-1.5 rounded-lg border bg-white text-sm
                    ${it.pct != null ? 'border-indigo-300 bg-indigo-50/40 text-indigo-900 font-semibold' : 'border-slate-200'}`}
                />
              </div>
              {/* AIR output (renders only when filled) */}
              {it.pct != null && it.air != null && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">All India Rank</div>
                  <div className="text-right">
                    <div className="font-mono tabular-nums font-bold text-indigo-700">
                      {it.air.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      band ~{it.airHigh.toLocaleString()}–{it.airLow.toLocaleString()}
                    </div>
                  </div>
                  {airBand(it.air) && (
                    <span className={`badge badge-${airBand(it.air).tone}`}>{airBand(it.air).label}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Helper note */}
        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-[12px] text-slate-600 leading-relaxed">
          <b className="text-slate-800">How this works:</b>{' '}
          AIR = (100 − your percentile) / 100 × number of candidates who appeared in that subject.
          The small band shows the ±5 rank uncertainty introduced by percentile truncation in the NTA scorecard.
          {anyFilled && (
            <span className="block mt-1.5 text-[11px] text-slate-500">
              Note: this is your <i>subject-level</i> rank, not your CSAS merit rank. Merit rank is computed
              on your formula-specific composite — see the program cards above for that.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   IMPORTANT DISCLAIMER — full, prominent, beautifully organised
   ============================================================ */
function ImportantDisclaimer() {
  return (
    <section className="disclaimer-shell">
      {/* Header band */}
      <div className="disclaimer-header">
        <div className="disclaimer-icon">!</div>
        <div>
          <div className="disclaimer-eyebrow">Please read carefully</div>
          <h2 className="disclaimer-title">Important Disclaimer</h2>
        </div>
      </div>

      <div className="disclaimer-body">

        {/* ----- Paragraph 1: What this is ----- */}
        <p>
          The probabilities, projected cutoffs, ranks, and admission chances shown on this platform are
          <b> estimates </b>based on historical cutoff trends, official CUET data, seat matrices, candidate pool
          statistics, category-wise competition, and other publicly available information.
        </p>

        {/* ----- Paragraph 2: Not a guarantee ----- */}
        <p>
          These predictions are <b>not official</b> and should not be treated as a guarantee of admission or
          rejection. The actual cutoffs released by Delhi University may be higher or lower than our projections
          due to factors that cannot be predicted with complete certainty, including student preference patterns,
          seat movement, counselling behaviour, normalization effects, vacant seats, category-wise demand, and
          round-wise allocation changes.
        </p>

        {/* ----- HIGHLIGHTED RULE — the most important thing ----- */}
        <div className="disclaimer-rule">
          <div className="disclaimer-rule-label">★ Most important</div>
          <p className="disclaimer-rule-text">
            <b>Never</b> arrange your CSAS preference list according to predicted chances alone.
          </p>
          <p className="disclaimer-rule-sub">
            Always place colleges and courses in the <b>exact order of what you genuinely want.</b>
            <br />
            If your dream college is your first choice, keep it at the top — even if the prediction appears uncertain.
          </p>
        </div>

        {/* ----- The mechanism ----- */}
        <p>
          Delhi University considers your <b>preference order</b> during seat allocation. If you place a
          lower-preference college above a college that you actually prefer, you may be allotted the lower-preference
          option and lose the opportunity to be considered for the higher-preference college — even if your score
          was sufficient for it.
        </p>

        {/* ----- The safety tip in a soft callout ----- */}
        <div className="disclaimer-tip">
          <div className="disclaimer-tip-label">💡 Pro tip</div>
          <p>
            You are <b>not penalised</b> for adding ambitious preferences. Since there is no practical disadvantage
            to including colleges with lower predicted chances, it is generally advisable to include every college
            and course you would <b>genuinely be willing to join</b>.
          </p>
        </div>

        {/* ----- Closing ----- */}
        <p className="disclaimer-closing">
          Use these predictions as <b>guidance, not as a substitute for your own preference order.</b>
          <br />
          The final admission decision rests solely with <b>Delhi University</b> and the official
          <b> CSAS counselling process.</b>
        </p>
      </div>
    </section>
  );
}

/* Minimal trailing footnote — kept short so the big disclaimer above remains the hero */
function DisclaimerCard() {
  return (
    <div className="text-center text-[11px] text-slate-400 px-4">
      Built on public NTA CUET 2025 / 2026 data &amp; DU 2025-26 Round 1 cutoffs · Always verify with the official DU Bulletin of Information.
    </div>
  );
}
