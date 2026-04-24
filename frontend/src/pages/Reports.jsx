import React, { useEffect, useState } from 'react'
import { FileText, Download, Plus, Clock, CheckCircle2, AlertCircle, Loader, Trash2, BarChart3, Shield, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Input'
import { reportsAPI, assessmentsAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'
import { formatDate, capitalize } from '../lib/utils'

const REPORT_TYPES = [
  { value: 'full', label: 'Full Risk Report', desc: 'Complete risk analysis with all details, heatmap & mitigations' },
  { value: 'executive', label: 'Executive Summary', desc: 'High-level overview for leadership & board meetings' },
  { value: 'technical', label: 'Technical Risk Report', desc: 'Detailed technical analysis for risk managers' },
]

const TYPE_ICONS = { full: FileText, executive: BarChart3, technical: Shield }

function StatusBadge({ status }) {
  if (status === 'ready') return <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</span>
  if (status === 'generating') return <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"><Loader className="w-3.5 h-3.5 animate-spin" /> Generating...</span>
  if (status === 'failed') return <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>
  return <span className="text-xs text-slate-400">{capitalize(status)}</span>
}

export default function Reports() {
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)
  const [reports, setReports] = useState([])
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [genForm, setGenForm] = useState({ assessment_id: '', report_type: 'full' })
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [rRes, aRes] = await Promise.all([reportsAPI.list(), assessmentsAPI.list()])
      setReports(rRes.data || [])
      setAssessments(aRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [globalRefreshKey, localRefresh])

  const handleGenerate = async () => {
    setGenError('')
    if (!genForm.assessment_id) { setGenError('Please select an assessment'); return }
    setGenLoading(true)
    try {
      const res = await reportsAPI.create({ assessment_id: Number(genForm.assessment_id), report_type: genForm.report_type })
      setReports(prev => [res.data, ...prev])
      setShowModal(false)
      setGenForm({ assessment_id: '', report_type: 'full' })
      // Poll for status update
      setTimeout(() => load(), 3000)
    } catch (e) {
      setGenError(e.response?.data?.detail || 'Report generation failed')
    } finally { setGenLoading(false) }
  }

  const handleDownload = async (report) => {
    if (report.status !== 'ready') return
    setDownloadingId(report.id)
    try {
      const res = await reportsAPI.download(report.id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.title || 'risk-report'}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e) {
      alert('Download failed. The report may still be generating.')
    } finally { setDownloadingId(null) }
  }

  const reportTypeInfo = (type) => REPORT_TYPES.find(t => t.value === type) || REPORT_TYPES[0]

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3"><h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reports</h2><button onClick={() => setLocalRefresh(k=>k+1)} title="Refresh" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
          <p className="text-slate-500 text-sm">Generate and download PDF risk reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Generate Report
          </Button>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {REPORT_TYPES.map(({ value, label, desc }) => {
          const Icon = TYPE_ICONS[value]
          const count = reports.filter(r => r.report_type === value).length
          return (
            <Card key={value} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setGenForm(p => ({ ...p, report_type: value })); setShowModal(true) }}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                    <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    <p className="text-xs text-slate-400 mt-2">{count} generated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary-500" />Report History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-14 h-14 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No reports generated yet</p>
              <p className="text-slate-400 text-sm mt-1">Generate your first report to get started</p>
              <Button className="mt-4" size="sm" onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4" /> Generate First Report
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {reports.map(report => {
                const info = reportTypeInfo(report.report_type)
                const Icon = TYPE_ICONS[report.report_type] || FileText
                return (
                  <div key={report.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl flex-shrink-0">
                      <Icon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                        {report.title || `${info.label} — Assessment #${report.assessment_id}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDate(report.created_at)}
                        </span>
                        <StatusBadge status={report.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant={report.status === 'ready' ? 'primary' : 'secondary'}
                        size="sm"
                        disabled={report.status !== 'ready' || downloadingId === report.id}
                        loading={downloadingId === report.id}
                        onClick={() => handleDownload(report)}
                      >
                        <Download className="w-4 h-4" />
                        {report.status === 'ready' ? 'Download PDF' : report.status === 'generating' ? 'Generating...' : 'Failed'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate Risk Report" size="md">
        <div className="space-y-5">
          <Select
            label="Select Assessment *"
            value={genForm.assessment_id}
            onChange={e => setGenForm(p => ({ ...p, assessment_id: e.target.value }))}
          >
            <option value="">Choose an assessment...</option>
            {assessments.map(a => (
              <option key={a.id} value={a.id}>{a.title} — {capitalize(a.industry)}</option>
            ))}
          </Select>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Report Type</label>
            <div className="space-y-2">
              {REPORT_TYPES.map(({ value, label, desc }) => (
                <label key={value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  genForm.report_type === value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}>
                  <input type="radio" name="report_type" value={value} checked={genForm.report_type === value}
                    onChange={e => setGenForm(p => ({ ...p, report_type: e.target.value }))}
                    className="mt-0.5 accent-primary-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {genError && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" />{genError}</p>}

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> Report generation may take 30–60 seconds. You can leave this page and return later.
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleGenerate} loading={genLoading}>
              <FileText className="w-4 h-4" /> Generate Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
