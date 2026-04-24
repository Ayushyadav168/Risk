import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function getSeverityColor(severity) {
  const colors = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626',
  }
  return colors[severity] || '#94A3B8'
}

export function getSeverityBadgeClass(severity) {
  const classes = {
    low: 'badge-low',
    medium: 'badge-medium',
    high: 'badge-high',
    critical: 'badge-critical',
  }
  return classes[severity] || 'badge-low'
}

export function getScoreColor(score) {
  if (score >= 8) return '#DC2626'
  if (score >= 6) return '#EF4444'
  if (score >= 4) return '#F59E0B'
  return '#10B981'
}

export function formatScore(score) {
  return Number(score).toFixed(1)
}

export function formatCurrency(value) {
  if (!value) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
