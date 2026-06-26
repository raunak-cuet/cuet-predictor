'use client';

import { useEffect, useMemo, useRef, useState, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
      <ShareResults
        payload={payload}
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
   SUBJECT BREAKDOWN
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
   DREAM REPORT
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

  const deltaLabel = whatIf === 0
    ? null
    : whatIf > 0
      ? `What if I had ${whatIf} more marks?`
      : `What if I had ${Math.abs(whatIf)} fewer marks?`;

  return (
    <div className="card-solid p-6 sm:p-8 ring-2 ring-amber-300 shadow-[0_24px_60px_-20px_rgba(245,158,11,0.35)]">
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

      {/* ── KPI section: Expected 2026 Cutoff hero first, then supporting stats ── */}
      <div className="space-y-3 mb-6">
        <CutoffHeroTile proj={proj} outOf={r.outOf} yourComposite={r.yourComposite} whatIf={whatIf} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile label="Composite score" value={r.yourComposite?.toFixed(2)} sub={`out of ${r.outOf}`} tone="emerald" />
          <KpiTile label="Admission chance" value={`~${Math.round(p)}%`} sub={<Verdict tone={tone} label={r.probability.verdict?.label} emoji={r.probability.verdict?.emoji} />} tone={tone} />
          <KpiTile label="2025 cutoff (actual)" value={r.cutoff2025 != null ? Math.round(r.cutoff2025) : '—'} sub={r.cutoff2025 != null ? null : 'no data'} tone="slate" />
          <KpiTile label={`${category} seats`} value={showSeats && !zeroSeats ? urSeats : zeroSeats ? '0' : '—'} sub={zeroSeats ? 'no reserved seats' : showSeats ? 'this category' : 'merit-based'} tone={zeroSeats ? 'risk' : 'violet'} />
        </div>
      </div>

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

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <SubjectBars r={r} />
        <PercentilePanel r={r} />
      </div>

      <BigVerdictBlock r={r} category={catLabel} showSeats={showSeats} urSeats={urSeats} />
      <UncertaintyNote r={r} />
      <FactorReveal r={r} />
    </div>
  );
}

/* ============================================================
   CUTOFF HERO TILE — the star of the show
   ============================================================ */
function CutoffHeroTile({ proj, outOf, yourComposite, whatIf = 0 }) {
  if (!proj.mostLikely) return null;

  const low = Math.round(proj.conservative);
  const mid = Math.round(proj.mostLikely);
  const high = Math.round(proj.aggressive);
  const sigma = Math.round(proj.sigma);
  const displayScore = yourComposite != null ? yourComposite + whatIf : null;
  const hasShift = whatIf !== 0;
  const margin = displayScore != null ? (displayScore - proj.mostLikely) : null;
  const isAbove = margin != null && margin >= 0;

  const dispMin = Math.min(low - 30, yourComposite != null ? yourComposite - 40 : low - 30, displayScore != null ? displayScore - 30 : low - 30);
  const dispMax = Math.max(high + 30, yourComposite != null ? yourComposite + 40 : high + 30, displayScore != null ? displayScore + 30 : high + 30);
  const range = dispMax - dispMin;
  const pct = (v) => Math.max(1, Math.min(99, ((v - dispMin) / range) * 100));

  return (
    <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-indigo-200 blur-3xl opacity-40 pointer-events-none" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Left: label + big number */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-indigo-600 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Expected 2026 Cutoff
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-6xl sm:text-7xl text-indigo-900 tabular-nums leading-none">{mid}</span>
              <span className="text-sm text-indigo-400 font-medium">/ {outOf}</span>
            </div>
            <div className="mt-1.5 text-xs text-indigo-600 font-medium">
              Most likely cutoff · ±{sigma} confidence
            </div>
          </div>

          {/* Right: range pills + margin */}
          <div className="text-right space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Cutoff range</div>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-xs font-mono tabular-nums text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{low}</span>
              <span className="text-slate-300 text-xs">—</span>
              <span className="text-xs font-mono tabular-nums text-indigo-700 bg-indigo-50 border border-indigo-300 px-2 py-0.5 rounded-full font-bold shadow-sm">{mid}</span>
              <span className="text-slate-300 text-xs">—</span>
              <span className="text-xs font-mono tabular-nums text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">{high}</span>
            </div>
            <div className="text-[10px] text-slate-400">conservative · likely · aggressive</div>
            {margin != null && (
              <div className={`mt-1 text-sm font-bold tabular-nums ${isAbove ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isAbove ? `+${margin.toFixed(1)} marks above cutoff ✓` : `${margin.toFixed(1)} marks below cutoff ✗`}
              </div>
            )}
          </div>
        </div>

        {/* Visual range bar */}
        <div className="mt-4">
          <div className="relative h-6">
            <div className="absolute top-1/2 inset-x-0 h-2 bg-indigo-100 rounded-full -translate-y-1/2" />
            {/* cutoff band */}
            <div
              className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-300 via-indigo-400 to-violet-400"
              style={{ left: `${pct(low)}%`, width: `${Math.max(2, pct(high) - pct(low))}%` }}
            />
            {/* mid tick */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-6 bg-indigo-700 rounded-full"
              style={{ left: `${pct(mid)}%` }}
            />
            {/* original score dot while dragging */}
            {hasShift && yourComposite != null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${pct(yourComposite)}%` }}
              >
                <div className="h-5 w-5 rounded-full bg-emerald-300 ring-4 ring-white opacity-45 shadow-sm" />
              </div>
            )}
            {/* active score dot */}
            {displayScore != null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-200 ease-out"
                style={{ left: `${pct(displayScore)}%` }}
              >
                <div className={`h-6 w-6 rounded-full ring-4 ring-white shadow-md ${isAbove ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </div>
            )}
          </div>

          {/* axis labels row */}
          <div className="relative h-5 mt-1 text-[10px] font-mono tabular-nums">
            <span
              className="absolute -translate-x-1/2 text-amber-700 font-semibold"
              style={{ left: `${pct(low)}%` }}
            >{low}</span>
            <span
              className="absolute -translate-x-1/2 text-indigo-800 font-bold"
              style={{ left: `${pct(mid)}%` }}
            >{mid}</span>
            <span
              className="absolute -translate-x-1/2 text-violet-700 font-semibold"
              style={{ left: `${pct(high)}%` }}
            >{high}</span>
          </div>

          {/* active score label */}
          {displayScore != null && (
            <div className="relative h-4 text-[10px] font-bold tabular-nums">
              <span
                className={`absolute -translate-x-1/2 whitespace-nowrap ${hasShift ? 'text-indigo-700' : isAbove ? 'text-emerald-700' : 'text-rose-700'}`}
                style={{ left: `${pct(displayScore)}%` }}
              >
                {hasShift ? 'adjusted' : 'you'}: {displayScore.toFixed(1)}
              </span>
            </div>
          )}

          {/* legend */}
          <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-400 mt-2 pt-2 border-t border-indigo-100 gap-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-5 rounded-full bg-gradient-to-r from-amber-300 to-violet-400" />
              Projected 2026 cutoff range
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-0.5 bg-indigo-700 rounded-full" />
              Most likely: {mid}
            </span>
            {displayScore != null && (
              <span className="flex items-center gap-1.5">
                <span className={`inline-block h-3 w-3 rounded-full ${isAbove ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {hasShift ? 'Adjusted composite' : 'Your composite'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Subject bars chart
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
              <div className="absolute top-0 bottom-0 left-0 bg-slate-300 rounded-full" style={{ width: `${it.max * scale}%` }} />
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
   Percentile panel
   ============================================================ */
function PercentilePanel({ r }) {
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
    risk: 'from-orange-500 to-red-600',
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
   DREAM COLLEGE SELECTOR
   ============================================================ */
function DreamSelector({ results, currentId, onSelect, onCancel }) {
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

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
function normalizeSearch(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[.,()\[\]\/\\&+\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  if (college === q || abbrCollege === q) score += 1000;
  else if (program === q || abbrProgram === q) score += 900;
  else if (college.startsWith(q + ' ') || abbrCollege.startsWith(q + ' ')) score += 800;
  else if (college.startsWith(q) || abbrCollege.startsWith(q)) score += 700;
  else if (program.startsWith(q + ' ') || abbrProgram.startsWith(q + ' ')) score += 650;
  else if (program.startsWith(q) || abbrProgram.startsWith(q)) score += 600;

  const allInFull = tokens.every(t => haystack.includes(t));
  const allInAbbr = tokens.every(t => abbrHaystack.includes(t));
  if (allInFull || allInAbbr) score += 400;

  tokens.forEach(t => {
    const w = Math.min(t.length, 4);
    if (college.includes(t) || abbrCollege.includes(t)) score += 10 * w;
    if (program.includes(t) || abbrProgram.includes(t)) score += 6 * w;
  });

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
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    if (search.trim() && sort === 'PROB') {
      setSort('BEST');
    } else if (!search.trim() && sort === 'BEST') {
      setSort('PROB');
    }
  }, [search, sort]);

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

      {/* Expected 2026 cutoff strip */}
      {r.projection.mostLikely != null && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2.5 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-600">Expected 2026 cutoff</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono tabular-nums text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">{Math.round(r.projection.conservative)}</span>
              <span className="text-slate-300 text-[10px]">–</span>
              <span className="text-[11px] font-mono font-bold tabular-nums text-indigo-800 bg-white border border-indigo-300 px-2 py-0.5 rounded-full shadow-sm">{Math.round(r.projection.mostLikely)}</span>
              <span className="text-slate-300 text-[10px]">–</span>
              <span className="text-[10px] font-mono tabular-nums text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">{Math.round(r.projection.aggressive)}</span>
            </div>
          </div>
          <MiniCutoffBar r={r} whatIf={whatIf} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mt-3">
        <SmallStat label="Composite" value={r.yourComposite?.toFixed(2)} sub={`/${r.outOf}`} />
        <SmallStat label="2025 cutoff" value={r.cutoff2025 != null ? Math.round(r.cutoff2025) : '—'} sub={r.cutoff2025 != null ? null : 'n/a'} />
        <SmallStat label="Margin" value={(r.probability.margin >= 0 ? '+' : '') + r.probability.margin?.toFixed(1)} positive={r.probability.margin >= 0} />
      </div>

      {r.seats && typeof r.seats[r.category] === 'number' && r.seats[r.category] === 0 && (
        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
          ⚠️ <b>No reserved {r.category} seats</b> — you must compete via UR/General
          {r.seats['UR'] != null ? ` (${r.seats['UR']} UR seats)` : ''}.
        </div>
      )}

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

/* ============================================================
   Mini cutoff bar — used in each ResultCard
   ============================================================ */
function MiniCutoffBar({ r, whatIf = 0 }) {
  const proj = r.projection;
  const you = r.yourComposite;
  const low = proj.conservative;
  const high = proj.aggressive;
  const mid = proj.mostLikely;
  const displayScore = you != null ? you + whatIf : null;
  const hasShift = whatIf !== 0;
  const isAbove = displayScore != null && displayScore >= mid;

  const dispMin = Math.min(low - 25, you != null ? you - 35 : low - 25, displayScore != null ? displayScore - 25 : low - 25);
  const dispMax = Math.max(high + 25, you != null ? you + 35 : high + 25, displayScore != null ? displayScore + 25 : high + 25);
  const range = dispMax - dispMin;
  const pct = v => Math.max(1, Math.min(99, ((v - dispMin) / range) * 100));

  return (
    <div>
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-1/2 h-1.5 bg-indigo-100 rounded-full -translate-y-1/2" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-300 to-violet-400"
          style={{ left: `${pct(low)}%`, width: `${Math.max(2, pct(high) - pct(low))}%` }}
        />
        {/* mid tick */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-3 bg-indigo-700 rounded-full"
          style={{ left: `${pct(mid)}%` }}
        />
        {/* original score dot while dragging */}
        {hasShift && you != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-200"
            style={{ left: `${pct(you)}%` }}
          >
            <div className="h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-white opacity-50" />
          </div>
        )}
        {/* active score dot */}
        {displayScore != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-200 ease-out"
            style={{ left: `${pct(displayScore)}%` }}
          >
            <div className={`h-3 w-3 rounded-full ring-2 ring-white ${isAbove ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>
        )}
      </div>
      {/* score label */}
      {displayScore != null && (
        <div className="relative h-3.5 mt-0.5">
          <span
            className={`absolute -translate-x-1/2 text-[9px] font-bold tabular-nums whitespace-nowrap ${hasShift ? 'text-indigo-700' : isAbove ? 'text-emerald-700' : 'text-rose-700'}`}
            style={{ left: `${pct(displayScore)}%` }}
          >
            {hasShift ? 'adjusted' : 'you'}: {displayScore.toFixed(1)}
          </span>
        </div>
      )}
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

/* ============================================================
   estimatePercentile
   ============================================================ */
function estimatePercentile(score, max, appeared) {
  if (!score || !max) return null;
  const r = score / max;
  if (r >= 1.0)   return 100;
  if (r <= 0)     return 0;

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

  if (appeared && r > 0.85) {
    const refSize = 900000;
    const tightness = Math.log10(refSize / Math.max(appeared, 50000));
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

  const LN3 = 1.09861228867;
  let k = LN3 / sigma;

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
   AIR CALCULATOR
   ============================================================ */
function AirCalculator({ payload }) {
  const codes = (payload.subjectsTaken && payload.subjectsTaken.length)
    ? payload.subjectsTaken
    : Object.keys(payload.scores || {});

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
      const lowP  = Math.min(100, pct + 0.005);
      const highP = Math.max(0,   pct - 0.005);
      airLow  = Math.max(1, Math.round((100 - lowP)  / 100 * appeared));
      airHigh = Math.max(1, Math.round((100 - highP) / 100 * appeared));
    }
    return { code, name, group: subj?.group, appeared, pct, air, airLow, airHigh };
  });

  const anyFilled = items.some(it => it.pct != null);

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
   IMPORTANT DISCLAIMER
   ============================================================ */
function ImportantDisclaimer() {
  return (
    <section className="disclaimer-shell">
      <div className="disclaimer-header">
        <div className="disclaimer-icon">!</div>
        <div>
          <div className="disclaimer-eyebrow">Please read carefully</div>
          <h2 className="disclaimer-title">Important Disclaimer</h2>
        </div>
      </div>

      <div className="disclaimer-body">
        <p>
          The probabilities, projected cutoffs, ranks, and admission chances shown on this platform are
          <b> estimates </b>based on historical cutoff trends, official CUET data, seat matrices, candidate pool
          statistics, category-wise competition, and other publicly available information.
        </p>

        <p>
          These predictions are <b>not official</b> and should not be treated as a guarantee of admission or
          rejection. The actual cutoffs released by Delhi University may be higher or lower than our projections
          due to factors that cannot be predicted with complete certainty, including student preference patterns,
          seat movement, counselling behaviour, normalization effects, vacant seats, category-wise demand, and
          round-wise allocation changes.
        </p>

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

        <p>
          Delhi University considers your <b>preference order</b> during seat allocation. If you place a
          lower-preference college above a college that you actually prefer, you may be allotted the lower-preference
          option and lose the opportunity to be considered for the higher-preference college — even if your score
          was sufficient for it.
        </p>

        <div className="disclaimer-tip">
          <div className="disclaimer-tip-label">💡 Pro tip</div>
          <p>
            You are <b>not penalised</b> for adding ambitious preferences. Since there is no practical disadvantage
            to including colleges with lower predicted chances, it is generally advisable to include every college
            and course you would <b>genuinely be willing to join</b>.
          </p>
        </div>

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
   SHARE RESULTS — Branded shareable card
   ============================================================ */
function ShareResults({ payload, results, dream }) {
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [genError, setGenError] = useState(null);
  const [shareMsg, setShareMsg] = useState('');
  const cardRef = useRef(null);

  const name = payload.name || 'Student';
  const category = payload.category || 'UR';

  const subjectBars = useMemo(() => {
    const codes = payload.subjectsTaken || Object.keys(payload.scores || {});
    return codes.map(code => {
      const subj = SUBJECT_BY_CODE[code];
      const stats = SUBJECT_STATS[code];
      const score = payload.scores[code];
      const max = stats?.maxScore?.[2026] || stats?.maxScore?.[2025] || 250;
      const shortName = (subj?.name || code).split('/')[0].split('(')[0].trim();
      return { code, name: shortName, score, max };
    }).sort((a, b) => b.score - a.score);
  }, [payload]);

  const dreamPos = useMemo(() => {
    if (!dream) return null;
    const proj = dream.projection;
    const you = dream.yourComposite;
    const low = proj.conservative;
    const high = proj.aggressive;
    const outOf = dream.outOf;
    const dispMin = Math.min(low - 50, you - 70);
    const dispMax = outOf;
    const range = dispMax - dispMin;
    const pct = (v) => Math.max(0, Math.min(100, ((v - dispMin) / range) * 100));
    return { you, low, high, outOf, pct, margin: dream.probability.margin };
  }, [dream]);

  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);

  const imageUrlToBlob = useCallback(async () => {
    if (!imageUrl) return null;
    try { const r = await fetch(imageUrl); return r.blob(); }
    catch { return null; }
  }, [imageUrl]);

  const shareWithImage = useCallback(async (text) => {
    if (typeof navigator === 'undefined' || !navigator.share) return false;
    const blob = await imageUrlToBlob();
    if (!blob) return false;
    try {
      await navigator.share({
        title: 'My DreamSeat Results',
        text,
        files: [new File([blob], 'DreamSeat-Results.png', { type: 'image/png' })],
      });
      setShareMsg('Shared!');
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('Share failed:', e);
      return false;
    }
  }, [imageUrl, imageUrlToBlob]);

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    setGenError(null);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      setImageUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('Share card generation failed:', e);
      setGenError('Failed to generate image. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, []);

  const downloadImage = useCallback(() => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = 'DreamSeat-Results.png';
    a.click();
    setShareMsg('Image saved!');
  }, [imageUrl]);

  const copyLink = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setShareMsg('Copy not supported');
      return;
    }
    navigator.clipboard.writeText('https://dreamseat.vercel.app')
      .then(() => setShareMsg('Link copied!'))
      .catch(() => setShareMsg('Failed to copy'));
  }, []);

  const openModal = () => {
    setShowModal(true);
    setImageUrl(null);
    setGenError(null);
    setShareMsg('');
  };

  const closeModal = () => {
    setShowModal(false);
    setGenerating(false);
    document.body.style.overflow = '';
  };

  useEffect(() => {
    if (!shareMsg) return;
    const t = setTimeout(() => setShareMsg(''), 3000);
    return () => clearTimeout(t);
  }, [shareMsg]);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
      const t = setTimeout(generateImage, 200);
      return () => { document.body.style.overflow = ''; clearTimeout(t); };
    }
  }, [showModal, generateImage]);

  if (!dream) {
    return (
      <div className="text-center">
        <p className="text-xs text-slate-400">Select a dream college to unlock the shareable results card.</p>
      </div>
    );
  }

  const dreamP = Math.round(dream.probability?.p ?? 0);
  const dreamCollege = dream.college;
  const dreamProgram = dream.program;
  const dreamVerdict = dream.probability?.verdict;
  const catSeats = dream.seats?.[category];

  const shareText = `I just checked my DU admission chances on DreamSeat — ${dreamP}% for ${dreamCollege}! Check yours free: https://dreamseat.vercel.app`;
  const tweetText = `Just checked my DU 2026 admission chances — ${dreamP}% for ${dreamCollege}! \uD83C\uDFAF\n\nCheck yours free \uD83D\uDC47\nhttps://dreamseat.vercel.app`;

  const vBadge = (tone) => {
    const map = {
      safe:  { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
      good:  { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
      mid:   { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
      risk:  { bg: '#ffedd5', color: '#9a3412', border: '#fed7aa' },
      reach: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
    };
    return map[tone] || map.good;
  };

  const barColor = (pct) => pct >= 90 ? '#10b981' : pct >= 80 ? '#3b82f6' : pct >= 70 ? '#f59e0b' : '#fb923c';

  return (
    <>
      <div className="text-center">
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white font-bold text-sm hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700 transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share My Results ✨
        </button>
        <p className="mt-2 text-[11px] text-slate-400">Get a shareable card for WhatsApp, Instagram &amp; Twitter</p>
      </div>

      {showModal && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 12px', overflowY: 'auto', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ width: '100%', maxWidth: '500px', marginTop: '40px', background: '#fff', borderRadius: '20px', boxShadow: '0 25px 60px -12px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>Share your results</span>
              <button onClick={closeModal} style={{ height: '28px', width: '28px', display: 'grid', placeItems: 'center', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#64748b' }}>&times;</button>
            </div>

            {shareMsg && (
              <div style={{ padding: '8px 20px', background: '#ecfdf5', borderBottom: '1px solid #a7f3d0', fontSize: '13px', color: '#065f46', fontWeight: 600, textAlign: 'center' }}>
                ✓ {shareMsg}
              </div>
            )}

            <div style={{ padding: '16px', background: '#f8fafc', overflowX: 'auto' }}>
              <div ref={cardRef} style={{ width: '460px', margin: '0 auto', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '28px 26px', fontFamily: "'Inter', system-ui, sans-serif", color: '#0f172a', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif", fontStyle: 'italic', fontSize: '26px', letterSpacing: '-0.01em', lineHeight: 1 }}>
                    <span style={{ color: '#312e81' }}>Dream</span><span style={{ color: '#4f46e5' }}>Seat</span>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#94a3b8' }}>CUET 2026</span>
                </div>

                <div style={{ marginBottom: '22px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>Predictions for</div>
                  <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '40px', color: '#0f172a', lineHeight: 1.25, paddingBottom: '4px' }}>{name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                    <span style={{ display: 'inline-grid', placeItems: 'center', height: '24px', padding: '0 14px', fontSize: '10px', fontWeight: 700, borderRadius: '20px', background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', letterSpacing: '0.04em', lineHeight: 1 }}>
                      <span style={{ display: 'block', transform: 'translateY(-1px)' }}>{category}</span>
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>{results.length.toLocaleString()} eligible programs</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#d97706', marginBottom: '5px' }}>★ DREAM COLLEGE</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', lineHeight: 1.25 }}>{dreamCollege}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.3 }}>{dreamProgram}</div>
                    </div>
                    <div style={{ display: 'inline-grid', gridAutoFlow: 'column', gap: '5px', placeItems: 'center', height: '26px', padding: '0 12px', flexShrink: 0, fontSize: '10px', fontWeight: 700, borderRadius: '20px', background: vBadge(dreamVerdict?.tone).bg, color: vBadge(dreamVerdict?.tone).color, border: `1px solid ${vBadge(dreamVerdict?.tone).border}`, whiteSpace: 'nowrap', lineHeight: 1 }}>
                      <span style={{ transform: 'translateY(-0.5px)' }}>{dreamVerdict?.emoji}</span>
                      <span style={{ transform: 'translateY(-1px)' }}>{dreamVerdict?.label}</span>
                    </div>
                  </div>

                  <div style={{ position: 'relative', background: 'linear-gradient(135deg,#6366f1 0%,#7c3aed 50%,#8b5cf6 100%)', borderRadius: '14px', marginBottom: '14px', padding: '24px 20px 22px', overflow: 'hidden', boxShadow: '0 8px 20px -8px rgba(124,58,237,0.5)' }}>
                    <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ position: 'relative', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Admission Chance</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", color: '#ffffff', lineHeight: 1, letterSpacing: '-0.04em', marginTop: '8px', marginBottom: '24px' }}>
                        <span style={{ fontSize: '68px', fontWeight: 800, lineHeight: 1, transform: 'translateY(7px)', display: 'inline-block' }}>{dreamP}</span>
                        <span style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1, marginLeft: '4px', transform: 'translateY(-7px)', display: 'inline-block' }}>%</span>
                      </div>
                      <div style={{ display: 'inline-grid', gridAutoFlow: 'column', gap: '6px', placeItems: 'center', height: '28px', padding: '0 14px', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em', lineHeight: 1 }}>
                        <span style={{ transform: 'translateY(-0.5px)' }}>{dreamVerdict?.emoji}</span>
                        <span style={{ transform: 'translateY(-1px)' }}>{dreamVerdict?.label}</span>
                      </div>
                    </div>
                  </div>

                  {dreamPos && (
                    <div style={{ position: 'relative', overflow: 'hidden', marginBottom: '12px', padding: '14px 14px 13px', borderRadius: '14px', background: 'linear-gradient(135deg,#eef2ff 0%,#ffffff 52%,#f5f3ff 100%)', border: '1px solid #c7d2fe' }}>
                      <div style={{ position: 'absolute', top: '-34px', right: '-28px', width: '92px', height: '92px', borderRadius: '50%', background: 'rgba(99,102,241,0.13)' }} />
                      <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4f46e5', marginBottom: '4px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4f46e5', display: 'inline-block' }} />
                              Expected 2026 Cutoff
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                              <span style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.05em', color: '#312e81', lineHeight: 1 }}>{Math.round(dream.projection.mostLikely)}</span>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8' }}>/ {dream.outOf}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '999px', padding: '2px 6px' }}>{Math.round(dream.projection.conservative)}</span>
                              <span style={{ fontSize: '10px', color: '#cbd5e1' }}>–</span>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, color: '#4338ca', background: '#ffffff', border: '1px solid #a5b4fc', borderRadius: '999px', padding: '2px 7px' }}>{Math.round(dream.projection.mostLikely)}</span>
                              <span style={{ fontSize: '10px', color: '#cbd5e1' }}>–</span>
                              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#7c3aed', background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '999px', padding: '2px 6px' }}>{Math.round(dream.projection.aggressive)}</span>
                            </div>
                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>range · likely · high</div>
                          </div>
                        </div>

                        <div style={{ position: 'relative', height: '13px', borderRadius: '8px', background: '#dbe4ff' }}>
                          <div style={{ position: 'absolute', top: '2px', bottom: '2px', left: dreamPos.pct(dreamPos.low) + '%', width: Math.max(3, dreamPos.pct(dreamPos.high) - dreamPos.pct(dreamPos.low)) + '%', borderRadius: '7px', background: 'linear-gradient(90deg,#fbbf24,#818cf8,#a78bfa)' }} />
                          <div style={{ position: 'absolute', top: '50%', left: dreamPos.pct(dream.projection.mostLikely) + '%', transform: 'translate(-50%,-50%)', width: '2px', height: '16px', borderRadius: '2px', background: '#4338ca' }} />
                          <div style={{ position: 'absolute', top: '50%', left: dreamPos.pct(dreamPos.you) + '%', transform: 'translate(-50%,-50%)', width: '17px', height: '17px', borderRadius: '50%', background: '#10b981', border: '3px solid #fff', boxShadow: '0 0 0 1px #10b981' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '7px' }}>
                          <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 800 }}>Cutoff: {Math.round(dreamPos.low)}{'\u2013'}{Math.round(dreamPos.high)}</span>
                          <span style={{ fontSize: '10px', color: '#059669', fontWeight: 800 }}>You: {dreamPos.you.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '14px' }}>
                    <StatBox label="YOUR COMPOSITE" value={dream.yourComposite?.toFixed(1)} sub={`out of ${dream.outOf}`} />
                    <StatBox label="2025 CUTOFF" value={dream.cutoff2025 != null ? Math.round(dream.cutoff2025) : '\u2014'} />
                    <StatBox label={`${category} SEATS`} value={typeof catSeats === 'number' ? catSeats : '\u2014'} sub={typeof catSeats === 'number' ? (catSeats === 0 ? 'no reserved' : 'this category') : ''} />
                  </div>

                  <div style={{ textAlign: 'center', padding: '4px 0' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Your margin: </span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: (dreamPos?.margin ?? 0) >= 0 ? '#059669' : '#dc2626' }}>
                      {(dreamPos?.margin ?? 0) >= 0 ? '+' : ''}{dreamPos?.margin?.toFixed(1)} marks {(dreamPos?.margin ?? 0) >= 0 ? '\u2713' : '\u2717'}
                    </span>
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px' }}>NTA SCORE vs SUBJECT MAX</div>
                    {subjectBars.map((sb, i) => {
                      const pct = (sb.score / sb.max) * 100;
                      return (
                        <div key={sb.code} style={{ marginBottom: i < subjectBars.length - 1 ? '9px' : '0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>{sb.name}</span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{sb.score.toFixed(1)} / {sb.max}</span>
                          </div>
                          <div style={{ position: 'relative', height: '7px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: pct + '%', borderRadius: '4px', background: barColor(pct) }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>Check your real admission probability at your dream college free {'\u2192'}</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#4f46e5', marginTop: '3px', letterSpacing: '-0.01em' }}>dreamseat.vercel.app</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px 18px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
              {generating ? (
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', padding: '14px 0' }}>
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', marginRight: '8px', verticalAlign: 'middle', animation: 'spin 0.7s linear infinite' }} />
                  Generating your card…
                </div>
              ) : genError ? (
                <div style={{ textAlign: 'center', padding: '14px 0' }}>
                  <div style={{ fontSize: '13px', color: '#dc2626', marginBottom: '10px' }}>{genError}</div>
                  <button onClick={generateImage} style={{ fontSize: '13px', fontWeight: 600, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Try again</button>
                </div>
              ) : imageUrl ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '10px' }}>
                    {isMobile && (
                      <ShareBtn label="Share" iconColor="#6366f1"
                        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>}
                        onClick={() => shareWithImage(shareText)} />
                    )}
                    <ShareBtn label="WhatsApp" iconColor="#25D366"
                      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>}
                      onClick={() => shareWithImage(shareText).then(ok => { if (!ok) window.open('https://wa.me/?text=' + encodeURIComponent(shareText), '_blank'); })} />
                    <ShareBtn label="Twitter / X" iconColor="#0f172a"
                      icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                      onClick={() => window.open('https://x.com/intent/tweet?text=' + encodeURIComponent(tweetText), '_blank')} />
                    <ShareBtn label="Telegram" iconColor="#0088cc"
                      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>}
                      onClick={() => window.open('https://t.me/share/url?url=https://dreamseat.vercel.app&text=' + encodeURIComponent(shareText), '_blank')} />
                    <ShareBtn label="Reddit" iconColor="#FF4500"
                      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>}
                      onClick={() => window.open('https://reddit.com/submit?url=https://dreamseat.vercel.app&title=' + encodeURIComponent(shareText), '_blank')} />
                    <ShareBtn label="Copy Link" iconColor="#4f46e5"
                      icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
                      onClick={copyLink} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
                    <ShareBtn label="Save Image" iconColor="#0f172a" filled
                      icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
                      onClick={downloadImage} />
                  </div>
                  <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '12px', lineHeight: 1.5 }}>
                    {isMobile
                      ? 'Tap Share to send the image to any app, or use WhatsApp / Telegram directly.'
                      : 'Save the image, then attach it when sharing. Or use a direct link button.'}
                  </p>
                </>
              ) : (
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8', padding: '14px 0' }}>
                  Waiting to generate card…
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 8px', textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function ShareBtn({ label, iconColor, icon, onClick, filled }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '10px 6px', borderRadius: '10px',
        border: filled ? 'none' : '1px solid #e2e8f0',
        background: filled ? (hover ? '#1e293b' : '#0f172a') : (hover ? '#f8fafc' : '#ffffff'),
        color: filled ? '#ffffff' : '#0f172a',
        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: hover ? '0 2px 8px -2px rgba(15,23,42,0.12)' : '0 1px 2px rgba(15,23,42,0.05)',
        transform: hover ? 'translateY(-1px)' : 'none',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', color: iconColor }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function DisclaimerCard() {
  return (
    <div className="text-center text-[11px] text-slate-400 px-4">
      Built on public NTA CUET 2025 / 2026 data &amp; DU 2025-26 Round 1 cutoffs · Always verify with the official DU Bulletin of Information.
    </div>
  );
}
