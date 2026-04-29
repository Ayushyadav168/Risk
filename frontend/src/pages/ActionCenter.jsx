import React, { useState, useEffect, useCallback } from 'react'
import {
  Target, Plus, Filter, Search, ChevronDown, ChevronUp, X,
  Calendar, User, AlertTriangle, CheckCircle, Clock, ArrowRight,
  Flame, TrendingDown, Shield, RefreshCw, MoreHorizontal,
  Edit2, Trash2, MessageSquare, Paperclip, Flag
} from 'lucide-react'
import { risksAPI } from '../lib/api'

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: 'bg-slate-500/20 text-slate-400',   dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400',     dot: 'bg-blue-400' },
  completed:   { label: 'Completed',   color: 'bg-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400' },
  overdue:     { label: 'Overdue',     color: 'bg-red-500/20 text-red-400',       dot: 'bg-red-400' },
  blocked:     { label: 'Blocked',     color: 'bg-amber-500/20 text-amber-400',   dot: 'bg-amber-400' },
}

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'text-red-400',    icon: Flame },
  high:     { label: 'High',     color: 'text-orange-400', icon: AlertTriangle },
  medium:   { label: 'Medium',   color: 'text-amber-400',  icon: Flag },
  low:      { label: 'Low',      color: 'text-slate-400',  icon: TrendingDown },
}

const ACTION_TYPES = ['avoid', 'mitigate', 'transfer', 'accept']

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  )
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function DueDateChip({ date }) {
  if (!date) return <span className="text-xs text-slate-600">No due date</span>
  const days = daysUntil(date)
  const formatted = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  if (days < 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
      <Clock className="w-3 h-3" />{Math.abs(days)}d overdue
    </span>
  )
  if (days === 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
      <Clock className="w-3 h-3" />Due today
    </span>
  )
  if (days <= 3) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
      <Clock className="w-3 h-3" />{formatted}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Calendar className="w-3 h-3" />{formatted}
    </span>
  )
}

function EditMitigationModal({ mitigation, riskId, onSave, onClose }) {
  const [form, setForm] = useState({
    title:              mitigation?.title || '',
    description:        mitigation?.description || '',
    status:             mitigation?.status || 'pending',
    priority:           mitigation?.priority || 'medium',
    action_type:        mitigation?.action_type || 'mitigate',
    assigned_to:        mitigation?.assigned_to || '',
    due_date:           mitigation?.due_date ? mitigation.due_date.slice(0, 10) : '',
    estimated_cost:     mitigation?.estimated_cost || '',
    expected_reduction: mitigation?.expected_reduction || '',
  })
  const [saving, setSaving] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload.estimated_cost) payload.estimated_cost = parseFloat(payload.estimated_cost)
      if (payload.expected_reduction) payload.expected_reduction = parseFloat(payload.expected_reduction)
      if (!payload.due_date) delete payload.due_date
      await onSave(riskId, mitigation.id, payload)
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f1729] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white">Edit Mitigation Task</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handle} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Title *</label>
            <input className="input-field" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Description</label>
            <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Status</label>
              <select className="input-field" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Priority</label>
              <select className="input-field" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {Object.keys(PRIORITY_CONFIG).map(k => <option key={k} value={k}>{PRIORITY_CONFIG[k].label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Action Type</label>
              <select className="input-field" value={form.action_type} onChange={e => setForm(p => ({ ...p, action_type: e.target.value }))}>
                {ACTION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Assigned To</label>
              <input className="input-field" placeholder="Name or email" value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Due Date</label>
              <input type="date" className="input-field" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Est. Cost</label>
              <input type="number" className="input-field" placeholder="0.00" value={form.estimated_cost} onChange={e => setForm(p => ({ ...p, estimated_cost: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MitigationCard({ mitigation, riskId, riskName, riskSeverity, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${mitigation.title}"?`)) return
    setDeleting(true)
    try { await onDelete(riskId, mitigation.id) }
    finally { setDeleting(false) }
  }

  const severityDot = {
    critical: 'bg-red-500',
    high: 'bg-orange-400',
    medium: 'bg-amber-400',
    low: 'bg-emerald-400',
  }[riskSeverity] || 'bg-slate-400'

  return (
    <>
      {editing && (
        <EditMitigationModal
          mitigation={mitigation} riskId={riskId}
          onSave={onUpdate} onClose={() => setEditing(false)}
        />
      )}
      <div className="card p-4 hover:border-white/[0.12] transition-all group">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${severityDot}`} />
                {riskName}
              </span>
            </div>
            <p className="text-sm font-medium text-white leading-snug">{mitigation.title}</p>
            {mitigation.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{mitigation.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => setEditing(true)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleDelete} disabled={deleting} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
              {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={mitigation.status || 'pending'} />
            <PriorityBadge priority={mitigation.priority || 'medium'} />
            {mitigation.action_type && (
              <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05]">
                {mitigation.action_type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {mitigation.assigned_to && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <User className="w-3 h-3" />{mitigation.assigned_to}
              </span>
            )}
            <DueDateChip date={mitigation.due_date} />
          </div>
        </div>

        {(mitigation.estimated_cost || mitigation.expected_reduction) && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
            {mitigation.estimated_cost && (
              <div>
                <p className="text-[10px] text-slate-600 mb-0.5">Est. Cost</p>
                <p className="text-xs font-semibold text-slate-300">₹{Number(mitigation.estimated_cost).toLocaleString()}</p>
              </div>
            )}
            {mitigation.expected_reduction && (
              <div>
                <p className="text-[10px] text-slate-600 mb-0.5">Risk Reduction</p>
                <p className="text-xs font-semibold text-emerald-400">{mitigation.expected_reduction}%</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default function ActionCenter() {
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [view, setView] = useState('board') // 'board' | 'list'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await risksAPI.list()
      setRisks(res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const allMitigations = risks.flatMap(r =>
    (r.mitigations || []).map(m => ({ ...m, riskId: r.id, riskName: r.name, riskSeverity: r.severity }))
  )

  const filtered = allMitigations.filter(m => {
    const matchSearch = !search || m.title?.toLowerCase().includes(search.toLowerCase()) || m.riskName?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || (m.status || 'pending') === filterStatus
    const matchPriority = filterPriority === 'all' || (m.priority || 'medium') === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  const handleUpdate = async (riskId, mitigationId, data) => {
    await fetch(`/api/risks/${riskId}/mitigations/${mitigationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(data),
    })
    await fetchData()
  }

  const handleDelete = async (riskId, mitigationId) => {
    await fetch(`/api/risks/${riskId}/mitigations/${mitigationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
    await fetchData()
  }

  // Stats
  const total     = allMitigations.length
  const completed = allMitigations.filter(m => m.status === 'completed').length
  const overdue   = allMitigations.filter(m => m.due_date && daysUntil(m.due_date) < 0 && m.status !== 'completed').length
  const inProgress = allMitigations.filter(m => m.status === 'in_progress').length

  const boardColumns = [
    { key: 'pending',     label: 'Pending',     items: filtered.filter(m => (m.status || 'pending') === 'pending') },
    { key: 'in_progress', label: 'In Progress', items: filtered.filter(m => m.status === 'in_progress') },
    { key: 'blocked',     label: 'Blocked',     items: filtered.filter(m => m.status === 'blocked') },
    { key: 'completed',   label: 'Completed',   items: filtered.filter(m => m.status === 'completed') },
  ]

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Action Center</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track & manage all mitigation tasks across risks</p>
        </div>
        <button onClick={fetchData} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks',  value: total,      icon: Target,      color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
          { label: 'In Progress',  value: inProgress, icon: ArrowRight,  color: 'text-blue-400',    bg: 'bg-blue-500/10' },
          { label: 'Completed',    value: completed,  icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Overdue',      value: overdue,    icon: AlertTriangle, color: 'text-red-400',   bg: 'bg-red-500/10' },
        ].map(s => (
          <div key={s.label} className="stat-card flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Overall Completion</span>
            <span className="text-xs font-bold text-white">{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            className="input-field pl-9"
            placeholder="Search tasks or risks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input-field w-auto" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">All Priority</option>
          {Object.keys(PRIORITY_CONFIG).map(k => <option key={k} value={k}>{PRIORITY_CONFIG[k].label}</option>)}
        </select>
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] rounded-xl p-1">
          {[['board', 'Board'], ['list', 'List']].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === v ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : allMitigations.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <Target className="w-12 h-12 text-slate-700 mb-4" />
          <p className="text-lg font-semibold text-slate-400">No mitigation tasks yet</p>
          <p className="text-sm text-slate-600 mt-1">Add mitigations to your risks from the Risk Register to see them here.</p>
        </div>
      ) : view === 'board' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {boardColumns.map(col => {
            const cfg = STATUS_CONFIG[col.key]
            return (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-sm font-semibold text-slate-300">{col.label}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-white/[0.05] px-2 py-0.5 rounded-full">{col.items.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  {col.items.map(m => (
                    <MitigationCard key={m.id} mitigation={m} riskId={m.riskId} riskName={m.riskName} riskSeverity={m.riskSeverity} onUpdate={handleUpdate} onDelete={handleDelete} />
                  ))}
                  {col.items.length === 0 && (
                    <div className="card border-dashed flex items-center justify-center py-8 text-slate-700 text-xs">Empty</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="card flex items-center justify-center py-12 text-slate-500 text-sm">No tasks match your filters</div>
          ) : filtered.map(m => (
            <MitigationCard key={m.id} mitigation={m} riskId={m.riskId} riskName={m.riskName} riskSeverity={m.riskSeverity} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
