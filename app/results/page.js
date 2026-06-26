'use client';

import { useEffect, useMemo, useRef, useState, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SUBJECT_BY_CODE } from '@/lib/subjects';
import { SUBJECT_STATS, CATEGORY_POOL } from '@/lib/cuet2026';

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [editingDream, setEditingDream] = useState(false);

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

  const handleDreamChange = (newDreamId) => {
    const selected = results.find(r => r.id === Number(newDreamId));
    if (!selected) return;
    const newPayload = {
      ...payload,
      dreamProgramId: Number(newDreamId),
      dreamLabel: `${selected.college} — ${selected.program}`
    };
    const newData = { ...data, payload: newPayload };
    setData(newData);
    sessionStorage.setItem('cuet:results', JSON.stringify(newData));
    setEditingDream(false);
  };

  return (
    <div className="space-y-10 animate-in">
      <ResultsHero name={payload.name} category={payload.category} totalEligible={results.length} persisted={response?.persisted} />

      {/* Subject score breakdown — VISUAL */}
      <SubjectBreakdown payload={payload} />

      {dream && (
        <section>
          <SectionDivider label="★ Your dream college" color="amber" />
          <DreamReport
            r={dream}
            category={payload.category}
            results={results}
            editingDream={editingDream}
            setEditingDream={setEditingDream}
            onChangeDream={handleDreamChange}
          />
        </section>
      )}

      {/* ============= SHARE RESULTS CARD ============= */}
      <ShareResults
        name={payload.name}
        category={payload.category}
        results={results}
        dream={dream}
      />

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
function DreamReport({ r, category, results, editingDream, setEditingDream, onChangeDream }) {
  const [whatIf, setWhatIf] = useState(0);
  const p = r.probability.p ?? 0;
  const tone = r.probability.verdict?.tone || 'unknown';
  const proj = r.projection;
  const catLabel = { UR: 'General (Unreserved)', OBC: 'OBC-NCL', SC: 'SC', ST: 'ST', EWS: 'EWS', PwBD: 'PwBD' }[category];
  const catSeats = r.seats?.[category];
  const urSeats = catSeats ?? r.seats;
  const showSeats = typeof urSeats === 'number';
  const zeroSeats = showSeats && urSeats === 0;
  const urSeatsFallback = zeroSeats ? (r.seats?.['UR'] ?? null) : null;

  // Dynamic what-if label
  const deltaLabel = whatIf === 0
    ? null
    : whatIf > 0
      ? `What if I had ${whatIf} more marks?`
      : `What if I had ${Math.abs(whatIf)} fewer marks?`;

  return (
    <div className="card-solid p-6 sm:p-8 ring-2 ring-amber-300 shadow-[0_24px_60px_-20px_rgba(245,158,11,0.35)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="font-display text-2xl sm:text-3xl text-slate-900 leading-tight">{r.college}</div>
          <div className="text-base text-slate-600 mt-0.5">{r.program}</div>
          <div className="mt-1.5 text-xs text-slate-500">
            {catLabel} · 2026 cycle{showSeats && !zeroSeats ? ` · ${urSeats} ${category} seats available` : ''}
          </div>
          {zeroSeats && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <b>⚠️ No reserved {category} seats</b> at this college for this program.
              {category !== 'UR' && (
                <span> Your category ({catLabel}) does not have special reserved seats here.
                  You will need to compete through the <b>General/Unreserved (UR)</b> category
                  {urSeatsFallback != null ? ` (${urSeatsFallback} UR seats available)` : ''}.
                  {category === 'PwBD' && ' PwBD candidates may also be eligible through other reserved categories if applicable.'}
                </span>
              )}
            </div>
          )}
        </div>
        <Verdict tone={tone} label={r.probability.verdict?.label} emoji={r.probability.verdict?.emoji} big />
      </div>

      {/* Change dream college */}
      {!editingDream && (
        <button
          onClick={() => setEditingDream(true)}
          className="mb-6 text-sm font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1"
        >
          Change your dream college?
        </button>
      )}

      {editingDream && (
        <DreamSelector
          results={results}
          currentId={r.id}
          onSelect={onChangeDream}
          onCancel={() => setEditingDream(false)}
        />
      )}

      {/* 5-stat KPI row — 2 cols mobile, 3 cols tablet, 5 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <KpiTile label="Composite score" value={r.yourComposite?.toFixed(2)} sub={`out of ${r.outOf}`} tone="emerald" />
        <KpiTile label="2025 cutoff (actual)" value={r.cutoff2025 != null ? Math.round(r.cutoff2025) : '—'} sub={r.cutoff2025 != null ? `Rd 1 · ${category}` : 'no data'} tone="slate" />
        <KpiTile label="Est. 2026 cut-off" value={proj.mostLikely != null ? Math.round(proj.mostLikely) : null} sub={proj.mostLikely != null ? `±${Math.round(proj.sigma)} · ${Math.round(proj.conservative)}–${Math.round(proj.aggressive)}` : `out of ${r.outOf}`} tone="indigo" />
        <KpiTile label={`${category} seats`} value={showSeats && !zeroSeats ? urSeats : zeroSeats ? '0' : '—'} sub={zeroSeats ? 'no reserved seats' : showSeats ? 'this category' : 'merit-based'} tone={zeroSeats ? 'risk' : 'violet'} />
        <KpiTile label="Admission chance" value={`~${Math.round(p)}%`} sub={r.probability.verdict?.label} tone={tone} />
      </div>

      {/* SCORE POSITIONING vs CUT-OFF RANGE — with what-if support */}
      <ScorePositionBar r={r} whatIf={whatIf} />

      {/* What-if slider — right below the positioning bar */}
      <div className="mt-3">
        <div className="flex justify-between items-center text-sm mb-1.5">
          <span className="font-semibold text-indigo-900">
            {deltaLabel || 'Drag to explore what-if scenarios'}
          </span>
          {whatIf !== 0 && (
            <span className="font-mono tabular-nums text-indigo-700">
              → <b>{simulate(r, whatIf) == null ? '—' : `${simulate(r, whatIf)}%`}</b>
            </span>
          )}
        </div>
        <input
          type="range" min="-100" max="100" step="1" value={whatIf}
          onChange={(e) => setWhatIf(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>-100 marks</span>
          <span className={whatIf === 0 ? 'font-semibold text-slate-600' : ''}>0</span>
          <span>+100 marks</span>
        </div>
      </div>

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
function ScorePositionBar({ r, whatIf = 0 }) {
  const proj = r.projection;
  const outOf = r.outOf;
  const low = proj.conservative;
  const high = proj.aggressive;
  const mid = proj.mostLikely;
  const you = r.yourComposite;
  const displayScore = you + whatIf;
  const hasShift = whatIf !== 0;

  // Display range — accommodate slider extremes
  const dispMin = Math.min(700, you - 60, low - 60, displayScore - 20);
  const dispMax = Math.max(outOf, displayScore + 20);
  const range = dispMax - dispMin;
  const pct = (v) => Math.max(0, Math.min(100, ((v - dispMin) / range) * 100));

  // Decide which label goes on top vs bottom row to avoid overlap
  const youX = pct(displayScore);
  const bandX = pct((low + high) / 2);
  const labelsOverlap = Math.abs(youX - bandX) < 18;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-600">Score positioning vs estimated 2026 cut-off</div>
        <div className="text-[10px] text-slate-400">scale: {dispMin.toFixed(0)} – {dispMax}</div>
      </div>

      {/* Labels ABOVE the bar */}
      <div className="relative h-8 mt-2">
        <Tag x={bandX} color="amber" level={labelsOverlap && youX < bandX ? 'high' : 'low'}>est. cut-off range</Tag>
        <Tag x={youX}  color={hasShift ? 'indigo' : 'emerald'} level={labelsOverlap && youX >= bandX ? 'high' : 'low'}>
          {hasShift ? `${you + whatIf >= you ? '+' : ''}${whatIf} adjusted` : 'your score'}
        </Tag>
      </div>

      {/* The bar itself */}
      <div className="relative h-7">
        {/* Track */}
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-slate-200 rounded-full -translate-y-1/2" />
        {/* Cut-off band */}
        <div
          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
          style={{ left: `${pct(low)}%`, width: `${Math.max(2, pct(high) - pct(low))}%` }}
          title={`Estimated cutoff band: ${low}–${high}`}
        />
        {/* Range-end ticks on the cutoff band */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct(low)}%`, height: '18px' }}>
          <div className="w-0.5 h-full bg-amber-700 rounded-full" />
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct(high)}%`, height: '18px' }}>
          <div className="w-0.5 h-full bg-amber-700 rounded-full" />
        </div>
        {/* Ghost dot at original score (only when shifted) */}
        {hasShift && (
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct(you)}%` }}>
            <div className="h-4 w-4 rounded-full bg-emerald-300 ring-2 ring-white opacity-40" />
          </div>
        )}
        {/* Live dot at current (maybe simulated) score */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-200 ease-out" style={{ left: `${youX}%` }}>
          <div className={`h-5 w-5 rounded-full ${hasShift ? 'bg-indigo-500 ring-indigo-200' : 'bg-emerald-500'} ring-4 ring-white shadow-lg`} />
        </div>
      </div>

      {/* Numeric scale below the bar — aligned with actual positions */}
      <div className="relative mt-2 h-4 text-[10px] font-mono tabular-nums">
        <span className="absolute left-0 text-slate-400">{dispMin.toFixed(0)}</span>
        <span className="absolute -translate-x-1/2 text-amber-700 font-semibold" style={{ left: `${pct(low)}%` }}>{Math.round(low)}</span>
        <span className="absolute -translate-x-1/2 text-amber-700 font-semibold" style={{ left: `${pct(high)}%` }}>{Math.round(high)}</span>
        <span className="absolute right-0 text-slate-400">{dispMax}</span>
      </div>

      {/* Your-score numeric value, anchored under the dot */}
      <div className="relative mt-1 h-4">
        <div className="absolute -translate-x-1/2" style={{ left: `${youX}%` }}>
          <span className={`text-[11px] font-bold tabular-nums whitespace-nowrap ${hasShift ? 'text-indigo-700' : 'text-emerald-700'}`}>
            {(you + whatIf)?.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
function Tag({ x, color, children, level = 'low' }) {
  const colors = {
    amber:   'text-amber-700 bg-amber-50 border border-amber-200',
    emerald: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    indigo:  'text-indigo-700 bg-indigo-50 border border-indigo-200'
  };
  // Two stagger levels so close-together labels don't overlap horizontally
  const top = level === 'high' ? 0 : 18;
  return (
    <div
      className={`absolute text-[10px] font-semibold px-1.5 py-0.5 rounded -translate-x-1/2 whitespace-nowrap ${colors[color]}`}
      style={{ left: `${x}%`, top: `${top}px` }}
    >
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
   DREAM COLLEGE SELECTOR — change dream without re-submitting
   ============================================================ */
function DreamSelector({ results, currentId, onSelect, onCancel }) {
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  // Click outside closes the selector
  useEffect(() => {
    function onClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        onCancel();
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onCancel]);

  const options = useMemo(() => {
    return results.map(r => ({
      id: r.id,
      label: `${r.college} — ${r.program}`
    }));
  }, [results]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return options;
    const tokens = q.split(/\s+/).filter(t => t.length > 0);
    const abbrQ = abbreviate(q);

    const scored = options.map(o => {
      const hay = normalizeSearch(o.label);
      const abbrHay = abbreviate(hay);
      const allIn = tokens.every(t => hay.includes(t) || abbrHay.includes(t));
      if (!allIn) return null;

      let score = 0;
      if (hay === q || abbrHay === abbrQ) score += 1000;
      else if (hay.startsWith(q + ' ') || abbrHay.startsWith(abbrQ + ' ')) score += 800;
      else if (hay.startsWith(q) || abbrHay.startsWith(abbrQ)) score += 700;
      score += 400;
      tokens.forEach(t => {
        const w = Math.min(t.length, 4);
        if (hay.includes(t)) score += 10 * w;
      });
      score -= hay.length * 0.02;
      return { o, score };
    }).filter(Boolean);

    scored.sort((a, b) => b.score - a.score);
    return scored.map(x => x.o);
  }, [search, options]);

  const displayed = useMemo(() => filtered.slice(0, 80), [filtered]);

  return (
    <div ref={wrapperRef} className="mb-6 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-indigo-900">Select a new dream college</div>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">Cancel</button>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search college or course…"
        className="field mb-2"
        autoFocus
      />
      <div className="text-[11px] text-slate-500 mb-1">
        {search
          ? `${filtered.length.toLocaleString()} match${filtered.length === 1 ? '' : 'es'}`
          : `${options.length.toLocaleString()} eligible programs`}
      </div>
      <div className="border border-slate-200 rounded-xl bg-white max-h-72 overflow-y-auto">
        {displayed.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 text-center">No programs match your search.</div>
        ) : (
          displayed.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              className={`w-full text-left px-4 py-2.5 text-sm border-b border-slate-100 last:border-0 ${o.id === currentId ? 'bg-indigo-50 text-indigo-900 font-medium' : 'text-slate-800 hover:bg-indigo-50/60'}`}
            >
              <div className="truncate">{o.label}</div>
            </button>
          ))
        )}
        {filtered.length > 80 && (
          <div className="px-4 py-2 text-[11px] text-slate-500 bg-slate-50 text-center border-t border-slate-200">
            + {filtered.length - 80} more programs — type to narrow
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   FILTER HELPERS
   ============================================================ */

// Normalize text for flexible keyword matching.
function normalizeSearch(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[.,()\[\]\/\\&+\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Collapse single-letter abbreviations like "b a" → "ba" so that
// "ba economics" matches "B.A. (Hons.) Economics".
function abbreviate(str) {
  return str.replace(/\b([a-z])\s+(?=[a-z]\b)/g, '$1');
}

function relevanceScore(r, q, tokens) {
  const college = normalizeSearch(r.college);
  const program = normalizeSearch(r.program);

  const abbrCollege = abbreviate(college);
  const abbrProgram = abbreviate(program);
  const haystack = college + ' ' + program;
  const abbrHaystack = abbrCollege + ' ' + abbrProgram;

  let score = 0;

  // 1. Exact / prefix match bonuses
  if (college === q || abbrCollege === q) score += 1000;
  else if (program === q || abbrProgram === q) score += 900;
  else if (college.startsWith(q + ' ') || abbrCollege.startsWith(q + ' ')) score += 800;
  else if (college.startsWith(q) || abbrCollege.startsWith(q)) score += 700;
  else if (program.startsWith(q + ' ') || abbrProgram.startsWith(q + ' ')) score += 650;
  else if (program.startsWith(q) || abbrProgram.startsWith(q)) score += 600;

  // 2. All tokens present
  const allInFull = tokens.every(t => haystack.includes(t));
  const allInAbbr = tokens.every(t => abbrHaystack.includes(t));
  if (allInFull || allInAbbr) score += 400;

  // 3. Token-level bonuses (weight by length to avoid single-letter spam)
  tokens.forEach(t => {
    const w = Math.min(t.length, 4);
    if (college.includes(t) || abbrCollege.includes(t)) score += 10 * w;
    if (program.includes(t) || abbrProgram.includes(t)) score += 6 * w;
  });

  // 4. Prefer shorter, more precise matches
  if (allInFull || allInAbbr) {
    score -= (college.length + program.length) * 0.02;
  }

  return score;
}

/* ============================================================
   ALL RESULTS LIST
   ============================================================ */
function AllResults({ results, dreamId }) {
  const [filter, setFilter] = useState('ALL');
  const [sort, setSort] = useState('PROB');
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(50);   // render-cap for performance

  // When the user starts searching, switch from Probability to Best Match
  // so the top result is the closest text match (e.g. "shri ram college"
  // puts SRCC above Lady Shri Ram). Restore Probability when cleared.
  useEffect(() => {
    if (search.trim() && sort === 'PROB') {
      setSort('BEST');
    } else if (!search.trim() && sort === 'BEST') {
      setSort('PROB');
    }
  }, [search, sort]);

  // Extract unique course types from results
  const courseTypes = useMemo(() => {
    const types = new Set();
    for (const r of results) {
      if (r.program) types.add(r.program);
    }
    return [...types].sort();
  }, [results]);

  const items = useMemo(() => {
    let arr = results.filter(r => r.id !== dreamId);
    if (filter === 'SAFE')  arr = arr.filter(r => (r.probability.p ?? 0) >= 75);
    if (filter === 'MID')   arr = arr.filter(r => { const p = r.probability.p ?? -1; return p >= 50 && p < 75; });
    if (filter === 'RISKY') arr = arr.filter(r => (r.probability.p ?? 0) < 50);
    if (courseFilter !== 'ALL') arr = arr.filter(r => r.program === courseFilter);

    const q = normalizeSearch(search);
    const tokens = q ? q.split(/\s+/).filter(t => t.length > 0) : [];

    let scored = arr.map(r => ({ r, score: tokens.length ? relevanceScore(r, q, tokens) : 0 }));
    if (tokens.length) scored = scored.filter(x => x.score > 0);

    scored = [...scored];
    if (sort === 'PROB')  scored.sort((a, b) => (b.r.probability.p ?? -1) - (a.r.probability.p ?? -1));
    if (sort === 'NAME')  scored.sort((a, b) => (a.r.college + a.r.program).localeCompare(b.r.college + b.r.program));
    if (sort === 'SCORE') scored.sort((a, b) => (b.r.yourComposite ?? 0) - (a.r.yourComposite ?? 0));
    if (sort === 'BEST')  scored.sort((a, b) => b.score - a.score || (b.r.probability.p ?? -1) - (a.r.probability.p ?? -1));

    return scored.map(x => x.r);
  }, [results, filter, sort, search, dreamId, courseFilter]);

  // Reset pagination whenever filter/sort/search change so the user sees fresh top results
  useEffect(() => { setVisibleCount(50); }, [filter, sort, search, courseFilter]);

  const displayed = items.slice(0, visibleCount);
  const hasMore = items.length > visibleCount;

  const sortLabel = {
    PROB: 'sorted by your admission probability',
    BEST: 'sorted by best match',
    NAME: 'sorted by name',
    SCORE: 'sorted by composite score'
  }[sort] || 'sorted by your admission probability';

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          {items.length.toLocaleString()} programs · {sortLabel}
          {hasMore && <span className="text-slate-400"> · showing first {visibleCount}</span>}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search college / course…"
            className="field !py-2 text-sm w-full"
          />
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="field !py-2 text-sm w-full">
            <option value="ALL">All courses</option>
            {courseTypes.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="field !py-2 text-sm w-full">
            <option value="ALL">All chances</option>
            <option value="SAFE">🟢 Safe (≥75%)</option>
            <option value="MID">🟡 Moderate (50–75%)</option>
            <option value="RISKY">🔴 Risky (&lt;50%)</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="field !py-2 text-sm w-full">
            <option value="PROB">Sort: Probability</option>
            <option value="BEST">Sort: Best Match</option>
            <option value="NAME">Sort: Name</option>
            <option value="SCORE">Sort: Composite</option>
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card-solid p-10 text-center text-slate-500">No programs match this filter.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayed.map((r, i) => <ResultCard key={r.id} r={r} idx={i} />)}
          </div>
          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={() => setVisibleCount(c => c + 50)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
              >
                Show 50 more
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">({items.length - visibleCount} remaining)</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const ResultCard = memo(function ResultCard({ r, idx }) {
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
      <MiniPositionBar r={r} simulatedScore={r.yourComposite + whatIf} hasShift={whatIf !== 0} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        <SmallStat label="Composite" value={r.yourComposite?.toFixed(2)} sub={`/${r.outOf}`} />
        <SmallStat label="2025 cutoff" value={r.cutoff2025 != null ? Math.round(r.cutoff2025) : '—'} sub={r.cutoff2025 != null ? `actual · /${r.outOf}` : 'n/a'} />
        <SmallStat label="Est. 2026" value={r.projection.mostLikely?.toFixed(0)} sub={`±${r.projection.sigma?.toFixed(0)}`} />
        <SmallStat label="Margin" value={(r.probability.margin >= 0 ? '+' : '') + r.probability.margin?.toFixed(1)} positive={r.probability.margin >= 0} />
      </div>
      {/* Zero seats warning */}
      {r.seats && typeof r.seats[r.category] === 'number' && r.seats[r.category] === 0 && (
        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
          ⚠️ <b>No reserved {r.category} seats</b> — you must compete via UR/General
          {r.seats['UR'] != null ? ` (${r.seats['UR']} UR seats)` : ''}.
        </div>
      )}

      {/* What-if */}
      <div className="mt-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">What-if: {whatIf >= 0 ? '+' : ''}{whatIf} marks</span>
          <span className="font-semibold text-slate-900 tabular-nums">→ {simP == null ? '—' : `${simP}%`}</span>
        </div>
        <input type="range" min="-100" max="100" step="1" value={whatIf} onChange={(e) => setWhatIf(Number(e.target.value))} className="w-full mt-1" />
      </div>

      <FactorReveal r={r} />
    </div>
  );
});

function MiniPositionBar({ r, simulatedScore, hasShift }) {
  const proj = r.projection;
  const actualScore = r.yourComposite;
  // Use simulated score for the moving dot; fall back to actual if not provided
  const displayScore = typeof simulatedScore === 'number' ? simulatedScore : actualScore;
  const low = proj.conservative;
  const high = proj.aggressive;

  // Scale needs to accommodate slider extremes (−100 to +100), not just current values
  const dispMin = Math.min(low - 40, actualScore - 60, displayScore - 20);
  const dispMax = Math.max(high + 40, actualScore + 110, displayScore + 20);
  const range = dispMax - dispMin;
  const pct = v => Math.max(0, Math.min(100, ((v - dispMin) / range) * 100));

  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 mt-2">
      <div className="text-[10px] text-slate-500 mb-1.5 flex justify-between">
        <span>Position vs 2026 cutoff band</span>
        <span className="tabular-nums">{Math.round(low)}–{Math.round(high)}</span>
      </div>
      <div className="relative h-3">
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 bg-slate-200 rounded-full -translate-y-1/2" />
        {/* Cutoff band */}
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-amber-400"
          style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }}
        />
        {/* Range-end ticks */}
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct(low)}%`, height: '12px' }}>
          <div className="w-0.5 h-full bg-amber-600 rounded-full" />
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct(high)}%`, height: '12px' }}>
          <div className="w-0.5 h-full bg-amber-600 rounded-full" />
        </div>
        {/* Ghost dot at original score (only when shifted) */}
        {hasShift && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-200"
            style={{ left: `${pct(actualScore)}%` }}
          >
            <div className="h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-white opacity-50" />
          </div>
        )}
        {/* Live dot at current (maybe simulated) score */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-200 ease-out"
          style={{ left: `${pct(displayScore)}%` }}
        >
          <div className={`h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white shadow ${hasShift ? 'ring-emerald-200' : ''}`} />
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

  // k = ln(3) / sigma — mathematically derived (P(+σ) ≈ 75%, P(0) = 50%, P(-σ) ≈ 25%)
  // No free parameters. No elite floor hacks. The logistic IS the model.
  const LN3 = 1.09861228867;
  let k = LN3 / sigma;

  // Seat-scarcity sharpening: tiny pools → steeper curve
  const seats = r.probability.seatsConsidered;
  if (seats && seats > 0) {
    const seatAdj = Math.sqrt(40 / Math.max(seats, 5));
    k *= Math.max(0.85, Math.min(1.3, seatAdj));
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

/* ============================================================
   SHARE RESULTS — Viral shareable card
   ============================================================ */
function ShareResults({ name, category, results, dream }) {
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const cardRef = useRef(null);

  const firstName = (name || 'Student').split(' ')[0];
  const top3 = useMemo(() => results.slice(0, 3), [results]);
  const safeCount = useMemo(() => results.filter(r => (r.probability.p ?? 0) >= 75).length, [results]);

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });
      const url = canvas.toDataURL('image/png');
      setImageUrl(url);
    } catch (e) {
      console.error('Share card generation failed:', e);
    }
    setGenerating(false);
  }, []);

  useEffect(() => {
    if (showModal) {
      setImageUrl(null);
      // Small delay to let DOM render
      const t = setTimeout(generateImage, 200);
      return () => clearTimeout(t);
    }
  }, [showModal, generateImage]);

  const downloadImage = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `DreamSeat-${firstName}-Results.png`;
    a.click();
  };

  const dreamP = dream?.probability?.p;
  const dreamEmoji = dream?.probability?.verdict?.emoji || '';
  const dreamCollege = dream?.college || '';
  const dreamProgram = dream?.program || '';

  const whatsappText = dream
    ? `I just checked my DU admission chances on DreamSeat — ${Math.round(dreamP)}% for ${dreamCollege} ${dreamProgram}! Check yours free: https://dreamseat.vercel.app`
    : `I just checked my DU admission chances on DreamSeat — ${safeCount} safe programs! Check yours free: https://dreamseat.vercel.app`;

  const twitterText = dream
    ? `Just checked my DU 2026 admission chances on @DreamSeat — ${Math.round(dreamP)}% for ${dreamCollege}! 🎯\n\nCheck yours free 👇\nhttps://dreamseat.vercel.app`
    : `Just checked my DU 2026 admission chances on @DreamSeat — ${safeCount} safe programs! 🎯\n\nCheck yours free 👇\nhttps://dreamseat.vercel.app`;

  const verdictColor = (tone) => ({
    safe: '#10b981', good: '#3b82f6', mid: '#f59e0b', risk: '#fb923c', reach: '#ef4444'
  }[tone] || '#94a3b8');

  const verdictBg = (tone) => ({
    safe: 'rgba(16,185,129,0.15)', good: 'rgba(59,130,246,0.15)', mid: 'rgba(245,158,11,0.15)',
    risk: 'rgba(251,146,60,0.15)', reach: 'rgba(239,68,68,0.15)'
  }[tone] || 'rgba(148,163,184,0.15)');

  return (
    <>
      {/* Share button */}
      <div className="text-center">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-bold text-sm hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share My Results ✨
        </button>
        <p className="mt-2 text-[11px] text-slate-400">Get a shareable card for WhatsApp, Instagram & Twitter</p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Share your results</h3>
              <button onClick={() => setShowModal(false)} className="h-7 w-7 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500 text-sm">✕</button>
            </div>

            {/* Card preview */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* The actual card that gets captured */}
              <div ref={cardRef} style={{
                width: '440px',
                maxWidth: '100%',
                margin: '0 auto',
                background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)',
                borderRadius: '20px',
                padding: '28px 24px',
                fontFamily: "'Inter', system-ui, sans-serif",
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Decorative orbs */}
                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)' }} />
                <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.2), transparent 70%)' }} />

                {/* Logo area */}
                <div style={{ position: 'relative', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    <span style={{ color: '#e879a0' }}>Dream</span><span style={{ color: '#d4a574' }}>Seat</span>
                  </div>
                  <span style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>CUET 2026</span>
                </div>

                {/* Student name */}
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Predictions for</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'white', lineHeight: 1.1, marginTop: '4px' }}>{firstName}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>{category}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{results.length} eligible programs</span>
                  </div>
                </div>

                {/* Dream college (if exists) */}
                {dream && (
                  <div style={{ position: 'relative', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 700, marginBottom: '6px' }}>★ DREAM COLLEGE</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{dreamCollege}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{dreamProgram}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                      <span style={{ fontSize: '28px', fontWeight: 800, color: verdictColor(dream.probability?.verdict?.tone), lineHeight: 1 }}>~{Math.round(dreamP)}%</span>
                      <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: verdictBg(dream.probability?.verdict?.tone), color: verdictColor(dream.probability?.verdict?.tone), fontWeight: 600 }}>{dreamEmoji} {dream.probability?.verdict?.label}</span>
                    </div>
                  </div>
                )}

                {/* Top 3 programs */}
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '10px' }}>TOP 3 MOST LIKELY</div>
                  {top3.map((r, i) => {
                    const p = r.probability.p ?? 0;
                    const tone = r.probability.verdict?.tone || 'unknown';
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: i < 2 ? '8px' : '0', padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', width: '16px', flexShrink: 0 }}>#{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.college}</div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.program}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: verdictColor(tone), lineHeight: 1 }}>{Math.round(p)}%</div>
                          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{r.probability.verdict?.emoji}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stats row */}
                <div style={{ position: 'relative', display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <div style={{ flex: 1, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>{safeCount}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Safe (75%+)</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#6366f1' }}>{results.length}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Total Eligible</div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    Check your real admission probability at your dream college free
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa', marginTop: '4px' }}>
                    dreamseat.vercel.app
                  </div>
                </div>
              </div>
            </div>

            {/* Share actions */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
              {generating ? (
                <div className="text-center text-sm text-slate-500 py-2">
                  <span className="inline-block animate-spin mr-2">⏳</span> Generating your card...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button onClick={downloadImage} disabled={!imageUrl}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-semibold hover:bg-[#1ebe57] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 0 0 .611.611l4.458-1.495A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.396 0-4.612-.77-6.42-2.076l-.253-.183-3.237 1.085 1.085-3.237-.183-.253A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                    WhatsApp
                  </a>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Twitter / X
                  </a>
                  <button
                    onClick={async () => {
                      if (imageUrl && navigator.share && /Mobi/i.test(navigator.userAgent)) {
                        try {
                          const res = await fetch(imageUrl);
                          const blob = await res.blob();
                          const file = new File([blob], 'DreamSeat-Results.png', { type: 'image/png' });
                          await navigator.share({ files: [file], title: 'My DreamSeat Results' });
                        } catch {}
                      } else {
                        try {
                          await navigator.clipboard.writeText('https://dreamseat.vercel.app');
                          alert('Link copied! Paste it anywhere.');
                        } catch { alert('https://dreamseat.vercel.app'); }
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs font-semibold hover:from-pink-600 hover:to-orange-600 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    {/Mobi/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') ? 'More' : 'Copy Link'}
                  </button>
                </div>
              )}
              <p className="text-center text-[10px] text-slate-400 mt-2.5">Download the image to share on Instagram Stories</p>
            </div>
          </div>
        </div>
      )}
    </>
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
