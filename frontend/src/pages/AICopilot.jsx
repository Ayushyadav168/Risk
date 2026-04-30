import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles, Send, Plus, Trash2, Copy, Check, RefreshCw,
  Brain, BookOpen, TrendingUp, Shield, AlertTriangle,
  Database, Wifi, WifiOff, MessageSquare,
  BarChart3, Lock, Layers, Activity, FileText
} from 'lucide-react'
import { aiAPI, risksAPI, assessmentsAPI } from '../lib/api'
import useAuthStore from '../store/authStore'

// ─── Persist conversations to localStorage ────────────────────────────────────
const STORAGE_KEY = 'riskiq_copilot_v2'
const loadConversations = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') }
  catch { return null }
}
const saveConversations = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
  catch {}
}

// ─── Suggested prompts ────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { icon: Shield,       label: 'Basel III Explained',     prompt: 'Explain Basel III capital requirements and what CET1, Tier 1, and Total Capital ratios mean for Indian banks.' },
  { icon: TrendingUp,   label: 'NPA Risk Analysis',       prompt: 'What are the key NPA risk indicators for an NBFC and how should I design an early warning system?' },
  { icon: Brain,        label: 'Risk Appetite Statement', prompt: 'Help me write a Risk Appetite Statement for a mid-size fintech company operating in India.' },
  { icon: BarChart3,    label: 'KRI Design',              prompt: 'Design KRIs for a B2B SaaS company — include thresholds, escalation rules, and dashboard metrics.' },
  { icon: Lock,         label: 'Cyber Risk Assessment',   prompt: 'What is a comprehensive cybersecurity risk assessment framework for a financial institution? Include RBI & SEBI requirements.' },
  { icon: Layers,       label: 'COSO vs ISO 31000',       prompt: 'Compare COSO ERM 2017 and ISO 31000:2018 — when should I use each framework?' },
  { icon: AlertTriangle,label: 'Supply Chain Risk',       prompt: 'What are the top supply chain risks for a manufacturing company and what mitigation playbook should I use?' },
  { icon: Activity,     label: 'Stress Testing',          prompt: 'Explain how to design a credit risk stress testing framework for an SME lending portfolio.' },
  { icon: FileText,     label: 'SEBI Compliance',         prompt: 'What are the key SEBI risk management requirements for a listed company in India? Include LODR and BRSR.' },
  { icon: BookOpen,     label: 'VaR Calculation',         prompt: 'How do I calculate Value at Risk (VaR) using historical simulation? Show me steps and interpretation.' },
]

// ─── Sources badge ────────────────────────────────────────────────────────────
function SourceBadge({ sources }) {
  if (!sources?.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {sources.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] text-indigo-400">
          <BookOpen className="w-2.5 h-2.5" />{s}
        </span>
      ))}
    </div>
  )
}

// ─── Format AI response text ──────────────────────────────────────────────────
function FormattedText({ text }) {
  const lines = (text || '').split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-bold text-white mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))  return <h3 key={i} className="text-base font-bold text-white mt-4 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))   return <h2 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('| '))   return <div key={i} className="font-mono text-[11px] bg-[#0d1728] px-3 py-1 border-b border-white/[0.05]">{line}</div>

        // Split by bold (**text**) and inline code (`text`)
        const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
        const isListItem = line.startsWith('• ') || line.startsWith('- ')
        const content = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>
          if (part.startsWith('`') && part.endsWith('`'))
            return <code key={j} className="px-1.5 py-0.5 bg-[#1a2640] rounded text-indigo-300 text-[0.85em] font-mono">{part.slice(1, -1)}</code>
          return part
        })

        if (isListItem) return (
          <div key={i} className="flex gap-1.5 items-start">
            <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
            <p className="leading-relaxed">{content.slice(1)}</p>
          </div>
        )
        return <p key={i} className="leading-relaxed">{content}</p>
      })}
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  const handleCopy = () => {
    navigator.clipboard?.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start group`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-slate-300">You</span>
        </div>
      )}

      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600/90 text-white rounded-tr-sm'
            : 'bg-white/[0.04] border border-white/[0.08] text-slate-300 rounded-tl-sm'
        }`}>
          {isUser ? <p>{msg.content}</p> : <FormattedText text={msg.content} />}
        </div>

        {msg.sources && <SourceBadge sources={msg.sources} />}

        {!isUser && (
          <button
            onClick={handleCopy}
            className="mt-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}

        <span className="text-[10px] text-slate-700 mt-1 px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.08] flex items-center gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }} />
        ))}
        <span className="text-xs text-slate-500 ml-1">Analyzing with RiskIQ knowledge base...</span>
      </div>
    </div>
  )
}

function KBStatusPill({ status }) {
  if (!status) return null
  const loaded = status.status === 'loaded'
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${
      loaded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
    }`}>
      {loaded ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {loaded
        ? `KB loaded · ${status.age_minutes}m ago · ${Math.round((status.total_chars || 0) / 1000)}K chars`
        : 'Knowledge base loading...'}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AICopilot() {
  const { user } = useAuthStore()

  const [conversations, setConversations] = useState(() => {
    const saved = loadConversations()
    if (saved?.conversations?.length) return saved.conversations
    return [{ id: Date.now(), title: 'New Chat', messages: [] }]
  })
  const [activeCid, setActiveCid] = useState(() => {
    const saved = loadConversations()
    return saved?.activeCid || (saved?.conversations?.[0]?.id ?? Date.now())
  })

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [kbStatus, setKbStatus] = useState(null)
  const [refreshingKb, setRefreshingKb] = useState(false)
  const [userContext, setUserContext] = useState(null)

  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  const activeConv = conversations.find(c => c.id === activeCid) || conversations[0]

  useEffect(() => {
    saveConversations({ conversations, activeCid })
  }, [conversations, activeCid])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages?.length, loading])

  useEffect(() => {
    aiAPI.copilotKbStatus().then(r => setKbStatus(r.data)).catch(() => {})
    Promise.all([
      risksAPI.list().catch(() => ({ data: [] })),
      assessmentsAPI.list().catch(() => ({ data: [] })),
    ]).then(([risksResp, assessResp]) => {
      const risks = Array.isArray(risksResp.data) ? risksResp.data : risksResp.data?.risks || []
      const assessments = Array.isArray(assessResp.data) ? assessResp.data : []
      setUserContext({ risks: risks.slice(0, 20), assessments: assessments.slice(0, 5), organization: user || {} })
    })
  }, [])

  const send = useCallback(async (overrideText) => {
    const text = (overrideText || input).trim()
    if (!text || loading) return
    setInput('')

    const userMsg = { role: 'user', content: text, timestamp: Date.now() }

    setConversations(prev => prev.map(c => {
      if (c.id !== activeCid) return c
      return {
        ...c,
        messages: [...c.messages, userMsg],
        title: c.messages.length === 0 ? text.slice(0, 40) : c.title,
      }
    }))

    setLoading(true)
    try {
      const conv = conversations.find(c => c.id === activeCid)
      const history = [...(conv?.messages || []), userMsg].map(m => ({ role: m.role, content: m.content }))

      const resp = await aiAPI.copilot({ messages: history, context: userContext })

      const assistantMsg = {
        role: 'assistant',
        content: resp.data.reply,
        sources: resp.data.sources,
        timestamp: Date.now(),
      }

      setConversations(prev => prev.map(c => {
        if (c.id !== activeCid) return c
        // avoid duplicates
        const has = c.messages.some(m => m.timestamp === assistantMsg.timestamp)
        if (has) return c
        return { ...c, messages: [...c.messages, assistantMsg] }
      }))
    } catch {
      const errMsg = {
        role: 'assistant',
        content: '⚠️ Connection error. The backend may be waking up (Render free tier sleeps after 15 min inactivity). Wait 30 seconds and retry.',
        timestamp: Date.now(),
      }
      setConversations(prev => prev.map(c => c.id !== activeCid ? c : { ...c, messages: [...c.messages, errMsg] }))
    } finally {
      setLoading(false)
    }
  }, [input, loading, activeCid, conversations, userContext])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const newChat = () => {
    const id = Date.now()
    setConversations(prev => [{ id, title: 'New Chat', messages: [] }, ...prev])
    setActiveCid(id)
  }

  const deleteChat = (cid, e) => {
    e.stopPropagation()
    setConversations(prev => {
      const remaining = prev.filter(c => c.id !== cid)
      if (!remaining.length) {
        const id = Date.now()
        setActiveCid(id)
        return [{ id, title: 'New Chat', messages: [] }]
      }
      if (activeCid === cid) setActiveCid(remaining[0].id)
      return remaining
    })
  }

  const refreshKb = async () => {
    setRefreshingKb(true)
    try {
      await aiAPI.copilotRefreshKb()
      const s = await aiAPI.copilotKbStatus()
      setKbStatus(s.data)
    } catch {}
    setRefreshingKb(false)
  }

  const showSuggestions = !activeConv?.messages?.length

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#060b18]">

      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-white/[0.06] flex flex-col bg-[#07101f]">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">RiskIQ Copilot</p>
              <p className="text-[10px] text-slate-500">Risk Intelligence AI</p>
            </div>
          </div>
          <button onClick={newChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-medium text-white transition-colors">
            <Plus className="w-3.5 h-3.5" />New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => setActiveCid(conv.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all group flex items-center justify-between gap-2 ${
                conv.id === activeCid
                  ? 'bg-indigo-500/15 text-white border border-indigo-500/20'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-300'
              }`}>
              <span className="truncate flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-60" />
                {conv.title}
              </span>
              <button onClick={(e) => deleteChat(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all flex-shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-white/[0.06] space-y-2">
          <KBStatusPill status={kbStatus} />
          <button onClick={refreshKb} disabled={refreshingKb}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-lg text-[10px] text-slate-400 hover:text-slate-300 transition-all disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${refreshingKb ? 'animate-spin' : ''}`} />
            {refreshingKb ? 'Refreshing...' : 'Refresh Knowledge Base'}
          </button>
          <div className="flex items-start gap-1.5 px-1">
            <Database className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-slate-600 leading-tight">
              ISO 31000 · COSO ERM · Basel III/IV · SEBI · RBI · Wikipedia Risk Articles · KRI Benchmarks
            </p>
          </div>
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#07101f]/50">
          <div>
            <h1 className="text-sm font-bold text-white">{activeConv?.title || 'RiskIQ Copilot'}</h1>
            <p className="text-[10px] text-slate-500">
              {activeConv?.messages?.length || 0} messages · Risk management, finance & regulatory expertise
            </p>
          </div>
          {userContext?.risks?.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <Activity className="w-3 h-3 text-violet-400" />
              <span className="text-[10px] text-violet-400">{userContext.risks.length} risks in context</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {showSuggestions ? (
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">RiskIQ Copilot</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  AI-powered risk expert trained on ISO 31000, COSO ERM, Basel III/IV, SEBI & RBI guidelines, KRI benchmarks, and live internet data.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map((p, i) => {
                  const Icon = p.icon
                  return (
                    <button key={i} onClick={() => send(p.prompt)}
                      className="text-left p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-indigo-500/30 rounded-xl transition-all group">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
                        <span className="text-xs font-semibold text-slate-300 group-hover:text-white">{p.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 group-hover:text-slate-500 line-clamp-2">{p.prompt}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {activeConv?.messages?.map((msg, i) => (
                <MessageBubble key={`${msg.timestamp}-${i}`} msg={msg} />
              ))}
              {loading && <TypingIndicator />}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#07101f]/50">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-3 p-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus-within:border-indigo-500/40 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about risk management, KRIs, Basel, SEBI, financial models..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 resize-none focus:outline-none leading-relaxed max-h-32 overflow-y-auto"
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0">
                {loading
                  ? <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                  : <Send className="w-3.5 h-3.5 text-white" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-700 text-center mt-2">
              Enter to send · Shift+Enter for new line · Powered by ISO 31000, COSO ERM, Basel, SEBI, RBI & Wikipedia
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
