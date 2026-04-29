import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bell, X, AlertTriangle, Newspaper, Shield, CheckCircle,
  ClipboardList, FileText, Zap, User, Menu, RefreshCw, ChevronDown
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../lib/api'
import { useCurrency, CURRENCIES, CLIENT_MODES } from '../context/CurrencyContext'
import { useRefresh } from '../context/RefreshContext'

const PAGE_TITLES = {
  '/dashboard':       { title: 'Dashboard',        sub: 'Overview & key metrics' },
  '/assessments/new': { title: 'New Assessment',   sub: 'Create risk assessment' },
  '/risks':           { title: 'Risk Register',    sub: 'Manage all risks' },
  '/action-center':   { title: 'Action Center',    sub: 'Mitigation workflows & tasks' },
  '/kri':             { title: 'KRI Monitor',      sub: 'Key Risk Indicators tracking' },
  '/heatmap':         { title: 'Risk Heatmap',     sub: 'Visual risk matrix' },
  '/ai-copilot':      { title: 'AI Risk Copilot',  sub: 'Intelligent risk assistant' },
  '/financial':       { title: 'Financial Tools',  sub: 'DCF, cash flow & models' },
  '/reports':         { title: 'Reports',          sub: 'Generated reports & exports' },
  '/templates':       { title: 'Templates',        sub: 'Assessment templates' },
  '/settings':        { title: 'Settings',         sub: 'Profile & preferences' },
  '/companies':       { title: 'Company Intel',    sub: 'Company research & analysis' },
  '/experts':         { title: 'Industry Experts', sub: 'Expert opinions & insights' },
  '/news':            { title: 'Market News',      sub: 'Live news feed' },
  '/indian-market':   { title: 'Indian Market',    sub: 'NSE/BSE data & analytics' },
  '/team':            { title: 'Team',             sub: 'Manage team members' },
  '/webhooks':        { title: 'Webhooks',         sub: 'Event integrations' },
  '/audit':           { title: 'Audit Log',        sub: 'Activity history' },
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function NotifIcon({ icon, color }) {
  const cls = `w-3.5 h-3.5 ${
    color === 'red'    ? 'text-red-400' :
    color === 'amber'  ? 'text-amber-400' :
    color === 'green'  ? 'text-emerald-400' :
    color === 'blue'   ? 'text-blue-400' :
    color === 'sky'    ? 'text-sky-400' :
    color === 'purple' ? 'text-violet-400' : 'text-slate-400'
  }`
  const I =
    icon === 'alert-triangle' ? AlertTriangle :
    icon === 'newspaper'      ? Newspaper :
    icon === 'shield'         ? Shield :
    icon === 'check-circle'   ? CheckCircle :
    icon === 'clipboard'      ? ClipboardList :
    icon === 'file-text'      ? FileText :
    icon === 'zap'            ? Zap :
    icon === 'user'           ? User : Bell
  return <I className={cls} />
}

function NotificationPanel({ notifications, loading, unreadCount, onClose, onMarkAllRead }) {
  const navigate = useNavigate()
  return (
    <div className="absolute right-0 top-11 z-50 w-[380px] bg-[#0f1729] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-white text-sm">Notifications</span>
          {unreadCount > 0 && <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && <button onClick={onMarkAllRead} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Mark all read</button>}
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto divide-y divide-white/[0.04]">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-8 h-8 mx-auto text-slate-700 mb-2" />
            <p className="text-sm text-slate-500">No notifications yet</p>
          </div>
        ) : notifications.map(n => (
          <div key={n.id} onClick={() => { if (n.news_id) navigate('/news'); onClose() }}
            className={`flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${!n.read ? 'bg-indigo-500/5' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
              n.color === 'red'   ? 'bg-red-500/10' : n.color === 'amber' ? 'bg-amber-500/10' :
              n.color === 'green' ? 'bg-emerald-500/10' : n.color === 'blue' ? 'bg-blue-500/10' : 'bg-white/[0.05]'
            }`}>
              <NotifIcon icon={n.icon} color={n.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug">{n.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{n.message}</p>
              <p className="text-xs text-slate-600 mt-1">{timeAgo(n.time)}</p>
            </div>
            {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-2" />}
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-white/[0.06] text-center">
        <button onClick={() => { navigate('/audit'); onClose() }} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">View all activity →</button>
      </div>
    </div>
  )
}

function CurrencyPanel({ onClose }) {
  const { currency, setCurrency, clientMode, switchClientMode } = useCurrency()
  return (
    <div className="absolute right-0 top-11 z-50 w-72 bg-[#0f1729] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Client Region</p>
        <div className="grid grid-cols-2 gap-2">
          {CLIENT_MODES.map(m => (
            <button key={m.id} onClick={() => switchClientMode(m.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                clientMode === m.id ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' : 'border-white/[0.08] text-slate-400 hover:bg-white/[0.04]'
              }`}>
              <span className="text-base">{m.flag}</span>{m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Currency</p>
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {CURRENCIES.map(cur => (
            <button key={cur.code} onClick={() => { setCurrency(cur.code); onClose() }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                currency === cur.code ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-white/[0.05]'
              }`}>
              <span className="text-base w-6">{cur.flag}</span>
              <span className="font-mono font-semibold w-10">{cur.code}</span>
              <span className={`text-xs ${currency === cur.code ? 'text-indigo-200' : 'text-slate-500'}`}>{cur.name}</span>
              <span className={`ml-auto font-medium`}>{cur.symbol}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Topbar({ onToggleSidebar }) {
  const location = useLocation()
  const { currency, clientMode } = useCurrency()
  const { refreshing, triggerGlobalRefresh } = useRefresh()

  const [showNotif,     setShowNotif]    = useState(false)
  const [showCurrency,  setShowCurrency] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [notifLoading,  setNotifLoading]  = useState(false)
  const [readIds,       setReadIds]       = useState(new Set())

  const notifRef    = useRef(null)
  const currencyRef = useRef(null)

  const pageMeta = Object.entries(PAGE_TITLES).find(([p]) =>
    location.pathname === p || location.pathname.startsWith(p + '/')
  )?.[1] || { title: 'RiskIQ', sub: 'Platform' }

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const res = await notificationsAPI.list()
      const notifs = (res.data.notifications || []).map(n => ({ ...n, read: readIds.has(n.id) }))
      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    } catch {} finally { setNotifLoading(false) }
  }, [readIds])

  useEffect(() => {
    fetchNotifications()
    const t = setInterval(fetchNotifications, 2 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const h = (e) => {
      if (notifRef.current    && !notifRef.current.contains(e.target))    setShowNotif(false)
      if (currencyRef.current && !currencyRef.current.contains(e.target)) setShowCurrency(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const markAllRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)))
    setNotifications(p => p.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const clientFlag = CLIENT_MODES.find(m => m.id === clientMode)?.flag || '🇮🇳'

  return (
    <header className="h-14 bg-[#0a1020]/80 backdrop-blur-md border-b border-white/[0.05] flex items-center justify-between px-6 sticky top-0 z-30 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all">
          <Menu className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-white leading-none">{pageMeta.title}</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">{pageMeta.sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative" ref={currencyRef}>
          <button onClick={() => { setShowNotif(false); setShowCurrency(v => !v) }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] text-slate-400 hover:text-white transition-all">
            <span className="text-sm">{clientFlag}</span>
            <span className="font-mono font-semibold text-xs">{currency}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showCurrency && <CurrencyPanel onClose={() => setShowCurrency(false)} />}
        </div>

        <button onClick={triggerGlobalRefresh} disabled={refreshing}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        <div className="relative" ref={notifRef}>
          <button onClick={() => { setShowCurrency(false); setShowNotif(v => !v); if (!showNotif) fetchNotifications() }}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <NotificationPanel
              notifications={notifications} loading={notifLoading}
              unreadCount={unreadCount} onClose={() => setShowNotif(false)}
              onMarkAllRead={markAllRead}
            />
          )}
        </div>
      </div>
    </header>
  )
}
