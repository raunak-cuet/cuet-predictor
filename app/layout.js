import './globals.css';
import Logo from './components/Logo';
import UpdateNotice from './components/UpdateNotice';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata = {
  title: 'DreamSeat | CUET 2026 College & Cutoff Predictor',
  description: 'A statistical engine projecting expected 2026 cutoffs and your real admission chances across every Delhi University college and program.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' }
    ],
    apple: '/apple-touch-icon.png'
  },
  openGraph: {
    title: 'DreamSeat | CUET 2026 College & Cutoff Predictor',
    description: 'Project expected 2026 cutoffs and your real DU admission chances. 1,526 college-program combinations.',
    images: ['/stars-icon-rounded.png']
  }
};
export const viewport = { width: 'device-width', initialScale: 1 };

// Force every page render to be dynamic — bypasses Vercel's edge cache so
// middleware-driven maintenance routing always works.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <UpdateNotice />
        <div className="relative z-10">
          {/* ============= NAVBAR ============= */}
          <header className="sticky top-0 z-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
              <nav className="card flex items-center justify-between px-3 sm:px-6 py-2 sm:py-4">
                <a href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
                  <Logo />
                  <div className="leading-tight min-w-0">
                    <div className="font-semibold text-slate-900 text-sm sm:text-base leading-tight truncate">DreamSeat</div>
                    <div className="hidden sm:block text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-slate-500 mt-0.5 sm:mt-1 whitespace-nowrap">
                      CUET 2026 College &amp; Cutoff Predictor
                    </div>
                  </div>
                </a>
                <div className="flex items-center gap-1.5 sm:gap-3 text-sm shrink-0">
                  <a href="/" className="px-2 py-1.5 sm:px-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition text-xs sm:text-sm">Home</a>
                  <a href="/how-to-use" className="inline-flex items-center gap-1.5 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition font-medium text-xs sm:text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span className="hidden sm:inline">How to Use</span>
                    <span className="sm:hidden">Help</span>
                  </a>
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
                  <span className="text-slate-700 font-semibold">DreamSeat</span>
                  &nbsp;· Built on public NTA CUET 2025/2026 data &amp; DU 2025-26 Round-1 cutoffs.
                </div>
                <div className="text-slate-400">
                  Statistical projections — not guarantees.
                </div>
              </div>
            </div>
          </footer>
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
