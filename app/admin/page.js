'use client';

import { useEffect, useMemo, useState } from 'react';

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
    if (cached) { setPwd(cached); /* attempt auto */ }
  }, []);

  const view = useMemo(() => {
    let arr = entries;
    if (filterCat !== 'ALL') arr = arr.filter(e => e.category === filterCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(e => (e.name || '').toLowerCase().includes(q) || (e.dream_label||'').toLowerCase().includes(q));
    }
    arr = [...arr];
    if (sort === 'DATE')  arr.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    if (sort === 'SCORE') arr.sort((a,b)=>(b.composite_top??-1)-(a.composite_top??-1));
    if (sort === 'PROB')  arr.sort((a,b)=>(b.dream_probability??-1)-(a.dream_probability??-1));
    return arr;
  }, [entries, filterCat, search, sort]);

  function downloadCSV() {
    const headers = ['created_at','name','category','dream_label','composite_top','dream_probability','subjects_taken','scores'];
    const rows = view.map(e => headers.map(h => {
      const v = e[h];
      if (Array.isArray(v)) return '"' + v.join('|') + '"';
      if (typeof v === 'object' && v !== null) return '"' + JSON.stringify(v).replace(/"/g,'""') + '"';
      const s = (v ?? '').toString().replace(/"/g,'""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cuet_du_submissions_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (!auth) {
    return (
      <div className="max-w-md mx-auto mt-12 card p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-1">🔐 Owner Dashboard</h1>
        <p className="text-sm text-slate-500 mb-4">Enter the admin password to continue.</p>
        <form onSubmit={login} className="space-y-3">
          <input type="password" value={pwd} onChange={(e)=>setPwd(e.target.value)}
            placeholder="Admin password"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white" />
          {err && <div className="text-sm text-rose-600">{err}</div>}
          <button disabled={busy} className="w-full py-2.5 rounded-lg bg-brand-600 text-white font-medium disabled:opacity-50">
            {busy ? 'Verifying…' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">📊 Admin Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Total submissions" value={summary?.total ?? 0} />
        <KPI label="Today" value={summary?.today ?? 0} />
        <KPI label="Avg composite" value={summary?.avg ?? '—'} />
        <KPI label="Top dream" value={summary?.popular || '—'} small />
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name / dream…"
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm flex-1 min-w-[180px]" />
          <select value={filterCat} onChange={(e)=>setFilterCat(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm">
            <option value="ALL">All categories</option>
            <option value="UR">UR</option>
            <option value="OBC">OBC</option>
            <option value="SC">SC</option>
            <option value="ST">ST</option>
            <option value="EWS">EWS</option>
            <option value="PwBD">PwBD</option>
          </select>
          <select value={sort} onChange={(e)=>setSort(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm">
            <option value="DATE">Sort: Date</option>
            <option value="SCORE">Sort: Composite</option>
            <option value="PROB">Sort: Dream Prob</option>
          </select>
          <button onClick={downloadCSV}
            className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700">
            ⬇️ Export CSV ({view.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Cat</th>
                <th className="py-2 pr-3">Dream</th>
                <th className="py-2 pr-3 text-right">Composite</th>
                <th className="py-2 pr-3 text-right">Dream P</th>
              </tr>
            </thead>
            <tbody>
              {view.length === 0 && (
                <tr><td colSpan="6" className="py-6 text-center text-slate-500">No entries yet.</td></tr>
              )}
              {view.map(e => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-3 text-xs text-slate-500 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-3 font-medium text-slate-900">{e.name || <span className="text-slate-400 italic">anon</span>}</td>
                  <td className="py-2 pr-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-100 text-brand-800">{e.category}</span></td>
                  <td className="py-2 pr-3 text-slate-700 max-w-xs truncate">{e.dream_label || <span className="text-slate-400 italic">—</span>}</td>
                  <td className="py-2 pr-3 text-right font-mono">{e.composite_top?.toFixed(2) ?? '—'}</td>
                  <td className="py-2 pr-3 text-right font-mono">{e.dream_probability != null ? `${e.dream_probability}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, small }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-bold text-slate-900 ${small ? 'text-sm' : 'text-2xl'}`}>{value}</div>
    </div>
  );
}
