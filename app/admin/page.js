'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { SUBJECT_BY_CODE } from '@/lib/subjects';

export default function AdminPage() {
  const [pwd, setPwd] = useState('');
  const [auth, setAuth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);

  const [filterCat, setFilterCat] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('DATE');

  const [selected, setSelected] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const REFRESH_INTERVAL_SEC = 30;

  // Maintenance toggle state
  const [maintenance, setMaintenance] = useState(null);   // null = loading, true/false otherwise
  const [maintBusy, setMaintBusy] = useState(false);

  async function loadMaintenance() {
    try {
      const r = await fetch(`/api/admin/maintenance?password=${encodeURIComponent(pwd)}&_t=${Date.now()}`, { cache: 'no-store' });
      const j = await r.json();
      if (r.ok) setMaintenance(!!j.enabled);
    } catch {}
  }
  async function toggleMaintenance(next) {
    if (maintBusy) return;
    const confirmMsg = next
      ? 'Turn ON maintenance mode? All visitors will see a "we\'ll be right back" page until you turn it off.'
      : 'Turn OFF maintenance mode? The site will go live for all visitors immediately.';
    if (!window.confirm(confirmMsg)) return;
    setMaintBusy(true);
    try {
      const r = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, enabled: next })
      });
      const j = await r.json();
      if (!r.ok) {
        alert('Failed: ' + (j.error || 'unknown'));
      } else {
        setMaintenance(j.enabled);
      }
    } catch (e) {
      alert('Network error: ' + (e.message || e));
    }
    setMaintBusy(false);
  }

  // -------- AUTH --------
  async function login(e) {
    e?.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await fetch(
        `/api/admin/entries?password=${encodeURIComponent(pwd)}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || 'Login failed');
        setBusy(false);
        return;
      }
      setSummary(j.summary);
      setEntries(j.entries || []);
      setLastRefreshAt(new Date());
      setAuth(true);
      sessionStorage.setItem('cuet:admin', pwd);
      // Fetch maintenance state right after login
      loadMaintenance();
    } catch {
      setErr('Network error');
    }
    setBusy(false);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      // Cache bust: append a unique timestamp + tell fetch to bypass HTTP cache
      const r = await fetch(
        `/api/admin/entries?password=${encodeURIComponent(pwd)}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      const j = await r.json();
      if (r.ok) {
        setSummary(j.summary);
        setEntries(j.entries || []);
        setLastRefreshAt(new Date());
      }
    } catch {}
    setRefreshing(false);
    setCountdown(REFRESH_INTERVAL_SEC);
  }

  // -------- DELETE --------
  async function doDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      const body = confirmDel.kind === 'all'
        ? { password: pwd, all: true }
        : { password: pwd, id: confirmDel.id };

      const r = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await r.json();

      if (!r.ok) {
        alert(`Delete failed:\n\n${j.error || 'Unknown'}\n${j.hint ? '\nHint: ' + j.hint : ''}`);
        setDeleting(false);
        return;
      }

      // Success! Update UI based on the verified deletion count from the server
      if (confirmDel.kind === 'all') {
        if (j.deleted > 0) setEntries([]);
        alert(`Deleted ${j.deleted} of ${j.beforeCount} entries.`);
      } else {
        setEntries(prev => prev.filter(e => e.id !== confirmDel.id));
        if (selected?.id === confirmDel.id) setSelected(null);
      }

      setConfirmDel(null);
      await refresh();
    } catch (e) {
      alert(`Network error: ${e.message || e}`);
    }
    setDeleting(false);
  }

  // -------- SAVED PASSWORD AUTO-LOGIN --------
  useEffect(() => {
    const cached = sessionStorage.getItem('cuet:admin');
    if (cached) setPwd(cached);
  }, []);

  // -------- AUTO-REFRESH TIMER --------
  // Ticks the countdown every second. Triggers refresh() at 0.
  // Pauses entirely when tab is hidden, when a modal is open, or when toggle is off.
  useEffect(() => {
    if (!auth || !autoRefresh) return;

    let intervalId;
    const tick = () => {
      // Keep ticking even when tab is hidden — admin wants live data
      // regardless. We still pause if a modal is open to avoid disrupting it.
      if (confirmDel || selected) return;
      setCountdown(c => {
        if (c <= 1) {
          refresh();
          return REFRESH_INTERVAL_SEC;
        }
        return c - 1;
      });
    };
    intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [auth, autoRefresh, confirmDel, selected]);

  // -------- TABLE VIEW --------
  const view = useMemo(() => {
    let arr = entries;
    if (filterCat !== 'ALL') arr = arr.filter(e => e.category === filterCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(e =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.dream_label || '').toLowerCase().includes(q)
      );
    }
    arr = [...arr];
    if (sort === 'DATE')  arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sort === 'NAME')  arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (sort === 'SCORE') arr.sort((a, b) => (b.composite_top ?? -1) - (a.composite_top ?? -1));
    if (sort === 'PROB')  arr.sort((a, b) => (b.dream_probability ?? -1) - (a.dream_probability ?? -1));
    return arr;
  }, [entries, filterCat, search, sort]);

  // -------- CSV EXPORT --------
  function downloadCSV() {
    // Clean, structured CSV — same columns as the table on screen.
    // Subject-wise scores are intentionally NOT spread across columns;
    // open any student row in the dashboard for the in-depth breakdown.
    const headers = [
      'Date', 'Name', 'Category', 'Dream College',
      'Composite Score', 'Dream Probability (%)', 'Subjects Taken'
    ];

    const esc = (v) => {
      const s = (v ?? '').toString().replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };

    const rows = view.map(e => {
      const date = new Date(e.created_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const subjectsCount = Array.isArray(e.subjects_taken)
        ? e.subjects_taken.length
        : Object.keys(e.scores || {}).length;
      return [
        esc(date),
        esc(e.name || 'anonymous'),
        esc(e.category),
        esc(e.dream_label || '—'),
        esc(e.composite_top?.toFixed(2) ?? ''),
        esc(e.dream_probability ?? ''),
        esc(`${subjectsCount} subjects`)
      ].join(',');
    });

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n'); // BOM for Excel UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dreamseat_entries_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // -------- LOGIN SCREEN --------
  if (!auth) {
    return (
      <div className="max-w-md mx-auto mt-16 animate-in">
        <div className="card p-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 grid place-items-center text-white mx-auto mb-4 shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              <circle cx="12" cy="16" r="1.2" fill="currentColor" />
            </svg>
          </div>
          <h1 className="font-display text-3xl text-center text-slate-900 mb-1">Owner Dashboard</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Enter the admin password.</p>
          <form onSubmit={login} className="space-y-3">
            <input
              type="password" value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••••••"
              className="field" autoFocus
            />
            {err && <div className="text-sm text-rose-600 px-1">{err}</div>}
            <button disabled={busy} className="btn-primary w-full py-3">
              {busy ? 'Verifying…' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------- DASHBOARD --------
  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Internal</div>
          <h1 className="font-display text-4xl text-slate-900">Owner Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto-refresh status pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600">
            <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            {autoRefresh ? (
              <span>Auto-refresh in <span className="tabular-nums font-semibold text-slate-900">{countdown}s</span></span>
            ) : (
              <span>Auto-refresh paused</span>
            )}
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className="ml-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold uppercase tracking-wider"
            >
              {autoRefresh ? 'Pause' : 'Resume'}
            </button>
          </div>

          {/* Manual refresh */}
          <button
            onClick={() => refresh()}
            disabled={refreshing}
            title="Refresh entries from the database"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 disabled:opacity-50"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              className={refreshing ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>

          {/* Delete all */}
          <button
            onClick={() => setConfirmDel({ kind: 'all' })}
            disabled={entries.length === 0}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🗑 Delete all entries
          </button>
        </div>
      </div>

      {/* Last refresh timestamp — small, subtle */}
      {lastRefreshAt && (
        <div className="text-[10px] text-slate-400 -mt-3">
          Last refreshed at {lastRefreshAt.toLocaleTimeString('en-IN')}
        </div>
      )}

      {/* ============= MAINTENANCE HERO BLOCK ============= */}
      {maintenance !== null && (
        <div className={`card-solid p-5 sm:p-6 border-2 ${maintenance ? 'border-rose-300' : 'border-emerald-300'}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`shrink-0 h-10 w-10 rounded-xl grid place-items-center text-white shadow-sm ${maintenance ? 'bg-gradient-to-br from-rose-500 to-rose-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-500">Site status</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`h-2 w-2 rounded-full ${maintenance ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                  <span className={`font-bold text-base sm:text-lg ${maintenance ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {maintenance ? 'DOWN — visitors see maintenance page' : 'LIVE — site is publicly accessible'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {maintenance
                    ? 'You can still browse the live site (admin bypass cookie).'
                    : 'Submissions are being accepted normally.'}
                </div>
              </div>
            </div>

            <button
              onClick={() => toggleMaintenance(!maintenance)}
              disabled={maintBusy}
              className={`shrink-0 px-5 sm:px-6 py-3 rounded-xl text-sm font-bold text-white uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed
                ${maintenance
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-br from-rose-500 to-rose-700 hover:from-rose-600 hover:to-rose-800 shadow-[0_8px_20px_-6px_rgba(244,63,94,0.5)]'}`}
            >
              {maintBusy ? 'Updating…' : 'Toggle Maintenance Mode'}
            </button>
          </div>
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Total submissions" value={summary?.total ?? 0} accent="indigo" />
        <KPI label="Today" value={summary?.today ?? 0} accent="emerald" />
        <KPI label="Avg composite" value={summary?.avg ?? '—'} accent="amber" />
        <KPI label="Top dream pick" value={summary?.popular || '—'} small accent="rose" />
      </div>

      {/* Filters + table */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / dream…"
            className="field !py-2 text-sm flex-1 min-w-[200px]"
          />
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="field !py-2 text-sm">
            <option value="ALL">All categories</option>
            <option value="UR">UR</option><option value="OBC">OBC</option><option value="SC">SC</option>
            <option value="ST">ST</option><option value="EWS">EWS</option><option value="PwBD">PwBD</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="field !py-2 text-sm">
            <option value="DATE">Sort: Date</option>
            <option value="NAME">Sort: Name</option>
            <option value="SCORE">Sort: Composite</option>
            <option value="PROB">Sort: Dream %</option>
          </select>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
            <span className="text-[10px] font-mono opacity-70 tabular-nums">{view.length}</span>
          </button>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-2 px-3 font-semibold">Date</th>
                <th className="py-2 px-3 font-semibold">Name</th>
                <th className="py-2 px-3 font-semibold">Cat</th>
                <th className="py-2 px-3 font-semibold">Dream college / course</th>
                <th className="py-2 px-3 font-semibold text-right">Composite</th>
                <th className="py-2 px-3 font-semibold text-right">Dream %</th>
                <th className="py-2 px-3 font-semibold text-right w-10"></th>
              </tr>
            </thead>
            <tbody>
              {view.length === 0 && (
                <tr><td colSpan="7" className="py-10 text-center text-slate-500">No entries yet.</td></tr>
              )}
              {view.map(e => (
                <tr key={e.id}
                    onClick={() => setSelected(e)}
                    className="border-b border-slate-100 hover:bg-indigo-50/30 cursor-pointer transition">
                  <td className="py-2.5 px-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    {e.name || <span className="italic text-slate-400 font-normal">anonymous</span>}
                  </td>
                  <td className="py-2.5 px-3"><span className="badge badge-good">{e.category}</span></td>
                  <td className="py-2.5 px-3 text-slate-700 max-w-md truncate" title={e.dream_label}>
                    {e.dream_label || <span className="italic text-slate-400">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {e.composite_top?.toFixed(2) ?? '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {e.dream_probability != null ? <span className="text-indigo-700 font-semibold">{e.dream_probability}%</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                    <button
                      onClick={() => setConfirmDel({ kind: 'one', id: e.id, name: e.name })}
                      title="Delete this entry"
                      className="h-7 w-7 grid place-items-center rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    >🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-slate-400">Click any row for an in-depth analysis of that student.</p>
      </div>

      {/* Modals via Portal */}
      {selected && (
        <PortalModal onClose={() => setSelected(null)}>
          <DetailModalBody entry={selected} onClose={() => setSelected(null)} />
        </PortalModal>
      )}

      {confirmDel && (
        <PortalModal onClose={deleting ? null : () => setConfirmDel(null)} maxWidthClass="max-w-md">
          <ConfirmModalBody
            kind={confirmDel.kind}
            name={confirmDel.name}
            count={confirmDel.kind === 'all' ? entries.length : 1}
            onCancel={() => setConfirmDel(null)}
            onConfirm={doDelete}
            busy={deleting}
          />
        </PortalModal>
      )}
    </div>
  );
}

/* ============================================================
   PORTAL MODAL — full-viewport backdrop
   ============================================================ */
function PortalModal({ children, onClose, maxWidthClass = 'max-w-3xl' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
  if (!mounted) return null;
  return createPortal(
    <div className="modal-fullscreen" onClick={onClose || undefined}>
      <div
        className={`card-solid w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >{children}</div>
    </div>,
    document.body
  );
}

/* ============================================================
   DETAIL MODAL
   ============================================================ */
function DetailModalBody({ entry, onClose }) {
  const scores = entry.scores || {};
  const codes = (entry.subjects_taken && entry.subjects_taken.length)
    ? entry.subjects_taken
    : Object.keys(scores);
  const subjItems = codes.map(c => ({
    code: c,
    name: SUBJECT_BY_CODE[c]?.name || c,
    group: SUBJECT_BY_CODE[c]?.group || '',
    score: scores[c]
  })).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div className="p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-slate-200">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Student detail</div>
          <h2 className="font-display text-3xl text-slate-900 mt-1">
            {entry.name || <span className="italic text-slate-400">anonymous</span>}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="badge badge-good">{entry.category}</span>
            <span className="text-slate-500">{new Date(entry.created_at).toLocaleString('en-IN')}</span>
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost px-3 py-1.5 text-sm">Close ×</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <Tile label="Composite score" value={entry.composite_top?.toFixed(2) ?? '—'} sub="best of any eligible program" />
        <Tile label="Subjects taken" value={codes.length} sub="CUET papers attempted" />
        <Tile label="Dream probability" value={entry.dream_probability != null ? `${entry.dream_probability}%` : '—'} sub="for selected dream" />
      </div>

      <Section title="Dream college selection">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          {entry.dream_label ? (
            <>
              <div className="text-sm font-semibold text-slate-900">{entry.dream_label}</div>
              {entry.dream_probability != null && (
                <div className="mt-1 text-xs text-amber-900">
                  Estimated admission probability: <b>{entry.dream_probability}%</b>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-slate-500 italic">No dream college selected — student opted to see all rankings.</div>
          )}
        </div>
      </Section>

      <Section title="Subject-wise NTA scores">
        <div className="space-y-2">
          {subjItems.map(it => {
            const pct = Math.min(100, (it.score / 250) * 100);
            const tone = pct >= 90 ? 'safe' : pct >= 80 ? 'good' : pct >= 65 ? 'mid' : 'risk';
            return (
              <div key={it.code} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-baseline justify-between mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] text-slate-400 tabular-nums">{it.code}</span>
                    <span className="text-sm font-semibold text-slate-900">{it.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">{it.group}</span>
                  </div>
                  <div className="font-mono tabular-nums text-slate-900 font-bold">
                    {it.score?.toFixed(2) ?? '—'} <span className="text-slate-300 text-xs">/ 250</span>
                  </div>
                </div>
                <div className={`bar bar-${tone}`}>
                  <div style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400 font-mono">id: {entry.id}</div>
        <details className="text-[11px]">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Show raw JSON</summary>
          <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 text-[10px] overflow-x-auto max-h-72">{JSON.stringify(entry, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}

/* ============================================================
   CONFIRM MODAL
   ============================================================ */
function ConfirmModalBody({ kind, name, count, onCancel, onConfirm, busy }) {
  return (
    <div className="p-6">
      <div className="h-12 w-12 rounded-full bg-rose-100 grid place-items-center text-2xl mx-auto mb-3">⚠️</div>
      <h3 className="font-display text-2xl text-slate-900 text-center">
        {kind === 'all' ? 'Delete ALL entries?' : 'Delete this entry?'}
      </h3>
      <p className="mt-2 text-sm text-slate-600 text-center">
        {kind === 'all'
          ? <>This will permanently delete all <b>{count}</b> submissions from Supabase. This cannot be undone.</>
          : <>This will permanently delete <b>{name || 'this entry'}</b> from Supabase. This cannot be undone.</>}
      </p>
      <div className="mt-5 flex gap-2">
        <button onClick={onCancel} disabled={busy} className="btn-ghost flex-1 py-2.5">Cancel</button>
        <button onClick={onConfirm} disabled={busy}
          className="flex-1 py-2.5 rounded-xl font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50">
          {busy ? 'Deleting…' : (kind === 'all' ? 'Yes, delete all' : 'Yes, delete')}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */
function KPI({ label, value, small, accent }) {
  const ring = {
    indigo: 'from-indigo-500 to-violet-600',
    emerald: 'from-emerald-500 to-teal-600',
    amber: 'from-amber-500 to-orange-600',
    rose: 'from-rose-500 to-pink-600'
  }[accent];
  return (
    <div className="card p-4 relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${ring} opacity-15`} />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
        <div className={`mt-1 font-bold text-slate-900 tabular-nums ${small ? 'text-sm leading-tight' : 'text-3xl'}`}>{value}</div>
      </div>
    </div>
  );
}
function Tile({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="font-display text-2xl text-slate-900 tabular-nums mt-1 leading-none">{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}
function Section({ title, children }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-bold mb-2">{title}</div>
      {children}
    </div>
  );
}
