'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FEATURES = [
  {
    title: '5-Step Score Entry',
    desc: 'Enter your CUET subjects, NTA scores, category, and name. The platform auto-filters programs based on your subject combination — you only see courses you are actually eligible for.',
    tip: 'You can select up to 5 subjects in any valid CUET combination (e.g. 1 Language + 4 Domains, or 3 Domains + 1 Language + GAT).'
  },
  {
    title: 'Dream College Deep-Dive',
    desc: 'Select a dream college during score entry. On the results page, you get a full-page report with projected cutoff range, your composite vs cutoff positioning, subject-wise breakdown, percentile estimates, and a verdict probability.',
    tip: 'Even if you do not select a dream college, you still get ranked results for every eligible program.'
  },
  {
    title: 'What-If Score Explorer',
    desc: 'Every program card and the dream college section includes an interactive slider (-100 to +100 marks). Drag it to see how your probability changes if you had scored differently. The score positioning bar updates in real-time.',
    tip: 'Use this to understand how sensitive your chances are to a few marks difference.'
  },
  {
    title: 'All India Rank Calculator',
    desc: 'Enter your exact NTA percentile from your scorecard for each subject. The platform calculates your subject-level All India Rank using the official appeared-candidates count, with a confidence band.',
    tip: 'This is your subject-level rank, not your CSAS merit rank. Merit rank depends on your formula-specific composite.'
  },
  {
    title: 'Course Type Filter',
    desc: 'In the "All Eligible Programs" section, use the course dropdown to filter by program type — see all B.Com (Hons.) colleges, all B.Sc Physics colleges, etc. Combined with search and sorting, this lets you quickly find the best options.',
    tip: 'Combine the course filter with the Safe/Moderate/Risky filter to find programs matching your risk appetite.'
  },
  {
    title: 'Probability Filters and Sorting',
    desc: 'Filter programs by Safe (75%+), Moderate (50-75%), or Risky (below 50%). Sort by probability, college name, or composite score. Search by any college or course name.',
    tip: 'Start with "Safe" to see your guaranteed options, then explore "Moderate" for realistic targets.'
  },
  {
    title: 'Factor-Level Transparency',
    desc: 'Every program card has a "How was this calculated?" section that reveals the exact contribution of each factor: scale adjustment, competition drift, top-end density, seat scarcity, and physical ceiling caps.',
    tip: 'This lets you verify the math yourself. Every coefficient is either computed from real NTA data or explicitly stated as an assumption.'
  },
  {
    title: 'Score Positioning Visual',
    desc: 'A horizontal bar shows your composite score relative to the projected cutoff range. The amber band represents the estimated cutoff uncertainty. Your position is marked with a green dot that moves with the what-if slider.',
    tip: 'If your dot is clearly to the right of the amber band, you are safely above the projected cutoff.'
  },
  {
    title: 'Percentile Estimates',
    desc: 'Per-subject estimated percentile ranks calibrated against real NTA CUET 2026 data points. Shows your score, the subject max, and how many candidates appeared.',
    tip: 'These are estimates based on score-to-max ratios. Your exact percentile is on your NTA scorecard — use it in the AIR Calculator for precise ranks.'
  },
  {
    title: 'Multiple Category Support',
    desc: 'Select your reservation category (UR, OBC-NCL, SC, ST, EWS, PwBD). The engine uses category-specific cutoffs and competition data. PwBD students see estimated cutoffs based on the lowest published category cutoff.',
    tip: 'PwBD cutoffs are estimated because most programs did not publish PwBD-specific cutoffs in Round 1. The engine notes this clearly on each card.'
  }
];

const STEPS = [
  {
    n: 1,
    title: 'Pick your subjects',
    desc: 'Select the CUET subjects you appeared for. The platform supports all 38 subjects (13 languages, 24 domain subjects, GAT). You can pick up to 5 in any valid combination.'
  },
  {
    n: 2,
    title: 'Enter your NTA scores',
    desc: 'Type in the exact normalised scores from your CUET scorecard. Decimals up to 4 places are supported, matching NTA precision.'
  },
  {
    n: 3,
    title: 'Choose your category',
    desc: 'Select UR, OBC-NCL, SC, ST, EWS, or PwBD. This determines which reservation cutoffs are used.'
  },
  {
    n: 4,
    title: 'Enter your name',
    desc: 'Used only to personalise your results page. Your name is stored privately and never shared.'
  },
  {
    n: 5,
    title: 'Select a dream college (optional)',
    desc: 'Search for any college or course. If selected, you get a detailed dream college report with score positioning, what-if slider, and verdict. If skipped, you still see all ranked results.'
  },
  {
    n: 6,
    title: 'Calculate and explore',
    desc: 'Click "Calculate my chances" to see your results. Browse all eligible programs, use filters and sorting, try the what-if slider, check the AIR calculator, and read the disclaimer about CSAS preference ordering.'
  }
];

export default function HowToUsePage() {
  const router = useRouter();
  const [openFeature, setOpenFeature] = useState(null);

  return (
    <div className="space-y-10 animate-in">
      {/* Hero */}
      <section className="text-center">
        <button onClick={() => router.push('/')} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mb-4 inline-block">
          Back to home
        </button>
        <h1 className="font-display text-3xl sm:text-5xl text-slate-900 leading-tight">
          How to use DreamSeat
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Everything this platform offers, explained step by step. DreamSeat is a statistical engine — every number it shows is derived from real NTA data and official DU cutoffs.
        </p>
      </section>

      {/* Step by step */}
      <section>
        <SectionHeader>Getting started — 6 steps</SectionHeader>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STEPS.map(s => (
            <div key={s.n} className="card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white grid place-items-center text-sm font-bold">
                  {s.n}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{s.title}</div>
                </div>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <SectionHeader>Features and capabilities</SectionHeader>
        <div className="space-y-3">
          {FEATURES.map((f, i) => {
            const isOpen = openFeature === i;
            return (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFeature(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 h-6 w-6 rounded-md bg-indigo-50 grid place-items-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="font-semibold text-sm text-slate-900 truncate">{f.title}</span>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 border-t border-slate-100 pt-3">
                    <p className="text-[13px] text-slate-600 leading-relaxed mb-3">{f.desc}</p>
                    <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2">
                      <p className="text-[12px] text-indigo-800 leading-relaxed">
                        <span className="font-semibold">Tip:</span> {f.tip}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* How the engine works */}
      <section>
        <SectionHeader>How the prediction engine works</SectionHeader>
        <div className="card p-5 sm:p-6">
          <div className="space-y-4 text-[13px] text-slate-600 leading-relaxed">
            <p>
              Every probability you see is computed by a <b className="text-slate-900">logistic model</b> over the margin between your composite score and the projected 2026 cutoff. The model has <b className="text-slate-900">no free parameters</b> — every coefficient is derived from real data.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <div className="font-semibold text-slate-900 text-sm mb-2">Cutoff Projection</div>
                <ol className="space-y-1.5 text-[12px] text-slate-600 list-decimal list-inside">
                  <li>2025 cutoff is scaled to the 2026 formula max (fraction-of-max preservation)</li>
                  <li>Competition drift added based on category-specific pool growth</li>
                  <li>Top-end density premium for elite programs (100-percentile holders grew 20%)</li>
                  <li>Seat scarcity adjustment for small category pools</li>
                  <li>Physical ceiling cap at 95% of formula max</li>
                </ol>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <div className="font-semibold text-slate-900 text-sm mb-2">Probability Calculation</div>
                <ol className="space-y-1.5 text-[12px] text-slate-600 list-decimal list-inside">
                  <li>Margin = your score minus projected cutoff</li>
                  <li>Steepness k = ln(3) / sigma (no free parameter)</li>
                  <li>P = 1 / (1 + exp(-k x margin))</li>
                  <li>Sigma is tier-aware: tighter for top-elite, wider for general programs</li>
                  <li>Range shown: pLow (worst case) to pHigh (best case)</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section>
        <SectionHeader>Coverage</SectionHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Programs" value="1,526" sub="all DU programs" />
          <StatCard label="Colleges" value="67" sub="with CSAS allocation" />
          <StatCard label="Categories" value="6" sub="UR, OBC, SC, ST, EWS, PwBD" />
          <StatCard label="Subjects" value="38" sub="13 languages + 24 domain + GAT" />
        </div>
      </section>

      {/* Important note */}
      <section className="card p-5 sm:p-6 border-l-4 border-amber-400 bg-amber-50/40">
        <div className="text-sm font-semibold text-amber-900 mb-2">Important reminder</div>
        <p className="text-[13px] text-amber-800 leading-relaxed">
          These are statistical projections, not official cutoffs. <b>Never</b> arrange your CSAS preference list according to predicted chances alone. Always place colleges in the exact order of what you genuinely want. You are not penalised for adding ambitious preferences.
        </p>
      </section>

      {/* Footer CTA */}
      <div className="text-center pb-4">
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-700 hover:to-violet-700 transition-colors shadow-lg shadow-indigo-500/25"
        >
          Start predicting
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-300 to-indigo-500" />
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-indigo-700">{children}</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-indigo-300 to-indigo-500" />
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="font-display text-3xl text-slate-900 mt-1">{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}
