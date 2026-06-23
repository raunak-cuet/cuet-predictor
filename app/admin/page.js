'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [selected, setSelected] = useState(null);          // entry currently shown in detail modal
  const [confirmDel, setConfirmDel] = useState(null);      // { kind: 'one'|'all', id? }
  const [deleting, setDeleting] = useState(false);

  async function login(e) {
    e?.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/entries?password=${encodeURIComponent(pwd)}`);
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Login failed'); setBusy(false); return; }
      setSummary(j.summary);
      setEntries(j.entries || []);
      setAuth(true);
      sessionStorage.setItem('cuet:admin', pwd);
    } catch { setErr('Network error'); }
    setBusy(false);
  }

  async function refresh() {
    try {
      const r = await fetch(`/api/admin/entries?password=${encodeURIComponent(pwd)}`);
      const j = await r.json();
      if (r.ok) { setSummary(j.summary); setEntries(j.entries || []); }
    } catch {}
  }

  async function doDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      const body = confirmDel.kind === 'all'
        ? { password: pwd, all: true }
        : { password: pwd, ids: [confirmDel.id] };
      const r = await fetch('/api/admin/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok) { alert('Delete failed: ' + (j.error || 'unknown error')); setDeleting(false); return; }
      // Optimistic UI update
      if (confirmDel.kind === 'all') setEntries([]);
      else setEntries(prev => prev.filter(e => e.id !== confirmDel.id));
      if (selected?.id === confirmDel.id) setSelected(null);
      setConfirmDel(null);
      await refresh();
    } catch {
      alert('Network error while deleting');
    }
    setDeleting(false);
  }

  useEffect(() => {
    const cached = sessionStorage.getItem('cuet:admin');
    if (cached) setPwd(cached);
  }, []);

  const view = useMemo(() => {
    let arr = entries;
    if (filterCat !== 'ALL') arr = arr.filter(e => e.category === filterCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(e => (e.name || '').toLowerCase().includes(q) || (e.dream_label || '').toLowerCase().includes(q));
    }
    arr = [...arr];
    if (sort === 'DATE')  arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sort === 'SCORE') arr.sort((a, b) => (b.composite_top ?? -1) - (a.composite_top ?? -1));
    if (sort === 'PROB')  arr.sort((a, b) => (b.dream_probability ?? -1) - (a.dream_probability ?? -1));
    if (sort === 'NAME')  arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return arr;
  }, [entries, filterCat, search, sort]);

  function downloadCSV() {
    // CSV: identity columns + all subjects + summary — for admin export only
    const allCodes = Array.from(new Set(entries.flatMap(e => Object.keys(e.scores || {})))).sort();
    const baseHeaders = ['created_at', 'name', 'category', 'dream_label', 'composite_top', 'dream_probability'];
    const subjectHeaders = allCodes.map(c => `${c}_${(SUBJECT_BY_CODE[c]?.name || c).replace(/[^\w]/g, '').slice(0, 12)}`);
    const headers = [...baseHeaders, ...subjectHeaders];
    const rows = view.map(e => {
      const base = baseHeaders.map(h => {
        const v = e[h];
        const s = (v ?? '').toString().replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      });
      const subs = allCodes.map(c => (e.scores?.[c] ?? '').toString());
      return [...base, ...subs].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cuet_du_submissions_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (!auth) {
    return (
      <div className="max-w-md mx-auto mt-16 animate-in">
        <div className="card p-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 grid place-items-center text-white text-xl mx-auto mb-4">🔐</div>
          <h1 className="font-display text-3xl text-center text-slate-900 mb-1">Owner Dashboard</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Enter the admin password to continue.</p>
          <form onSubmit={login} className="space-y-3">
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••••••" className="field" autoFocus />
            {err && <div className="text-sm text-rose-600 px-1">{err}</div>}
            <button disabled={busy} className="btn-primary w-full py-3">
              {busy ? 'Verifying…' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Internal</div>
          <h1 className="font-display text-4xl text-slate-900">Owner Dashboard</h1>
        </div>
        <button
          onClick={() => setConfirmDel({ kind: 'all' })}
          disabled={entries.length === 0}
          className="px-3 py-2 rounded-lg text-sm font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-40 disabled:cursor-not-allowed">
          🗑 Delete all entries
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Total submissions" value={summary?.total ?? 0} accent="indigo" />
        <KPI label="Today" value={summary?.today ?? 0} accent="emerald" />
        <KPI label="Avg composite" value={summary?.avg ?? '—'} accent="amber" />
        <KPI label="Top dream pick" value={summary?.popular || '—'} small accent="rose" />
      </div>

      {/* Filters + table */}
      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / dream college…"
            className="field !py-2 text-sm flex-1 min-w-[200px]" />
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="field !py-2 text-sm">
            <option value="ALL">All categories</option>
            <option value="UR">UR</option><option value="OBC">OBC</option><option value="SC">SC</option>
            <option value="ST">ST</option><option value="EWS">EWS</option><option value="PwBD">PwBD</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="field !py-2 text-sm">
            <option value="DATE">Sort: Date</option>
            <option value="NAME">Sort: Name</option>
            <option value="SCORE">Sort: Composite</option>
            <option value="PROB">Sort: Dream Prob.</option>
          </select>
          <button onClick={downloadCSV} className="btn-primary !rounded-xl text-sm px-4 py-2">
            ⬇️ Export CSV ({view.length})
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
                  <td className="py-2.5 px-3">
                    <span className="badge badge-good">{e.category}</span>
                  </td>
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
                      className="h-7 w-7 grid place-items-center rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-700">
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-slate-400">Click any row for an in-depth analysis of that student.</p>
      </div>

      {/* ===== Detail modal ===== */}
      {selected && (
        <DetailModal entry={selected} onClose={() => setSelected(null)} />
      )}

      {/* ===== Confirm-delete modal ===== */}
      {confirmDel && (
        <ConfirmModal
          kind={confirmDel.kind}
          name={confirmDel.name}
          count={confirmDel.kind === 'all' ? entries.length : 1}
          onCancel={() => setConfirmDel(null)}
          onConfirm={doDelete}
          busy={deleting}
        />
      )}
    </div>
  );
}

/* ===================================================================
   DETAIL MODAL — Click a row → see full student analysis
   =================================================================== */
function DetailModal({ entry, onClose }) {
  const scores = entry.scores || {};
  const codes = (entry.subjects_taken && entry.subjects_taken.length) ? entry.subjects_taken : Object.keys(scores);
  const subjItems = codes.map(c => ({
    code: c,
    name: SUBJECT_BY_CODE[c]?.name || c,
    group: SUBJECT_BY_CODE[c]?.group || '',
    score: scores[c]
  })).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card-solid max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 sm:p-7">
          {/* Header */}
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

          {/* Key results */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <Tile label="Composite score" value={entry.composite_top?.toFixed(2) ?? '—'} sub="best of any eligible program" />
            <Tile label="Subjects taken" value={codes.length} sub="CUET papers attempted" />
            <Tile label="Dream probability" value={entry.dream_probability != null ? `${entry.dream_probability}%` : '—'} sub="for selected dream" />
          </div>

          {/* Dream */}
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

          {/* Subject-wise scores — visual */}
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
                      <div className="font-mono tabular-nums text-slate-900 font-bold">{it.score?.toFixed(2) ?? '—'} <span className="text-slate-300 text-xs">/ 250</span></div>
                    </div>
                    <div className={`bar bar-${tone}`}>
                      <div style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Footer with delete inside detail modal */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 font-mono">id: {entry.id}</div>
            <details className="text-[11px]">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Show raw JSON</summary>
              <pre className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 text-[10px] overflow-x-auto max-h-72">{JSON.stringify(entry, null, 2)}</pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================================
   CONFIRMATION MODAL
   =================================================================== */
function ConfirmModal({ kind, name, count, onCancel, onConfirm, busy }) {
  return (
    <div className="modal-backdrop !z-[110]" onClick={busy ? undefined : onCancel}>
      <div className="card-solid max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}

/* ===================================================================
   SHARED
   =================================================================== */
function KPI({ label, value, small, accent }) {
  const ring = { indigo: 'from-indigo-500 to-violet-600', emerald: 'from-emerald-500 to-teal-600', amber: 'from-amber-500 to-orange-600', rose: 'from-rose-500 to-pink-600' }[accent];
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
