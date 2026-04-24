import React, { useState, useEffect } from 'react'
import { Activity, Shield, AlertTriangle, User, FileText, CreditCard, Users, ChevronLeft, ChevronRight, Search, Filter, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { auditAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'
import { formatDate } from '../lib/utils'

const ACTION_ICONS = {
  'risk.created': Shield, 'risk.updated': Shield, 'risk.deleted': Shield,
  'assessment.created': FileText, 'assessment.completed': FileText, 'assessment.deleted': FileText,
  'user.login': User, 'user.registered': User,
  'plan.upgraded': CreditCard, 'plan.cancelled': CreditCard,
  'team.member_invited': Users, 'team.member_removed': Users,
  'report.generated': FileText,
}

const ACTION_COLORS = {
  'risk.created': 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  'risk.deleted': 'text-red-600 bg-red-100 dark:bg-red-900/30',
  'assessment.completed': 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  'plan.upgraded': 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  'user.login': 'text-slate-600 bg-slate-100 dark:bg-slate-700',
}

function ActionBadge({ action }) {
  const Icon = ACTION_ICONS[action] || Activity
  const color = ACTION_COLORS[action] || 'text-slate-600 bg-slate-100 dark:bg-slate-700'
  const label = action.replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  )
}

export default function AuditLog() {
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const limit = 20

  useEffect(() => { load() }, [page, globalRefreshKey, localRefresh])

  const load = async () => {
    setLoading(true)
    try {
      const [logsRes, sumRes] = await Promise.all([
        auditAPI.list({ skip: (page - 1) * limit, limit }),
        auditAPI.summary(),
      ])
      setLogs(logsRes.data?.logs || logsRes.data || [])
      setTotal(logsRes.data?.total || 0)
      setSummary(sumRes.data?.top_actions || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = search
    ? logs.filter(l => l.action?.includes(search) || l.entity_name?.toLowerCase().includes(search.toLowerCase()) || l.user_email?.toLowerCase().includes(search.toLowerCase()))
    : logs

  const pages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Audit Log</h2>
          <p className="text-slate-500 text-sm">Complete activity history for your organization</p>
        </div>
        <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {/* Summary cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summary.slice(0, 4).map(({ action, count }) => {
            const Icon = ACTION_ICONS[action] || Activity
            return (
              <Card key={action}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-primary-500" />
                    <p className="text-xs text-slate-500 truncate">{action}</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{count}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filter by action, entity, or user..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500" />
      </div>

      {/* Log Table */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary-500" />Activity ({total})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((log) => {
                const Icon = ACTION_ICONS[log.action] || Activity
                return (
                  <div key={log.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ActionBadge action={log.action} />
                        {log.entity_name && <span className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate">{log.entity_name}</span>}
                      </div>
                      {log.user_email && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />{log.user_email}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0 text-right">
                      {log.created_at ? formatDate(log.created_at) : '—'}
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No audit logs found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
