import './globals.css';
import Logo from './components/Logo';
import UpdateNotice from './components/UpdateNotice';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata = {
  metadataBase: new URL('https://dreamseat.vercel.app'),
  title: 'DreamSeat | Free CUET 2026 DU Cutoff Predictor & College Calculator',
  description: 'Free Delhi University admission predictor for CUET 2026. Calculate your composite score, projected 2026 cutoffs, and admission probability for all 1,526 DU programs across 67 colleges. No signup, no ads.',
  keywords: [
    // Primary intent
    'DU cutoff 2026',
    'CUET 2026 cutoff',
    'Delhi University cutoff 2026',
    'DU admission 2026',
    'CUET cutoff predictor',
    // CSAS / preference list
    'CSAS 2026',
    'CSAS preference list',
    'DU preference list 2026',
    'CUET preference order',
    // Composite & calculation
    'CUET composite score calculator',
    'DU composite score',
    'CUET marks to DU college',
    'DU merit calculator',
    // College / program
    'DU college predictor',
    'best DU college for my CUET score',
    'SRCC cutoff 2026',
    'Hindu College cutoff 2026',
    'LSR cutoff 2026',
    'B.Com Hons DU cutoff',
    'B.A. Economics DU cutoff',
    'B.Sc Physics DU cutoff',
    'BMS DU cutoff',
    // Probability / outcomes
    'CUET admission probability',
    'DU admission chances',
    'will I get DU',
    // Brand
    'DreamSeat'
  ],
  authors: [{ name: 'Raunak Pandey' }],
  creator: 'Raunak Pandey',
  publisher: 'DreamSeat',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' }
    ],
    apple: '/apple-touch-icon.png'
  },
  openGraph: {
    title: 'DreamSeat | Free CUET 2026 DU Cutoff Predictor',
    description: 'Calculate your DU admission probability for all 1,526 programs based on your CUET 2026 scores. Free, no signup, no ads.',
    url: 'https://dreamseat.vercel.app',
    siteName: 'DreamSeat',
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: '/stars-icon-rounded.png',
        width: 1200,
        height: 630,
        alt: 'DreamSeat — CUET 2026 DU Cutoff Predictor'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DreamSeat | Free CUET 2026 DU Cutoff Predictor',
    description: 'Calculate your DU admission probability for all 1,526 programs. Free, no signup.',
    images: ['/stars-icon-rounded.png']
  },
  verification: {
    google: 'qc-IwvbEhiifZ98-9-cx92JESwMOe_Pq0BlVaYFVi28'
  },
  alternates: {
    canonical: 'https://dreamseat.vercel.app'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1
    }
  },
  category: 'education'
};

export const viewport = { width: 'device-width', initialScale: 1 };

// Force every page render to be dynamic — bypasses Vercel's edge cache so
// middleware-driven maintenance routing always works.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Schema.org structured data — helps Google understand what your site is
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'DreamSeat',
  alternateName: 'DreamSeat CUET Predictor',
  description: 'Free Delhi University admission probability calculator for CUET 2026 students. Predicts cutoffs and admission chances for 1,526 DU programs.',
  url: 'https://dreamseat.vercel.app',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR'
  },
  creator: {
    '@type': 'Person',
    name: 'Raunak Pandey'
  },
  inLanguage: 'en-IN',
  about: {
    '@type': 'Thing',
    name: 'Delhi University CUET 2026 Admissions'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        <UpdateNotice />
        <div className="relative z-10">
          {/* ============= NAVBAR ============= */}
          <header className="sticky top-0 z-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
              <nav className="card flex items-center justify-between px-3 sm:px-6 py-2 sm:py-4">
                <a href="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
                  <div className="leading-tight min-w-0">
                    <Logo />
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