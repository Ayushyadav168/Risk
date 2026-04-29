import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield, Users, BarChart3, FileText, Star, Trash2, Plus, Edit2,
  X, AlertTriangle, RefreshCw, LogOut, Eye, EyeOff, Search,
  Activity, Layers, ClipboardList, Lock, Database, Mail,
  TrendingUp, CheckCircle, XCircle, Sparkles, ChevronRight, Save
} from 'lucide-react'
import api from '../lib/api'

// ─── Auth helpers ──────────────────────────────────────────────────────────────
const getToken = () => sessionStorage.getItem('admin_token') || ''
const admH = () => ({ 'x-admin-token': getToken() })
const adm = {
  get:    (path, params) => api.get(`/admin${path}`,   { headers: admH(), params }),
  post:   (path, data)   => api.post(`/admin${path}`,   data, { headers: admH() }),
  patch:  (path, data)   => api.patch(`/admin${path}`,  data, { headers: admH() }),
  delete: (path)         => api.delete(`/admin${path}`,       { headers: admH() }),
}

// ─── Tiny reusable UI ──────────────────────────────────────────────────────────
const cls = (...args) => args.filter(Boolean).join(' ')

function Badge({ children, variant = 'slate' }) {
  const map = {
    slate:   'bg-slate-700/60 text-slate-300',
    red:     'bg-red-500/15 text-red-400',
    amber:   'bg-amber-500/15 text-amber-400',
    green:   'bg-emerald-500/15 text-emerald-400',
    blue:    'bg-blue-500/15 text-blue-400',
    violet:  'bg-violet-500/15 text-violet-400',
    indigo:  'bg-indigo-500/15 text-indigo-400',
  }
  return (
    <span className={cls('inline-flex px-2 py-0.5 rounded-md text-xs font-medium', map[variant] || map.slate)}>
      {children}
    </span>
  )
}

function Btn({ children, onClick, variant = 'primary', size = 'sm', disabled, className = '' }) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    danger:  'bg-red-600 hover:bg-red-500 text-white',
    ghost:   'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white',
    outline: 'border border-white/10 hover:border-white/20 text-slate-300 hover:text-white',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={cls(base, sizes[size] || sizes.sm, variants[variant] || variants.primary, className)}>
      {children}
    </button>
  )
}

function StatCard({ icon: Icon, label, value, accent = 'indigo' }) {
  const accents = {
    indigo:  { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    violet:  { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    amber:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20'  },
    emerald: { bg: 'bg-emerald-500/10',text: 'text-emerald-400',border: 'border-emerald-500/20'},
    blue:    { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20'   },
    pink:    { bg: 'bg-pink-500/10',   text: 'text-pink-400',   border: 'border-pink-500/20'   },
    sky:     { bg: 'bg-sky-500/10',    text: 'text-sky-400',    border: 'border-sky-500/20'    },
    orange:  { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  }
  const a = accents[accent] || accents.indigo
  return (
    <div className={cls('rounded-xl border p-5 bg-white/[0.02]', a.border)}>
      <div className={cls('w-9 h-9 rounded-lg flex items-center justify-center mb-3', a.bg)}>
        <Icon className={cls('w-4.5 h-4.5', a.text)} />
      </div>
      <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

function TField({ label, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs text-slate-400 font-medium">{label}</label>}
      <input className="w-full px-3 py-2.5 bg-[#0d1426] border border-white/[0.08] rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all" {...props} />
    </div>
  )
}

function TSelect({ label, children, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs text-slate-400 font-medium">{label}</label>}
      <select className="w-full px-3 py-2.5 bg-[#0d1426] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-all" {...props}>
        {children}
      </select>
    </div>
  )
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={cls('bg-[#0f1729] border border-white/[0.08] rounded-2xl shadow-2xl w-full', wide ? 'max-w-lg' : 'max-w-md')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h3 className="font-semibold text-white text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
      </div>
    </div>
  )
}

function Confirm({ message, onConfirm, onClose }) {
  return (
    <Modal title="Confirm Delete" onClose={onClose}>
      <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-slate-300">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" onClick={onConfirm}>Delete</Btn>
      </div>
    </Modal>
  )
}

function Table({ cols, rows, loading, empty = 'No records found' }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
    </div>
  )
  if (!rows.length) return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <Database className="w-8 h-8 text-slate-700" />
      <p className="text-sm text-slate-500">{empty}</p>
    </div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {cols.map(c => (
              <th key={c.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
              {cols.map(c => (
                <td key={c.key} className="px-4 py-3 text-slate-300">
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── SECTIONS ──────────────────────────────────────────────────────────────────

function Overview({ stats }) {
  const cards = [
    { icon: Users,         label: 'Total Users',   value: stats.users,       accent: 'blue'   },
    { icon: ClipboardList, label: 'Assessments',   value: stats.assessments, accent: 'violet' },
    { icon: AlertTriangle, label: 'Risks',          value: stats.risks,       accent: 'amber'  },
    { icon: FileText,      label: 'Reports',        value: stats.reports,     accent: 'emerald'},
    { icon: Star,          label: 'Experts',        value: stats.experts,     accent: 'pink'   },
    { icon: Layers,        label: 'Templates',      value: stats.templates,   accent: 'sky'    },
    { icon: Activity,      label: 'Audit Logs',     value: stats.audit_logs,  accent: 'orange' },
    { icon: Database,      label: 'Organizations',  value: stats.orgs,        accent: 'indigo' },
  ]
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(c => <StatCard key={c.label} {...c} />)}</div>
}

function UsersSection() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ login_id: '', password: '', full_name: '', role: 'member' })
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createdCreds, setCreatedCreds] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adm.get('/users', { search: search || undefined }); setUsers(r.data) }
    catch { } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const makeId = () => `risk-${Math.random().toString(36).slice(2, 8)}`
  const makePassword = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8)

  const handleAdd = async () => {
    if (!form.full_name) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        login_id: form.login_id || makeId(),
        password: form.password || makePassword(),
      }
      const res = await adm.post('/users', payload)
      setCreatedCreds({ login_id: res.data.login_id || payload.login_id, password: res.data.password || payload.password, full_name: res.data.full_name || payload.full_name })
      setShowAdd(false)
      setForm({ login_id: '', password: '', full_name: '', role: 'member' })
      load()
    }
    catch (e) { alert(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const handleEdit = async () => {
    setSaving(true)
    try { await adm.patch(`/users/${editUser.id}`, editUser); setEditUser(null); load() }
    catch (e) { alert(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => { await adm.delete(`/users/${id}`); setConfirm(null); load() }

  const ROLE = { owner: 'violet', admin: 'blue', member: 'slate' }

  const cols = [
    { key: 'full_name', label: 'Name', render: u => <span className="text-white font-medium">{u.full_name || '—'}</span> },
    { key: 'login_id', label: 'Login ID', render: u => <code className="text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">{u.login_id || u.email}</code> },
    { key: 'role', label: 'Role', render: u => <Badge variant={ROLE[u.role]}>{u.role}</Badge> },
    { key: 'is_active', label: 'Status', render: u => u.is_active
      ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle className="w-3 h-3" />Active</span>
      : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3 h-3" />Inactive</span> },
    { key: '_actions', label: '', render: u => (
      <div className="flex items-center gap-1 justify-end">
        <Btn variant="ghost" onClick={() => setEditUser({ ...u, password: '' })}><Edit2 className="w-3.5 h-3.5" /></Btn>
        <Btn variant="ghost" onClick={() => setConfirm({ id: u.id, name: u.login_id || u.email })}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Btn>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all" />
        </div>
        <Btn onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Add User</Btn>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <Table cols={cols} rows={users} loading={loading} empty="No users found" />
      </div>

      {showAdd && (
        <Modal title="Create Dashboard Access" onClose={() => setShowAdd(false)}>
          <TField label="Name *" placeholder="John Smith" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <TField label="Login ID" type="text" placeholder="risk-a1b2c3" value={form.login_id} onChange={e => setForm(f => ({ ...f, login_id: e.target.value }))} />
            <Btn variant="ghost" onClick={() => setForm(f => ({ ...f, login_id: makeId() }))}>Random</Btn>
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400 font-medium">Password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Leave blank to generate"
                className="w-full px-3 py-2.5 pr-10 bg-[#0d1426] border border-white/[0.08] rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all" />
              <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Btn variant="ghost" onClick={() => setForm(f => ({ ...f, password: makePassword() }))}>Generate Password</Btn>
          </div>
          <TSelect label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </TSelect>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Create User'}</Btn>
          </div>
        </Modal>
      )}

      {createdCreds && (
        <Modal title="User Credentials Created" onClose={() => setCreatedCreds(null)}>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Share these credentials with the user. The password is shown only now.
          </div>
          <TField label="Name" value={createdCreds.full_name || ''} readOnly />
          <TField label="Login ID" value={createdCreds.login_id || ''} readOnly />
          <TField label="Password" value={createdCreds.password || ''} readOnly />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => navigator.clipboard?.writeText(`Login ID: ${createdCreds.login_id}\nPassword: ${createdCreds.password}`)}>Copy</Btn>
            <Btn onClick={() => setCreatedCreds(null)}>Done</Btn>
          </div>
        </Modal>
      )}

      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <TField label="Login ID" type="text" value={editUser.login_id || editUser.email || ''} onChange={e => setEditUser(u => ({ ...u, login_id: e.target.value, email: e.target.value }))} />
          <TField label="Full Name" value={editUser.full_name || ''} onChange={e => setEditUser(u => ({ ...u, full_name: e.target.value }))} />
          <TField label="New Password (leave blank to keep)" type="password" value={editUser.password || ''} onChange={e => setEditUser(u => ({ ...u, password: e.target.value }))} placeholder="••••••••" />
          <TSelect label="Role" value={editUser.role} onChange={e => setEditUser(u => ({ ...u, role: e.target.value }))}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </TSelect>
          <TSelect label="Status" value={editUser.is_active ? 'true' : 'false'} onChange={e => setEditUser(u => ({ ...u, is_active: e.target.value === 'true' }))}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </TSelect>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setEditUser(null)}>Cancel</Btn>
            <Btn onClick={handleEdit} disabled={saving}><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Changes'}</Btn>
          </div>
        </Modal>
      )}

      {confirm && (
        <Confirm message={`Permanently delete user "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm.id)} onClose={() => setConfirm(null)} />
      )}
    </div>
  )
}

function RisksSection() {
  const [risks, setRisks] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [edit, setEdit] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await adm.get('/risks', { search: search || undefined }); setRisks(r.data) }
    catch { } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => { await adm.delete(`/risks/${id}`); setConfirm(null); load() }
  const handleEdit = async () => {
    setSaving(true)
    try { await adm.patch(`/risks/${edit.id}`, edit); setEdit(null); load() }
    catch (e) { alert(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const IMP = { low: 'green', medium: 'amber', high: 'red', critical: 'red' }
  const STA = { open: 'blue', in_progress: 'amber', resolved: 'green', accepted: 'slate' }

  const cols = [
    { key: 'name', label: 'Risk Name', render: r => <span className="text-white font-medium">{r.name}</span> },
    { key: 'category', label: 'Category', render: r => r.category || '—' },
    { key: 'impact', label: 'Impact', render: r => <Badge variant={IMP[r.impact]}>{r.impact}</Badge> },
    { key: 'status', label: 'Status', render: r => <Badge variant={STA[r.status]}>{r.status?.replace('_', ' ')}</Badge> },
    { key: '_a', label: '', render: r => (
      <div className="flex justify-end gap-1">
        <Btn variant="ghost" onClick={() => setEdit({ ...r })}><Edit2 className="w-3.5 h-3.5" /></Btn>
        <Btn variant="ghost" onClick={() => setConfirm({ id: r.id, name: r.name })}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Btn>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search risks…"
          className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all" />
      </div>
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <Table cols={cols} rows={risks} loading={loading} empty="No risks found" />
      </div>
      {edit && (
        <Modal title="Edit Risk" onClose={() => setEdit(null)}>
          <TField label="Name" value={edit.name || ''} onChange={e => setEdit(r => ({ ...r, name: e.target.value }))} />
          <TField label="Description" value={edit.description || ''} onChange={e => setEdit(r => ({ ...r, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Impact" value={edit.impact || 'medium'} onChange={e => setEdit(r => ({ ...r, impact: e.target.value }))}>
              {['low','medium','high','critical'].map(v => <option key={v} value={v}>{v}</option>)}
            </TSelect>
            <TSelect label="Status" value={edit.status || 'open'} onChange={e => setEdit(r => ({ ...r, status: e.target.value }))}>
              {['open','in_progress','resolved','accepted'].map(v => <option key={v} value={v}>{v}</option>)}
            </TSelect>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={handleEdit} disabled={saving}><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}</Btn>
          </div>
        </Modal>
      )}
      {confirm && <Confirm message={`Delete risk "${confirm.name}"?`} onConfirm={() => handleDelete(confirm.id)} onClose={() => setConfirm(null)} />}
    </div>
  )
}

function AssessmentsSection() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    adm.get('/assessments').then(r => setRows(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => { await adm.delete(`/assessments/${id}`); setConfirm(null); setRows(r => r.filter(x => x.id !== id)) }

  const cols = [
    { key: 'title', label: 'Title', render: r => <span className="text-white font-medium">{r.title}</span> },
    { key: 'industry', label: 'Industry', render: r => r.industry || '—' },
    { key: 'risk_score', label: 'Score', render: r => r.risk_score != null ? <Badge variant={r.risk_score > 70 ? 'red' : r.risk_score > 40 ? 'amber' : 'green'}>{r.risk_score}</Badge> : '—' },
    { key: 'created_at', label: 'Created', render: r => r.created_at ? new Date(r.created_at).toLocaleDateString() : '—' },
    { key: '_a', label: '', render: r => (
      <div className="flex justify-end">
        <Btn variant="ghost" onClick={() => setConfirm({ id: r.id, name: r.title })}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Btn>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <Table cols={cols} rows={rows} loading={loading} empty="No assessments found" />
      </div>
      {confirm && <Confirm message={`Delete assessment "${confirm.name}"?`} onConfirm={() => handleDelete(confirm.id)} onClose={() => setConfirm(null)} />}
    </div>
  )
}

function ReportsSection() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    adm.get('/reports').then(r => setRows(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => { await adm.delete(`/reports/${id}`); setConfirm(null); setRows(r => r.filter(x => x.id !== id)) }

  const cols = [
    { key: 'title', label: 'Title', render: r => <span className="text-white font-medium">{r.title || r.filename}</span> },
    { key: 'report_type', label: 'Type', render: r => <Badge variant="indigo">{r.report_type}</Badge> },
    { key: 'created_at', label: 'Created', render: r => r.created_at ? new Date(r.created_at).toLocaleDateString() : '—' },
    { key: '_a', label: '', render: r => (
      <div className="flex justify-end">
        <Btn variant="ghost" onClick={() => setConfirm({ id: r.id, name: r.title })}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Btn>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <Table cols={cols} rows={rows} loading={loading} empty="No reports found" />
      </div>
      {confirm && <Confirm message={`Delete report "${confirm.name}"?`} onConfirm={() => handleDelete(confirm.id)} onClose={() => setConfirm(null)} />}
    </div>
  )
}

function TemplatesSection() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ name: '', industry: '', description: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    adm.get('/templates').then(r => setRows(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    setSaving(true)
    try { await adm.post('/templates', form); setShowAdd(false); setForm({ name: '', industry: '', description: '' }); load() }
    catch (e) { alert(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => { await adm.delete(`/templates/${id}`); setConfirm(null); load() }

  const cols = [
    { key: 'name', label: 'Template Name', render: r => <span className="text-white font-medium">{r.name}</span> },
    { key: 'industry', label: 'Industry', render: r => r.industry || '—' },
    { key: 'description', label: 'Description', render: r => <span className="text-slate-400 truncate max-w-[200px] block">{r.description || '—'}</span> },
    { key: '_a', label: '', render: r => (
      <div className="flex justify-end gap-1">
        <Btn variant="ghost" onClick={() => setEdit({ ...r })}><Edit2 className="w-3.5 h-3.5" /></Btn>
        <Btn variant="ghost" onClick={() => setConfirm({ id: r.id, name: r.name })}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Btn>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Add Template</Btn>
      </div>
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <Table cols={cols} rows={rows} loading={loading} empty="No templates found" />
      </div>
      {(showAdd || edit) && (
        <Modal title={edit ? 'Edit Template' : 'Add Template'} onClose={() => { setShowAdd(false); setEdit(null) }}>
          <TField label="Name *" value={edit ? edit.name : form.name} onChange={e => edit ? setEdit(t => ({ ...t, name: e.target.value })) : setForm(f => ({ ...f, name: e.target.value }))} />
          <TField label="Industry" value={edit ? edit.industry || '' : form.industry} onChange={e => edit ? setEdit(t => ({ ...t, industry: e.target.value })) : setForm(f => ({ ...f, industry: e.target.value }))} />
          <TField label="Description" value={edit ? edit.description || '' : form.description} onChange={e => edit ? setEdit(t => ({ ...t, description: e.target.value })) : setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => { setShowAdd(false); setEdit(null) }}>Cancel</Btn>
            <Btn onClick={edit ? async () => { setSaving(true); try { await adm.patch(`/templates/${edit.id}`, edit); setEdit(null); load() } catch {} finally { setSaving(false) } } : handleAdd} disabled={saving}>
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
            </Btn>
          </div>
        </Modal>
      )}
      {confirm && <Confirm message={`Delete template "${confirm.name}"?`} onConfirm={() => handleDelete(confirm.id)} onClose={() => setConfirm(null)} />}
    </div>
  )
}

function ExpertsSection() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [edit, setEdit] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    adm.get('/experts').then(r => setRows(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => { await adm.delete(`/experts/${id}`); setConfirm(null); load() }
  const handleEdit = async () => {
    setSaving(true)
    try { await adm.patch(`/experts/${edit.id}`, edit); setEdit(null); load() }
    catch (e) { alert(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const cols = [
    { key: 'name', label: 'Name', render: r => <span className="text-white font-medium">{r.name}</span> },
    { key: 'title', label: 'Title', render: r => <span className="text-slate-400 text-xs">{r.title}</span> },
    { key: 'industry', label: 'Industry', render: r => <Badge variant="indigo">{r.industry}</Badge> },
    { key: 'is_verified', label: 'Status', render: r => r.is_verified ? <Badge variant="green">Verified</Badge> : <Badge>Unverified</Badge> },
    { key: '_a', label: '', render: r => (
      <div className="flex justify-end gap-1">
        <Btn variant="ghost" onClick={() => setEdit({ ...r })}><Edit2 className="w-3.5 h-3.5" /></Btn>
        <Btn variant="ghost" onClick={() => setConfirm({ id: r.id, name: r.name })}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Btn>
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <Table cols={cols} rows={rows} loading={loading} empty="No experts found" />
      </div>
      {edit && (
        <Modal title="Edit Expert" onClose={() => setEdit(null)}>
          <TField label="Name" value={edit.name || ''} onChange={e => setEdit(x => ({ ...x, name: e.target.value }))} />
          <TField label="Title" value={edit.title || ''} onChange={e => setEdit(x => ({ ...x, title: e.target.value }))} />
          <TField label="Industry" value={edit.industry || ''} onChange={e => setEdit(x => ({ ...x, industry: e.target.value }))} />
          <TSelect label="Verified" value={edit.is_verified ? 'true' : 'false'} onChange={e => setEdit(x => ({ ...x, is_verified: e.target.value === 'true' }))}>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </TSelect>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setEdit(null)}>Cancel</Btn>
            <Btn onClick={handleEdit} disabled={saving}><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}</Btn>
          </div>
        </Modal>
      )}
      {confirm && <Confirm message={`Delete expert "${confirm.name}"?`} onConfirm={() => handleDelete(confirm.id)} onClose={() => setConfirm(null)} />}
    </div>
  )
}

function HeatmapSection() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adm.get('/heatmap').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const levels = ['critical', 'high', 'medium', 'low']
  const colors = { critical: 'bg-red-500/80', high: 'bg-amber-500/80', medium: 'bg-yellow-500/80', low: 'bg-emerald-500/80' }

  if (loading) return <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-6">Risk Distribution</h3>
        <div className="grid grid-cols-2 gap-4">
          {levels.map(level => {
            const count = data.filter ? data.filter(r => r.impact === level).length : 0
            return (
              <div key={level} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className={`w-3 h-3 rounded-full ${colors[level]}`} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-300 capitalize">{level}</p>
                  <p className="text-xl font-bold text-white">{count}</p>
                </div>
              </div>
            )
          })}
        </div>
        {Array.isArray(data) && data.length === 0 && (
          <p className="text-center text-slate-500 text-sm mt-4">No risk data available</p>
        )}
      </div>
    </div>
  )
}

// ─── TABS config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview',      icon: Activity,       section: null },
  { id: 'users',       label: 'Users',          icon: Users,          section: UsersSection },
  { id: 'risks',       label: 'Risk Register',  icon: AlertTriangle,  section: RisksSection },
  { id: 'assessments', label: 'Assessments',    icon: ClipboardList,  section: AssessmentsSection },
  { id: 'heatmap',     label: 'Heatmap',        icon: BarChart3,      section: HeatmapSection },
  { id: 'reports',     label: 'Reports',        icon: FileText,       section: ReportsSection },
  { id: 'templates',   label: 'Templates',      icon: Layers,         section: TemplatesSection },
  { id: 'experts',     label: 'Experts',        icon: Star,           section: ExpertsSection },
]

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [authed, setAuthed] = useState(() => {
    const token = sessionStorage.getItem('admin_token')
    return !!token
  })
  const [email, setEmail]     = useState('safehorizonadvisory@gmail.com')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [logging, setLogging] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({})
  const [statsLoading, setStatsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!email || !password) { setLoginError('Enter your email and password'); return }
    setLogging(true); setLoginError('')
    try {
      const res = await api.post('/admin/login', { email: email.trim(), password })
      const { token } = res.data
      sessionStorage.setItem('admin_token', token)
      setAuthed(true)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid admin credentials'
      setLoginError(msg)
    } finally { setLogging(false) }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token')
    setAuthed(false); setPassword(''); setLoginError('')
  }

  useEffect(() => {
    if (!authed) return
    setStatsLoading(true)
    adm.get('/stats')
      .then(r => { setStats(r.data); setStatsLoading(false) })
      .catch(() => { handleLogout() })
  }, [authed])

  // ── LOGIN SCREEN ─────────────────────────────────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen bg-[#060b18] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px]" />
      </div>
      <div className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative w-full max-w-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-violet-500/10 rounded-3xl blur-xl" />
        <div className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/60">

          {/* Icon + Title */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
              <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-500 text-sm mt-1">RiskIQ Control Centre</p>
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
              <Lock className="w-3 h-3 text-red-400" />
              <span className="text-xs text-red-400 font-medium">Restricted Access</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); setLoginError('') }}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setLoginError('') }}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all text-sm"
                />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{loginError}</p>
              </div>
            )}

            <button type="submit" disabled={logging}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
              {logging ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Signing in…</>
              ) : (
                <>Sign In to Admin <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-6">
            Credentials configured in <code className="text-slate-500">backend/.env</code>
          </p>
        </div>
      </div>
    </div>
  )

  // ── MAIN PANEL ───────────────────────────────────────────────────────────────
  const ActiveSection = TABS.find(t => t.id === activeTab)?.section

  return (
    <div className="min-h-screen bg-[#060b18] flex">

      {/* Sidebar */}
      <aside className={cls(
        'flex-shrink-0 bg-[#0a1020] border-r border-white/[0.06] flex flex-col transition-all duration-200',
        sidebarOpen ? 'w-56' : 'w-14'
      )}>
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/[0.05] flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-sm font-bold text-white leading-none">RiskIQ</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Admin</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                title={!sidebarOpen ? tab.label : undefined}
                className={cls(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                    : 'text-slate-500 hover:text-white hover:bg-white/[0.05]'
                )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && tab.label}
              </button>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-white/[0.05] space-y-0.5">
          <a href="/dashboard" target="_blank"
            title={!sidebarOpen ? 'Open App' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-white hover:bg-white/[0.05] transition-all">
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && 'Open App'}
          </a>
          <button onClick={handleLogout}
            title={!sidebarOpen ? 'Sign Out' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-[#0a1020]/80 backdrop-blur-md border-b border-white/[0.05] px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(s => !s)}
              className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.05]">
              <Database className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-semibold text-white">
              {TABS.find(t => t.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {!statsLoading && (
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{stats.users ?? 0} users</span>
                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{stats.risks ?? 0} risks</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
              <span className="text-xs text-indigo-300 font-medium">Admin</span>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' ? (
            statsLoading
              ? <div className="flex items-center justify-center h-40"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>
              : <Overview stats={stats} />
          ) : (
            ActiveSection ? <ActiveSection /> : (
              <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                Section coming soon
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}
