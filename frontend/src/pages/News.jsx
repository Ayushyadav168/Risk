import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Newspaper, RefreshCw, ExternalLink, Clock, Search,
  TrendingUp, Shield, Building2, Globe, Loader, BookOpen,
  BarChart3, Settings, ChevronLeft, ChevronRight, Rss,
  X, Tag, ArrowLeft, Share2, AlertTriangle, Eye, Wifi,
  WifiOff, AlignJustify, LayoutGrid
} from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { newsAPI } from '../lib/api'
import { useRefresh } from '../context/RefreshContext'

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',      label: 'All News',          icon: Globe,      color: 'text-slate-600' },
  { id: 'markets',  label: 'Markets',            icon: TrendingUp, color: 'text-emerald-600' },
  { id: 'finance',  label: 'Finance & Banking',  icon: BarChart3,  color: 'text-blue-600' },
  { id: 'risk',     label: 'Risk & Compliance',  icon: Shield,     color: 'text-red-600' },
  { id: 'business', label: 'Business',           icon: Building2,  color: 'text-purple-600' },
  { id: 'economy',  label: 'Economy & Policy',   icon: BookOpen,   color: 'text-amber-600' },
]

const CAT_COLORS = {
  markets:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  finance:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  risk:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  business: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  economy:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  default:  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
}

const CAT_DOT = {
  markets:  'bg-emerald-400',
  finance:  'bg-blue-400',
  risk:     'bg-red-400',
  economy:  'bg-amber-400',
  business: 'bg-purple-400',
  default:  'bg-slate-400',
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

function readTime(paragraphs = []) {
  const words = paragraphs.join(' ').split(/\s+/).length
  const mins = Math.max(1, Math.round(words / 200))
  return `${mins} min read`
}

function CategoryBadge({ category }) {
  const cls = CAT_COLORS[category] || CAT_COLORS.default
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {category}
    </span>
  )
}

// ── Article Reader Modal ──────────────────────────────────────────────────────
function ArticleReader({ article, onClose }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    setContent(null)
    if (scrollRef.current) scrollRef.current.scrollTop = 0

    newsAPI.read(article.id)
      .then(res => setContent(res.data.content))
      .catch(() => setContent({ paragraphs: [], success: false, blocked: false, error: 'Network error' }))
      .finally(() => setLoading(false))
  }, [article.id])

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const displayImage = content?.og_image || article.image_url
  const hasParagraphs = content?.paragraphs?.length > 0
  const isBlocked = content && !content.success

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — slides in from right */}
      <div className="relative ml-auto w-full max-w-3xl h-full bg-white dark:bg-slate-900 flex flex-col shadow-2xl animate-slideInRight">

        {/* ── Top Bar ── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-2 ml-2 flex-1 min-w-0">
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 truncate">
              {article.source}
            </span>
            <CategoryBadge category={article.category} />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Original
            </a>
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">

            {/* Hero Image */}
            {displayImage && (
              <div className="rounded-2xl overflow-hidden mb-7 bg-slate-100 dark:bg-slate-800 max-h-72">
                <img
                  src={displayImage}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={e => e.target.parentElement.style.display = 'none'}
                />
              </div>
            )}

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-4">
              {article.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <Newspaper className="w-3.5 h-3.5" />
                {article.source}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {timeAgo(article.published_at)}
              </span>
              {hasParagraphs && (
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  {readTime(content.paragraphs)}
                </span>
              )}
              {article.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-auto">
                  {article.tags.slice(0, 5).map((t, i) => (
                    <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Content States ── */}
            {loading ? (
              <div className="space-y-4 animate-pulse">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className={`h-4 bg-slate-200 dark:bg-slate-700 rounded ${i % 3 === 2 ? 'w-3/4' : 'w-full'}`} />
                    {i % 2 === 0 && <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />}
                  </div>
                ))}
              </div>

            ) : hasParagraphs ? (
              /* ── Full article content ── */
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <div className="space-y-5">
                  {content.paragraphs.map((para, i) => {
                    // Detect headings (short, no period at end)
                    const isHeading = para.length < 120 && !para.endsWith('.') && !para.endsWith(',')
                      && (para.endsWith(':') || para.endsWith('?') || /^[A-Z]/.test(para))
                      && i > 0

                    if (isHeading && para.length < 80) {
                      return (
                        <h2 key={i} className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-6 mb-2 first:mt-0">
                          {para}
                        </h2>
                      )
                    }

                    return (
                      <p key={i} className="text-base leading-relaxed text-slate-700 dark:text-slate-300">
                        {para}
                      </p>
                    )
                  })}
                </div>
              </div>

            ) : (
              /* ── Blocked / error fallback ── */
              <div>
                {/* Show RSS summary */}
                {article.summary && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5 mb-6 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Summary</p>
                    <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">{article.summary}</p>
                  </div>
                )}

                {/* Paywall / blocked notice */}
                <div className="flex flex-col items-center text-center py-10 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    {content?.blocked
                      ? <WifiOff className="w-7 h-7 text-amber-500" />
                      : <AlertTriangle className="w-7 h-7 text-amber-500" />
                    }
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {content?.blocked
                        ? 'Content restricted by publisher'
                        : 'Could not load full article'
                      }
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                      {content?.blocked
                        ? 'This article may require a subscription or is behind a paywall on the original site.'
                        : 'The article may have moved or there was a network issue.'}
                    </p>
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Read on {article.source.split('—')[0].trim()}
                  </a>
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            {hasParagraphs && (
              <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 text-center">
                <p className="text-sm text-slate-400">
                  This article was sourced from <span className="font-medium text-slate-600 dark:text-slate-300">{article.source}</span>
                </p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View original article
                </a>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

// ── Featured Article (hero card) ──────────────────────────────────────────────
function FeaturedCard({ article, onOpen }) {
  return (
    <div
      onClick={() => onOpen(article)}
      className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
    >
      {article.image_url && (
        <div className="h-52 overflow-hidden bg-slate-100 dark:bg-slate-700">
          <img
            src={article.image_url} alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => e.target.style.display = 'none'}
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-bold bg-primary-500 text-white px-2.5 py-1 rounded-full">Featured</span>
          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{article.source}</span>
          <CategoryBadge category={article.category} />
          <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />{timeAgo(article.published_at)}
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {article.title}
        </h2>
        {article.summary && (
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2">
            {article.summary}
          </p>
        )}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {article.tags.slice(0, 5).map((t, i) => (
              <span key={i} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">#{t}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 mt-4 text-xs text-primary-500 font-medium">
          Read full story <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}

// ── Standard Article Card (grid) ──────────────────────────────────────────────
function ArticleCard({ article, onOpen }) {
  return (
    <div
      onClick={() => onOpen(article)}
      className="flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-200 group cursor-pointer"
    >
      {article.image_url && (
        <div className="h-36 overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
          <img
            src={article.image_url} alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => e.target.style.display = 'none'}
          />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{article.source}</span>
          <CategoryBadge category={article.category} />
          <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" />{timeAgo(article.published_at)}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex-1">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-2">
            {article.summary}
          </p>
        )}
        {article.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {article.tags.slice(0, 3).map((t, i) => (
              <span key={i} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">#{t}</span>
            ))}
          </div>
        )}
        <div className="mt-3 text-xs text-primary-500 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Read article <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}

// ── Compact list row ──────────────────────────────────────────────────────────
function ArticleRow({ article, onOpen }) {
  return (
    <div
      onClick={() => onOpen(article)}
      className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group border-b border-slate-100 dark:border-slate-700/50 last:border-0 cursor-pointer"
    >
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${CAT_DOT[article.category] || CAT_DOT.default}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {article.title}
        </p>
        {article.summary && (
          <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">{article.summary}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-slate-400">{article.source}</span>
          <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
          <span className="text-xs text-slate-400">{timeAgo(article.published_at)}</span>
          {article.tags?.slice(0, 2).map((t, i) => (
            <span key={i} className="text-xs text-slate-400 dark:text-slate-500">#{t}</span>
          ))}
        </div>
      </div>
      {article.image_url && (
        <div className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 hidden sm:block">
          <img
            src={article.image_url} alt=""
            className="w-full h-full object-cover"
            onError={e => e.target.parentElement.style.display = 'none'}
          />
        </div>
      )}
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-400 flex-shrink-0 mt-1 transition-colors" />
    </div>
  )
}

// ── Sources Panel ─────────────────────────────────────────────────────────────
function SourcesPanel({ sources, onToggle, onClose }) {
  return (
    <div className="absolute right-0 top-11 z-50 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
          <Rss className="w-4 h-4 text-primary-500" />RSS Sources
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-4 h-4" /></button>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
        {sources.map(src => (
          <div key={src.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/30">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{src.name}</p>
              <div className="flex items-center gap-2">
                <CategoryBadge category={src.category} />
                <span className="text-xs text-slate-400">{src.article_count || 0} articles</span>
              </div>
            </div>
            <button
              onClick={() => onToggle(src.id)}
              className={`ml-3 w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${src.is_active ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-600'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${src.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function News() {
  const { globalRefreshKey } = useRefresh()
  const [localRefresh, setLocalRefresh]   = useState(0)
  const [articles, setArticles]           = useState([])
  const [total, setTotal]                 = useState(0)
  const [sources, setSources]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [refreshing, setRefreshing]       = useState(false)
  const [category, setCategory]           = useState('all')
  const [search, setSearch]               = useState('')
  const [searchInput, setSearchInput]     = useState('')
  const [page, setPage]                   = useState(1)
  const [viewMode, setViewMode]           = useState('grid')
  const [showSources, setShowSources]     = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [openArticle, setOpenArticle]     = useState(null)   // currently reading
  const limit = 21
  const searchTimer = useRef(null)

  useEffect(() => { loadAll() }, [globalRefreshKey, localRefresh])
  useEffect(() => { loadArticles() }, [category, search, page, globalRefreshKey, localRefresh])

  const loadAll = async () => {
    try {
      const [srcRes, statsRes] = await Promise.all([newsAPI.sources(), newsAPI.stats()])
      setSources(srcRes.data || [])
      setLastRefreshed(statsRes.data?.latest_article_at)
    } catch (e) { console.error(e) }
  }

  const loadArticles = async () => {
    setLoading(true)
    try {
      const params = {
        limit,
        skip: (page - 1) * limit,
        ...(category !== 'all' && { category }),
        ...(search && { q: search }),
      }
      const res = await newsAPI.list(params)
      setArticles(res.data.articles || [])
      setTotal(res.data.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSearch = (val) => {
    setSearchInput(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1) }, 400)
  }

  const handleCategoryChange = (cat) => {
    setCategory(cat); setPage(1)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await newsAPI.refreshSync()
      setLastRefreshed(new Date().toISOString())
      if (res.data.total_new > 0) { loadArticles(); loadAll() }
    } catch (e) { console.error(e) }
    finally { setRefreshing(false) }
  }

  const handleToggleSource = async (id) => {
    try {
      const res = await newsAPI.toggleSource(id)
      setSources(prev => prev.map(s => s.id === id ? { ...s, is_active: res.data.is_active } : s))
    } catch (e) { console.error(e) }
  }

  const pages = Math.ceil(total / limit)
  const featured = articles[0]
  const gridArticles = articles.slice(1)

  return (
    <div className="space-y-5 animate-fadeIn">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Market News</h2>
          <p className="text-slate-500 text-sm">
            {total > 0 ? `${total} articles` : 'Loading...'} ·
            {lastRefreshed ? ` Updated ${timeAgo(lastRefreshed)}` : ' Fetching...'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
            <button onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}
              title="Grid view">
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}
              title="List view">
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          {/* Sources toggle */}
          <div className="relative">
            <button onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <Rss className="w-4 h-4" />
              Sources
              <span className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-1.5 rounded">
                {sources.filter(s => s.is_active).length}
              </span>
            </button>
            {showSources && (
              <SourcesPanel sources={sources} onToggle={handleToggleSource} onClose={() => setShowSources(false)} />
            )}
          </div>

          <Button onClick={() => { setLocalRefresh(k => k+1); handleRefresh() }} loading={refreshing} variant="secondary">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={searchInput} onChange={e => handleSearch(e.target.value)}
          placeholder="Search headlines, companies, topics..."
          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
        {searchInput && (
          <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Category filter pills ── */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => handleCategoryChange(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              category === id
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm">Loading latest news...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-slate-600 dark:text-slate-400">No articles found</p>
          <p className="text-sm mt-1">Try a different category or search term</p>
          <Button className="mt-4" onClick={handleRefresh} loading={refreshing}>
            <RefreshCw className="w-4 h-4" /> Fetch News
          </Button>
        </div>
      ) : viewMode === 'list' ? (
        /* ── List view ── */
        <Card>
          <CardContent className="p-0">
            {articles.map(a => <ArticleRow key={a.id} article={a} onOpen={setOpenArticle} />)}
          </CardContent>
        </Card>
      ) : (
        /* ── Grid view ── */
        <div className="space-y-5">
          {featured && page === 1 && !search && (
            <FeaturedCard article={featured} onOpen={setOpenArticle} />
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(page === 1 && !search ? gridArticles : articles).map(a => (
              <ArticleCard key={a.id} article={a} onOpen={setOpenArticle} />
            ))}
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page >= pages - 2 ? pages - 4 + i : page - 2 + i
              if (p < 1 || p > pages) return null
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-primary-500 text-white' : 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  {p}
                </button>
              )
            })}
          </div>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Source Attribution ── */}
      <div className="text-center pb-2">
        <p className="text-xs text-slate-400">
          Aggregated from {sources.filter(s => s.is_active).length} sources ·{' '}
          {sources.filter(s => s.is_active).map(s => s.name.split('—')[0].trim()).join(' · ')}
        </p>
      </div>

      {/* ── Article Reader Modal ── */}
      {openArticle && (
        <ArticleReader
          article={openArticle}
          onClose={() => setOpenArticle(null)}
        />
      )}
    </div>
  )
}
