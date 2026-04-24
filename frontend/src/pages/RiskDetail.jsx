import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Shield, AlertTriangle, Edit2, Save, X,
  Plus, Trash2, CheckCircle2, Clock, User, Sparkles, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { risksAPI, aiAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'
import { formatScore, formatDate, capitalize } from '../lib/utils'

const SCORE_COLOR = (s) =>
  s >= 8 ? 'text-red-600' : s >= 6 ? 'text-orange-500' : s >= 4 ? 'text-amber-500' : 'text-emerald-500'

const PRIORITY_COLOR = { high: 'text-red-500', medium: 'text-amber-500', low: 'text-emerald-500' }
const ACTION_COLOR = {
  avoid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  reduce: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accept: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
}

function ScoreGauge({ score }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? '#DC2626' : score >= 6 ? '#F97316' : score >= 4 ? '#F59E0B' : '#10B981'
  const r = 54, cx = 70, cy = 70
  const circumference = Math.PI * r
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" className="dark:stroke-slate-700" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={cx} y={cy - 8} textAnchor="middle" fill={color} fontSize="22" fontWeight="bold">{formatScore(score)}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#94a3b8" fontSize="11">/ 10</text>
      </svg>
    </div>
  )
}

export default function RiskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saveLoading, setSaveLoading] = useState(false)
  const [showMitModal, setShowMitModal] = useState(false)
  const [mitForm, setMitForm] = useState({ title: '', description: '', action_type: 'reduce', priority: 'medium', estimated_cost: '', assigned_to: '' })
  const [mitLoading, setMitLoading] = useState(false)
  const [aiMitLoading, setAiMitLoading] = useState(false)

  const load = async () => {
    try {
      const res = await risksAPI.get(id)
      setRisk(res.data)
      setEditForm({
        name: res.data.name, description: res.data.description,
        category: res.data.category, probability: res.data.probability,
        impact: res.data.impact, owner: res.data.owner, status: res.data.status,
      })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id, globalRefreshKey, localRefresh])

  const handleSave = async () => {
    setSaveLoading(true)
    try {
      const res = await risksAPI.update(id, editForm)
      setRisk(res.data)
      setEditing(false)
    } catch (e) { console.error(e) }
    finally { setSaveLoading(false) }
  }

  const handleAddMitigation = async () => {
    setMitLoading(true)
    try {
      const res = await risksAPI.addMitigation(id, {
        ...mitForm,
        estimated_cost: mitForm.estimated_cost ? Number(mitForm.estimated_cost) : null
      })
      setRisk(prev => ({ ...prev, mitigations: [...(prev.mitigations || []), res.data] }))
      setShowMitModal(false)
      setMitForm({ title: '', description: '', action_type: 'reduce', priority: 'medium', estimated_cost: '', assigned_to: '' })
    } catch (e) { console.error(e) }
    finally { setMitLoading(false) }
  }

  const handleAISuggest = async () => {
    setAiMitLoading(true)
    try {
      const res = await aiAPI.analyze({
        risk_id: risk.id,
        risk_name: risk.name,
        category: risk.category,
        probability: risk.probability,
        impact: risk.impact,
        description: risk.description,
        mode: 'mitigations_only',
      })
      const suggestions = res.data?.mitigations || res.data?.risks?.[0]?.mitigations || []
      if (suggestions.length > 0) {
        setMitForm({
          title: suggestions[0].title || suggestions[0].description?.slice(0, 60) || 'AI Suggested Mitigation',
          description: suggestions[0].description || '',
          action_type: suggestions[0].action_type || 'reduce',
          priority: suggestions[0].priority || 'medium',
          estimated_cost: '',
          assigned_to: '',
        })
        setShowMitModal(true)
      }
    } catch (e) {
      // Fallback: open modal with generic suggestion
      setMitForm({
        title: `Mitigate ${risk.name}`,
        description: `Implement controls to reduce the probability and impact of "${risk.name}". Review current processes and establish preventive measures.`,
        action_type: 'reduce', priority: 'high', estimated_cost: '', assigned_to: '',
      })
      setShowMitModal(true)
    } finally {
      setAiMitLoading(false)
    }
  }

  const handleDeleteMit = async (mitId) => {
    // Optimistic remove
    setRisk(prev => ({ ...prev, mitigations: prev.mitigations.filter(m => m.id !== mitId) }))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
    </div>
  )
  if (!risk) return <div className="text-center py-16 text-slate-500">Risk not found.</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Back + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{risk.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={risk.severity}>{capitalize(risk.severity)}</Badge>
              <Badge variant={risk.status}>{capitalize(risk.status)}</Badge>
              <span className="text-xs text-slate-400">Added {formatDate(risk.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          {editing ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)}><X className="w-4 h-4" /> Cancel</Button>
              <Button size="sm" onClick={handleSave} loading={saveLoading}><Save className="w-4 h-4" /> Save</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit2 className="w-4 h-4" /> Edit</Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Score Card */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Risk Score</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center pt-2 pb-4 space-y-4">
            <ScoreGauge score={risk.score} />
            <div className="w-full space-y-3 text-sm">
              {[
                { label: 'Probability', value: risk.probability, color: risk.probability === 'high' ? 'text-red-500' : risk.probability === 'medium' ? 'text-amber-500' : 'text-emerald-500' },
                { label: 'Impact', value: risk.impact, color: risk.impact === 'high' ? 'text-red-500' : risk.impact === 'medium' ? 'text-amber-500' : 'text-emerald-500' },
                { label: 'Category', value: capitalize(risk.category), color: 'text-slate-700 dark:text-slate-300' },
                { label: 'Owner', value: risk.owner || '—', color: 'text-slate-700 dark:text-slate-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-medium capitalize ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Details / Edit */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{editing ? 'Edit Risk Details' : 'Risk Details'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <Input label="Risk Name" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                <Textarea label="Description" rows={3} value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Category" value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                    {['financial','operational','market','credit','legal','technology','reputational','strategic'].map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
                  </Select>
                  <Select label="Status" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                    {['open','mitigated','accepted','closed'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                  </Select>
                  <Select label="Probability" value={editForm.probability} onChange={e => setEditForm(p => ({ ...p, probability: e.target.value }))}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </Select>
                  <Select label="Impact" value={editForm.impact} onChange={e => setEditForm(p => ({ ...p, impact: e.target.value }))}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </Select>
                </div>
                <Input label="Risk Owner" value={editForm.owner || ''} onChange={e => setEditForm(p => ({ ...p, owner: e.target.value }))} />
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{risk.description || 'No description provided.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-slate-100 dark:border-slate-700">
                  {[
                    ['Assessment', risk.assessment_id ? `Assessment #${risk.assessment_id}` : '—'],
                    ['Created', formatDate(risk.created_at)],
                    ['Last Updated', formatDate(risk.updated_at)],
                    ['Due Date', formatDate(risk.due_date)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-slate-500">{label}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mitigations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Mitigation Actions
              <span className="text-sm font-normal text-slate-400">({(risk.mitigations || []).length})</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAISuggest} loading={aiMitLoading}>
                <Sparkles className="w-4 h-4" /> AI Suggest
              </Button>
              <Button size="sm" onClick={() => setShowMitModal(true)}>
                <Plus className="w-4 h-4" /> Add Action
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(risk.mitigations || []).length === 0 ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No mitigation actions yet.</p>
              <p className="text-slate-400 text-xs mt-1">Use <strong>AI Suggest</strong> for instant recommendations.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {(risk.mitigations || []).map((m, idx) => (
                <div key={m.id || idx} className="px-6 py-4 flex gap-4 group">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{m.title}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {m.action_type && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOR[m.action_type] || ACTION_COLOR.reduce}`}>{capitalize(m.action_type)}</span>}
                        {m.priority && <span className={`text-xs font-medium capitalize ${PRIORITY_COLOR[m.priority]}`}>{m.priority}</span>}
                        <button onClick={() => handleDeleteMit(m.id)} className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      {m.assigned_to && <span className="flex items-center gap-1"><User className="w-3 h-3" />{m.assigned_to}</span>}
                      {m.estimated_cost && <span>${Number(m.estimated_cost).toLocaleString()} est. cost</span>}
                      {m.expected_reduction && <span>{m.expected_reduction}% risk reduction</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Mitigation Modal */}
      <Modal isOpen={showMitModal} onClose={() => setShowMitModal(false)} title="Add Mitigation Action" size="lg">
        <div className="space-y-4">
          <Input label="Action Title *" placeholder="e.g., Diversify borrower base" value={mitForm.title} onChange={e => setMitForm(p => ({ ...p, title: e.target.value }))} />
          <Textarea label="Description" rows={3} placeholder="Describe what needs to be done..." value={mitForm.description} onChange={e => setMitForm(p => ({ ...p, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Action Type" value={mitForm.action_type} onChange={e => setMitForm(p => ({ ...p, action_type: e.target.value }))}>
              <option value="avoid">Avoid</option>
              <option value="reduce">Reduce</option>
              <option value="transfer">Transfer</option>
              <option value="accept">Accept</option>
            </Select>
            <Select label="Priority" value={mitForm.priority} onChange={e => setMitForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Estimated Cost ($)" type="number" placeholder="5000" value={mitForm.estimated_cost} onChange={e => setMitForm(p => ({ ...p, estimated_cost: e.target.value }))} />
            <Input label="Assigned To" placeholder="e.g., Risk Manager" value={mitForm.assigned_to} onChange={e => setMitForm(p => ({ ...p, assigned_to: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowMitModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddMitigation} loading={mitLoading}>Add Action</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
