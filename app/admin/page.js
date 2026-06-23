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
  const [expandedId, setExpandedId] = useState(null);

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

  useEffect(() => {
    const cached = sessionStorage.getItem('cuet:admin');
    if (cached) setPwd(cached);
  }, []);

  // Discover ALL subject codes used across all entries (so columns are dynamic)
  const allSubjectCodes = useMemo(() => {
    const set = new Set();
    for (const e of entries) {
      if (e.scores && typeof e.scores === 'object') {
        Object.keys(e.scores).forEach(c => set.add(c));
      }
    }
    return Array.from(set).sort();
  }, [entries]);

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
    // CSV header: identity columns + one column per subject + summary columns
    const baseHeaders = ['created_at', 'name', 'category', 'dream_label', 'composite_top', 'dream_probability'];
    const subjectHeaders = allSubjectCodes.map(c => `${c}_${(SUBJECT_BY_CODE[c]?.name || c).replace(/[^\w]/g,'').slice(0,12)}`);
    const headers = [...baseHeaders, ...subjectHeaders];

    const rows = view.map(e => {
      const base = baseHeaders.map(h => {
        const v = e[h];
        const s = (v ?? '').toString().replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      });
      const subs = allSubjectCodes.map(c => (e.scores?.[c] ?? '').toString());
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
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Internal</div>
        <h1 className="font-display text-4xl text-slate-900">Owner Dashboard</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Total submissions" value={summary?.total ?? 0} accent="indigo" />
        <KPI label="Today" value={summary?.today ?? 0} accent="emerald" />
        <KPI label="Avg composite" value={summary?.avg ?? '—'} accent="amber" />
        <KPI label="Top dream pick" value={summary?.popular || '—'} small accent="rose" />
      </div>

      {/* Filters */}
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

        {/* TABLE — one row per submission, one column per subject */}
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider">
                <Th sticky>Date</Th>
                <Th>Name</Th>
                <Th>Cat</Th>
                <Th>Dream</Th>
                {allSubjectCodes.map(c => (
                  <Th key={c} center title={SUBJECT_BY_CODE[c]?.name}>
                    <div className="font-mono">{c}</div>
                    <div className="font-normal text-[9px] opacity-70 normal-case truncate max-w-[80px] mx-auto">
                      {SUBJECT_BY_CODE[c]?.name?.split('/')[0] || ''}
                    </div>
                  </Th>
                ))}
                <Th right>Composite</Th>
                <Th right>Dream %</Th>
              </tr>
            </thead>
            <tbody>
              {view.length === 0 && (
                <tr><td colSpan={6 + allSubjectCodes.length} className="py-10 text-center text-slate-500">No entries yet.</td></tr>
              )}
              {view.map(e => (
                <tr key={e.id}
                    onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                    className="hover:bg-slate-50 cursor-pointer transition">
                  <Td muted nowrap>{new Date(e.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Td>
                  <Td bold>{e.name || <span className="italic text-slate-400">anonymous</span>}</Td>
                  <Td><span className="badge badge-good">{e.category}</span></Td>
                  <Td muted truncate>{e.dream_label || <span className="italic">—</span>}</Td>
                  {allSubjectCodes.map(c => (
                    <Td key={c} center mono>
                      {typeof e.scores?.[c] === 'number'
                        ? <span className="text-slate-900 font-medium">{e.scores[c].toFixed(1)}</span>
                        : <span className="text-slate-300">—</span>}
                    </Td>
                  ))}
                  <Td right bold mono>{e.composite_top?.toFixed(2) ?? '—'}</Td>
                  <Td right mono>{e.dream_probability != null ? <span className="text-indigo-700 font-semibold">{e.dream_probability}%</span> : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-slate-400">Click any row for raw JSON. CSV includes all subject columns.</p>

        {expandedId && (
          <div className="mt-4 rounded-xl bg-slate-900 text-slate-100 p-4 text-[11px] font-mono overflow-x-auto">
            <pre>{JSON.stringify(entries.find(e => e.id === expandedId), null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== Components ========== */
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
function Th({ children, sticky, center, right, title }) {
  const base = `px-2 py-2 border-b border-slate-200 ${center ? 'text-center' : right ? 'text-right' : 'text-left'} ${sticky ? 'bg-white sticky left-0 z-10' : ''}`;
  return <th className={base} title={title}>{children}</th>;
}
function Td({ children, muted, bold, center, right, mono, nowrap, truncate }) {
  return <td className={`px-2 py-2 border-b border-slate-100 ${muted ? 'text-slate-500' : 'text-slate-700'} ${bold ? 'font-semibold text-slate-900' : ''} ${center ? 'text-center' : right ? 'text-right' : ''} ${mono ? 'font-mono tabular-nums' : ''} ${nowrap ? 'whitespace-nowrap' : ''} ${truncate ? 'max-w-xs truncate' : ''}`}>{children}</td>;
}
