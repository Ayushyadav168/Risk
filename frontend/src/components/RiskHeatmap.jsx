import React from 'react'

const CELL_COLORS = [
  ['#10B981', '#10B981', '#F59E0B', '#F59E0B', '#EF4444'],
  ['#10B981', '#F59E0B', '#F59E0B', '#EF4444', '#EF4444'],
  ['#F59E0B', '#F59E0B', '#EF4444', '#EF4444', '#DC2626'],
  ['#F59E0B', '#EF4444', '#EF4444', '#DC2626', '#DC2626'],
  ['#EF4444', '#EF4444', '#DC2626', '#DC2626', '#DC2626'],
]

const PROB_LABELS = ['Very Low', 'Low', 'Medium', 'High', 'Very High']
const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic']

export default function RiskHeatmap({ risks = [], compact = false }) {
  // Count risks per cell
  const getCellRisks = (probIdx, impactIdx) => {
    const probMap = { low: [0, 1], medium: [2], high: [3, 4] }
    const impactMap = { low: [0, 1], medium: [2], high: [3, 4] }
    return risks.filter(r => {
      const pCols = probMap[r.probability] || [2]
      const iCols = impactMap[r.impact] || [2]
      return pCols.includes(probIdx) && iCols.includes(impactIdx)
    })
  }

  return (
    <div className="w-full">
      {!compact && (
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>Low</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>Medium</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"></span>High</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-700 inline-block"></span>Critical</span>
        </div>
      )}
      <div className="flex">
        {/* Y-axis label */}
        <div className="flex flex-col justify-center mr-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 [writing-mode:vertical-lr] rotate-180 text-center">
            {compact ? 'Prob.' : 'Probability →'}
          </span>
        </div>
        <div className="flex-1">
          <div className="grid" style={{ gridTemplateColumns: `repeat(5, 1fr)`, gap: compact ? '3px' : '4px' }}>
            {[4, 3, 2, 1, 0].map(probIdx =>
              [0, 1, 2, 3, 4].map(impactIdx => {
                const cellRisks = getCellRisks(probIdx, impactIdx)
                const color = CELL_COLORS[4 - probIdx][impactIdx]
                return (
                  <div
                    key={`${probIdx}-${impactIdx}`}
                    className="relative rounded flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity group"
                    style={{
                      backgroundColor: color,
                      aspectRatio: '1',
                      opacity: 0.8 + (cellRisks.length > 0 ? 0.2 : 0),
                    }}
                    title={`${PROB_LABELS[probIdx]} probability, ${IMPACT_LABELS[impactIdx]} impact: ${cellRisks.length} risk(s)`}
                  >
                    {cellRisks.length > 0 && (
                      <span className="text-white font-bold text-sm">{cellRisks.length}</span>
                    )}
                    {!compact && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
                        {PROB_LABELS[probIdx]} × {IMPACT_LABELS[impactIdx]}
                        {cellRisks.length > 0 && <div>{cellRisks.map(r => r.name).join(', ')}</div>}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
          {/* X-axis labels */}
          {!compact && (
            <div className="grid mt-1" style={{ gridTemplateColumns: `repeat(5, 1fr)`, gap: '4px' }}>
              {IMPACT_LABELS.map(l => (
                <div key={l} className="text-center text-xs text-slate-500 dark:text-slate-400 truncate">{l}</div>
              ))}
            </div>
          )}
          {!compact && (
            <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1">Impact →</div>
          )}
        </div>
      </div>
    </div>
  )
}
