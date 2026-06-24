// Maintenance landing page.
// Shown to all visitors when middleware routes them here.

export const metadata = {
  title: 'DreamSeat — Under Maintenance',
  description: 'DreamSeat is briefly under maintenance while we ship improvements based on user feedback.'
};

export default function MaintenancePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-xl w-full text-center animate-in">
        {/* Icon — wrench-and-spark, in the brand dark slate circle */}
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 grid place-items-center text-white mx-auto mb-6 shadow-lg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>

        {/* Live status pulse */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800">
            Brief maintenance in progress
          </span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl text-slate-900 leading-tight">
          We&rsquo;ll be right back.
        </h1>

        <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-md mx-auto">
          Thank you for the incredible response — you&rsquo;ve helped us spot a few bugs.
          We&rsquo;re shipping fixes <b className="text-slate-900">right now</b> and will be back online in approximately
          {' '}<b className="text-slate-900">2 hours</b>.
        </p>

        <p className="mt-3 text-sm text-slate-500">
          Your predictions, scores, and existing data are all safe. Please check back shortly.
        </p>

        <div className="mt-8 text-[11px] text-slate-400 tracking-wide">
          — Team DreamSeat
        </div>
      </div>
    </div>
  );
}
