import React from 'react'

export default function RiskScoreGauge({ score = 0, size = 120 }) {
  const normalizedScore = Math.min(10, Math.max(0, score))
  const percentage = (normalizedScore / 10) * 100
  const angle = -135 + (percentage / 100) * 270
  
  const getColor = (s) => {
    if (s >= 8) return '#DC2626'
    if (s >= 6) return '#EF4444'
    if (s >= 4) return '#F59E0B'
    return '#10B981'
  }

  const getLabel = (s) => {
    if (s >= 8) return 'Critical'
    if (s >= 6) return 'High'
    if (s >= 4) return 'Medium'
    return 'Low'
  }

  const color = getColor(normalizedScore)
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) * 0.75

  // Arc calculation
  const startAngle = -225 * (Math.PI / 180)
  const endAngle = 45 * (Math.PI / 180)
  const currentAngle = startAngle + ((endAngle - startAngle) * (normalizedScore / 10))

  const arcPath = (startA, endA, radius) => {
    const x1 = cx + radius * Math.cos(startA)
    const y1 = cy + radius * Math.sin(startA)
    const x2 = cx + radius * Math.cos(endA)
    const y2 = cy + radius * Math.sin(endA)
    const largeArc = endA - startA > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={arcPath(startAngle, endAngle, r)}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={size * 0.06}
          strokeLinecap="round"
          className="dark:stroke-slate-700"
        />
        {/* Progress arc */}
        <path
          d={arcPath(startAngle, currentAngle, r)}
          fill="none"
          stroke={color}
          strokeWidth={size * 0.06}
          strokeLinecap="round"
          style={{ transition: 'all 0.5s ease' }}
        />
        {/* Score text */}
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={size * 0.22} fontWeight="700" fill={color}>
          {normalizedScore.toFixed(1)}
        </text>
        <text x={cx} y={cy + size * 0.2} textAnchor="middle" fontSize={size * 0.1} fill="#94A3B8">
          /10
        </text>
      </svg>
      <span className="text-xs font-semibold mt-1" style={{ color }}>{getLabel(normalizedScore)} Risk</span>
    </div>
  )
}
