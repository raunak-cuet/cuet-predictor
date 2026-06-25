'use client';

import { useState, useEffect } from 'react';

const UPDATE_KEY = 'dreamseat_update_v3_seen';

export default function UpdateNotice() {
  const [showPopup, setShowPopup] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const seen = localStorage.getItem(UPDATE_KEY);
      if (!seen) setShowPopup(true);
    } catch {}
  }, []);

  const dismissPopup = () => {
    setShowPopup(false);
    try { localStorage.setItem(UPDATE_KEY, '1'); } catch {}
  };

  if (!mounted) return null;

  return (
    <>
      {/* Persistent banner — below navbar */}
      {showBanner && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3">
          <div className="relative rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-2.5 text-white shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="shrink-0 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[12px] sm:text-[13px] font-medium leading-snug truncate">
                  <span className="font-bold">DreamSeat has been updated.</span>{' '}
                  <span className="hidden sm:inline opacity-90">
                    More advanced prediction algorithm, all known issues resolved, new features added.
                  </span>
                  <span className="sm:hidden opacity-90">
                    Major updates and improved accuracy.
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="shrink-0 h-5 w-5 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white/80 hover:text-white text-xs transition-colors"
                aria-label="Dismiss banner"
              >
                x
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First-time popup */}
      {showPopup && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-6 py-5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-white/20 grid place-items-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">DreamSeat has been updated</h2>
                  <p className="text-[12px] text-white/70">Here is what has changed</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-3">
              <UpdateItem
                title="More advanced prediction algorithm"
                desc="Probabilities are now significantly more accurate across all programs, categories, and score ranges."
              />
              <UpdateItem
                title="All reported issues resolved"
                desc="PwBD category, BSc scoring base, course eligibility, domain selection, cutoff projections — all corrected."
              />
              <UpdateItem
                title="New course filter and what-if explorer"
                desc="Filter by course type across all colleges. The dream college report now includes an interactive what-if slider."
              />
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <button
                onClick={dismissPopup}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm hover:from-indigo-700 hover:to-violet-700 transition-colors shadow-lg shadow-indigo-500/25"
              >
                Continue to DreamSeat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function UpdateItem({ title, desc }) {
  return (
    <div className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-indigo-100 grid place-items-center">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div>
        <div className="text-[13px] font-semibold text-slate-900">{title}</div>
        <div className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
