import React, { useState, useEffect } from 'react'
import { Webhook, Plus, Trash2, Play, CheckCircle2, XCircle, ToggleLeft, ToggleRight, Slack, Globe, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { webhookAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'

const PLATFORM_ICONS = { slack: '🟢', teams: '🔵', custom: '⚙️' }

export default function Webhooks() {
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)
  const [hooks, setHooks] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [testResult, setTestResult] = useState({})  // { hookId: {success, message} }
  const [testing, setTesting] = useState(null)
  const [showSecret, setShowSecret] = useState({})
  const [form, setForm] = useState({ name: '', url: '', platform: 'custom', events: [] })
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => { load() }, [globalRefreshKey, localRefresh])

  const load = async () => {
    setLoading(true)
    try {
      const [hooksRes, eventsRes] = await Promise.all([webhookAPI.list(), webhookAPI.events()])
      setHooks(hooksRes.data || [])
      setEvents(eventsRes.data?.events || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!form.name || !form.url || form.events.length === 0) return
    setFormLoading(true)
    try {
      const res = await webhookAPI.create(form)
      setHooks(prev => [...prev, res.data])
      setShowCreate(false)
      setForm({ name: '', url: '', platform: 'custom', events: [] })
    } catch (e) { alert(e.response?.data?.detail || 'Failed to create webhook') }
    finally { setFormLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this webhook?')) return
    try {
      await webhookAPI.delete(id)
      setHooks(prev => prev.filter(h => h.id !== id))
    } catch (e) { alert('Failed to delete') }
  }

  const handleToggle = async (hook) => {
    try {
      await webhookAPI.update(hook.id, { is_active: !hook.is_active })
      setHooks(prev => prev.map(h => h.id === hook.id ? { ...h, is_active: !h.is_active } : h))
    } catch (e) { alert('Failed to update') }
  }

  const handleTest = async (hook) => {
    setTesting(hook.id)
    try {
      const res = await webhookAPI.test(hook.id)
      setTestResult(prev => ({ ...prev, [hook.id]: res.data }))
    } catch (e) {
      setTestResult(prev => ({ ...prev, [hook.id]: { success: false, message: 'Request failed' } }))
    } finally { setTesting(null) }
  }

  const toggleEvent = (eventId) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(eventId) ? prev.events.filter(e => e !== eventId) : [...prev.events, eventId],
    }))
  }

  const grouped = events.reduce((acc, ev) => {
    acc[ev.group] = acc[ev.group] || []
    acc[ev.group].push(ev)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Webhooks</h2>
          <p className="text-slate-500 text-sm">Send real-time events to Slack, Teams, or custom endpoints</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />New Webhook</Button>
        </div>
      </div>

      {/* Hooks list */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>
      ) : (
        <div className="space-y-3">
          {hooks.map(hook => {
            const result = testResult[hook.id]
            return (
              <Card key={hook.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="text-2xl">{PLATFORM_ICONS[hook.platform] || '⚙️'}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{hook.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hook.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                            {hook.is_active ? 'Active' : 'Paused'}
                          </span>
                          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded capitalize">{hook.platform}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-sm">{hook.url}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(hook.events || []).map(ev => (
                            <span key={ev} className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full">{ev}</span>
                          ))}
                        </div>
                        {hook.last_triggered_at && (
                          <p className="text-xs text-slate-400 mt-1">Last triggered: {new Date(hook.last_triggered_at).toLocaleString()}</p>
                        )}
                        {result && (
                          <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${result.success ? 'text-emerald-600' : 'text-red-600'}`}>
                            {result.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            Test {result.success ? 'succeeded' : 'failed'} {result.status_code ? `(${result.status_code})` : ''} — {result.message?.slice(0, 60)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" variant="secondary" onClick={() => handleTest(hook)} loading={testing === hook.id}>
                        <Play className="w-3.5 h-3.5" />Test
                      </Button>
                      <button onClick={() => handleToggle(hook)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors" title={hook.is_active ? 'Pause' : 'Enable'}>
                        {hook.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => handleDelete(hook.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {hooks.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No webhooks configured</p>
              <p className="text-sm mt-1">Connect to Slack, Teams, or any HTTP endpoint</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />Create Webhook</Button>
            </div>
          )}
        </div>
      )}

      {/* Info card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4 pb-3">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>How it works:</strong> When events occur in RiskIQ (new risk, completed assessment, etc.), we send a signed HTTP POST to your endpoint.
            Each request includes an <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">X-RiskIQ-Signature</code> header for verification.
            Slack &amp; Teams format payloads automatically.
          </p>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Webhook" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name *" placeholder="My Slack Alert" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
            <Select label="Platform" value={form.platform} onChange={e => setForm(p => ({...p, platform: e.target.value}))}>
              <option value="custom">⚙️ Custom HTTP</option>
              <option value="slack">🟢 Slack</option>
              <option value="teams">🔵 Microsoft Teams</option>
            </Select>
          </div>
          <Input label="URL *" placeholder="https://hooks.slack.com/..." value={form.url} onChange={e => setForm(p => ({...p, url: e.target.value}))} />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Events to subscribe *</label>
            <div className="space-y-3">
              {Object.entries(grouped).map(([group, evs]) => (
                <div key={group}>
                  <p className="text-xs text-slate-500 font-semibold mb-1.5">{group}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {evs.map(ev => (
                      <label key={ev.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.events.includes(ev.id)} onChange={() => toggleEvent(ev.id)}
                          className="rounded border-slate-300 text-primary-500 focus:ring-primary-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{ev.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {form.platform === 'slack' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-400">
              <strong>Slack:</strong> Use an Incoming Webhook URL from your Slack App configuration. Go to api.slack.com → Your App → Incoming Webhooks.
            </div>
          )}
          {form.platform === 'teams' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-400">
              <strong>Teams:</strong> Create an Incoming Webhook connector in your Teams channel and paste the URL here.
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreate} loading={formLoading} disabled={!form.name || !form.url || form.events.length === 0}>
              <Plus className="w-4 h-4" />Create Webhook
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
