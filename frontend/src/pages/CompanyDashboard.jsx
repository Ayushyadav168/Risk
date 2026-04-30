import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Building2, Search, Plus, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp,
  BarChart3, DollarSign, BookOpen, Zap, Shield, Trash2, Globe,
  X, Copy, ExternalLink, Activity, Landmark, Info
} from 'lucide-react'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { companyAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'

/* ── tiny helpers ─────────────────────────────────────────────────────────── */
const fmt = (v, prefix = '', suffix = '') =>
  v != null ? `${prefix}${Number(v).toLocaleString('en-IN')}${suffix}` : '—'

const SEVERITY_COLOR = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-emerald-400' }
const REC_BADGE = {
  buy:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  hold:    'bg-amber-500/15  text-amber-400  border-amber-500/25',
  avoid:   'bg-red-500/15    text-red-400    border-red-500/25',
  monitor: 'bg-blue-500/15   text-blue-400   border-blue-500/25',
}

const INDUSTRIES = [
  'Banking / NBFC', 'Technology / SaaS', 'Manufacturing', 'E-Commerce',
  'Healthcare / Pharma', 'Logistics', 'Real Estate', 'FMCG / Retail',
  'Energy / Oil & Gas', 'Telecom', 'Auto / EV', 'Insurance', 'Other',
]

/* ── score gauge ──────────────────────────────────────────────────────────── */
function ScoreGauge({ score, label, color }) {
  const pct = Math.min(100, Math.max(0, ((score || 0) / 10) * 100))
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-18 h-18">
        <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-white">{score?.toFixed(1) ?? '—'}</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 text-center">{label}</p>
    </div>
  )
}

/* ── metric card ──────────────────────────────────────────────────────────── */
function Metric({ label, value, sub }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
      <p className="text-[10px] text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-white">{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ── search suggestions dropdown ──────────────────────────────────────────── */
function CompanySearchInput({ onSelect }) {
  const [query, setQuery]           = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]       = useState(false)
  const [open, setOpen]             = useState(false)
  const [fetching, setFetching]     = useState(false)
  const [error, setError]           = useState('')
  const debounceRef = useRef(null)
  const wrapRef     = useRef(null)

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Debounced search
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await companyAPI.searchSuggestions(q)
      setSuggestions(res.data || [])
      setOpen(true)
    } catch { setSuggestions([]) }
    finally { setLoading(false) }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    setError('')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 350)
  }

  const handleSelect = async (suggestion) => {
    setOpen(false)
    setQuery(suggestion.name)
    setSuggestions([])
    setError('')
    setFetching(true)
    try {
      const res = await companyAPI.fetchAndSave(suggestion.ticker)
      onSelect(res.data)
      setQuery('')
    } catch (e) {
      setError(e.response?.data?.detail || `Could not fetch ${suggestion.ticker}`)
    } finally { setFetching(false) }
  }

  const handleManualFetch = async () => {
    const ticker = query.trim().toUpperCase()
    if (!ticker) return
    setFetching(true)
    setError('')
    setOpen(false)
    try {
      const res = await companyAPI.fetchAndSave(ticker)
      onSelect(res.data)
      setQuery('')
    } catch (e) {
      setError(e.response?.data?.detail || `Could not fetch "${ticker}". Try the exact NSE/BSE ticker.`)
    } finally { setFetching(false) }
  }

  return (
    <div ref={wrapRef} className="space-y-2">
      <div className="relative">
        <div className={`flex items-center gap-2 bg-white/[0.04] border rounded-xl px-3 py-2.5 transition-all ${open ? 'border-indigo-500/50' : 'border-white/[0.08]'}`}>
          {fetching
            ? <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
            : <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />}
          <input
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono uppercase"
            placeholder="Search company or ticker… e.g. RELIANCE"
            value={query}
            onChange={handleChange}
            onKeyDown={e => e.key === 'Enter' && handleManualFetch()}
          />
          {query && (
            <button onClick={() => { setQuery(''); setSuggestions([]); setOpen(false); setError('') }}
              className="text-slate-600 hover:text-slate-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#0f1729] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-slate-500 text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />Searching…
              </div>
            )}
            {suggestions.map((s) => (
              <button key={s.ticker} onClick={() => handleSelect(s)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors text-left border-b border-white/[0.04] last:border-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-indigo-400">{s.ticker.slice(0, 2)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{s.name}</p>
                  <p className="text-xs font-mono text-slate-500">{s.ticker}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <button onClick={handleManualFetch} disabled={!query.trim() || fetching}
        className="w-full btn-primary justify-center disabled:opacity-40">
        {fetching
          ? <><RefreshCw className="w-4 h-4 animate-spin" />Fetching data…</>
          : <><Search className="w-4 h-4" />Fetch &amp; Analyze</>}
      </button>
      <p className="text-[10px] text-slate-600 text-center">
        Powered by Screener.in · NSE/BSE data · Auto AI analysis
      </p>
    </div>
  )
}

/* ── manual add modal ─────────────────────────────────────────────────────── */
function ManualModal({ onAdd, onClose }) {
  const [form, setForm] = useState({
    name: '', industry: '', sector: '', website: '', description: '',
    revenue: '', net_profit: '', total_assets: '', total_liabilities: '',
    equity: '', pe_ratio: '', roe: '', roce: '', debt_to_equity: '',
    current_ratio: '', market_cap: '',
  })
  const [saving, setSaving] = useState(false)

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const numFields = ['revenue','net_profit','total_assets','total_liabilities','equity',
        'pe_ratio','roe','roce','debt_to_equity','current_ratio','market_cap']
      const payload = { ...form, is_listed: false }
      numFields.forEach(k => { if (form[k]) payload[k] = parseFloat(form[k]) })
      const res = await companyAPI.create(payload)
      onAdd(res.data)
      onClose()
    } catch (e) { alert(e.response?.data?.detail || 'Failed to add company') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f1729] border border-white/[0.08] rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-white text-sm">Add Private Company</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Company Name *</label>
              <input className="input-field" placeholder="e.g. Acme Corp Pvt Ltd" value={form.name} onChange={f('name')} required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Industry</label>
              <select className="input-field" value={form.industry} onChange={f('industry')}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Sector</label>
              <input className="input-field" placeholder="e.g. IT Services" value={form.sector} onChange={f('sector')} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Website</label>
              <input className="input-field" placeholder="https://..." value={form.website} onChange={f('website')} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Description</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Brief company description…" value={form.description} onChange={f('description')} />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Financials (₹ Crores)</p>
            <div className="grid grid-cols-3 gap-3">
              {[['Revenue','revenue'],['Net Profit','net_profit'],['Market Cap','market_cap'],
                ['Total Assets','total_assets'],['Total Liabilities','total_liabilities'],['Net Worth','equity']].map(([lbl,k]) => (
                <div key={k}>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">{lbl}</label>
                  <input type="number" step="any" className="input-field" value={form[k]} onChange={f(k)} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Ratios</p>
            <div className="grid grid-cols-3 gap-3">
              {[['P/E Ratio','pe_ratio'],['ROE (%)','roe'],['ROCE (%)','roce'],
                ['Debt / Equity','debt_to_equity'],['Current Ratio','current_ratio']].map(([lbl,k]) => (
                <div key={k}>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">{lbl}</label>
                  <input type="number" step="any" className="input-field" value={form[k]} onChange={f(k)} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving || !form.name.trim()} className="btn-primary flex-1 justify-center">
              {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Saving…</> : <><Plus className="w-4 h-4" />Add Company</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── custom tooltip for recharts ─────────────────────────────────────────── */
const DarkTooltip = ({ active, payload, label, prefix = '₹', suffix = ' Cr' }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0f1729] border border-white/[0.08] rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.dataKey}: {prefix}{Number(p.value || 0).toLocaleString('en-IN')}{suffix}
        </p>
      ))}
    </div>
  )
}

/* ── main page ────────────────────────────────────────────────────────────── */
export default function CompanyDashboard() {
  const { globalRefreshKey } = useRefresh()
  const [companies, setCompanies]   = useState([])
  const [selected, setSelected]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [analyzing, setAnalyzing]   = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [activeTab, setActiveTab]   = useState('overview')
  const [expandSwot, setExpandSwot] = useState(false)

  useEffect(() => { loadCompanies() }, [globalRefreshKey])

  const loadCompanies = async () => {
    setLoading(true)
    try {
      const res = await companyAPI.list()
      const data = res.data || []
      setCompanies(data)
      if (data.length && !selected) setSelected(data[0])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleFetched = (company) => {
    setCompanies(prev => {
      const exists = prev.find(c => c.id === company.id)
      return exists ? prev.map(c => c.id === company.id ? company : c) : [company, ...prev]
    })
    setSelected(company)
    setActiveTab('overview')
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this company?')) return
    try {
      await companyAPI.delete(id)
      const remaining = companies.filter(c => c.id !== id)
      setCompanies(remaining)
      setSelected(remaining[0] || null)
    } catch { alert('Failed to delete') }
  }

  const handleAnalyze = async () => {
    if (!selected) return
    setAnalyzing(true)
    try {
      const res = await companyAPI.analyze(selected.id)
      const a = res.data.analysis
      const updated = {
        ...selected,
        ai_analysis: JSON.stringify(a),
        risk_score: a.risk_score,
        growth_score: a.growth_score,
        opportunities: a.opportunities,
        threats: a.threats,
      }
      setSelected(updated)
      setCompanies(prev => prev.map(c => c.id === selected.id ? updated : c))
    } catch { alert('Analysis failed. Check API key.') }
    finally { setAnalyzing(false) }
  }

  const getAnalysis = () => {
    if (!selected?.ai_analysis) return null
    try { return typeof selected.ai_analysis === 'string' ? JSON.parse(selected.ai_analysis) : selected.ai_analysis }
    catch { return null }
  }

  const analysis = getAnalysis()

  const incomeData = (() => {
    const is = selected?.income_statement
    if (!is?.years?.length) return []
    return is.years.map((yr, i) => ({
      year: yr,
      Revenue: is.revenue?.[i],
      Profit: is.profit?.[i],
    })).filter(d => d.Revenue || d.Profit)
  })()

  const bsData = (() => {
    const bs = selected?.balance_sheet
    if (!bs?.years?.length) return []
    return bs.years.map((yr, i) => ({
      year: yr,
      Assets: bs.assets?.[i],
      Liabilities: bs.liabilities?.[i],
      Equity: bs.equity?.[i],
    })).filter(d => d.Assets)
  })()

  const quarterlyData = (() => {
    const qr = selected?.quarterly_results
    if (!qr?.quarters?.length) return []
    return qr.quarters.map((q, i) => ({
      quarter: q,
      Revenue: qr.revenue?.[i],
      Profit: qr.profit?.[i],
    })).filter(d => d.Revenue || d.Profit).slice(-8)
  })()

  const TABS = [
    { id: 'overview',      label: 'Overview',      icon: BarChart3 },
    { id: 'financials',    label: 'Financials',    icon: DollarSign },
    { id: 'balance_sheet', label: 'Balance Sheet', icon: BookOpen },
    { id: 'analysis',      label: 'AI Analysis',   icon: Zap },
  ]

  return (
    <div className="flex gap-5 animate-fade-up" style={{ minHeight: 'calc(100vh - 130px)' }}>

      {/* ── Left Sidebar ────────────────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4">

        {/* Search / fetch */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Search Company</span>
          </div>
          <CompanySearchInput onSelect={handleFetched} />
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-slate-600">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <button onClick={() => setShowManual(true)} className="btn-secondary w-full justify-center text-xs">
            <Building2 className="w-3.5 h-3.5" />Add Private Company
          </button>
        </div>

        {/* Company list */}
        <div className="card flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Portfolio ({companies.length})
            </span>
            <button onClick={loadCompanies} disabled={loading}
              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Building2 className="w-10 h-10 text-slate-700 mb-2" />
              <p className="text-sm text-slate-500">No companies yet</p>
              <p className="text-xs text-slate-600 mt-0.5">Search for a ticker above</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
              {companies.map(c => (
                <button key={c.id} onClick={() => { setSelected(c); setActiveTab('overview') }}
                  className={`w-full text-left px-4 py-3 transition-all hover:bg-white/[0.03] ${selected?.id === c.id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.ticker && <span className="text-[10px] font-mono text-indigo-400">{c.ticker}</span>}
                        {c.is_listed
                          ? <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-md">Listed</span>
                          : <span className="text-[10px] bg-slate-500/15 text-slate-400 px-1.5 py-0.5 rounded-md">Private</span>}
                      </div>
                      {c.industry && <p className="text-[10px] text-slate-600 mt-0.5 truncate">{c.industry}</p>}
                    </div>
                    {c.risk_score != null && (
                      <span className={`text-xs font-bold flex-shrink-0 ${c.risk_score >= 7 ? 'text-red-400' : c.risk_score >= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {c.risk_score.toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Panel ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {!selected ? (
          <div className="card flex flex-col items-center justify-center h-full py-20 text-center">
            <Building2 className="w-16 h-16 text-slate-700 mb-4" />
            <p className="text-lg font-semibold text-slate-400">No company selected</p>
            <p className="text-sm text-slate-600 mt-1">Search for an NSE/BSE ticker or add a private company</p>
          </div>
        ) : (
          <>
            {/* Company header */}
            <div className="card p-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-lg shadow-indigo-500/25">
                    {selected.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold text-white">{selected.name}</h1>
                      {selected.ticker && (
                        <span className="font-mono text-xs bg-white/[0.06] border border-white/[0.08] text-slate-300 px-2 py-0.5 rounded-md">
                          {selected.exchange}:{selected.ticker}
                        </span>
                      )}
                      {analysis?.recommendation && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${REC_BADGE[analysis.recommendation] || REC_BADGE.monitor}`}>
                          {analysis.recommendation}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {selected.industry || 'Industry not set'}
                      {selected.sector ? ` · ${selected.sector}` : ''}
                    </p>
                    {selected.description && (
                      <p className="text-xs text-slate-600 mt-1 max-w-lg line-clamp-2">{selected.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={handleAnalyze} disabled={analyzing}
                    className="btn-secondary text-xs">
                    {analyzing
                      ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Analyzing…</>
                      : <><Zap className="w-3.5 h-3.5 text-amber-400" />AI Analysis</>}
                  </button>
                  <button onClick={() => handleDelete(selected.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(selected.risk_score != null || selected.growth_score != null) && (
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/[0.05]">
                  <ScoreGauge score={selected.risk_score}   label="Risk Score"   color="#f87171" />
                  <ScoreGauge score={selected.growth_score} label="Growth Score" color="#34d399" />
                  {analysis?.executive_summary && (
                    <p className="flex-1 text-xs text-slate-500 italic leading-relaxed">
                      "{analysis.executive_summary}"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium flex-1 justify-center transition-all ${
                    activeTab === id
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>

            {/* ── Overview tab ─────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />Key Metrics
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <Metric label="Market Cap"      value={fmt(selected.market_cap,    '₹', ' Cr')} />
                    <Metric label="Revenue (TTM)"   value={fmt(selected.revenue,       '₹', ' Cr')} />
                    <Metric label="Net Profit"       value={fmt(selected.net_profit,    '₹', ' Cr')} />
                    <Metric label="Current Price"    value={fmt(selected.current_price, '₹')} />
                    <Metric label="P/E Ratio"        value={selected.pe_ratio != null ? selected.pe_ratio.toFixed(1) : '—'} />
                    <Metric label="P/B Ratio"        value={selected.pb_ratio != null ? selected.pb_ratio.toFixed(2) : '—'} />
                    <Metric label="ROE %"            value={selected.roe       != null ? `${selected.roe.toFixed(1)}%` : '—'} />
                    <Metric label="ROCE %"           value={selected.roce      != null ? `${selected.roce.toFixed(1)}%` : '—'} />
                    <Metric label="Debt / Equity"    value={selected.debt_to_equity  != null ? selected.debt_to_equity.toFixed(2) : '—'} />
                    <Metric label="Current Ratio"    value={selected.current_ratio   != null ? selected.current_ratio.toFixed(2) : '—'} />
                    <Metric label="Dividend Yield"   value={selected.dividend_yield  != null ? `${selected.dividend_yield.toFixed(2)}%` : '—'} />
                    <Metric label="EPS"              value={fmt(selected.eps, '₹')} />
                  </div>
                </div>

                {/* SWOT */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-400" />SWOT Analysis
                    </h3>
                    <button onClick={() => setExpandSwot(v => !v)} className="text-slate-500 hover:text-white transition-colors">
                      {expandSwot ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'strengths',    label: 'Strengths',    icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/15' },
                      { key: 'weaknesses',   label: 'Weaknesses',   icon: XCircle,     color: 'text-red-400',     bg: 'bg-red-500/5 border-red-500/15' },
                      { key: 'opportunities',label: 'Opportunities', icon: TrendingUp,  color: 'text-blue-400',    bg: 'bg-blue-500/5 border-blue-500/15' },
                      { key: 'threats',      label: 'Threats',      icon: AlertTriangle,color:'text-amber-400',   bg: 'bg-amber-500/5 border-amber-500/15' },
                    ].map(({ key, label, icon: Icon, color, bg }) => {
                      const items = selected[key] || []
                      const display = expandSwot ? items : items.slice(0, 3)
                      return (
                        <div key={key} className={`rounded-xl p-3 border ${bg}`}>
                          <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold ${color}`}>
                            <Icon className="w-3.5 h-3.5" />{label}
                          </div>
                          {display.length > 0 ? (
                            <ul className="space-y-1">
                              {display.map((item, i) => (
                                <li key={i} className="text-xs text-slate-400 flex gap-1.5">
                                  <span className="mt-0.5 flex-shrink-0 text-slate-600">•</span>{item}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-600 italic">Run AI analysis to generate</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Quarterly chart */}
                {quarterlyData.length > 0 && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Quarterly Performance (₹ Cr)</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={quarterlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip content={<DarkTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Revenue" fill="#6366F1" radius={[4,4,0,0]} />
                        <Bar dataKey="Profit"  fill="#34d399" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ── Financials tab ───────────────────────────────────────── */}
            {activeTab === 'financials' && (
              <div className="space-y-4">
                {incomeData.length > 0 ? (
                  <>
                    <div className="card p-5">
                      <h3 className="text-sm font-semibold text-white mb-4">Annual Revenue &amp; Profit (₹ Cr)</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={incomeData}>
                          <defs>
                            <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="proG" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#34d399" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip content={<DarkTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Area type="monotone" dataKey="Revenue" stroke="#6366F1" fill="url(#revG)" strokeWidth={2} />
                          <Area type="monotone" dataKey="Profit"  stroke="#34d399" fill="url(#proG)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card p-5 overflow-x-auto">
                      <h3 className="text-sm font-semibold text-white mb-4">Annual Financials</h3>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left py-2 text-slate-500">Metric</th>
                            {incomeData.map(d => <th key={d.year} className="text-right py-2 px-3 text-slate-500">{d.year}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {['Revenue','Profit'].map(m => (
                            <tr key={m} className="hover:bg-white/[0.02]">
                              <td className="py-2 font-medium text-slate-300">{m} (₹ Cr)</td>
                              {incomeData.map(d => (
                                <td key={d.year} className="text-right py-2 px-3 text-slate-400 font-mono">
                                  {d[m] != null ? Number(d[m]).toLocaleString('en-IN') : '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="card flex flex-col items-center justify-center py-16">
                    <BarChart3 className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-slate-400 font-medium">No financial data</p>
                    <p className="text-xs text-slate-600 mt-1">Fetch a listed company by NSE/BSE ticker to see financials</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Balance Sheet tab ────────────────────────────────────── */}
            {activeTab === 'balance_sheet' && (
              <div className="space-y-4">
                {bsData.length > 0 ? (
                  <>
                    <div className="card p-5">
                      <h3 className="text-sm font-semibold text-white mb-4">Balance Sheet Trend (₹ Cr)</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={bsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="year"  tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip content={<DarkTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Assets"      fill="#6366F1" radius={[4,4,0,0]} />
                          <Bar dataKey="Liabilities" fill="#f87171" radius={[4,4,0,0]} />
                          <Bar dataKey="Equity"      fill="#34d399" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Total Assets',      value: fmt(selected.total_assets,      '₹', ' Cr'), color: 'text-indigo-400' },
                        { label: 'Total Liabilities', value: fmt(selected.total_liabilities, '₹', ' Cr'), color: 'text-red-400'    },
                        { label: 'Net Worth',         value: fmt(selected.equity,            '₹', ' Cr'), color: 'text-emerald-400'},
                      ].map(({ label, value, color }) => (
                        <div key={label} className="card p-4 text-center">
                          <p className="text-xs text-slate-500 mb-1">{label}</p>
                          <p className={`text-xl font-black ${color}`}>{value}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">Crores</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="card flex flex-col items-center justify-center py-16">
                    <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-slate-400 font-medium">No balance sheet data</p>
                  </div>
                )}
              </div>
            )}

            {/* ── AI Analysis tab ──────────────────────────────────────── */}
            {activeTab === 'analysis' && (
              <div className="space-y-4">
                {!analysis ? (
                  <div className="card flex flex-col items-center justify-center py-16">
                    <Zap className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-slate-400 font-medium">No analysis yet</p>
                    <p className="text-xs text-slate-600 mt-1 mb-4">Click below to run AI-powered risk &amp; growth analysis</p>
                    <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary">
                      {analyzing
                        ? <><RefreshCw className="w-4 h-4 animate-spin" />Analyzing…</>
                        : <><Zap className="w-4 h-4" />Run AI Analysis</>}
                    </button>
                  </div>
                ) : (
                  <>
                    {analysis.key_risks?.length > 0 && (
                      <div className="card p-5">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />Key Risks Identified
                        </h3>
                        <div className="space-y-3">
                          {analysis.key_risks.map((risk, i) => (
                            <div key={i} className={`p-3 rounded-xl border ${
                              risk.severity === 'high'   ? 'border-red-500/20    bg-red-500/5' :
                              risk.severity === 'medium' ? 'border-amber-500/20  bg-amber-500/5' :
                              'border-slate-500/20 bg-white/[0.02]'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${SEVERITY_COLOR[risk.severity] || 'text-slate-400'} bg-white/[0.06]`}>
                                  {risk.severity}
                                </span>
                                <span className="text-sm font-semibold text-white">{risk.name}</span>
                              </div>
                              <p className="text-xs text-slate-400">{risk.description}</p>
                              {risk.mitigation && (
                                <p className="text-xs text-emerald-400 mt-1.5 flex items-start gap-1">
                                  <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />{risk.mitigation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.growth_drivers?.length > 0 && (
                      <div className="card p-5">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />Growth Drivers
                        </h3>
                        <ul className="space-y-2">
                          {analysis.growth_drivers.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />{d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.analyst_note && (
                      <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-indigo-300 mb-1">AI Analyst Note</p>
                          <p className="text-sm text-indigo-200/80">{analysis.analyst_note}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual modal */}
      {showManual && (
        <ManualModal
          onAdd={(c) => { setCompanies(p => [c, ...p]); setSelected(c) }}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  )
}
