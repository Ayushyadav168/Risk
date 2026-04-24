import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Shield, Map, ClipboardList, BarChart3, FileText,
  Settings, LogOut, TrendingUp, BookTemplate, ChevronLeft, ChevronRight,
  Users, Activity, Webhook, Building2, UserCheck, Zap, Newspaper, IndianRupee
} from 'lucide-react'
import { cn } from '../lib/utils'
import useAuthStore from '../store/authStore'

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { to: '/dashboard',       label: 'Dashboard',        icon: LayoutDashboard },
      { to: '/assessments/new', label: 'New Assessment',   icon: ClipboardList },
      { to: '/risks',           label: 'Risk Register',    icon: Shield },
      { to: '/heatmap',         label: 'Risk Heatmap',     icon: Map },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/companies',  label: 'Company Intel',    icon: Building2 },
      { to: '/experts',    label: 'Industry Experts', icon: UserCheck },
      { to: '/news',           label: 'Market News',      icon: Newspaper },
      { to: '/indian-market',  label: 'Indian Market',    icon: IndianRupee },
      { to: '/financial',      label: 'Financial Tools',  icon: TrendingUp },
      { to: '/reports',    label: 'Reports',          icon: FileText },
      { to: '/templates',  label: 'Templates',        icon: BookTemplate },
    ],
  },
  {
    label: 'Organization',
    items: [
      { to: '/team',      label: 'Team',         icon: Users },
      { to: '/webhooks',  label: 'Webhooks',     icon: Webhook },
      { to: '/audit',     label: 'Audit Log',    icon: Activity },
      { to: '/settings',  label: 'Settings',     icon: Settings },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuthStore()

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 dark:bg-slate-950 text-white transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-700">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && <span className="text-lg font-bold text-white truncate">RiskIQ</span>}
        </div>
        <button onClick={onToggle} className="ml-auto p-1 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors flex-shrink-0">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_SECTIONS.map(({ label, items }) => (
          <div key={label}>
            {!collapsed && (
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">{label}</p>
            )}
            <ul className="space-y-0.5">
              {items.map(({ to, label: itemLabel, icon: Icon }) => (
                <li key={to}>
                  <NavLink to={to}
                    className={({ isActive }) => cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    )}
                    title={collapsed ? itemLabel : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{itemLabel}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-slate-700 p-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
            {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role || 'member'}</p>
            </div>
          )}
        </div>
        <button onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title={collapsed ? 'Logout' : undefined}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
