import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bell, Moon, Sun, Search, X, AlertTriangle, Newspaper, Shield,
  CheckCircle, ClipboardList, FileText, User, Zap, ChevronDown,
  Globe, RefreshCw, Info, IndianRupee
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../lib/api'
import { useCurrency, CURRENCIES, CLIENT_MODES } from '../context/CurrencyContext'
import { useRefresh } from '../context/RefreshContext'

const PAGE_TITLES = {
  '/dashboard':       'Dashboard',
  '/assessments/new': 'New Assessment',
  '/risks':           'Risk Register',
  '/heatmap':         'Risk Heatmap',
  '/financial':       'Financial Tools',
  '/reports':         'Reports',
  '/templates':       'Templates',
  '/settings':        'Settings',
  '/companies':       'Company Intelligence',
  '/experts':         'Industry Experts',
  '/news':            'Market News',
  '/team':            'Team',
  '/billing':         'Billing',
  '/webhooks':        'Webhooks',
  '/audit':           'Audit Log',
}

// Map icon names from backend to Lucide components
function NotifIcon({ icon, color }) {
  const cls = `w-4 h-4 ${
    color === 'red'    ? 'text-red-500' :
    color === 'amber'  ? 'text-amber-500' :
    color === 'green'  ? 'text-emerald-500' :
    color === 'blue'   ? 'text-blue-500' :
    color === 'sky'    ? 'text-sky-500' :
    color === 'purple' ? 'text-purple-500' : 'text-slate-400'
  }`
  const Icon =
    icon === 'alert-triangle'  ? AlertTriangle :
    icon === 'newspaper'       ? Newspaper :
    icon === 'shield'          ? Shield :
    icon === 'shield-check'    ? Shield :
    icon === 'shield-off'      ? Shield :
    icon === 'check-circle'    ? CheckCircle :
    icon === 'clipboard'       ? ClipboardList :
    icon === 'file-text'       ? FileText :
    icon === 'zap'             ? Zap :
    icon === 'user'            ? User : Bell

  return <Icon className={cls} />
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Notification Panel ────────────────────────────────────────────────────────
function NotificationPanel({ notifications, loading, onClose, onMarkAllRead, unreadCount, onNavigate }) {
  const navigate = useNavigate()

  const handleClick = (notif) => {
    if (notif.news_id) {
      navigate('/news')
    }
    onClose()
  }

  return (
    <div className="absolute right-0 top-12 z-50 w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-primary-500 hover:text-primary-700 font-medium transition-colors"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10">
            <Bell className="w-8 h-8 mx-auto text-slate-200 dark:text-slate-700 mb-2" />
            <p className="text-sm text-slate-400 dark:text-slate-500">No notifications yet</p>
            <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Activity will appear here</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${!notif.read ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''}`}
            >
              {/* Icon bubble */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                notif.color === 'red'   ? 'bg-red-100 dark:bg-red-900/20' :
                notif.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/20' :
                notif.color === 'green' ? 'bg-emerald-100 dark:bg-emerald-900/20' :
                notif.color === 'sky'   ? 'bg-sky-100 dark:bg-sky-900/20' :
                notif.color === 'blue'  ? 'bg-blue-100 dark:bg-blue-900/20' :
                'bg-slate-100 dark:bg-slate-700'
              }`}>
                <NotifIcon icon={notif.icon} color={notif.color} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                  {notif.title}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
                  {notif.message}
                </p>
                <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">{timeAgo(notif.time)}</p>
              </div>

              {/* Unread dot */}
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-center">
          <button
            onClick={() => { navigate('/audit'); onClose() }}
            className="text-xs text-primary-500 hover:text-primary-700 font-medium transition-colors"
          >
            View all activity →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Currency Selector ─────────────────────────────────────────────────────────
function CurrencySelector({ onClose }) {
  const { currency, setCurrency, clientMode, switchClientMode, currentCurrency } = useCurrency()

  return (
    <div className="absolute right-0 top-12 z-50 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Client mode */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Client Region</p>
        <div className="grid grid-cols-2 gap-2">
          {CLIENT_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => switchClientMode(m.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                clientMode === m.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-base">{m.flag}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Currency list */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Currency</p>
        <div className="max-h-52 overflow-y-auto space-y-0.5 -mx-1 px-1">
          {CURRENCIES.map(cur => (
            <button
              key={cur.code}
              onClick={() => { setCurrency(cur.code); onClose() }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                currency === cur.code
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="text-base w-6">{cur.flag}</span>
              <span className="font-mono font-semibold w-10">{cur.code}</span>
              <span className={`text-xs ${currency === cur.code ? 'text-sky-100' : 'text-slate-400'}`}>{cur.name}</span>
              <span className={`ml-auto font-medium ${currency === cur.code ? 'text-white' : 'text-slate-500'}`}>{cur.symbol}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Topbar ───────────────────────────────────────────────────────────────
export default function Topbar({ darkMode, onToggleDark }) {
  const location = useLocation()
  const { currentCurrency, clientMode, currency } = useCurrency()
  const { refreshing, triggerGlobalRefresh } = useRefresh()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showCurrency, setShowCurrency]           = useState(false)
  const [notifications, setNotifications]         = useState([])
  const [unreadCount, setUnreadCount]             = useState(0)
  const [notifLoading, setNotifLoading]           = useState(false)
  const [readIds, setReadIds]                     = useState(new Set())

  const notifRef    = useRef(null)
  const currencyRef = useRef(null)

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] || 'RiskIQ'

  // Load notifications
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await notificationsAPI.list()
      const notifs = (res.data.notifications || []).map(n => ({
        ...n,
        read: readIds.has(n.id),
      }))
      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    } catch (e) {
      console.error('Notifications error:', e)
    } finally {
      setNotifLoading(false)
    }
  }, [readIds])

  // Load on mount + every 2 minutes
  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 2 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const handleBellClick = () => {
    setShowCurrency(false)
    setShowNotifications(v => !v)
    if (!showNotifications) fetchNotifications()
  }

  const markAllRead = () => {
    const ids = new Set(notifications.map(n => n.id))
    setReadIds(ids)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  // Click-outside to close
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
      if (currencyRef.current && !currencyRef.current.contains(e.target)) setShowCurrency(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const clientFlag = CLIENT_MODES.find(m => m.id === clientMode)?.flag || '🇮🇳'

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Page title */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">RiskIQ Platform</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">

        {/* Currency / Region toggle */}
        <div className="relative" ref={currencyRef}>
          <button
            onClick={() => { setShowNotifications(false); setShowCurrency(v => !v) }}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-base leading-none">{clientFlag}</span>
            <span className="font-mono font-semibold text-xs">{currency}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showCurrency && (
            <CurrencySelector onClose={() => setShowCurrency(false)} />
          )}
        </div>

        {/* Global Refresh */}
        <button
          onClick={triggerGlobalRefresh}
          disabled={refreshing}
          title="Refresh all page data"
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary-500' : ''}`} />
        </button>

        {/* Dark mode */}
        <button
          onClick={onToggleDark}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationPanel
              notifications={notifications}
              loading={notifLoading}
              onClose={() => setShowNotifications(false)}
              onMarkAllRead={markAllRead}
              unreadCount={unreadCount}
            />
          )}
        </div>
      </div>
    </header>
  )
}
