import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, RefreshCw, Download, TrendingUp, TrendingDown,
  Building2, BarChart3, FileText, Mic, ExternalLink, Loader2,
  IndianRupee, Activity, BookOpen, AlertCircle, CheckCircle2,
  XCircle, Info, X, ChevronDown,
  Calendar, Hash, Layers, Shield
} from 'lucide-react'
import { marketAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const n2 = (v) => (v == null || isNaN(v)) ? null : Number(v)

const fmtPrice = (v) => {
  const n = n2(v); if (n == null) return '—'
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const fmtCr = (v, compact = false) => {
  const n = n2(v); if (n == null) return '—'
  if (compact) {
    if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L Cr`
    if (Math.abs(n) >= 1000)   return `₹${(n / 1000).toFixed(2)}K Cr`
    return `₹${n.toFixed(2)} Cr`
  }
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`
}

const fmtX = (v, suffix = '') => {
  const n = n2(v); if (n == null) return '—'
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${suffix}`
}

const fmtPct = (v) => { const n = n2(v); return n == null ? '—' : `${n.toFixed(2)}%` }

const colorNum = (v, reverse = false) => {
  const n = n2(v); if (n == null) return 'text-slate-400'
  const pos = reverse ? n < 0 : n > 0
  return pos ? 'text-emerald-400' : n < 0 ? 'text-red-400' : 'text-slate-400'
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI atoms
// ─────────────────────────────────────────────────────────────────────────────
const Badge = ({ children, color = 'slate' }) => {
  const c = {
    slate:   'bg-slate-700/60 text-slate-300',
    sky:     'bg-sky-900/50 text-sky-300 border border-sky-700/40',
    green:   'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40',
    red:     'bg-red-900/50 text-red-300 border border-red-700/40',
    amber:   'bg-amber-900/50 text-amber-300 border border-amber-700/40',
    violet:  'bg-violet-900/50 text-violet-300 border border-violet-700/40',
  }[color] || 'bg-slate-700/60 text-slate-300'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c}`}>{children}</span>
}

const MetricCard = ({ label, value, sub, highlight }) => (
  <div className={`rounded-xl p-3.5 border ${highlight
    ? 'bg-sky-950/40 border-sky-700/40'
    : 'bg-slate-800/50 border-slate-700/30'}`}>
    <p className="text-xs text-slate-500 mb-1 leading-none">{label}</p>
    <p className={`text-sm font-bold leading-tight ${highlight ? 'text-sky-300' : 'text-slate-100'}`}>{value}</p>
    {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// Financial Table
// ─────────────────────────────────────────────────────────────────────────────
function FinTable({ data, title }) {
  if (!data?.years?.length || !data?.rows?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="w-10 h-10 text-slate-700 mb-3" />
        <p className="text-slate-500 text-sm font-medium">No {title} data</p>
        <p className="text-slate-600 text-xs mt-1">Click <span className="text-sky-400 font-medium">Fetch Live Data</span> to load from Screener.in</p>
      </div>
    )
  }
  const years = data.years.slice(-10)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2.5 px-4 bg-slate-800 text-slate-400 font-semibold min-w-[200px] sticky left-0 rounded-tl-lg border-b border-slate-700">
              {title} <span className="text-slate-600 font-normal">(₹ Cr)</span>
            </th>
            {years.map((yr, i) => (
              <th key={i} className="text-right py-2.5 px-3 bg-slate-800 text-slate-300 font-medium whitespace-nowrap min-w-[90px] border-b border-slate-700 last:rounded-tr-lg">
                {yr}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => {
            const hl = /total|net profit|revenue|sales|operating profit|ebitda/i.test(row.label)
            return (
              <tr key={ri} className={`border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors ${hl ? 'bg-slate-800/30' : ''}`}>
                <td className={`py-2 px-4 sticky left-0 bg-inherit font-medium ${hl ? 'text-slate-200' : 'text-slate-400'}`}>
                  {row.label}
                </td>
                {years.map((yr, i) => {
                  const idx = data.years.indexOf(yr)
                  const raw = row.values[idx]
                  const num = parseFloat(String(raw || '').replace(/,/g, ''))
                  const neg = !isNaN(num) && num < 0
                  return (
                    <td key={i} className={`py-2 px-3 text-right tabular-nums font-mono ${neg ? 'text-red-400' : hl ? 'text-slate-100' : 'text-slate-300'}`}>
                      {raw || '—'}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-xs text-slate-700 px-4 py-2 text-right">Source: Screener.in</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────────
function Overview({ c }) {
  const pros = Array.isArray(c.pros) ? c.pros : []
  const cons = Array.isArray(c.cons) ? c.cons : []

  const marketMetrics = [
    { label: 'Current Price',    value: fmtPrice(c.current_price),      highlight: true },
    { label: 'Market Cap',       value: fmtCr(c.market_cap, true) },
    { label: '52W High',         value: fmtPrice(c.high_52w) },
    { label: '52W Low',          value: fmtPrice(c.low_52w) },
    { label: 'P/E Ratio',        value: fmtX(c.pe_ratio, 'x') },
    { label: 'P/B Ratio',        value: fmtX(c.pb_ratio, 'x') },
    { label: 'EPS',              value: fmtPrice(c.eps) },
    { label: 'Book Value',       value: fmtPrice(c.book_value) },
    { label: 'ROCE',             value: fmtPct(c.roce) },
    { label: 'ROE',              value: fmtPct(c.roe) },
    { label: 'Div. Yield',       value: fmtPct(c.div_yield) },
    { label: 'Debt / Equity',    value: fmtX(c.debt_equity, 'x') },
    { label: 'Revenue (TTM)',    value: fmtCr(c.revenue, true) },
    { label: 'Net Profit (TTM)', value: fmtCr(c.net_profit, true) },
    { label: 'Promoter %',       value: fmtPct(c.promoter_holding) },
  ]

  return (
    <div className="space-y-6 pb-4">

      {/* Fetch prompt */}
      {!c.fetched_at && (
        <div className="flex items-start gap-3 p-4 bg-sky-950/40 border border-sky-700/40 rounded-xl">
          <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sky-300">Only basic NSE data loaded</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Click <strong className="text-white">Fetch Live Data</strong> above to get current price, ratios, financial statements, pros &amp; cons from Screener.in
            </p>
          </div>
        </div>
      )}

      {/* Key metrics */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Market &amp; Valuation</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {marketMetrics.map(m => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </section>

      {/* Company info */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" /> Identifiers
          </h3>
          {[
            ['NSE Symbol',  c.symbol],
            ['BSE Code',    c.bse_code || '—'],
            ['ISIN',        c.isin || '—'],
            ['Series',      c.series || '—'],
            ['Face Value',  c.face_value ? `₹${c.face_value}` : '—'],
            ['Listed Since', c.date_of_listing || '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
              <span className="text-xs text-slate-500">{k}</span>
              <span className="text-xs text-slate-300 font-mono">{v}</span>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Sector &amp; Industry
          </h3>
          {[
            ['Industry',    c.industry || '—'],
            ['Sector',      c.sector   || '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start justify-between py-1.5 border-b border-slate-800/50 last:border-0 gap-2">
              <span className="text-xs text-slate-500 flex-shrink-0">{k}</span>
              <span className="text-xs text-slate-300 text-right">{v}</span>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-slate-800/50 space-y-2">
            <a href={`https://www.nseindia.com/get-quotes/equity?symbol=${c.symbol}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 transition-colors">
              <ExternalLink className="w-3 h-3" /> NSE Quote Page
            </a>
            {c.bse_code && (
              <a href={`https://www.bseindia.com/stock-share-price/x/x/${c.bse_code}/`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                <ExternalLink className="w-3 h-3" /> BSE Quote Page
              </a>
            )}
            <a href={`https://www.screener.in/company/${c.symbol}/consolidated/`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 transition-colors">
              <ExternalLink className="w-3 h-3" /> Screener.in Profile
            </a>
          </div>
        </div>
      </section>

      {/* Pros / Cons */}
      {(pros.length > 0 || cons.length > 0) && (
        <section className="grid grid-cols-2 gap-4">
          {pros.length > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
              </h3>
              <ul className="space-y-2">
                {pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0 font-bold">✓</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cons.length > 0 && (
            <div className="bg-red-950/30 border border-red-800/30 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-red-400 mb-3 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Risks
              </h3>
              <ul className="space-y-2">
                {cons.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                    <span className="text-red-500 mt-0.5 flex-shrink-0 font-bold">✗</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents tab
// ─────────────────────────────────────────────────────────────────────────────
function Documents({ symbol, annualReports, hasFinancials }) {
  const [dl, setDl] = useState(null)

  const download = async (docType) => {
    if (!hasFinancials) {
      alert('Please fetch company data first before downloading.')
      return
    }
    setDl(docType)
    try {
      const res = await marketAPI.download(symbol, docType)
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `${symbol}_${docType}.xlsx`; a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Download failed: ' + (e.response?.data?.detail || e.message))
    } finally { setDl(null) }
  }

  const DOCS = [
    { id: 'all',              icon: BarChart3,  label: 'Complete Package',       desc: 'All statements + summary in one Excel' },
    { id: 'income-statement', icon: TrendingUp, label: 'Income Statement (P&L)',  desc: 'Annual revenue, expenses & profit' },
    { id: 'balance-sheet',    icon: Shield,     label: 'Balance Sheet',           desc: 'Assets, liabilities & equity' },
    { id: 'cash-flow',        icon: Activity,   label: 'Cash Flow Statement',     desc: 'Operating, investing & financing flows' },
    { id: 'quarterly',        icon: Calendar,   label: 'Quarterly Results',       desc: 'Quarter-by-quarter performance' },
  ]

  return (
    <div className="space-y-6 pb-4">
      {!hasFinancials && (
        <div className="flex items-center gap-3 p-3 bg-amber-950/30 border border-amber-700/30 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">Fetch live data first to enable Excel downloads</p>
        </div>
      )}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Download className="w-3.5 h-3.5" /> Download Excel
        </h3>
        <div className="space-y-2">
          {DOCS.map(({ id, icon: Icon, label, desc }) => (
            <div key={id} className="flex items-center gap-3 p-3.5 bg-slate-800/40 border border-slate-700/30 rounded-xl hover:border-slate-600 transition-colors">
              <div className="w-9 h-9 bg-slate-700/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <button onClick={() => download(id)} disabled={!!dl || !hasFinancials}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0">
                {dl === id
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                  : <><Download className="w-3.5 h-3.5" /> Excel</>}
              </button>
            </div>
          ))}
        </div>
      </div>

      {annualReports?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Annual Reports (BSE / Screener)
          </h3>
          <div className="space-y-2">
            {annualReports.map((ar, i) => (
              <a key={i} href={ar.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg hover:border-sky-700/40 hover:bg-slate-800/60 transition-colors group">
                <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span className="text-sm text-slate-300 flex-1 truncate">{ar.label || `Annual Report ${i + 1}`}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-700 group-hover:text-sky-400 transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Concall tab
// ─────────────────────────────────────────────────────────────────────────────
function Concall({ symbol }) {
  const [items, setItems]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await marketAPI.concall(symbol)
      setItems(res.data?.concalls || [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not fetch NSE announcements')
    } finally { setLoading(false) }
  }, [symbol])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
      <p className="text-sm text-slate-400">Fetching NSE corporate announcements…</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <AlertCircle className="w-10 h-10 text-red-400/50 mb-3" />
      <p className="text-sm text-red-400">{error}</p>
      <button onClick={load} className="mt-3 text-xs text-sky-400 hover:underline">Try again</button>
    </div>
  )

  if (!items?.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <Mic className="w-10 h-10 text-slate-700 mb-3" />
      <p className="text-sm text-slate-500 font-medium">No concall filings found</p>
      <p className="text-xs text-slate-600 mt-1">NSE hasn't published concall announcements for this company recently</p>
      <a href={`https://www.bseindia.com/stock-share-price/x/x/${symbol}/`}
        target="_blank" rel="noopener noreferrer"
        className="mt-3 flex items-center gap-1.5 text-xs text-sky-400 hover:underline">
        <ExternalLink className="w-3 h-3" /> Check on BSE
      </a>
      <button onClick={load} className="mt-2 text-xs text-slate-500 hover:text-slate-300">Refresh</button>
    </div>
  )

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{items.length} filing{items.length !== 1 ? 's' : ''} from NSE</p>
        <button onClick={load} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 hover:border-sky-700/30 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge color="sky">{item.type || 'Announcement'}</Badge>
                {item.date && (
                  <span className="text-xs text-slate-500">
                    {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-200 font-medium leading-snug">{item.title}</p>
            </div>
            {item.file_url && (
              <a href={item.file_url} target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white text-xs font-medium rounded-lg transition-colors">
                <FileText className="w-3.5 h-3.5" /> PDF
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Company Detail Panel
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',   label: 'Overview',       icon: Building2  },
  { id: 'income',     label: 'P&L',            icon: TrendingUp },
  { id: 'balance',    label: 'Balance Sheet',  icon: BarChart3  },
  { id: 'cashflow',   label: 'Cash Flow',      icon: Activity   },
  { id: 'quarterly',  label: 'Quarterly',      icon: Calendar   },
  { id: 'documents',  label: 'Download',       icon: Download   },
  { id: 'concall',    label: 'Concall',        icon: Mic        },
]

function CompanyDetail({ symbol, onBack }) {
  const [company, setCompany]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [fetching, setFetching] = useState(false)
  const [tab, setTab]           = useState('overview')
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await marketAPI.getCompany(symbol)
      setCompany(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load company')
    } finally { setLoading(false) }
  }, [symbol])

  useEffect(() => { load() }, [load])

  const handleFetch = async () => {
    setFetching(true)
    try {
      const res = await marketAPI.fetchCompany(symbol)
      setCompany(res.data)
      setTab('overview')
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.detail || e.message))
    } finally { setFetching(false) }
  }

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
      <p className="text-sm text-slate-400">Loading {symbol}…</p>
    </div>
  )

  if (error || !company) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
      <p className="text-slate-300 font-medium">{error || 'Company not found'}</p>
      <button onClick={load} className="mt-3 text-sm text-sky-400 hover:underline">Retry</button>
      {onBack && <button onClick={onBack} className="mt-2 text-sm text-slate-500 hover:underline">← Back to list</button>}
    </div>
  )

  const { income_statement, balance_sheet, cash_flow, quarterly, annual_reports } = company
  const hasData = !!company.has_financials

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Company header ── */}
      <div className="px-5 py-4 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-start gap-3">

          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-white font-bold text-lg">{symbol[0]}</span>
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white leading-tight">{company.name}</h2>
              <Badge color="slate">{company.symbol}</Badge>
              {company.series && <Badge color="sky">{company.series}</Badge>}
              {hasData && <Badge color="green">Data loaded</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {company.industry && <span className="text-xs text-slate-400">{company.industry}</span>}
              {company.sector && company.sector !== company.industry && (
                <span className="text-xs text-slate-600">· {company.sector}</span>
              )}
              {company.current_price && (
                <span className="text-sm font-bold text-sky-400">{fmtPrice(company.current_price)}</span>
              )}
              {company.market_cap && (
                <span className="text-xs text-slate-500">MCap {fmtCr(company.market_cap, true)}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleFetch} disabled={fetching}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors">
              {fetching
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching…</>
                : <><RefreshCw className="w-3.5 h-3.5" /> Fetch Live Data</>}
            </button>
            {onBack && (
              <button onClick={onBack}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors lg:hidden">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none flex-shrink-0 bg-slate-900/50">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              tab === id
                ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
            }`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'overview'  && <Overview c={company} />}
        {tab === 'income'    && <FinTable data={income_statement}  title="Income Statement" />}
        {tab === 'balance'   && <FinTable data={balance_sheet}     title="Balance Sheet" />}
        {tab === 'cashflow'  && <FinTable data={cash_flow}         title="Cash Flow" />}
        {tab === 'quarterly' && <FinTable data={quarterly}         title="Quarterly Results" />}
        {tab === 'documents' && <Documents symbol={symbol} annualReports={annual_reports} hasFinancials={hasData} />}
        {tab === 'concall'   && <Concall symbol={symbol} />}
      </div>

      {/* ── Footer ── */}
      {company.fetched_at && (
        <div className="px-5 py-2 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-600">
            Data from Screener.in · Fetched {new Date(company.fetched_at).toLocaleString('en-IN')}
          </span>
          <a href={`https://www.screener.in/company/${symbol}/consolidated/`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-slate-600 hover:text-sky-400 flex items-center gap-1 transition-colors">
            View on Screener <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Company list row
// ─────────────────────────────────────────────────────────────────────────────
function CompanyRow({ c, selected, onClick }) {
  const isSelected = selected === c.symbol
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-slate-800/50 transition-all hover:bg-slate-800/40 ${
        isSelected ? 'bg-sky-950/30 border-l-[3px] border-l-sky-500' : 'border-l-[3px] border-l-transparent'
      }`}>
      <div className="flex items-start gap-3">
        {/* Mini avatar */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 ${
          isSelected ? 'bg-sky-600 text-white' : 'bg-slate-700/60 text-slate-400'
        }`}>
          {c.symbol[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-bold ${isSelected ? 'text-sky-400' : 'text-slate-200'}`}>
              {c.symbol}
            </span>
            {c.current_price && (
              <span className="text-xs font-semibold text-slate-300 flex-shrink-0">
                {fmtPrice(c.current_price)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">{c.name}</p>
          <div className="flex items-center gap-2 mt-1">
            {c.industry && (
              <span className="text-xs text-slate-700 truncate max-w-[140px]">{c.industry}</span>
            )}
            {c.has_financials && (
              <span className="text-[10px] text-emerald-600 font-medium">● Data</span>
            )}
            {c.market_cap && (
              <span className="text-[10px] text-slate-700 ml-auto flex-shrink-0">
                {fmtCr(c.market_cap, true)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function IndianMarket() {
  const { globalRefreshKey } = useRefresh()
  const [companies, setCompanies]       = useState([])
  const [total, setTotal]               = useState(0)
  const [listLoading, setListLoading]   = useState(false)
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState(null)
  const [syncing, setSyncing]           = useState(false)
  const [page, setPage]                 = useState(1)
  const [hasMore, setHasMore]           = useState(false)
  const [showDetail, setShowDetail]     = useState(false)   // mobile

  const debounceRef  = useRef(null)
  const activeQ      = useRef('')
  const PAGE_SIZE    = 50

  // ── Load company list ──────────────────────────────────────────────────────
  const loadPage = useCallback(async (q, pg, append = false) => {
    setListLoading(true)
    try {
      const res = await marketAPI.companies({ search: q || undefined, page: pg, limit: PAGE_SIZE })
      const { companies: items = [], total: tot = 0, pages = 1 } = res.data
      setTotal(tot)
      setHasMore(pg < pages)
      setCompanies(prev => append ? [...prev, ...items] : items)
    } catch (e) {
      console.error('load failed', e)
    } finally {
      setListLoading(false)
    }
  }, [])

  // initial load + global refresh
  useEffect(() => {
    setSearch(''); activeQ.current = ''; setPage(1)
    loadPage('', 1)
  }, [globalRefreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search ─────────────────────────────────────────────────────────────────
  const onSearch = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      activeQ.current = val
      setPage(1)
      loadPage(val, 1)
    }, 300)
  }

  const clearSearch = () => {
    setSearch(''); activeQ.current = ''
    setPage(1); loadPage('', 1)
  }

  // ── Load more ──────────────────────────────────────────────────────────────
  const loadMore = () => {
    const next = page + 1
    setPage(next)
    loadPage(activeQ.current, next, true)
  }

  // ── Sync NSE ───────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await marketAPI.syncNow()
      const { synced = 0, total_in_db = 0 } = res.data
      alert(`✅ Sync complete!\n${synced} companies synced from NSE\n${total_in_db} total in database`)
      setSearch(''); activeQ.current = ''; setPage(1)
      loadPage('', 1)
    } catch (e) {
      alert('Sync failed: ' + (e.response?.data?.detail || e.message))
    } finally { setSyncing(false) }
  }

  const selectCompany = (sym) => {
    setSelected(sym)
    setShowDetail(true)
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-950 overflow-hidden">

      {/* ══════════════════════════════════════════════════════
          LEFT PANEL — Company List
      ══════════════════════════════════════════════════════ */}
      <div className={`flex flex-col flex-shrink-0 w-full lg:w-[320px] xl:w-[360px]
        border-r border-slate-800 bg-slate-900
        ${showDetail ? 'hidden lg:flex' : 'flex'}`}>

        {/* Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-700/40 flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Indian Market</h1>
                <p className="text-[11px] text-slate-500">
                  {total > 0
                    ? `${total.toLocaleString('en-IN')} companies${search ? ` · "${search}"` : ' on NSE'}`
                    : listLoading ? 'Loading…' : 'NSE listed'}
                </p>
              </div>
            </div>
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-medium rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync NSE'}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={onSearch}
              placeholder="Search symbol, company name, ISIN…"
              className="w-full pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-600 rounded-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all"
            />
            {search && (
              <button onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">

          {/* Skeleton loader */}
          {listLoading && companies.length === 0 && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-800 rounded w-24" />
                    <div className="h-2.5 bg-slate-800 rounded w-40" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!listLoading && companies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Building2 className="w-10 h-10 text-slate-700 mb-3" />
              {search ? (
                <>
                  <p className="text-sm text-slate-400 font-medium">No results for "{search}"</p>
                  <button onClick={clearSearch} className="mt-2 text-xs text-sky-400 hover:underline">Clear search</button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-400 font-medium">No companies loaded</p>
                  <p className="text-xs text-slate-600 mt-1 mb-4">Sync from NSE to load all listed companies</p>
                  <button onClick={handleSync} disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors">
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing…' : 'Sync from NSE'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Company rows */}
          {companies.map(c => (
            <CompanyRow
              key={c.symbol}
              c={c}
              selected={selected}
              onClick={() => selectCompany(c.symbol)}
            />
          ))}

          {/* In-list loading */}
          {listLoading && companies.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
            </div>
          )}

          {/* Load more */}
          {hasMore && !listLoading && (
            <button onClick={loadMore}
              className="w-full py-3 text-xs text-sky-500 hover:text-sky-400 hover:bg-slate-800/40 flex items-center justify-center gap-1.5 transition-colors">
              <ChevronDown className="w-3.5 h-3.5" /> Load more companies
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT PANEL — Company Detail
      ══════════════════════════════════════════════════════ */}
      <div className={`flex-1 min-w-0 flex flex-col bg-slate-900 overflow-hidden
        ${showDetail ? 'flex' : 'hidden lg:flex'}`}>

        {selected ? (
          <CompanyDetail
            key={selected}
            symbol={selected}
            onBack={() => setShowDetail(false)}
          />
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center mb-5">
              <IndianRupee className="w-9 h-9 text-slate-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-400 mb-2">Select a Company</h2>
            <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
              Search or browse the list of <strong className="text-slate-500">2,300+ NSE-listed</strong> companies.
              Click any company to view full details.
            </p>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
              {[
                [Building2,  'Company Info & Ratios'],
                [BarChart3,  'P&L, Balance Sheet, Cash Flow'],
                [Download,   'Download Excel Reports'],
                [Mic,        'Concall Announcements'],
              ].map(([Icon, label]) => (
                <div key={label} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 text-center">
                  <Icon className="w-5 h-5 text-sky-600/70 mx-auto mb-2" />
                  <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
