import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Shield, AlertTriangle, Clock, FileText, Trash2, ExternalLink, Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { assessmentsAPI, risksAPI, reportsAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'
import { formatScore, formatDate, capitalize } from '../lib/utils'

const CATEGORY_COLORS = {
  financial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  operational: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  market: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  credit: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  legal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  technology: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  reputational: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  strategic: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

function ScoreBar({ score }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? 'bg-red-500' : score >= 6 ? 'bg-orange-500' : score >= 4 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-8">{formatScore(score)}</span>
    </div>
  )
}

function AIAnalysisPanel({ content }) {
  const [expanded, setExpanded] = useState(false)
  if (!content) return null
  const preview = content.slice(0, 400)
  return (
    <div className="bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-900/10 dark:to-purple-900/10 border border-primary-200 dark:border-primary-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-primary-500" />
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Risk Analysis Report</h3>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {expanded ? content : preview + (content.length > 400 ? '...' : '')}
        </pre>
      </div>
      {content.length > 400 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
        >
          {expanded ? <><ChevronUp className="w-4 h-4" />Show Less</> : <><ChevronDown className="w-4 h-4" />Read Full Analysis</>}
        </button>
      )}
    </div>
  )
}

export default function AssessmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)
  const [assessment, setAssessment] = useState(null)
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [genReport, setGenReport] = useState(false)

  const load = async () => {
    try {
      const [aRes, rRes] = await Promise.all([
        assessmentsAPI.get(id),
        risksAPI.list({ assessment_id: id })
      ])
      setAssessment(aRes.data)
      setRisks(rRes.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id, globalRefreshKey, localRefresh])

  const handleDelete = async () => {
    if (!window.confirm('Delete this assessment and all its risks?')) return
    await assessmentsAPI.delete(id)
    navigate('/dashboard')
  }

  const handleGenerateReport = async () => {
    setGenReport(true)
    try {
      const res = await reportsAPI.create({ assessment_id: Number(id), report_type: 'full' })
      navigate('/reports')
    } catch (e) {
      alert('Report generation failed. Please try again.')
    } finally {
      setGenReport(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
    </div>
  )

  if (!assessment) return (
    <div className="text-center py-16">
      <p className="text-slate-500">Assessment not found.</p>
      <Button className="mt-4" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
    </div>
  )

  const categoryGroups = risks.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {})

  const highRisks = risks.filter(r => r.severity === 'high' || r.severity === 'critical')

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{assessment.title}</h2>
            <p className="text-sm text-slate-500">{formatDate(assessment.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Button variant="outline" size="sm" onClick={handleGenerateReport} loading={genReport}>
            <FileText className="w-4 h-4" /> Generate Report
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Score', value: formatScore(assessment.overall_score || 0) + ' / 10', color: 'text-primary-500', icon: Shield },
          { label: 'Total Risks', value: risks.length, color: 'text-blue-500', icon: Shield },
          { label: 'High Risk', value: highRisks.length, color: 'text-red-500', icon: AlertTriangle },
          { label: 'Status', value: capitalize(assessment.status), color: 'text-emerald-500', icon: Clock },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Analysis */}
      <AIAnalysisPanel content={assessment.ai_analysis} />

      {/* Business Info */}
      <Card>
        <CardHeader><CardTitle>Assessment Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {[
              ['Industry', capitalize(assessment.industry)],
              ['Organization Size', capitalize(assessment.organization_size)],
              ['Location', assessment.location],
              ['Annual Revenue', assessment.annual_revenue ? `$${Number(assessment.annual_revenue).toLocaleString()}` : 'N/A'],
              ['Status', <Badge key="status" variant={assessment.status}>{capitalize(assessment.status)}</Badge>],
              ['Created', formatDate(assessment.created_at)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-slate-500 mb-1">{label}</p>
                <p className="font-medium text-slate-700 dark:text-slate-300">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risks by Category */}
      {Object.entries(categoryGroups).map(([category, catRisks]) => (
        <Card key={category}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[category] || 'bg-slate-100 text-slate-600'}`}>
                  {capitalize(category)}
                </span>
                <span>Risk ({catRisks.length})</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {catRisks.map(risk => (
                <Link key={risk.id} to={`/risks/${risk.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{risk.name}</p>
                      <Badge variant={risk.severity}>{capitalize(risk.severity)}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{risk.description || 'No description'}</p>
                  </div>
                  <div className="w-40 flex-shrink-0">
                    <ScoreBar score={risk.score} />
                  </div>
                  <div className="flex-shrink-0 text-xs text-slate-400 capitalize">{risk.status}</div>
                  <ExternalLink className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {risks.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No risks identified yet.</p>
            <Link to="/risks" className="mt-3 inline-block">
              <Button size="sm">Add Risks Manually</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
