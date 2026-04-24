import React, { useState, useEffect } from 'react'
import {
  Users, Plus, Linkedin, Twitter, MessageSquare,
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus,
  CheckCircle2, Search, Trash2, AlertCircle, X, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { expertAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'

const INDUSTRIES = [
  'All', 'Banking', 'Technology', 'Healthcare', 'Manufacturing',
  'Retail', 'Financial', 'Legal', 'Auto', 'Energy', 'Real Estate',
]

const SENTIMENT = {
  bullish:  { color:'text-emerald-700 dark:text-emerald-400', bg:'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', icon:TrendingUp,  label:'Bullish' },
  bearish:  { color:'text-red-700 dark:text-red-400',         bg:'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',                icon:TrendingDown, label:'Bearish' },
  cautious: { color:'text-amber-700 dark:text-amber-400',     bg:'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',        icon:AlertCircle,  label:'Cautious' },
  neutral:  { color:'text-slate-600 dark:text-slate-400',     bg:'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700',        icon:Minus,        label:'Neutral' },
}

function Avatar({ expert, size = 'md' }) {
  const cls = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-sm'
  return (
    <div className={`${cls} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: expert.avatar_color || '#6366F1' }}>
      {expert.avatar_initials || expert.name?.[0]}
    </div>
  )
}

function OpinionCard({ opinion, onDelete }) {
  const cfg = SENTIMENT[opinion.sentiment] || SENTIMENT.neutral
  const Icon = cfg.icon
  return (
    <div className={`rounded-xl border p-4 ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex-1">{opinion.title}</h4>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
            <Icon className="w-3 h-3" />{cfg.label}
          </span>
          {onDelete && (
            <button onClick={onDelete} className="text-slate-300 hover:text-red-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{opinion.content}</p>
      {opinion.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {opinion.tags.map((t, i) => (
            <span key={i} className="text-xs bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">#{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExpertsPanel() {
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)
  const [experts, setExperts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIndustry, setSelectedIndustry] = useState('All')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [opinions, setOpinions] = useState({})   // { expertId: [...] }
  const [loadingOpinions, setLoadingOpinions] = useState(null)
  const [showAddExpert, setShowAddExpert] = useState(false)
  const [showAddOpinion, setShowAddOpinion] = useState(null)  // expert object
  const [expertForm, setExpertForm] = useState({ name:'', title:'', industry:'', bio:'', linkedin_url:'', twitter_url:'', years_experience:'', expertise_areas:'' })
  const [opinionForm, setOpinionForm] = useState({ title:'', content:'', sentiment:'neutral', industry:'', tags:'' })

  useEffect(() => { loadExperts() }, [selectedIndustry, globalRefreshKey, localRefresh])

  const loadExperts = async () => {
    setLoading(true)
    try {
      const params = selectedIndustry !== 'All' ? { industry: selectedIndustry.toLowerCase() } : {}
      const res = await expertAPI.list(params)
      setExperts(res.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadOpinions = async (expertId) => {
    if (opinions[expertId]) return
    setLoadingOpinions(expertId)
    try {
      const res = await expertAPI.getOpinions(expertId)
      setOpinions(prev => ({ ...prev, [expertId]: res.data || [] }))
    } catch (e) { console.error(e) }
    finally { setLoadingOpinions(null) }
  }

  const handleToggle = (expert) => {
    if (expanded === expert.id) { setExpanded(null); return }
    setExpanded(expert.id)
    loadOpinions(expert.id)
  }

  const handleAddExpert = async () => {
    try {
      const payload = {
        ...expertForm,
        years_experience: expertForm.years_experience ? parseInt(expertForm.years_experience) : null,
        expertise_areas: expertForm.expertise_areas.split(',').map(s => s.trim()).filter(Boolean),
        industries: expertForm.industry ? [expertForm.industry] : [],
      }
      const res = await expertAPI.create(payload)
      setExperts(prev => [...prev, res.data])
      setShowAddExpert(false)
      setExpertForm({ name:'', title:'', industry:'', bio:'', linkedin_url:'', twitter_url:'', years_experience:'', expertise_areas:'' })
    } catch (e) { alert(e.response?.data?.detail || 'Failed to add expert') }
  }

  const handleAddOpinion = async () => {
    if (!showAddOpinion) return
    try {
      const payload = {
        ...opinionForm,
        tags: opinionForm.tags.split(',').map(s => s.trim()).filter(Boolean),
        industry: opinionForm.industry || showAddOpinion.industry,
      }
      const res = await expertAPI.addOpinion(showAddOpinion.id, payload)
      setOpinions(prev => ({ ...prev, [showAddOpinion.id]: [res.data, ...(prev[showAddOpinion.id] || [])] }))
      setShowAddOpinion(null)
      setOpinionForm({ title:'', content:'', sentiment:'neutral', industry:'', tags:'' })
    } catch (e) { alert(e.response?.data?.detail || 'Failed to add opinion') }
  }

  const handleDeleteExpert = async (id) => {
    if (!window.confirm('Remove this expert?')) return
    try {
      await expertAPI.delete(id)
      setExperts(prev => prev.filter(e => e.id !== id))
    } catch (e) { alert(e.response?.data?.detail || 'Cannot delete system expert') }
  }

  const handleDeleteOpinion = async (expertId, opinionId) => {
    try {
      await expertAPI.deleteOpinion(expertId, opinionId)
      setOpinions(prev => ({ ...prev, [expertId]: (prev[expertId] || []).filter(o => o.id !== opinionId) }))
    } catch (e) { alert('Failed to delete opinion') }
  }

  const filtered = experts.filter(e =>
    !search ||
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.title?.toLowerCase().includes(search.toLowerCase()) ||
    e.industry?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Industry Experts</h2>
          <p className="text-slate-500 text-sm">Learn from the best minds — track opinions and market views</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Button onClick={() => setShowAddExpert(true)}><Plus className="w-4 h-4" />Add Expert</Button>
        </div>
      </div>

      {/* Industry filter chips */}
      <div className="flex flex-wrap gap-2">
        {INDUSTRIES.map(ind => (
          <button key={ind} onClick={() => setSelectedIndustry(ind)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedIndustry === ind ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
            {ind}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, title, or industry..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {/* Expert cards */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>
      ) : (
        <div className="space-y-4">
          {filtered.map(expert => {
            const isOpen = expanded === expert.id
            const expertOpinions = opinions[expert.id] || []
            return (
              <Card key={expert.id} className={isOpen ? 'ring-2 ring-primary-500/30' : ''}>
                <CardContent className="pt-5">
                  <div className="flex items-start gap-4">
                    <Avatar expert={expert} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100">{expert.name}</h3>
                            {expert.is_verified && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />Verified
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{expert.title}</p>
                          {expert.industry && (
                            <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full mt-1 inline-block capitalize">{expert.industry}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {expert.years_experience && <span className="text-xs text-slate-400">{expert.years_experience}y exp</span>}
                          {expert.linkedin_url && (
                            <a href={expert.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Linkedin className="w-4 h-4" /></a>
                          )}
                          {expert.twitter_url && (
                            <a href={expert.twitter_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"><Twitter className="w-4 h-4" /></a>
                          )}
                          {!expert.is_global && (
                            <button onClick={() => handleDeleteExpert(expert.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => handleToggle(expert)} className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                            {isOpen ? <><ChevronUp className="w-4 h-4" />Hide</> : <><ChevronDown className="w-4 h-4" />Opinions</>}
                          </button>
                        </div>
                      </div>
                      {expert.bio && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{expert.bio}</p>}
                      {expert.expertise_areas?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {expert.expertise_areas.map((area, i) => (
                            <span key={i} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{area}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Opinions panel */}
                  {isOpen && (
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary-500" />Expert Opinions
                          <span className="text-xs text-slate-400">({expertOpinions.length})</span>
                        </h4>
                        <Button size="sm" onClick={() => setShowAddOpinion(expert)}><Plus className="w-3.5 h-3.5" />Add</Button>
                      </div>
                      {loadingOpinions === expert.id ? (
                        <div className="flex items-center justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" /></div>
                      ) : expertOpinions.length > 0 ? (
                        <div className="space-y-3">
                          {expertOpinions.map(op => (
                            <OpinionCard key={op.id} opinion={op} onDelete={() => handleDeleteOpinion(expert.id, op.id)} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-slate-400">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No opinions yet</p>
                          <button onClick={() => setShowAddOpinion(expert)} className="text-xs text-primary-500 hover:text-primary-600 mt-1">Add the first opinion</button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No experts found</p>
              <p className="text-sm mt-1">Try a different filter or add a new expert</p>
            </div>
          )}
        </div>
      )}

      {/* Add Expert Modal */}
      <Modal isOpen={showAddExpert} onClose={() => setShowAddExpert(false)} title="Add Industry Expert" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name *" value={expertForm.name} onChange={e => setExpertForm(p => ({...p, name: e.target.value}))} />
            <Input label="Title / Role" placeholder="CEO at XYZ Corp" value={expertForm.title} onChange={e => setExpertForm(p => ({...p, title: e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Primary Industry" value={expertForm.industry} onChange={e => setExpertForm(p => ({...p, industry: e.target.value}))}>
              <option value="">Select industry</option>
              {INDUSTRIES.filter(i => i !== 'All').map(i => <option key={i} value={i.toLowerCase()}>{i}</option>)}
            </Select>
            <Input label="Years of Experience" type="number" value={expertForm.years_experience} onChange={e => setExpertForm(p => ({...p, years_experience: e.target.value}))} />
          </div>
          <Input label="Expertise Areas (comma-separated)" placeholder="credit risk, fintech, banking" value={expertForm.expertise_areas} onChange={e => setExpertForm(p => ({...p, expertise_areas: e.target.value}))} />
          <Input label="Bio" value={expertForm.bio} onChange={e => setExpertForm(p => ({...p, bio: e.target.value}))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="LinkedIn URL" value={expertForm.linkedin_url} onChange={e => setExpertForm(p => ({...p, linkedin_url: e.target.value}))} />
            <Input label="Twitter URL" value={expertForm.twitter_url} onChange={e => setExpertForm(p => ({...p, twitter_url: e.target.value}))} />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddExpert(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddExpert} disabled={!expertForm.name}><Plus className="w-4 h-4" />Add Expert</Button>
          </div>
        </div>
      </Modal>

      {/* Add Opinion Modal */}
      <Modal isOpen={!!showAddOpinion} onClose={() => setShowAddOpinion(null)} title={`Add Opinion — ${showAddOpinion?.name}`} size="md">
        <div className="space-y-4">
          <Input label="Title *" value={opinionForm.title} onChange={e => setOpinionForm(p => ({...p, title: e.target.value}))} />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content *</label>
            <textarea rows={4} value={opinionForm.content} onChange={e => setOpinionForm(p => ({...p, content: e.target.value}))}
              placeholder="Expert's opinion, analysis, or market insight..."
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Sentiment" value={opinionForm.sentiment} onChange={e => setOpinionForm(p => ({...p, sentiment: e.target.value}))}>
              <option value="bullish">🟢 Bullish</option>
              <option value="bearish">🔴 Bearish</option>
              <option value="cautious">🟡 Cautious</option>
              <option value="neutral">⚪ Neutral</option>
            </Select>
            <Input label="Industry" value={opinionForm.industry} onChange={e => setOpinionForm(p => ({...p, industry: e.target.value}))} />
          </div>
          <Input label="Tags (comma-separated)" placeholder="fintech, risk, banking" value={opinionForm.tags} onChange={e => setOpinionForm(p => ({...p, tags: e.target.value}))} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddOpinion(null)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddOpinion} disabled={!opinionForm.title || !opinionForm.content}><Plus className="w-4 h-4" />Add Opinion</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
