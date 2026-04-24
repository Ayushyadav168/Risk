import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Plus, Search, Filter, ArrowUpDown, ExternalLink, Trash2, ChevronDown, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { risksAPI, assessmentsAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'
import { formatScore, formatDate, capitalize } from '../lib/utils'

const CATEGORIES = ['all', 'financial', 'operational', 'market', 'credit', 'legal', 'technology', 'reputational', 'strategic']
const SEVERITIES = ['all', 'critical', 'high', 'medium', 'low']
const STATUSES = ['all', 'open', 'mitigated', 'accepted', 'closed']

const CATEGORY_DOT = {
  financial: 'bg-blue-500', operational: 'bg-purple-500', market: 'bg-amber-500',
  credit: 'bg-red-500', legal: 'bg-emerald-500', technology: 'bg-indigo-500',
  reputational: 'bg-pink-500', strategic: 'bg-orange-500',
}

export default function RiskRegister() {
  const navigate = useNavigate()
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)
  const [risks, setRisks] = useState([])
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [filterSev, setFilterSev] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortField, setSortField] = useState('score')
  const [sortDir, setSortDir] = useState('desc')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ assessment_id: '', name: '', description: '', category: 'financial', probability: 'medium', impact: 'medium', owner: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [rRes, aRes] = await Promise.all([risksAPI.list(), assessmentsAPI.list()])
      setRisks(rRes.data || [])
      setAssessments(aRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [globalRefreshKey, localRefresh])

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const filtered = risks
    .filter(r => filterCat === 'all' || r.category === filterCat)
    .filter(r => filterSev === 'all' || r.severity === filterSev)
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av = a[sortField], bv = b[sortField]
      if (typeof av === 'string') av = av.toLowerCase(), bv = bv.toLowerCase()
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })

  const handleDelete = async (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Delete this risk?')) return
    await risksAPI.delete(id)
    setRisks(prev => prev.filter(r => r.id !== id))
  }

  const handleStatusChange = async (riskId, newStatus, e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await risksAPI.update(riskId, { status: newStatus })
      setRisks(prev => prev.map(r => r.id === riskId ? { ...r, status: newStatus } : r))
    } catch (e) { console.error(e) }
  }

  const handleAdd = async () => {
    setAddError('')
    if (!addForm.assessment_id || !addForm.name) {
      setAddError('Assessment and Risk name are required')
      return
    }
    setAddLoading(true)
    try {
      const res = await risksAPI.create({ ...addForm, assessment_id: Number(addForm.assessment_id) })
      setRisks(prev => [res.data, ...prev])
      setShowAddModal(false)
      setAddForm({ assessment_id: '', name: '', description: '', category: 'financial', probability: 'medium', impact: 'medium', owner: '' })
    } catch (e) {
      setAddError(e.response?.data?.detail || 'Failed to add risk')
    } finally {
      setAddLoading(false)
    }
  }

  const SortHeader = ({ field, label }) => (
    <button onClick={() => handleSort(field)} className="flex items-center gap-1 hover:text-primary-500 transition-colors">
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-primary-500' : 'text-slate-400'}`} />
    </button>
  )

  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.severity === 'critical').length,
    high: risks.filter(r => r.severity === 'high').length,
    open: risks.filter(r => r.status === 'open').length,
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3"><h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Risk Register</h2><button onClick={() => setLocalRefresh(k=>k+1)} title="Refresh" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
          <p className="text-slate-500 text-sm">Complete inventory of all identified risks</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Add Risk
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Risks', value: stats.total, color: 'text-blue-500' },
          { label: 'Critical', value: stats.critical, color: 'text-red-700' },
          { label: 'High', value: stats.high, color: 'text-red-500' },
          { label: 'Open', value: stats.open, color: 'text-amber-500' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search risks..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <select className="input-field w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : capitalize(c)}</option>)}
            </select>
            <select className="input-field w-auto" value={filterSev} onChange={e => setFilterSev(e.target.value)}>
              {SEVERITIES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Severities' : capitalize(s)}</option>)}
            </select>
            <select className="input-field w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : capitalize(s)}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No risks found. Adjust filters or add a risk.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-6 py-3 font-medium text-slate-500 dark:text-slate-400">
                    <SortHeader field="name" label="Risk Name" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                    <SortHeader field="probability" label="Probability" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                    <SortHeader field="impact" label="Impact" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                    <SortHeader field="score" label="Score" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Severity</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Owner</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map(risk => (
                  <tr key={risk.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/risks/${risk.id}`)}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_DOT[risk.category] || 'bg-slate-400'}`} />
                        <span className="font-medium text-slate-800 dark:text-slate-200 max-w-48 truncate">{risk.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{risk.category}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium capitalize ${risk.probability === 'high' ? 'text-red-500' : risk.probability === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {risk.probability}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium capitalize ${risk.impact === 'high' ? 'text-red-500' : risk.impact === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {risk.impact}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-base ${risk.score >= 8 ? 'text-red-600' : risk.score >= 6 ? 'text-orange-500' : risk.score >= 4 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {formatScore(risk.score)}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Badge variant={risk.severity}>{capitalize(risk.severity)}</Badge></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <select
                        value={risk.status}
                        onChange={e => handleStatusChange(risk.id, e.target.value, e)}
                        className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {['open', 'mitigated', 'accepted', 'closed'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{risk.owner || '—'}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/risks/${risk.id}`} className="p-1 hover:text-primary-500"><ExternalLink className="w-3.5 h-3.5" /></Link>
                        <button onClick={e => handleDelete(risk.id, e)} className="p-1 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500">
            Showing {filtered.length} of {risks.length} risks
          </div>
        )}
      </Card>

      {/* Add Risk Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Risk" size="lg">
        <div className="space-y-4">
          {addError && <p className="text-red-500 text-sm">{addError}</p>}
          <Select label="Assessment *" value={addForm.assessment_id} onChange={e => setAddForm(p => ({ ...p, assessment_id: e.target.value }))}>
            <option value="">Select assessment...</option>
            {assessments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </Select>
          <Input label="Risk Name *" placeholder="e.g., Credit Concentration Risk" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
          <Textarea label="Description" placeholder="Describe the risk..." rows={3} value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Category" value={addForm.category} onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}>
              {['financial','operational','market','credit','legal','technology','reputational','strategic'].map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
            </Select>
            <Select label="Probability" value={addForm.probability} onChange={e => setAddForm(p => ({ ...p, probability: e.target.value }))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </Select>
            <Select label="Impact" value={addForm.impact} onChange={e => setAddForm(p => ({ ...p, impact: e.target.value }))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </Select>
          </div>
          <Input label="Risk Owner" placeholder="e.g., CFO, Risk Team" value={addForm.owner} onChange={e => setAddForm(p => ({ ...p, owner: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAdd} loading={addLoading}>Add Risk</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
