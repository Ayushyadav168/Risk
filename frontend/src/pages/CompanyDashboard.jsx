import React, { useState, useEffect } from 'react'
import {
  Building2, Search, Plus, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp,
  BarChart3, DollarSign, BookOpen, Zap, Shield, Trash2, Globe, Loader
} from 'lucide-react'
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { companyAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'

const INDUSTRIES = [
  'Banking / NBFC', 'Technology / SaaS', 'Manufacturing', 'E-Commerce',
  'Healthcare / Pharma', 'Logistics', 'Real Estate', 'FMCG / Retail',
  'Energy / Oil & Gas', 'Telecom', 'Auto / EV', 'Insurance', 'Other',
]

function ScoreGauge({ score, label, color }) {
  const pct = Math.min(100, Math.max(0, ((score || 0) / 10) * 100))
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" className="dark:stroke-slate-700" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} 100`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{score?.toFixed(1) ?? '—'}</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 text-center">{label}</p>
    </div>
  )
}

function MetricCard({ label, value, unit = '', sub }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
        {value != null ? `${unit}${typeof value === 'number' ? value.toLocaleString('en-IN') : value}` : '—'}
      </p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function CompanyDashboard() {
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)
  const [companies, setCompanies] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showAddManual, setShowAddManual] = useState(false)
  const [tickerInput, setTickerInput] = useState('')
  const [fetchError, setFetchError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [expandSwot, setExpandSwot] = useState(false)
  const [manualForm, setManualForm] = useState({
    name: '', industry: '', sector: '', website: '', description: '',
    revenue: '', net_profit: '', total_assets: '', total_liabilities: '',
    equity: '', pe_ratio: '', roe: '', roce: '', debt_to_equity: '',
    current_ratio: '', market_cap: '',
  })

  useEffect(() => { loadCompanies() }, [globalRefreshKey, localRefresh])

  const loadCompanies = async () => {
    setLoading(true)
    try {
      const res = await companyAPI.list()
      const data = res.data || []
      setCompanies(data)
      if (data.length > 0) setSelected(data[0])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleFetchTicker = async () => {
    if (!tickerInput.trim()) return
    setFetching(true)
    setFetchError('')
    try {
      const res = await companyAPI.fetchAndSave(tickerInput.trim().toUpperCase())
      const company = res.data
      setCompanies(prev => {
        const exists = prev.find(c => c.id === company.id)
        return exists ? prev.map(c => c.id === company.id ? company : c) : [company, ...prev]
      })
      setSelected(company)
      setShowAdd(false)
      setTickerInput('')
    } catch (e) {
      setFetchError(e.response?.data?.detail || 'Could not fetch. Check ticker symbol.')
    } finally { setFetching(false) }
  }

  const handleAddManual = async () => {
    try {
      const numFields = ['revenue','net_profit','total_assets','total_liabilities','equity',
        'pe_ratio','roe','roce','debt_to_equity','current_ratio','market_cap']
      const payload = { ...manualForm, is_listed: false }
      numFields.forEach(k => { payload[k] = manualForm[k] ? parseFloat(manualForm[k]) : null })
      const res = await companyAPI.create(payload)
      setCompanies(prev => [res.data, ...prev])
      setSelected(res.data)
      setShowAddManual(false)
      setManualForm({ name:'',industry:'',sector:'',website:'',description:'',revenue:'',net_profit:'',total_assets:'',total_liabilities:'',equity:'',pe_ratio:'',roe:'',roce:'',debt_to_equity:'',current_ratio:'',market_cap:'' })
    } catch (e) { alert(e.response?.data?.detail || 'Failed to add company') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this company?')) return
    try {
      await companyAPI.delete(id)
      const remaining = companies.filter(c => c.id !== id)
      setCompanies(remaining)
      setSelected(remaining[0] || null)
    } catch (e) { alert('Failed to delete') }
  }

  const handleAnalyze = async () => {
    if (!selected) return
    setAnalyzing(true)
    try {
      const res = await companyAPI.analyze(selected.id)
      const a = res.data.analysis
      const updated = { ...selected, ai_analysis: JSON.stringify(a), risk_score: a.risk_score, growth_score: a.growth_score, opportunities: a.opportunities, threats: a.threats }
      setSelected(updated)
      setCompanies(prev => prev.map(c => c.id === selected.id ? updated : c))
    } catch (e) { alert('Analysis failed') }
    finally { setAnalyzing(false) }
  }

  const getAnalysis = () => {
    if (!selected?.ai_analysis) return null
    try { return typeof selected.ai_analysis === 'string' ? JSON.parse(selected.ai_analysis) : selected.ai_analysis } catch { return null }
  }

  const analysis = getAnalysis()

  const incomeData = (() => {
    const is = selected?.income_statement
    if (!is?.years?.length) return []
    return is.years.map((yr, i) => ({ year: yr, Revenue: is.revenue?.[i], Profit: is.profit?.[i] })).filter(d => d.Revenue || d.Profit)
  })()

  const bsData = (() => {
    const bs = selected?.balance_sheet
    if (!bs?.years?.length) return []
    return bs.years.map((yr, i) => ({ year: yr, Assets: bs.assets?.[i], Liabilities: bs.liabilities?.[i], Equity: bs.equity?.[i] })).filter(d => d.Assets)
  })()

  const quarterlyData = (() => {
    const qr = selected?.quarterly_results
    if (!qr?.quarters?.length) return []
    return qr.quarters.map((q, i) => ({ quarter: q, Revenue: qr.revenue?.[i], Profit: qr.profit?.[i] })).filter(d => d.Revenue || d.Profit).slice(-8)
  })()

  const recColor = { buy:'text-emerald-600 bg-emerald-100', hold:'text-amber-600 bg-amber-100', avoid:'text-red-600 bg-red-100', monitor:'text-blue-600 bg-blue-100' }

  return (
    <div className="flex gap-6 animate-fadeIn" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Sidebar — Company List */}
      <div className="w-60 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Companies</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader className="w-6 h-6 animate-spin text-primary-500" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2">
            {companies.map(c => (
              <button key={c.id} onClick={() => { setSelected(c); setActiveTab('overview') }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === c.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}`}>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                    {c.ticker && <p className="text-xs text-slate-400 font-mono">{c.ticker}</p>}
                    {c.industry && <p className="text-xs text-slate-400 truncate">{c.industry}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {c.is_listed
                      ? <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded">Listed</span>
                      : <span className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded">Private</span>}
                    {c.risk_score != null && (
                      <span className={`text-xs font-bold ${c.risk_score >= 7 ? 'text-red-500' : c.risk_score >= 4 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        R {c.risk_score?.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {companies.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No companies yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Panel */}
      <div className="flex-1 min-w-0 space-y-4 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Building2 className="w-16 h-16 opacity-20 mb-3" />
            <p className="text-lg font-medium">Select or add a company</p>
            <p className="text-sm mt-1">Search by NSE/BSE ticker or enter data manually</p>
            <Button className="mt-4" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Company</Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {selected.name?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selected.name}</h1>
                      {selected.ticker && <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">{selected.exchange}:{selected.ticker}</span>}
                      {selected.is_listed ? <Badge variant="primary">Listed</Badge> : <Badge variant="secondary">Private</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{selected.industry || 'Industry not set'}{selected.sector ? ` · ${selected.sector}` : ''}</p>
                    {selected.description && <p className="text-xs text-slate-400 mt-1 max-w-lg line-clamp-2">{selected.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {analysis?.recommendation && (
                    <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase dark:bg-opacity-20 ${recColor[analysis.recommendation] || recColor.monitor}`}>
                      {analysis.recommendation}
                    </span>
                  )}
                  <Button size="sm" variant="secondary" onClick={handleAnalyze} loading={analyzing}><Zap className="w-4 h-4" /> Analyze</Button>
                  <button onClick={() => handleDelete(selected.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {(selected.risk_score != null || selected.growth_score != null) && (
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <ScoreGauge score={selected.risk_score} label="Risk Score" color="#EF4444" />
                  <ScoreGauge score={selected.growth_score} label="Growth Score" color="#10B981" />
                  {analysis?.executive_summary && (
                    <p className="flex-1 text-sm text-slate-600 dark:text-slate-400 italic">"{analysis.executive_summary}"</p>
                  )}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[
                { id:'overview', label:'Overview', icon:BarChart3 },
                { id:'financials', label:'Financials', icon:DollarSign },
                { id:'balance_sheet', label:'Balance Sheet', icon:BookOpen },
                { id:'analysis', label:'Analysis', icon:Zap },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium flex-1 justify-center transition-all ${activeTab === id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle>Key Financial Metrics</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <MetricCard label="Market Cap" value={selected.market_cap} unit="₹" sub="in Crores" />
                      <MetricCard label="Revenue (TTM)" value={selected.revenue} unit="₹" sub="in Crores" />
                      <MetricCard label="Net Profit" value={selected.net_profit} unit="₹" sub="in Crores" />
                      <MetricCard label="Current Price" value={selected.current_price} unit="₹" />
                      <MetricCard label="P/E Ratio" value={selected.pe_ratio} />
                      <MetricCard label="P/B Ratio" value={selected.pb_ratio} />
                      <MetricCard label="ROE %" value={selected.roe} />
                      <MetricCard label="ROCE %" value={selected.roce} />
                      <MetricCard label="Debt / Equity" value={selected.debt_to_equity} />
                      <MetricCard label="Current Ratio" value={selected.current_ratio} />
                      <MetricCard label="Dividend Yield" value={selected.dividend_yield} sub="%" />
                      <MetricCard label="EPS" value={selected.eps} unit="₹" />
                    </div>
                  </CardContent>
                </Card>

                {/* SWOT */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>SWOT Analysis</CardTitle>
                      <button onClick={() => setExpandSwot(!expandSwot)} className="text-slate-400 hover:text-slate-600">
                        {expandSwot ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key:'strengths', label:'Strengths', icon:CheckCircle2, color:'text-emerald-600', bg:'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
                        { key:'weaknesses', label:'Weaknesses', icon:XCircle, color:'text-red-600', bg:'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
                        { key:'opportunities', label:'Opportunities', icon:TrendingUp, color:'text-blue-600', bg:'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
                        { key:'threats', label:'Threats', icon:AlertTriangle, color:'text-amber-600', bg:'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
                      ].map(({ key, label, icon: Icon, color, bg }) => {
                        const items = selected[key] || []
                        const display = expandSwot ? items : items.slice(0, 3)
                        return (
                          <div key={key} className={`rounded-xl p-3 border ${bg}`}>
                            <div className={`flex items-center gap-2 mb-2 font-semibold text-sm ${color}`}><Icon className="w-4 h-4" />{label}</div>
                            {display.length > 0 ? (
                              <ul className="space-y-1">
                                {display.map((item, i) => (
                                  <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex gap-1.5"><span className="mt-0.5 flex-shrink-0">•</span>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400">Run AI analysis to generate insights</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {quarterlyData.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Quarterly Performance (₹ Cr)</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={quarterlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={v => `₹${v?.toLocaleString('en-IN')} Cr`} />
                          <Legend />
                          <Bar dataKey="Revenue" fill="#6366F1" radius={[4,4,0,0]} />
                          <Bar dataKey="Profit" fill="#10B981" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Financials */}
            {activeTab === 'financials' && (
              <div className="space-y-4">
                {incomeData.length > 0 ? (
                  <>
                    <Card>
                      <CardHeader><CardTitle>Annual Revenue & Profit (₹ Cr)</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart data={incomeData}>
                            <defs>
                              <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="proG" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={v => `₹${v?.toLocaleString('en-IN')} Cr`} />
                            <Legend />
                            <Area type="monotone" dataKey="Revenue" stroke="#6366F1" fill="url(#revG)" strokeWidth={2} />
                            <Area type="monotone" dataKey="Profit" stroke="#10B981" fill="url(#proG)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle>Annual Financials Table</CardTitle></CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b dark:border-slate-700">
                                <th className="text-left py-2 text-slate-500">Metric</th>
                                {incomeData.map(d => <th key={d.year} className="text-right py-2 px-3 text-slate-500">{d.year}</th>)}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                              {['Revenue','Profit'].map(m => (
                                <tr key={m} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                  <td className="py-2 font-medium text-slate-700 dark:text-slate-300">{m} (₹ Cr)</td>
                                  {incomeData.map(d => (
                                    <td key={d.year} className="text-right py-2 px-3 text-slate-600 dark:text-slate-400 font-mono">
                                      {d[m] != null ? d[m].toLocaleString('en-IN') : '—'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <BarChart3 className="w-12 h-12 opacity-20 mb-2" />
                    <p>No financial data</p>
                    <p className="text-xs mt-1">Fetch a listed company by NSE/BSE ticker</p>
                  </div>
                )}
              </div>
            )}

            {/* Balance Sheet */}
            {activeTab === 'balance_sheet' && (
              <div className="space-y-4">
                {bsData.length > 0 ? (
                  <>
                    <Card>
                      <CardHeader><CardTitle>Balance Sheet Trend (₹ Cr)</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={bsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={v => `₹${v?.toLocaleString('en-IN')} Cr`} />
                            <Legend />
                            <Bar dataKey="Assets" fill="#6366F1" radius={[4,4,0,0]} />
                            <Bar dataKey="Liabilities" fill="#EF4444" radius={[4,4,0,0]} />
                            <Bar dataKey="Equity" fill="#10B981" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label:'Total Assets', value: selected.total_assets, color:'text-blue-600' },
                        { label:'Total Liabilities', value: selected.total_liabilities, color:'text-red-600' },
                        { label:'Net Worth (Equity)', value: selected.equity, color:'text-emerald-600' },
                      ].map(({ label, value, color }) => (
                        <Card key={label}>
                          <CardContent className="pt-4">
                            <p className="text-xs text-slate-500 mb-1">{label}</p>
                            <p className={`text-2xl font-bold ${color}`}>₹{value?.toLocaleString('en-IN') ?? '—'}</p>
                            <p className="text-xs text-slate-400">Crores</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <BookOpen className="w-12 h-12 opacity-20 mb-2" />
                    <p>No balance sheet data</p>
                  </div>
                )}
                {!selected.is_listed && (
                  <Card>
                    <CardHeader><CardTitle>Enter Financial Data</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          ['Total Assets (₹ Cr)','total_assets'],['Total Liabilities (₹ Cr)','total_liabilities'],
                          ['Net Worth / Equity (₹ Cr)','equity'],['Revenue (₹ Cr)','revenue'],
                          ['Net Profit (₹ Cr)','net_profit'],['Debt / Equity Ratio','debt_to_equity'],
                        ].map(([label, field]) => (
                          <div key={field}>
                            <label className="text-xs text-slate-500 block mb-1">{label}</label>
                            <input type="number"
                              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              defaultValue={selected[field] || ''}
                              onBlur={async (e) => {
                                const val = parseFloat(e.target.value)
                                if (!isNaN(val)) {
                                  await companyAPI.update(selected.id, { [field]: val })
                                  setSelected(prev => ({ ...prev, [field]: val }))
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* AI Analysis */}
            {activeTab === 'analysis' && (
              <div className="space-y-4">
                {!analysis ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <Zap className="w-12 h-12 opacity-20 mb-2" />
                    <p>No analysis yet</p>
                    <Button className="mt-3" onClick={handleAnalyze} loading={analyzing}><Zap className="w-4 h-4" /> Run Analysis</Button>
                  </div>
                ) : (
                  <>
                    {analysis.key_risks?.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" />Key Risks Identified</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {analysis.key_risks.map((risk, i) => (
                            <div key={i} className={`p-3 rounded-xl border ${risk.severity === 'high' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : risk.severity === 'medium' ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-200 bg-slate-50 dark:bg-slate-700/50'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${risk.severity === 'high' ? 'bg-red-200 text-red-800' : risk.severity === 'medium' ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>{risk.severity?.toUpperCase()}</span>
                                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{risk.name}</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{risk.description}</p>
                              {risk.mitigation && <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5 flex items-start gap-1"><Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />{risk.mitigation}</p>}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                    {analysis.growth_drivers?.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-500" />Growth Drivers</CardTitle></CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {analysis.growth_drivers.map((d, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />{d}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    {analysis.analyst_note && (
                      <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary-800 dark:text-primary-300 mb-1">AI Analyst Note</p>
                          <p className="text-sm text-primary-700 dark:text-primary-400">{analysis.analyst_note}</p>
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

      {/* Add Company Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setFetchError(''); setTickerInput('') }} title="Add Company" size="md">
        <div className="space-y-5">
          <div className="p-4 border-2 border-primary-200 dark:border-primary-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2"><Globe className="w-5 h-5 text-primary-500" /><h3 className="font-semibold text-slate-800 dark:text-slate-200">Listed Company (NSE / BSE)</h3></div>
            <p className="text-xs text-slate-500 mb-3">Auto-fetch data from Screener.in — financials, ratios, pros &amp; cons</p>
            {fetchError && <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs rounded-lg mb-2 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{fetchError}</div>}
            <div className="flex gap-2">
              <input type="text" value={tickerInput} onChange={e => setTickerInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleFetchTicker()}
                placeholder="e.g. RELIANCE, TCS, INFY, HDFCBANK"
                className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 uppercase font-mono" />
              <Button onClick={handleFetchTicker} loading={fetching}><Search className="w-4 h-4" />Fetch</Button>
            </div>
          </div>
          <div className="p-4 border-2 border-slate-200 dark:border-slate-700 rounded-xl">
            <div className="flex items-center gap-2 mb-2"><Building2 className="w-5 h-5 text-slate-500" /><h3 className="font-semibold text-slate-800 dark:text-slate-200">Private / Unlisted Company</h3></div>
            <p className="text-xs text-slate-500 mb-3">Enter data manually for private businesses</p>
            <Button variant="outline" className="w-full" onClick={() => { setShowAdd(false); setShowAddManual(true) }}>
              <Plus className="w-4 h-4" />Enter Data Manually
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manual Company Modal */}
      <Modal isOpen={showAddManual} onClose={() => setShowAddManual(false)} title="Add Private Company" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Company Name *" value={manualForm.name} onChange={e => setManualForm(p => ({...p, name: e.target.value}))} />
            <Select label="Industry" value={manualForm.industry} onChange={e => setManualForm(p => ({...p, industry: e.target.value}))}>
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </Select>
            <Input label="Sector" value={manualForm.sector} onChange={e => setManualForm(p => ({...p, sector: e.target.value}))} />
            <Input label="Website" value={manualForm.website} onChange={e => setManualForm(p => ({...p, website: e.target.value}))} />
          </div>
          <Input label="Description" value={manualForm.description} onChange={e => setManualForm(p => ({...p, description: e.target.value}))} />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">Financial Data (₹ Crores)</p>
          <div className="grid grid-cols-3 gap-3">
            {[['Revenue','revenue'],['Net Profit','net_profit'],['Market Cap','market_cap'],['Total Assets','total_assets'],['Total Liabilities','total_liabilities'],['Net Worth','equity']].map(([label,field]) => (
              <Input key={field} label={label} type="number" value={manualForm[field]} onChange={e => setManualForm(p => ({...p, [field]: e.target.value}))} />
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">Financial Ratios</p>
          <div className="grid grid-cols-3 gap-3">
            {[['P/E Ratio','pe_ratio'],['ROE (%)','roe'],['ROCE (%)','roce'],['Debt/Equity','debt_to_equity'],['Current Ratio','current_ratio']].map(([label,field]) => (
              <Input key={field} label={label} type="number" value={manualForm[field]} onChange={e => setManualForm(p => ({...p, [field]: e.target.value}))} />
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddManual(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddManual} disabled={!manualForm.name}><Plus className="w-4 h-4" />Add Company</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
