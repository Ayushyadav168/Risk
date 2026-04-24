import React, { createContext, useContext, useState, useCallback } from 'react'
import { newsAPI } from '../lib/api'

const RefreshContext = createContext(null)

export function RefreshProvider({ children }) {
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  /**
   * Global refresh — increments the key (all pages re-fetch)
   * and also syncs the news feed from RSS sources.
   */
  const triggerGlobalRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // Fire news refresh in background (don't await — pages reload themselves)
      newsAPI.refresh().catch(() => {})
    } finally {
      setGlobalRefreshKey(k => k + 1)
      // Keep spinner for a short moment so the user can see it
      setTimeout(() => setRefreshing(false), 1200)
    }
  }, [])

  return (
    <RefreshContext.Provider value={{ globalRefreshKey, refreshing, triggerGlobalRefresh }}>
      {children}
    </RefreshContext.Provider>
  )
}

/** Hook — use inside any page to get the global refresh key */
export function useRefresh() {
  const ctx = useContext(RefreshContext)
  if (!ctx) throw new Error('useRefresh must be used inside <RefreshProvider>')
  return ctx
}
