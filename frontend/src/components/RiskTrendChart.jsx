import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function RiskTrendChart({ data = [] }) {
  const chartData = data.length > 0 ? data : [
    { month: 'Oct 2023', risk_count: 4, avg_score: 5.2 },
    { month: 'Nov 2023', risk_count: 5, avg_score: 5.8 },
    { month: 'Dec 2023', risk_count: 6, avg_score: 6.1 },
    { month: 'Jan 2024', risk_count: 7, avg_score: 6.5 },
    { month: 'Feb 2024', risk_count: 8, avg_score: 6.8 },
    { month: 'Mar 2024', risk_count: 8, avg_score: 6.8 },
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:stroke-slate-700" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="avg_score" stroke="#6366F1" strokeWidth={2} fill="url(#colorScore)" name="Avg Score" dot={{ r: 4, fill: '#6366F1' }} />
        <Area type="monotone" dataKey="risk_count" stroke="#F59E0B" strokeWidth={2} fill="url(#colorCount)" name="Risk Count" dot={{ r: 4, fill: '#F59E0B' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
