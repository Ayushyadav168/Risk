import React, { useEffect, useState } from 'react'
import { Users, Plus, Mail, Shield, Crown, Eye, Edit2, Trash2, Copy, CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { teamAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'
import { formatDate } from '../lib/utils'
import useAuthStore from '../store/authStore'

const ROLE_ICONS = { owner: Crown, admin: Shield, member: Edit2, viewer: Eye }
const ROLE_COLORS = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  member: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  viewer: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
}

export default function Team() {
  const { user } = useAuthStore()
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await teamAPI.getMembers()
      setMembers(res.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [globalRefreshKey, localRefresh])

  const handleInvite = async () => {
    setError('')
    if (!inviteForm.email) { setError('Email is required'); return }
    setInviteLoading(true)
    try {
      const res = await teamAPI.invite(inviteForm)
      setInviteResult(res.data)
      load()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to send invite')
    } finally { setInviteLoading(false) }
  }

  const handleRemove = async (memberId) => {
    if (!window.confirm('Remove this team member?')) return
    try {
      await teamAPI.remove(memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (e) { alert(e.response?.data?.detail || 'Failed to remove member') }
  }

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await teamAPI.updateRole(memberId, newRole)
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    } catch (e) { alert(e.response?.data?.detail || 'Failed to update role') }
  }

  const copyInviteLink = () => {
    if (inviteResult?.invite_url) {
      navigator.clipboard.writeText(inviteResult.invite_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const canManage = user?.role === 'owner' || user?.role === 'admin'

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3"><h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Team Management</h2><button onClick={() => setLocalRefresh(k=>k+1)} title="Refresh" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
          <p className="text-slate-500 text-sm">Manage members and their roles in your organization</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          {canManage && (
            <Button onClick={() => { setShowInvite(true); setInviteResult(null); setError('') }}>
              <Plus className="w-4 h-4" /> Invite Member
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: members.filter(m => m.status === 'active').length, color: 'text-blue-500' },
          { label: 'Pending Invites', value: members.filter(m => m.status === 'pending').length, color: 'text-amber-500' },
          { label: 'Admins', value: members.filter(m => m.role === 'admin' || m.role === 'owner').length, color: 'text-purple-500' },
          { label: 'Viewers', value: members.filter(m => m.role === 'viewer').length, color: 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Members List */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary-500" /> Members ({members.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {members.map((member) => {
                const RoleIcon = ROLE_ICONS[member.role] || Users
                const isCurrentUser = member.email === user?.email
                return (
                  <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(member.full_name || member.email)[0]?.toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                          {member.full_name || member.email}
                          {isCurrentUser && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{member.email}</p>
                    </div>
                    {/* Role badge */}
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[member.role]}`}>
                        <RoleIcon className="w-3 h-3" />
                        {member.role}
                      </span>
                    </div>
                    {/* Status */}
                    <div className="flex-shrink-0">
                      {member.status === 'pending' ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    {/* Joined */}
                    <div className="hidden md:block text-xs text-slate-400 flex-shrink-0 w-24 text-right">
                      {member.joined_at ? formatDate(member.joined_at) : member.invited_at ? `Invited ${formatDate(member.invited_at)}` : '—'}
                    </div>
                    {/* Actions */}
                    {canManage && !isCurrentUser && member.id !== 0 && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.id, e.target.value)}
                          className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          {['viewer', 'member', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button onClick={() => handleRemove(member.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              {members.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No team members yet. Invite your colleagues!</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Reference */}
      <Card>
        <CardHeader><CardTitle>Role Permissions</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 text-slate-500 font-medium">Permission</th>
                {['Viewer', 'Member', 'Admin', 'Owner'].map(r => (
                  <th key={r} className="text-center py-2 text-slate-500 font-medium px-4">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {[
                ['View risks & assessments', true, true, true, true],
                ['Create/edit risks', false, true, true, true],
                ['Delete risks', false, false, true, true],
                ['Invite team members', false, false, true, true],
                ['Manage billing', false, false, false, true],
                ['Delete organization', false, false, false, true],
              ].map(([perm, ...access]) => (
                <tr key={perm} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">{perm}</td>
                  {access.map((has, i) => (
                    <td key={i} className="text-center py-2.5 px-4">
                      {has
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                        : <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite Team Member" size="md">
        {!inviteResult ? (
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <Input label="Email Address *" type="email" placeholder="colleague@company.com"
              value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} />
            <Select label="Role" value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}>
              <option value="viewer">Viewer — Read-only access</option>
              <option value="member">Member — Create and edit</option>
              <option value="admin">Admin — Full access (except billing)</option>
            </Select>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-400">
              An invitation link will be generated. Share it with your colleague.
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleInvite} loading={inviteLoading}>
                <Mail className="w-4 h-4" /> Send Invite
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Invitation Created!</p>
              <p className="text-sm text-slate-500 mt-1">Share this invite link with your colleague:</p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
              <span className="flex-1 text-left">{inviteResult.invite_url}</span>
              <button onClick={copyInviteLink} className="flex-shrink-0 p-1 hover:text-primary-500">
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <Button className="w-full" onClick={() => { setShowInvite(false); setInviteResult(null); setInviteForm({ email: '', role: 'member' }) }}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
