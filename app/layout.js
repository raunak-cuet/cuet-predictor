import './globals.css';

export const metadata = {
  title: 'CUET 2026 → DU Admission Predictor',
  description: 'Know your real chances at Delhi University, instantly. Statistically rigorous, fully explainable.'
};
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="relative z-10">
          {/* ============= NAVBAR ============= */}
          <header className="sticky top-0 z-30">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
              <nav className="card flex items-center justify-between px-4 sm:px-6 py-3">
                <a href="/" className="flex items-center gap-2.5 group">
                  <div className="relative h-9 w-9 rounded-xl grid place-items-center text-white font-bold text-sm
                                  bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600
                                  shadow-[0_4px_12px_-2px_rgba(79,70,229,0.5)]">
                    DU
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 to-transparent" />
                  </div>
                  <div className="leading-tight">
                    <div className="font-semibold text-slate-900 text-sm">CUET → DU Predictor</div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">2026 Admissions Cycle</div>
                  </div>
                </a>
                <div className="flex items-center gap-1 sm:gap-2 text-sm">
                  <a href="/" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">Home</a>
                  <a href="#how" className="hidden sm:inline px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">Methodology</a>
                  <a href="/admin" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">Admin</a>
                </div>
              </nav>
            </div>
          </header>

          {/* ============= MAIN ============= */}
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">{children}</main>

          {/* ============= FOOTER ============= */}
          <footer className="mt-24 pb-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <hr className="hr-fade mb-6" />
              <div className="flex flex-col md:flex-row justify-between gap-4 text-xs text-slate-500">
                <div>
                  <span className="text-slate-700 font-semibold">CUET → DU Predictor</span>
                  &nbsp;· Built on public NTA CUET 2025/2026 data &amp; DU 2025-26 Round-1 cutoffs.
                </div>
                <div className="flex gap-3 text-slate-400">
                  <span>v2.0</span>
                  <span>·</span>
                  <span>Statistical projections — not guarantees.</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
