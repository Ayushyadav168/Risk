import React, { useState, useEffect, useCallback } from 'react'
import {
  LineChart as LineChartIcon, Plus, RefreshCw, AlertTriangle,
  CheckCircle, TrendingUp, TrendingDown, Minus, X, Edit2,
  Trash2, Bell, BellOff, Target, Activity, Zap
} from 'lucide-react'

const SAMPLE_KRIS = [
  {
    id: 1, name: 'Operational Loss Ratio', category: 'Operational',
    unit: '%', currentValue: 4.2, threshold: 5.0, criticalThreshold: 8.0,
    trend: 'up', trendPct: 12, description: 'Ratio of operational losses to total revenue',
    history: [2.1, 2.8, 3.1, 2.9, 3.5, 3.8, 4.0, 4.2],
    alertEnabled: true,
  },
  {
    id: 2, name: 'Customer Churn Rate', category: 'Strategic',
    unit: '%', currentValue: 2.1, threshold: 3.0, criticalThreshold: 5.0,
    trend: 'down', trendPct: 8, description: 'Monthly customer churn percentage',
    history: [3.2, 2.9, 2.8, 2.6, 2.4, 2.3, 2.2, 2.1],
    alertEnabled: true,
  },
  {
    id: 3, name: 'Regulatory Violations', category: 'Compliance',
    unit: 'count', currentValue: 0, threshold: 1, criticalThreshold: 3,
    trend: 'stable', trendPct: 0, description: 'Number of regulatory violations in the period',
    history: [1, 0, 0, 1, 0, 0, 0, 0],
    alertEnabled: true,
  },
  {
    id: 4, name: 'IT System Uptime', category: 'Technology',
    unit: '%', currentValue: 99.2, threshold: 99.5, criticalThreshold: 99.0,
    trend: 'down', trendPct: 3, description: 'System availability percentage (higher is better)',
    history: [99.9, 99.8, 99.7, 99.6, 99.5, 99.4, 99.3, 99.2],
    alertEnabled: false,
    invertThreshold: true,
  },
  {
    id: 5, name: 'Debt-to-Equity Ratio', category: 'Financial',
    unit: 'x', currentValue: 1.8, threshold: 2.0, criticalThreshold: 2.5,
    trend: 'up', trendPct: 5, description: 'Total debt divided by shareholder equity',
    history: [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.75, 1.8],
    alertEnabled: true,
  },
  {
    id: 6, name: 'Employee Turnover', category: 'HR',
    unit: '%', currentValue: 11.5, threshold: 15.0, criticalThreshold: 20.0,
    trend: 'stable', trendPct: 1, description: 'Annual employee turnover rate',
    history: [12.0, 11.8, 11.5, 11.9, 11.7, 11.5, 11.6, 11.5],
    alertEnabled: true,
  },
]

const CATEGORIES = ['All', 'Financial', 'Operational', 'Compliance', 'Technology', 'Strategic', 'HR']

function getStatus(kri) {
  const { currentValue, threshold, criticalThreshold, invertThreshold } = kri
  if (invertThreshold) {
    if (currentValue <= criticalThreshold) return 'critical'
    if (currentValue <= threshold) return 'warning'
    return 'normal'
  }
  if (currentValue >= criticalThreshold) return 'critical'
  if (currentValue >= threshold) return 'warning'
  return 'normal'
}

const STATUS_CONFIG = {
  normal:   { label: 'Normal',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', glow: 'shadow-emerald-500/20' },
  warning:  { label: 'Warning',  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   dot: 'bg-amber-400',   glow: 'shadow-amber-500/20' },
  critical: { label: 'Critical', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-500 animate-pulse',     glow: 'shadow-red-500/20' },
}

function MiniSparkline({ data, status }) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 80
  const h = 32
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const strokeColor = status === 'critical' ? '#f87171' : status === 'warning' ? '#fbbf24' : '#34d399'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * w
        const y = h - ((v - min) / range) * (h - 4) - 2
        return i === data.length - 1 ? (
          <circle key={i} cx={x} cy={y} r="2.5" fill={strokeColor} />
        ) : null
      })}
    </svg>
  )
}

function GaugeBar({ kri }) {
  const { currentValue, threshold, criticalThreshold, invertThreshold } = kri
  const maxVal = criticalThreshold * 1.2
  const pct = Math.min((currentValue / maxVal) * 100, 100)
  const threshPct = (threshold / maxVal) * 100
  const critPct = (criticalThreshold / maxVal) * 100
  const status = getStatus(kri)
  const fillColor = status === 'critical' ? 'from-red-500 to-red-400' : status === 'warning' ? 'from-amber-500 to-amber-400' : 'from-emerald-500 to-emerald-400'

  return (
    <div className="relative h-2 bg-white/[0.06] rounded-full overflow-visible mt-3">
      <div className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${fillColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
      <div className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-amber-400/60" style={{ left: `${threshPct}%` }} />
      <div className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-red-400/60" style={{ left: `${critPct}%` }} />
    </div>
  )
}

function KRICard({ kri, onEdit, onDelete, onToggleAlert }) {
  const status = getStatus(kri)
  const cfg = STATUS_CONFIG[status]
  const TrendIcon = kri.trend === 'up' ? TrendingUp : kri.trend === 'down' ? TrendingDown : Minus
  const trendColor = kri.invertThreshold
    ? kri.trend === 'down' ? 'text-emerald-400' : kri.trend === 'up' ? 'text-red-400' : 'text-slate-400'
    : kri.trend === 'up' ? 'text-red-400' : kri.trend === 'down' ? 'text-emerald-400' : 'text-slate-400'

  return (
    <div className={`card p-5 border ${cfg.border} transition-all hover:scale-[1.01] group`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
              {kri.category}
            </span>
            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white leading-snug">{kri.name}</h3>
          {kri.description && <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{kri.description}</p>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onToggleAlert(kri.id)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${kri.alertEnabled ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-500/10' : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.05]'}`}>
            {kri.alertEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onEdit(kri)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(kri.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between mt-4">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-black ${cfg.color}`}>{kri.currentValue}</span>
            <span className="text-sm text-slate-500">{kri.unit}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />{kri.trendPct}%
            </span>
            <span className="text-xs text-slate-600">vs last period</span>
          </div>
        </div>
        <MiniSparkline data={kri.history} status={status} />
      </div>

      <GaugeBar kri={kri} />

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-slate-600">0</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-amber-500/70">⚠ {kri.threshold}{kri.unit}</span>
          <span className="text-[10px] text-red-500/70">⛔ {kri.criticalThreshold}{kri.unit}</span>
        </div>
      </div>
    </div>
  )
}

function KRIFormModal({ kri, onSave, onClose }) {
  const [form, setForm] = useState({
    name:               kri?.name || '',
    category:           kri?.category || 'Operational',
    unit:               kri?.unit || '%',
    currentValue:       kri?.currentValue ?? '',
    threshold:          kri?.threshold ?? '',
    criticalThreshold:  kri?.criticalThreshold ?? '',
    description:        kri?.description || '',
    invertThreshold:    kri?.invertThreshold || false,
    alertEnabled:       kri?.alertEnabled ?? true,
  })

  const handle = (e) => {
    e.preventDefault()
    onSave({
      ...kri,
      ...form,
      currentValue:      parseFloat(form.currentValue),
      threshold:         parseFloat(form.threshold),
      criticalThreshold: parseFloat(form.criticalThreshold),
      trend: 'stable', trendPct: 0,
      history: kri?.history || [parseFloat(form.currentValue)],
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f1729] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white">{kri ? 'Edit KRI' : 'Add New KRI'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">KRI Name *</label>
            <input className="input-field" placeholder="e.g. Debt-to-Equity Ratio" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Category</label>
              <select className="input-field" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Unit</label>
              <input className="input-field" placeholder="%, x, count…" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['currentValue', 'Current Value'], ['threshold', 'Warning Threshold'], ['criticalThreshold', 'Critical Threshold']].map(([k, l]) => (
              <div key={k}>
                <label className="text-xs font-medium text-slate-400 mb-1.5 block">{l}</label>
                <input type="number" step="any" className="input-field" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} required />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Description</label>
            <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-indigo-500" checked={form.invertThreshold} onChange={e => setForm(p => ({ ...p, invertThreshold: e.target.checked }))} />
              <span className="text-xs text-slate-400">Higher value = better (e.g. uptime)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-indigo-500" checked={form.alertEnabled} onChange={e => setForm(p => ({ ...p, alertEnabled: e.target.checked }))} />
              <span className="text-xs text-slate-400">Enable alerts</span>
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center">{kri ? 'Save Changes' : 'Add KRI'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function KRIMonitor() {
  const [kris, setKris] = useState(SAMPLE_KRIS)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [editingKRI, setEditingKRI] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const handleRefresh = () => {
    // Simulate small value fluctuations
    setKris(prev => prev.map(k => ({
      ...k,
      currentValue: parseFloat((k.currentValue * (1 + (Math.random() - 0.5) * 0.03)).toFixed(2)),
      history: [...k.history.slice(1), parseFloat((k.currentValue * (1 + (Math.random() - 0.5) * 0.03)).toFixed(2))],
    })))
    setLastRefresh(new Date())
  }

  const filtered = kris.filter(k => {
    const matchCat = category === 'All' || k.category === category
    const matchSearch = !search || k.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleSave = (data) => {
    if (data.id) {
      setKris(prev => prev.map(k => k.id === data.id ? data : k))
    } else {
      setKris(prev => [...prev, { ...data, id: Date.now() }])
    }
  }

  const handleDelete = (id) => {
    if (!window.confirm('Remove this KRI?')) return
    setKris(prev => prev.filter(k => k.id !== id))
  }

  const handleToggleAlert = (id) => {
    setKris(prev => prev.map(k => k.id === id ? { ...k, alertEnabled: !k.alertEnabled } : k))
  }

  const criticalCount = kris.filter(k => getStatus(k) === 'critical').length
  const warningCount  = kris.filter(k => getStatus(k) === 'warning').length
  const normalCount   = kris.filter(k => getStatus(k) === 'normal').length

  return (
    <div className="space-y-6 animate-fade-up">
      {(showForm || editingKRI) && (
        <KRIFormModal
          kri={editingKRI}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingKRI(null) }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">KRI Monitor</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Key Risk Indicators · Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="btn-secondary">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
          <button onClick={() => { setEditingKRI(null); setShowForm(true) }} className="btn-primary">
            <Plus className="w-4 h-4" />Add KRI
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Critical', count: criticalCount, icon: Zap,          color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
          { label: 'Warning',  count: warningCount,  icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
          { label: 'Normal',   count: normalCount,   icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        ].map(s => (
          <div key={s.label} className={`card border ${s.border} p-4 flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Banner */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <Zap className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300 font-medium">
            {criticalCount} KRI{criticalCount > 1 ? 's are' : ' is'} in critical range — immediate attention required.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input className="input-field pl-9" placeholder="Search KRIs…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] rounded-xl p-1 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category === c ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* KRI Grid */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <LineChartIcon className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-slate-400 font-medium">No KRIs found</p>
          <p className="text-sm text-slate-600 mt-1">Add your first Key Risk Indicator to start monitoring</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(k => (
            <KRICard
              key={k.id} kri={k}
              onEdit={(k) => { setEditingKRI(k); setShowForm(true) }}
              onDelete={handleDelete}
              onToggleAlert={handleToggleAlert}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Threshold Legend</p>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-4 h-px bg-emerald-400" />Below warning threshold — operating normally
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-4 h-px bg-amber-400" />Between warning &amp; critical — monitor closely
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-4 h-px bg-red-400" />Above critical threshold — immediate action needed
          </div>
        </div>
      </div>
    </div>
  )
}
