import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, AlertTriangle, Activity, TrendingUp, Plus, ArrowRight,
  RefreshCw, FileText, Building2, UserCheck, CreditCard, Clock,
  CheckCircle2, Circle, ChevronRight, BarChart3, Layers, Target,
  Calendar, Bell, TrendingDown, Minus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { dashboardAPI, risksAPI, companyAPI, expertAPI } from '../lib/api'
import { getSeverityBadgeClass, formatScore, capitalize, formatDate } from '../lib/utils'
import useAuthStore from '../store/authStore'
import { useRefresh } from '../context/RefreshContext'

const SEV_COLORS = { critical: '#DC2626', high: '#EF4444', medium: '#F59E0B', low: '#10B981' }

function StatCard({ label, value, icon: Icon, color, bg, sub, to }) {
  const inner = (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-3xl font-bold mt-1.5 ${color}`}>{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl ${bg}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  )
  if (to) return (
    <Link to={to}>
      <Card className="hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer">
        <CardContent className="pt-5">{inner}</CardContent>
      </Card>
    </Link>
  )
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">{inner}</CardContent>
    </Card>
  )
}

function SeverityBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 dark:text-slate-400 w-16 capitalize">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-6 text-right">{count}</span>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [risks, setRisks] = useState([])
  const [companies, setCompanies] = useState([])
  const [experts, setExperts] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      const [statsRes, risksRes] = await Promise.all([
        dashboardAPI.stats(),
        risksAPI.list(),
      ])
      setStats(statsRes.data)
      setRisks(risksRes.data || [])

      // Load secondary data non-blocking
      Promise.all([companyAPI.list(), expertAPI.list({})]).then(([cRes, eRes]) => {
        setCompanies(cRes.data || [])
        setExperts(eRes.data?.slice(0, 3) || [])
      }).catch(() => {})
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [globalRefreshKey, localRefresh])

  const sevBreakdown = stats?.risk_by_severity || {}
  const totalRisks = Object.values(sevBreakdown).reduce((a, b) => a + b, 0)

  const pieData = Object.entries(sevBreakdown)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: capitalize(k), value: v, color: SEV_COLORS[k] }))

  const openRisks = risks.filter(r => r.status === 'open')
  const criticalRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high')
  const mitigatedRisks = risks.filter(r => r.status === 'mitigated')

  const categoryData = (() => {
    const cats = {}
    risks.forEach(r => { cats[r.category] = (cats[r.category] || 0) + 1 })
    return Object.entries(cats).map(([name, count]) => ({ name: capitalize(name), count })).sort((a,b) => b.count - a.count).slice(0, 6)
  })()

  const trendData = stats?.monthly_trend || []

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">{dateStr}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {greeting}, {user?.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {criticalRisks.length > 0
              ? `${criticalRisks.length} high-priority risk${criticalRisks.length > 1 ? 's' : ''} require your attention`
              : 'Your risk portfolio is under control'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Button onClick={() => navigate('/assessments/new')}>
            <Plus className="w-4 h-4" /> New Assessment
          </Button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Risks" value={totalRisks} icon={Shield}
          color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20"
          sub={`${openRisks.length} open · ${mitigatedRisks.length} mitigated`} to="/risks" />
        <StatCard label="Critical & High" value={criticalRisks.length} icon={AlertTriangle}
          color={criticalRisks.length > 0 ? 'text-red-600' : 'text-emerald-600'}
          bg={criticalRisks.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}
          sub={criticalRisks.length > 0 ? 'Requires action' : 'All clear'} to="/risks" />
        <StatCard label="Assessments" value={stats?.total_assessments ?? 0} icon={FileText}
          color="text-purple-600 dark:text-purple-400" bg="bg-purple-50 dark:bg-purple-900/20"
          sub={`${stats?.completed_assessments ?? 0} completed`} to="/assessments/new" />
        <StatCard label="Risk Score" value={formatScore(stats?.overall_score)} icon={Target}
          color="text-primary-600 dark:text-primary-400" bg="bg-primary-50 dark:bg-primary-900/20"
          sub="Weighted average (out of 10)" />
      </div>

      {/* ── Row 2: Trend + Severity Breakdown ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Risk Trend</CardTitle>
              <span className="text-xs text-slate-400">Last 6 months</span>
            </div>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="tG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="count" stroke="#6366F1" fill="url(#tG)" strokeWidth={2} name="Risks" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No trend data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Severity Breakdown */}
        <Card>
          <CardHeader><CardTitle>Severity Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={35} paddingAngle={3}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {Object.entries(sevBreakdown).map(([sev, count]) => (
                    <SeverityBar key={sev} label={sev} count={count} total={totalRisks} color={SEV_COLORS[sev]} />
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Category Breakdown + Recent Risks ── */}
      <div className="grid lg:grid-cols-5 gap-5">

        {/* Category bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Risks by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={72} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#6366F1" radius={[0,4,4,0]} name="Risks" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No category data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Risks */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Risks</CardTitle>
              <Link to="/risks" className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 font-medium">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(stats?.recent_risks || []).length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-400">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No risks yet. Run an assessment to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {(stats?.recent_risks || []).map(risk => (
                  <Link key={risk.id} to={`/risks/${risk.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      risk.severity === 'critical' ? 'bg-red-600' :
                      risk.severity === 'high' ? 'bg-red-400' :
                      risk.severity === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{risk.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{risk.category} · {risk.status}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400 font-mono">{formatScore(risk.score)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        risk.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        risk.severity === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        risk.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      }`}>{risk.severity}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Companies + Experts + Quick Actions ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Tracked Companies */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4 text-primary-500" />Company Intel</CardTitle>
              <Link to="/companies" className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {companies.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No companies tracked</p>
                <Link to="/companies" className="text-xs text-primary-500 hover:text-primary-600 mt-1 inline-block">Add a company</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {companies.slice(0, 4).map(c => (
                  <Link key={c.id} to="/companies"
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {c.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.ticker || c.industry || 'Private'}</p>
                    </div>
                    {c.risk_score != null && (
                      <span className={`text-xs font-bold ${c.risk_score >= 7 ? 'text-red-500' : c.risk_score >= 4 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {c.risk_score?.toFixed(1)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expert Pulse */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary-500" />Expert Pulse</CardTitle>
              <Link to="/experts" className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
                All Experts <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {experts.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400">
                <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Loading experts...</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {experts.map(e => (
                  <Link key={e.id} to="/experts"
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: e.avatar_color || '#6366F1' }}>
                      {e.avatar_initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{e.name}</p>
                      <p className="text-xs text-slate-400 truncate">{e.title}</p>
                    </div>
                    {e.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'New Risk Assessment', to: '/assessments/new', icon: Plus, primary: true },
              { label: 'Add Company to Track', to: '/companies', icon: Building2 },
              { label: 'View Risk Register', to: '/risks', icon: Shield },
              { label: 'Risk Heatmap', to: '/heatmap', icon: Layers },
              { label: 'Financial Tools', to: '/financial', icon: TrendingUp },
              { label: 'Generate Report', to: '/reports', icon: FileText },
              { label: 'Industry Experts', to: '/experts', icon: UserCheck },
              { label: 'Market News', to: '/news', icon: Bell },
            ].map(({ label, to, icon: Icon, primary }) => (
              <Link key={label} to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  primary
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 5: Risk Mitigation Progress + Assessment Status ── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Mitigation Progress */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-4 h-4 text-primary-500" />Risk Status Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Open', count: openRisks.length, color: 'bg-red-400', textColor: 'text-red-600 dark:text-red-400' },
                { label: 'Mitigated', count: mitigatedRisks.length, color: 'bg-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Accepted', count: risks.filter(r => r.status === 'accepted').length, color: 'bg-amber-400', textColor: 'text-amber-600' },
                { label: 'Closed', count: risks.filter(r => r.status === 'closed').length, color: 'bg-slate-400', textColor: 'text-slate-500' },
              ].map(({ label, count, color, textColor }) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-sm text-slate-500 w-20">{label}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`}
                      style={{ width: totalRisks > 0 ? `${(count / totalRisks) * 100}%` : '0%' }} />
                  </div>
                  <span className={`text-sm font-bold w-8 text-right ${textColor}`}>{count}</span>
                </div>
              ))}
              {totalRisks === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">No risks recorded yet</p>
              )}
            </div>

            {totalRisks > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {totalRisks > 0 ? Math.round((mitigatedRisks.length / totalRisks) * 100) : 0}%
                  </p>
                  <p className="text-xs text-slate-400">Mitigation rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{totalRisks}</p>
                  <p className="text-xs text-slate-400">Total tracked</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${criticalRisks.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {criticalRisks.length}
                  </p>
                  <p className="text-xs text-slate-400">High priority</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming & Alerts */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-4 h-4 text-primary-500" />Alerts & Reminders</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {criticalRisks.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">{criticalRisks.length} High-Priority Risk{criticalRisks.length > 1 ? 's' : ''}</p>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 ml-6">Immediate review recommended</p>
                <Link to="/risks" className="text-xs text-red-600 dark:text-red-400 font-semibold ml-6 mt-1 inline-flex items-center gap-1 hover:text-red-700">
                  Review now <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            {openRisks.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{openRisks.length} Open Risk{openRisks.length > 1 ? 's' : ''} Pending</p>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 ml-6">Assign owners and mitigation plans</p>
              </div>
            )}

            {companies.length === 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Track Your First Company</p>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 ml-6">Add a listed or private company for financial intelligence</p>
                <Link to="/companies" className="text-xs text-blue-600 dark:text-blue-400 font-semibold ml-6 mt-1 inline-flex items-center gap-1 hover:text-blue-700">
                  Add company <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            {criticalRisks.length === 0 && openRisks.length === 0 && companies.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All clear — no urgent actions</p>
                </div>
              </div>
            )}

            {/* Navigation shortcuts */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Sections</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Heatmap', to: '/heatmap', icon: Layers },
                  { label: 'Reports', to: '/reports', icon: FileText },
                  { label: 'Billing', to: '/billing', icon: CreditCard },
                  { label: 'Team', to: '/team', icon: UserCheck },
                ].map(({ label, to, icon: Icon }) => (
                  <Link key={label} to={to}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm">
                    <Icon className="w-3.5 h-3.5" />{label}
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
