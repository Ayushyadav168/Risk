import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Info, ExternalLink, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { risksAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'
import { formatScore, capitalize } from '../lib/utils'

const PROB_LABELS = ['Low', 'Medium', 'High']
const IMPACT_LABELS = ['Low', 'Medium', 'High']

// Cell colors by (prob_idx, impact_idx) → 0-based
function getCellColor(prob, impact) {
  const score = (prob * 0.4 + impact * 0.6) / 2 * 10
  if (prob === 2 && impact === 2) return { bg: 'bg-red-600', text: 'text-white', label: 'Critical', score: 10 }
  if ((prob === 2 && impact === 1) || (prob === 1 && impact === 2)) return { bg: 'bg-red-400', text: 'text-white', label: 'High', score: 7 }
  if (prob === 2 && impact === 0) return { bg: 'bg-orange-400', text: 'text-white', label: 'Medium-High', score: 5.3 }
  if (prob === 0 && impact === 2) return { bg: 'bg-orange-400', text: 'text-white', label: 'Medium-High', score: 5.3 }
  if (prob === 1 && impact === 1) return { bg: 'bg-amber-400', text: 'text-slate-900', label: 'Medium', score: 4.7 }
  if ((prob === 1 && impact === 0) || (prob === 0 && impact === 1)) return { bg: 'bg-yellow-300', text: 'text-slate-900', label: 'Low-Medium', score: 2.7 }
  return { bg: 'bg-emerald-400', text: 'text-white', label: 'Low', score: 1.3 }
}

function mapLevel(level) {
  if (level === 'low') return 0
  if (level === 'medium') return 1
  return 2
}

const CATEGORY_COLORS = {
  financial: '#3B82F6', operational: '#8B5CF6', market: '#F59E0B',
  credit: '#EF4444', legal: '#10B981', technology: '#6366F1',
  reputational: '#EC4899', strategic: '#F97316',
}

export default function Heatmap() {
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh] = useState(0)
  const [risks, setRisks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCell, setSelectedCell] = useState(null) // {prob, impact}
  const [filterCat, setFilterCat] = useState('all')

  const load = () => {
    setLoading(true)
    risksAPI.list().then(r => {
      setRisks(r.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [globalRefreshKey, localRefresh])

  const filtered = filterCat === 'all' ? risks : risks.filter(r => r.category === filterCat)

  // Group risks into cells
  const cellRisks = (pIdx, iIdx) =>
    filtered.filter(r => mapLevel(r.probability) === pIdx && mapLevel(r.impact) === iIdx)

  const selectedRisks = selectedCell
    ? filtered.filter(r => mapLevel(r.probability) === selectedCell.prob && mapLevel(r.impact) === selectedCell.impact)
    : []

  // Category distribution
  const catCounts = filtered.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1
    return acc
  }, {})

  const categories = [...new Set(risks.map(r => r.category))]

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Risk Heatmap</h2>
          <p className="text-slate-500 text-sm">Visual probability × impact matrix for all risks</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLocalRefresh(k => k+1)} title="Refresh" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <select className="input-field w-auto" value={filterCat} onChange={e => { setFilterCat(e.target.value); setSelectedCell(null) }}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Heatmap Grid */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Risk Matrix
              <span className="text-xs font-normal text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Click a cell to see risks
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Y-axis label */}
                <div className="flex gap-2 items-end">
                  <div className="w-20 flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-3 gap-2 text-center text-xs text-slate-500 font-medium">
                    {IMPACT_LABELS.map(l => <div key={l}>{l}</div>)}
                  </div>
                </div>
                <div className="text-center text-xs text-slate-400 ml-20">← Impact →</div>

                {/* Grid rows (probability high→low) */}
                {[2, 1, 0].map(pIdx => (
                  <div key={pIdx} className="flex gap-2 items-center">
                    <div className="w-20 flex-shrink-0 text-right text-xs text-slate-500 font-medium pr-2">
                      {PROB_LABELS[pIdx]}
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      {[0, 1, 2].map(iIdx => {
                        const cell = getCellColor(pIdx, iIdx)
                        const cellR = cellRisks(pIdx, iIdx)
                        const isSelected = selectedCell?.prob === pIdx && selectedCell?.impact === iIdx
                        return (
                          <button
                            key={iIdx}
                            onClick={() => setSelectedCell(isSelected ? null : { prob: pIdx, impact: iIdx })}
                            className={`
                              ${cell.bg} ${cell.text} rounded-xl h-24 flex flex-col items-center justify-center
                              transition-all duration-200 hover:scale-105 hover:shadow-lg
                              ${isSelected ? 'ring-4 ring-white ring-offset-2 scale-105 shadow-xl' : ''}
                            `}
                          >
                            <span className="text-xs font-medium opacity-80">{cell.label}</span>
                            {cellR.length > 0 && (
                              <div className={`mt-1.5 w-7 h-7 rounded-full bg-white/30 flex items-center justify-center`}>
                                <span className="text-sm font-bold">{cellR.length}</span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Probability axis label */}
                <div className="flex gap-2 mt-1">
                  <div className="w-20 flex-shrink-0 text-xs text-slate-400 text-center" style={{ writingMode: 'vertical-lr' }}>
                    ↑ Probability ↑
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  {[
                    { color: 'bg-red-600', label: 'Critical (9-10)' },
                    { color: 'bg-red-400', label: 'High (7-8)' },
                    { color: 'bg-orange-400', label: 'Med-High (5-6)' },
                    { color: 'bg-amber-400', label: 'Medium (4-5)' },
                    { color: 'bg-yellow-300', label: 'Low-Med (3-4)' },
                    { color: 'bg-emerald-400', label: 'Low (1-3)' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className={`w-3 h-3 rounded ${color}`} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected cell risks */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedCell
                  ? `${PROB_LABELS[selectedCell.prob]} Prob / ${IMPACT_LABELS[selectedCell.impact]} Impact`
                  : 'Select a cell'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedCell ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">
                  Click any heatmap cell to see risks in that zone.
                </div>
              ) : selectedRisks.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">No risks in this zone.</div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {selectedRisks.map(risk => (
                    <li key={risk.id}>
                      <Link to={`/risks/${risk.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors gap-2 group">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[risk.category] }} />
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{risk.name}</p>
                          </div>
                          <p className="text-xs text-slate-400 capitalize ml-3.5">{risk.category}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-sm font-bold ${risk.score >= 8 ? 'text-red-600' : risk.score >= 6 ? 'text-orange-500' : 'text-amber-500'}`}>
                            {formatScore(risk.score)}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <Card>
            <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400 capitalize">{cat}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${(count / filtered.length) * 100}%`, backgroundColor: CATEGORY_COLORS[cat] || '#94a3b8' }}
                    />
                  </div>
                </div>
              ))}
              {Object.keys(catCounts).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No risks yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Risk count summary */}
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { label: 'Total Risks', value: filtered.length, color: 'text-slate-700 dark:text-slate-300' },
                { label: 'Critical', value: filtered.filter(r => r.severity === 'critical').length, color: 'text-red-700' },
                { label: 'High', value: filtered.filter(r => r.severity === 'high').length, color: 'text-red-500' },
                { label: 'Medium', value: filtered.filter(r => r.severity === 'medium').length, color: 'text-amber-500' },
                { label: 'Low', value: filtered.filter(r => r.severity === 'low').length, color: 'text-emerald-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className={`font-semibold ${color}`}>{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* All risks table */}
      <Card>
        <CardHeader><CardTitle>All Risks — Heatmap View</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                {['Risk Name', 'Category', 'Probability', 'Impact', 'Score', 'Severity', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filtered.sort((a, b) => b.score - a.score).map(risk => (
                <tr key={risk.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/risks/${risk.id}`} className="font-medium text-slate-800 dark:text-slate-200 hover:text-primary-600 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[risk.category] }} />
                      {risk.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-500 capitalize">{risk.category}</td>
                  <td className="px-5 py-3 capitalize font-medium">
                    <span className={risk.probability === 'high' ? 'text-red-500' : risk.probability === 'medium' ? 'text-amber-500' : 'text-emerald-500'}>{risk.probability}</span>
                  </td>
                  <td className="px-5 py-3 capitalize font-medium">
                    <span className={risk.impact === 'high' ? 'text-red-500' : risk.impact === 'medium' ? 'text-amber-500' : 'text-emerald-500'}>{risk.impact}</span>
                  </td>
                  <td className="px-5 py-3 font-bold">
                    <span className={risk.score >= 8 ? 'text-red-600' : risk.score >= 6 ? 'text-orange-500' : risk.score >= 4 ? 'text-amber-500' : 'text-emerald-500'}>
                      {formatScore(risk.score)}
                    </span>
                  </td>
                  <td className="px-5 py-3"><Badge variant={risk.severity}>{capitalize(risk.severity)}</Badge></td>
                  <td className="px-5 py-3"><Badge variant={risk.status}>{capitalize(risk.status)}</Badge></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="text-center py-12 text-slate-400">No risks to display.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
