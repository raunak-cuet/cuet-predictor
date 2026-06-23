import './globals.css';

export const metadata = {
  title: 'CUET 2026 → DU Admission Predictor',
  description: 'Know your real chances at Delhi University, instantly. Mathematical, explainable, and based on real CUET 2025 + 2026 data.'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 grid place-items-center text-white font-bold shadow-soft">DU</div>
              <div>
                <div className="font-bold text-slate-900 leading-tight">CUET → DU Predictor</div>
                <div className="text-xs text-slate-500 -mt-0.5">2026 admissions · explainable model</div>
              </div>
            </a>
            <nav className="flex items-center gap-2 sm:gap-4 text-sm">
              <a href="/" className="text-slate-600 hover:text-brand-700">Home</a>
              <a href="/admin" className="text-slate-600 hover:text-brand-700">Admin</a>
              <a href="#how" className="hidden sm:inline text-slate-600 hover:text-brand-700">How it works</a>
            </nav>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">{children}</main>

        <footer className="mt-20 border-t border-slate-200/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-sm text-slate-500 flex flex-col sm:flex-row gap-3 justify-between">
            <p>
              Built with publicly available CUET 2025 &amp; 2026 NTA data and DU 2025-26 Round 1 cutoffs.
              <span className="block text-xs mt-1">Estimates are statistical projections — not guarantees.</span>
            </p>
            <p>v1.0 · Next.js · Supabase · Vercel</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
