import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield, Users, BarChart3, FileText, BookOpen, Star,
  Trash2, Plus, Edit2, Save, X, Check, AlertTriangle,
  RefreshCw, LogOut, Eye, EyeOff, Search, Activity,
  TrendingUp, Layers, ClipboardList, Lock, ChevronRight,
  Database, Settings, User, Mail
} from 'lucide-react'
import api from '../lib/api'

// ─── Admin API helper — uses session token from login ─────────────────────────
function getToken() { return sessionStorage.getItem('admin_token') || '' }

const admHeaders = () => ({ 'x-admin-token': getToken() })

const adm = {
  get:    (path, params) => api.get(`/admin${path}`,  { headers: admHeaders(), params }),
  post:   (path, data)   => api.post(`/admin${path}`,  data, { headers: admHeaders() }),
  patch:  (path, data)   => api.patch(`/admin${path}`, data, { headers: admHeaders() }),
  delete: (path)         => api.delete(`/admin${path}`,      { headers: admHeaders() }),
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────
const Badge = ({ children, color = 'slate' }) => {
  const c = {
    slate:    'bg-slate-700 text-slate-300',
    red:      'bg-red-900/50 text-red-300',
    amber:    'bg-amber-900/50 text-amber-300',
    green:    'bg-emerald-900/50 text-emerald-300',
    blue:     'bg-blue-900/50 text-blue-300',
    violet:   'bg-violet-900/50 text-violet-300',
  }[color] || 'bg-slate-700 text-slate-300'
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${c}`}>{children}</span>
}

const Btn = ({ children, onClick, variant = 'primary', size = 'sm', disabled, className = '' }) => {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }
  const variants = {
    primary:  'bg-primary-600 hover:bg-primary-500 text-white',
    danger:   'bg-red-600 hover:bg-red-500 text-white',
    ghost:    'bg-white/5 hover:bg-white/10 text-slate-300',
    outline:  'border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

const StatCard = ({ icon: Icon, label, value, color = 'text-primary-400' }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
    <div className="w-10 h-10 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0">
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div>
      <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  </div>
)

const Input = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
    <input
      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      {...props}
    />
  </div>
)

const Select = ({ label, children, ...props }) => (
  <div>
    {label && <label className="block text-xs text-slate-400 mb-1">{label}</label>}
    <select
      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      {...props}
    >
      {children}
    </select>
  </div>
)

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onClose }) {
  return (
    <Modal title="Confirm Delete" onClose={onClose}>
      <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-700/30 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-sm text-red-300">{message}</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" onClick={onConfirm}>Delete</Btn>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────────────────────────────────────────

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ stats }) {
  const cards = [
    { icon: Users,       label: 'Total Users',       value: stats.users,       color: 'text-blue-400' },
    { icon: ClipboardList,label:'Assessments',        value: stats.assessments, color: 'text-violet-400' },
    { icon: AlertTriangle,label:'Risks',              value: stats.risks,       color: 'text-amber-400' },
    { icon: FileText,    label: 'Reports',            value: stats.reports,     color: 'text-emerald-400' },
    { icon: Star,        label: 'Experts',            value: stats.experts,     color: 'text-pink-400' },
    { icon: Layers,      label: 'Templates',          value: stats.templates,   color: 'text-sky-400' },
    { icon: Activity,    label: 'Audit Logs',         value: stats.audit_logs,  color: 'text-orange-400' },
    { icon: Database,    label: 'Organizations',      value: stats.orgs,        color: 'text-primary-400' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => <StatCard key={c.label} {...c} />)}
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersSection() {
  const [users, setUsers]   = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm]     = useState({ email: '', password: '', full_name: '', role: 'member' })
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adm.get('/users', { search: search || undefined })
      setUsers(res.data)
    } catch { } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.email || !form.password) return
    setSaving(true)
    try {
      await adm.post('/users', form)
      setShowAdd(false)
      setForm({ email: '', password: '', full_name: '', role: 'member' })
      load()
    } catch (e) { alert(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const handleEdit = async () => {
    setSaving(true)
    try {
      await adm.patch(`/users/${editUser.id}`, editUser)
      setEditUser(null)
      load()
    } catch (e) { alert(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    await adm.delete(`/users/${id}`)
    setConfirm(null)
    load()
  }

  const ROLE_COLOR = { owner: 'violet', admin: 'blue', member: 'slate' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <Btn onClick={() => setShowAdd(true)} variant="primary" size="sm">
          <Plus className="w-3.5 h-3.5" /> Add User
        </Btn>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80 border-b border-slate-700">
            <tr>{['ID', 'Name', 'Email', 'Role', 'Status', 'Organization', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading…</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-slate-500 text-xs">#{u.id}</td>
                <td className="px-4 py-3 text-white font-medium">{u.full_name || '—'}</td>
                <td className="px-4 py-3 text-slate-300">{u.email}</td>
                <td className="px-4 py-3"><Badge color={ROLE_COLOR[u.role] || 'slate'}>{u.role}</Badge></td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{u.organization_name || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Btn variant="ghost" size="sm" onClick={() => setEditUser({ ...u, password: '' })}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Btn>
                    <Btn variant="danger" size="sm" onClick={() => setConfirm(u.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add user modal */}
      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <Input label="Full Name" placeholder="John Smith" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          <Input label="Email *" type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <div>
            <label className="block text-xs text-slate-400 mb-1">Password *</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 pr-9 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Min 6 characters" />
              <button type="button" onClick={() => setShowPwd(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </Select>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleAdd} disabled={saving}>
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add User
            </Btn>
          </div>
        </Modal>
      )}

      {/* Edit user modal */}
      {editUser && (
        <Modal title={`Edit User #${editUser.id}`} onClose={() => setEditUser(null)}>
          <Input label="Full Name" value={editUser.full_name || ''} onChange={e => setEditUser(u => ({ ...u, full_name: e.target.value }))} />
          <Input label="Email" type="email" value={editUser.email} onChange={e => setEditUser(u => ({ ...u, email: e.target.value }))} />
          <Input label="New Password (leave blank to keep)" type="password" value={editUser.password || ''} onChange={e => setEditUser(u => ({ ...u, password: e.target.value }))} placeholder="••••••••" />
          <Select label="Role" value={editUser.role} onChange={e => setEditUser(u => ({ ...u, role: e.target.value }))}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </Select>
          <Select label="Status" value={editUser.is_active ? 'true' : 'false'} onChange={e => setEditUser(u => ({ ...u, is_active: e.target.value === 'true' }))}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setEditUser(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleEdit} disabled={saving}>
              <Save className="w-3.5 h-3.5" /> Save Changes
            </Btn>
          </div>
        </Modal>
      )}

      {confirm && (
        <ConfirmModal
          message="This will permanently delete the user and all associated data."
          onConfirm={() => handleDelete(confirm)}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

// ── Risks ─────────────────────────────────────────────────────────────────────
function RisksSection() {
  const [risks, setRisks] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSev, setFilterSev] = useState('')
  const [editRisk, setEditRisk] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adm.get('/risks', { search: search || undefined, severity: filterSev || undefined, limit: 200 })
      setRisks(res.data.risks)
      setTotal(res.data.total)
    } catch { } finally { setLoading(false) }
  }, [search, filterSev])

  useEffect(() => { load() }, [load])

  const handleUpdate = async () => {
    await adm.patch(`/risks/${editRisk.id}`, {
      name: editRisk.name, description: editRisk.description,
      status: editRisk.status, severity: editRisk.severity, owner: editRisk.owner,
    })
    setEditRisk(null); load()
  }

  const handleDelete = async (id) => {
    await adm.delete(`/risks/${id}`)
    setConfirm(null); load()
  }

  const SEV_COLOR = { critical: 'red', high: 'amber', medium: 'blue', low: 'green' }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search risks…"
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Severities</option>
          {['critical','high','medium','low'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{total} risks total</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80 border-b border-slate-700">
            <tr>{['Name', 'Category', 'Score', 'Severity', 'Status', 'Owner', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading…</td></tr>
            ) : risks.map(r => (
              <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{r.name}</td>
                <td className="px-4 py-3 text-slate-400 capitalize">{r.category}</td>
                <td className="px-4 py-3 font-bold">
                  <span className={r.score >= 8 ? 'text-red-400' : r.score >= 6 ? 'text-amber-400' : r.score >= 4 ? 'text-yellow-400' : 'text-emerald-400'}>
                    {r.score?.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3"><Badge color={SEV_COLOR[r.severity] || 'slate'}>{r.severity}</Badge></td>
                <td className="px-4 py-3"><Badge>{r.status}</Badge></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{r.owner || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Btn variant="ghost" size="sm" onClick={() => setEditRisk({ ...r })}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Btn>
                    <Btn variant="danger" size="sm" onClick={() => setConfirm(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && risks.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No risks found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editRisk && (
        <Modal title={`Edit Risk #${editRisk.id}`} onClose={() => setEditRisk(null)}>
          <Input label="Name" value={editRisk.name} onChange={e => setEditRisk(r => ({ ...r, name: e.target.value }))} />
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea value={editRisk.description || ''} onChange={e => setEditRisk(r => ({ ...r, description: e.target.value }))}
              rows={3} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <Input label="Owner" value={editRisk.owner || ''} onChange={e => setEditRisk(r => ({ ...r, owner: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Severity" value={editRisk.severity} onChange={e => setEditRisk(r => ({ ...r, severity: e.target.value }))}>
              {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select label="Status" value={editRisk.status} onChange={e => setEditRisk(r => ({ ...r, status: e.target.value }))}>
              {['open','mitigated','accepted','closed'].map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setEditRisk(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleUpdate}><Save className="w-3.5 h-3.5" /> Save</Btn>
          </div>
        </Modal>
      )}
      {confirm && (
        <ConfirmModal message="Delete this risk permanently?" onConfirm={() => handleDelete(confirm)} onClose={() => setConfirm(null)} />
      )}
    </div>
  )
}

// ── Reports ───────────────────────────────────────────────────────────────────
function ReportsSection() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  const load = async () => {
    setLoading(true)
    try { const res = await adm.get('/reports'); setReports(res.data) }
    catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    await adm.delete(`/reports/${id}`)
    setConfirm(null); load()
  }

  const STATUS_COLOR = { completed: 'green', generating: 'blue', failed: 'red', pending: 'amber' }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{reports.length} reports in database</p>
        <Btn variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</Btn>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80 border-b border-slate-700">
            <tr>{['ID', 'Title', 'Type', 'Status', 'Assessment', 'Created', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading…</td></tr>
            ) : reports.map(r => (
              <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-slate-500 text-xs">#{r.id}</td>
                <td className="px-4 py-3 text-white font-medium">{r.title || 'Untitled'}</td>
                <td className="px-4 py-3 text-slate-400 capitalize">{r.report_type}</td>
                <td className="px-4 py-3"><Badge color={STATUS_COLOR[r.status] || 'slate'}>{r.status}</Badge></td>
                <td className="px-4 py-3 text-slate-400 text-xs">#{r.assessment_id}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <Btn variant="danger" size="sm" onClick={() => setConfirm(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Btn>
                </td>
              </tr>
            ))}
            {!loading && reports.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No reports yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {confirm && (
        <ConfirmModal message="Delete this report file permanently?" onConfirm={() => handleDelete(confirm)} onClose={() => setConfirm(null)} />
      )}
    </div>
  )
}

// ── Templates ─────────────────────────────────────────────────────────────────
function TemplatesSection() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', industry: 'banking' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { const res = await adm.get('/templates'); setTemplates(res.data) }
    catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name) return
    setSaving(true)
    try { await adm.post('/templates', form); setShowAdd(false); setForm({ name: '', description: '', industry: 'banking' }); load() }
    catch (e) { alert(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    await adm.delete(`/templates/${id}`)
    setConfirm(null); load()
  }

  const INDUSTRIES = ['banking', 'technology', 'manufacturing', 'healthcare', 'retail', 'energy', 'real_estate', 'other']

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{templates.length} templates</p>
        <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Add Template</Btn>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8 text-slate-500">Loading…</div>
        ) : templates.map(t => (
          <div key={t.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{t.name}</p>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">{t.industry}</p>
              </div>
              <Btn variant="danger" size="sm" onClick={() => setConfirm(t.id)}><Trash2 className="w-3 h-3" /></Btn>
            </div>
            {t.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{t.description}</p>}
            <div className="flex items-center gap-2 mt-3">
              <Badge color="blue">{(t.risk_categories || []).length} categories</Badge>
              <Badge color="slate">{(t.default_risks || []).length} risks</Badge>
            </div>
          </div>
        ))}
        {!loading && templates.length === 0 && (
          <div className="col-span-3 text-center py-8 text-slate-500">No templates yet</div>
        )}
      </div>

      {showAdd && (
        <Modal title="Add Template" onClose={() => setShowAdd(false)}>
          <Input label="Template Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Startup Risk Template" />
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Brief description…" />
          </div>
          <Select label="Industry *" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase()+i.slice(1).replace('_',' ')}</option>)}
          </Select>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleAdd} disabled={saving}>
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create
            </Btn>
          </div>
        </Modal>
      )}
      {confirm && (
        <ConfirmModal message="Delete this template permanently?" onConfirm={() => handleDelete(confirm)} onClose={() => setConfirm(null)} />
      )}
    </div>
  )
}

// ── Experts ───────────────────────────────────────────────────────────────────
function ExpertsSection() {
  const [experts, setExperts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', title: '', industry: 'banking', bio: '', years_experience: 0, is_verified: false })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { const res = await adm.get('/experts'); setExperts(res.data) }
    catch { } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name || !form.title) return
    setSaving(true)
    try { await adm.post('/experts', { ...form, avatar_initials: form.name.slice(0,2).toUpperCase() }); setShowAdd(false); load() }
    catch (e) { alert(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    await adm.delete(`/experts/${id}`)
    setConfirm(null); load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{experts.length} experts</p>
        <Btn variant="primary" size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Add Expert</Btn>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80 border-b border-slate-700">
            <tr>{['Name', 'Title', 'Industry', 'Experience', 'Opinions', 'Verified', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading…</td></tr>
            ) : experts.map(e => (
              <tr key={e.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{e.name}</td>
                <td className="px-4 py-3 text-slate-400 text-xs max-w-[180px] truncate">{e.title}</td>
                <td className="px-4 py-3 text-slate-400 capitalize">{e.industry}</td>
                <td className="px-4 py-3 text-slate-400">{e.years_experience}y</td>
                <td className="px-4 py-3"><Badge color="blue">{e.opinions_count}</Badge></td>
                <td className="px-4 py-3">
                  {e.is_verified ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-slate-600" />}
                </td>
                <td className="px-4 py-3">
                  <Btn variant="danger" size="sm" onClick={() => setConfirm(e.id)}><Trash2 className="w-3.5 h-3.5" /></Btn>
                </td>
              </tr>
            ))}
            {!loading && experts.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No experts yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Add Expert" onClose={() => setShowAdd(false)}>
          <Input label="Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. John Smith" />
          <Input label="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Chief Risk Officer, HDFC Bank" />
          <Select label="Industry" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}>
            {['banking','technology','manufacturing','healthcare','retail','energy','financial','legal'].map(i => (
              <option key={i} value={i}>{i.charAt(0).toUpperCase()+i.slice(1)}</option>
            ))}
          </Select>
          <Input label="Years of Experience" type="number" value={form.years_experience} onChange={e => setForm(f => ({ ...f, years_experience: Number(e.target.value) }))} />
          <div>
            <label className="block text-xs text-slate-400 mb-1">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.is_verified} onChange={e => setForm(f => ({ ...f, is_verified: e.target.checked }))} className="accent-primary-500" />
            Mark as verified
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleAdd} disabled={saving}>
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Expert
            </Btn>
          </div>
        </Modal>
      )}
      {confirm && (
        <ConfirmModal message="Delete this expert and all their opinions?" onConfirm={() => handleDelete(confirm)} onClose={() => setConfirm(null)} />
      )}
    </div>
  )
}

// ── Assessments ───────────────────────────────────────────────────────────────
function AssessmentsSection() {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await adm.get('/assessments', { search: search || undefined }); setAssessments(res.data) }
    catch { } finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await adm.delete(`/assessments/${id}`)
    setConfirm(null); load()
  }

  const STATUS_COLOR = { completed: 'green', in_progress: 'blue', draft: 'slate', archived: 'amber' }

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assessments…"
          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/80 border-b border-slate-700">
            <tr>{['Title', 'Industry', 'Score', 'Status', 'Risks', 'Created', 'Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading…</td></tr>
            ) : assessments.map(a => (
              <tr key={a.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{a.title}</td>
                <td className="px-4 py-3 text-slate-400 capitalize">{a.industry}</td>
                <td className="px-4 py-3 font-bold">
                  <span className={a.overall_score >= 7 ? 'text-red-400' : a.overall_score >= 5 ? 'text-amber-400' : 'text-emerald-400'}>
                    {a.overall_score?.toFixed(1) || '—'}
                  </span>
                </td>
                <td className="px-4 py-3"><Badge color={STATUS_COLOR[a.status] || 'slate'}>{a.status?.replace('_',' ')}</Badge></td>
                <td className="px-4 py-3 text-slate-400">{a.risk_count}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">
                  <Btn variant="danger" size="sm" onClick={() => setConfirm(a.id)}><Trash2 className="w-3.5 h-3.5" /></Btn>
                </td>
              </tr>
            ))}
            {!loading && assessments.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No assessments found</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {confirm && (
        <ConfirmModal message="This will delete the assessment AND all its risks." onConfirm={() => handleDelete(confirm)} onClose={() => setConfirm(null)} />
      )}
    </div>
  )
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function HeatmapSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adm.get('/heatmap').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-12 text-slate-500">Loading…</div>
  if (!data) return null

  const { severity_breakdown, total } = data
  const cells = ['critical','high','medium','low']
  const colors = { critical: 'bg-red-600', high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-emerald-500' }
  const labels = { critical: '9–10', high: '7–8', medium: '4–6', low: '1–3' }

  return (
    <div className="space-y-6">
      {/* Severity breakdown cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cells.map(sev => (
          <div key={sev} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <div className={`w-3 h-3 rounded-full ${colors[sev]} mx-auto mb-2`} />
            <p className="text-2xl font-bold text-white">{severity_breakdown[sev] || 0}</p>
            <p className="text-xs text-slate-400 capitalize mt-0.5">{sev} <span className="text-slate-600">({labels[sev]})</span></p>
          </div>
        ))}
      </div>

      {/* Cells table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Risk Distribution by Probability × Impact</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400">
                <th className="text-left pb-3 pr-4">Probability</th>
                <th className="text-left pb-3 pr-4">Impact</th>
                <th className="text-left pb-3 pr-4">Risk Count</th>
                <th className="text-left pb-3">Top Risks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.cells.sort((a, b) => b.count - a.count).map((cell, i) => (
                <tr key={i} className="hover:bg-slate-700/30">
                  <td className="py-2.5 pr-4 text-white capitalize">{cell.probability}</td>
                  <td className="py-2.5 pr-4 text-white capitalize">{cell.impact}</td>
                  <td className="py-2.5 pr-4"><Badge color="blue">{cell.count}</Badge></td>
                  <td className="py-2.5 text-slate-400 text-xs">
                    {cell.risks.slice(0, 3).map(r => r.name).join(', ')}
                    {cell.risks.length > 3 && ` +${cell.risks.length - 3} more`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-4">Total risks mapped: {total}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Admin Panel
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',     label: 'Overview',     icon: Activity },
  { id: 'users',        label: 'Users',         icon: Users },
  { id: 'risks',        label: 'Risk Register', icon: AlertTriangle },
  { id: 'assessments',  label: 'Assessments',   icon: ClipboardList },
  { id: 'heatmap',      label: 'Heatmap',       icon: BarChart3 },
  { id: 'reports',      label: 'Reports',       icon: FileText },
  { id: 'templates',    label: 'Templates',     icon: Layers },
  { id: 'experts',      label: 'Experts',       icon: Star },
]

export default function AdminPanel() {
  const [authed, setAuthed]     = useState(() => !!sessionStorage.getItem('admin_token'))
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loginError, setLoginError] = useState('')
  const [logging, setLogging]   = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats]       = useState({})
  const [statsLoading, setStatsLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState('')

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!email || !password) { setLoginError('Enter your email and password'); return }
    setLogging(true); setLoginError('')
    try {
      const res = await api.post('/admin/login', { email, password })
      const { token, email: ae } = res.data
      sessionStorage.setItem('admin_token', token)
      setAdminEmail(ae)
      setAuthed(true)
    } catch (err) {
      setLoginError(err.response?.data?.detail || 'Invalid credentials')
    } finally { setLogging(false) }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token')
    setAuthed(false); setEmail(''); setPassword('')
  }

  useEffect(() => {
    if (authed) {
      adm.get('/stats')
        .then(r => { setStats(r.data); setStatsLoading(false) })
        .catch(() => { handleLogout() }) // token invalid → re-login
    }
  }, [authed])

  // ── Login screen ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-violet-900/10 pointer-events-none" />
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full bg-primary-600/10 blur-[100px]" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[350px] h-[350px] rounded-full bg-violet-600/10 blur-[80px]" />

        <div className="w-full max-w-sm relative">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-primary-500/30">
              <Shield className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 text-sm mt-1.5">RiskIQ Control Centre — restricted access</p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-7 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-4">

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setLoginError('') }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                    placeholder="admin@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setLoginError('') }}
                    className="w-full pl-10 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700/40 rounded-xl text-red-300 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {loginError}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={logging}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-primary-500/20 disabled:opacity-60 mt-1">
                {logging ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Signing in…</>
                ) : (
                  <>Sign In to Admin Panel <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-600 mt-5">
              Credentials are stored in <code className="text-slate-500">backend/.env</code>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main panel ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex">

      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">RiskIQ</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Bottom: logout + link to app */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          <a href="/dashboard" target="_blank"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <ChevronRight className="w-4 h-4" /> Open App
          </a>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 h-14 flex items-center justify-between">
          <h1 className="text-base font-semibold text-white">
            {TABS.find(t => t.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-3">
            {!statsLoading && (
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{stats.users} users</span>
                <span>{stats.risks} risks</span>
                <span>{stats.assessments} assessments</span>
              </div>
            )}
            <div className="w-7 h-7 bg-primary-600/20 border border-primary-600/30 rounded-lg flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary-400" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview'    && <Overview stats={stats} />}
          {activeTab === 'users'       && <UsersSection />}
          {activeTab === 'risks'       && <RisksSection />}
          {activeTab === 'assessments' && <AssessmentsSection />}
          {activeTab === 'heatmap'     && <HeatmapSection />}
          {activeTab === 'reports'     && <ReportsSection />}
          {activeTab === 'templates'   && <TemplatesSection />}
          {activeTab === 'experts'     && <ExpertsSection />}
        </div>
      </main>
    </div>
  )
}
