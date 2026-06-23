import './globals.css';
import Logo from './components/Logo';

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
          <header className="sticky top-0 z-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
              <nav className="card flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
                <a href="/" className="flex items-center gap-3 sm:gap-4 group">
                  <img src="/stars-icon-rounded.png" alt=""
                       className="h-11 w-11 sm:h-14 sm:w-14 rounded-[12px] shadow-sm shrink-0" />
                  <div className="leading-tight">
                    <Logo />
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-slate-500 mt-1">
                      CUET 2026 College &amp; Cutoff Predictor
                    </div>
                  </div>
                </a>
                <div className="flex items-center gap-1 sm:gap-2 text-sm">
                  <a href="/" className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">Home</a>
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
      </body>
    </html>
  );
}
