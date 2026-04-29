import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const W = collapsed ? 64 : 240

  return (
    <div className="min-h-screen bg-[#060b18] flex">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex flex-col flex-1 min-h-screen transition-all duration-300" style={{ marginLeft: W }}>
        <Topbar onToggleSidebar={() => setCollapsed(c => !c)} />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
