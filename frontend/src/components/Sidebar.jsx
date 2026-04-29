import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Shield, Map, ClipboardList, BarChart3, FileText,
  Settings, LogOut, TrendingUp, BookTemplate, ChevronLeft, ChevronRight,
  Users, Activity, Webhook, Building2, UserCheck, Zap, Newspaper,
  IndianRupee, Target, LineChart, Bot, Layers
} from 'lucide-react'
import useAuthStore from '../store/authStore'

const NAV = [
  {
    label: 'Core',
    items: [
      { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/assessments/new', icon: ClipboardList,   label: 'New Assessment' },
      { to: '/risks',           icon: Shield,           label: 'Risk Register' },
      { to: '/action-center',   icon: Target,           label: 'Action Center',  badge: 'new' },
      { to: '/kri',             icon: LineChart,        label: 'KRI Monitor',    badge: 'new' },
      { to: '/heatmap',         icon: Map,              label: 'Risk Heatmap' },
      { to: '/ai-copilot',      icon: Bot,              label: 'AI Copilot',     badge: 'new' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/companies',     icon: Building2,    label: 'Company Intel' },
      { to: '/experts',       icon: UserCheck,    label: 'Industry Experts' },
      { to: '/news',          icon: Newspaper,    label: 'Market News' },
      { to: '/indian-market', icon: IndianRupee,  label: 'Indian Market' },
      { to: '/financial',     icon: TrendingUp,   label: 'Financial Tools' },
      { to: '/reports',       icon: FileText,     label: 'Reports' },
      { to: '/templates',     icon: Layers,       label: 'Templates' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { to: '/team',     icon: Users,    label: 'Team' },
      { to: '/webhooks', icon: Webhook,  label: 'Webhooks' },
      { to: '/audit',    icon: Activity, label: 'Audit Log' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

const BADGE_COLORS = {
  new:  'bg-indigo-500/20 text-indigo-300',
  beta: 'bg-amber-500/20 text-amber-300',
  hot:  'bg-red-500/20 text-red-300',
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuthStore()
  const initials = (user?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col bg-[#0a1020] border-r border-white/[0.06] transition-all duration-300"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25">
            <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-none">RiskIQ</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Risk Platform</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {NAV.map(({ label, items }) => (
          <div key={label}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-1.5">{label}</p>
            )}
            <ul className="space-y-0.5">
              {items.map(({ to, icon: Icon, label: itemLabel, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    title={collapsed ? itemLabel : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                        isActive
                          ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
                          : 'text-slate-500 hover:text-white hover:bg-white/[0.05]'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <span className="truncate flex-1">{itemLabel}</span>
                    )}
                    {!collapsed && badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${BADGE_COLORS[badge] || BADGE_COLORS.new}`}>
                        {badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.05] p-3 space-y-1 flex-shrink-0">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'User'}</p>
              <p className="text-[10px] text-slate-500 capitalize truncate">{user?.role || 'member'}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
