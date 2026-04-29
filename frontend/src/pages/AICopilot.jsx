import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bot, Send, RefreshCw, Sparkles, User, Copy, ThumbsUp,
  ThumbsDown, AlertTriangle, Shield, TrendingUp, FileText,
  ChevronRight, Lightbulb, X, Plus, Trash2, MessageSquare
} from 'lucide-react'
import { aiAPI, risksAPI } from '../lib/api'

const SUGGESTED_PROMPTS = [
  { icon: AlertTriangle, label: 'Top Risks Analysis',     color: 'text-red-400',     prompt: 'Analyze my top 5 risks and provide a prioritized action plan.' },
  { icon: Shield,        label: 'Mitigation Strategy',    color: 'text-indigo-400',  prompt: 'Suggest mitigation strategies for my highest severity risks.' },
  { icon: TrendingUp,    label: 'Risk Trend Insights',    color: 'text-blue-400',    prompt: 'What risk trends should I be monitoring based on my current risk profile?' },
  { icon: FileText,      label: 'Executive Summary',      color: 'text-emerald-400', prompt: 'Generate an executive summary of our current risk posture for board presentation.' },
  { icon: Lightbulb,     label: 'Compliance Gaps',        color: 'text-amber-400',   prompt: 'Identify potential compliance gaps in my risk register.' },
  { icon: Sparkles,      label: 'Industry Benchmarks',    color: 'text-violet-400',  prompt: 'How does my risk profile compare to industry benchmarks?' },
]

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg, onCopy, onReact }) {
  const [copied, setCopied] = useState(false)
  const isUser = msg.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    onCopy?.()
  }

  return (
    <div className={`flex items-end gap-3 group ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-gradient-to-br from-slate-600 to-slate-700' : 'bg-gradient-to-br from-indigo-500 to-violet-600'
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-indigo-500 text-white rounded-br-sm'
            : 'bg-white/[0.04] border border-white/[0.06] text-slate-200 rounded-bl-sm'
        }`}>
          {msg.content}
        </div>

        {/* Actions row */}
        <div className={`flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-600">{msg.time}</span>
          {!isUser && (
            <>
              <button onClick={handleCopy} className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-slate-300 transition-colors">
                <Copy className="w-3 h-3" />
              </button>
              <button onClick={() => onReact?.(msg.id, 'up')} className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${msg.reaction === 'up' ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-300'}`}>
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button onClick={() => onReact?.(msg.id, 'down')} className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${msg.reaction === 'down' ? 'text-red-400' : 'text-slate-600 hover:text-slate-300'}`}>
                <ThumbsDown className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  content: `Hello! I'm your AI Risk Copilot. 👋

I can help you analyze your risk portfolio, suggest mitigation strategies, identify compliance gaps, generate executive summaries, and much more.

You can ask me about your specific risks, request industry benchmarks, or use one of the suggested prompts below to get started.

What would you like to explore today?`,
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
}

const CONVERSATIONS_KEY = 'riskiq_conversations'

function loadConversations() {
  try {
    return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || '[]')
  } catch { return [] }
}

function saveConversations(convs) {
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs))
}

export default function AICopilot() {
  const [conversations, setConversations] = useState(() => {
    const saved = loadConversations()
    if (saved.length === 0) {
      const initial = [{ id: 'default', title: 'New Conversation', messages: [WELCOME_MSG], createdAt: Date.now() }]
      saveConversations(initial)
      return initial
    }
    return saved
  })
  const [activeConvId, setActiveConvId] = useState(() => {
    const saved = loadConversations()
    return saved[0]?.id || 'default'
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [risks, setRisks] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const messagesEndRef = useRef(null)
  const textareaRef    = useRef(null)

  const activeConv = conversations.find(c => c.id === activeConvId)
  const messages   = activeConv?.messages || [WELCOME_MSG]

  useEffect(() => {
    risksAPI.list().then(r => setRisks(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const updateConversation = useCallback((convId, updater) => {
    setConversations(prev => {
      const updated = prev.map(c => c.id === convId ? updater(c) : c)
      saveConversations(updated)
      return updated
    })
  }, [])

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim()
    if (!trimmed || loading) return

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    updateConversation(activeConvId, c => ({
      ...c,
      title: c.messages.length <= 1 ? trimmed.slice(0, 40) : c.title,
      messages: [...c.messages, userMsg],
    }))
    setInput('')
    setLoading(true)

    try {
      // Build context from risks
      const riskContext = risks.slice(0, 10).map(r =>
        `- ${r.name} (${r.category}, ${r.severity} severity, score ${r.score})`
      ).join('\n')

      const fullPrompt = risks.length > 0
        ? `Context — current risk portfolio:\n${riskContext}\n\nUser question: ${trimmed}`
        : trimmed

      const res = await aiAPI.analyze({ prompt: fullPrompt, type: 'copilot' })
      const reply = res.data?.analysis || res.data?.result || res.data?.response || 'I analyzed your request. Based on your risk profile, I recommend reviewing your highest-severity risks first and ensuring mitigation plans are up to date.'

      const aiMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      updateConversation(activeConvId, c => ({ ...c, messages: [...c.messages, aiMsg] }))
    } catch (err) {
      const errorMsg = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: err?.response?.status === 429
          ? '⚠️ Rate limit reached. Please wait a moment before sending another message.'
          : '⚠️ I encountered an error processing your request. Please check your connection and try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      updateConversation(activeConvId, c => ({ ...c, messages: [...c.messages, errorMsg] }))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const newConversation = () => {
    const conv = { id: `conv-${Date.now()}`, title: 'New Conversation', messages: [WELCOME_MSG], createdAt: Date.now() }
    setConversations(prev => {
      const updated = [conv, ...prev]
      saveConversations(updated)
      return updated
    })
    setActiveConvId(conv.id)
  }

  const deleteConversation = (id) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id)
      if (updated.length === 0) {
        const fresh = [{ id: 'default', title: 'New Conversation', messages: [WELCOME_MSG], createdAt: Date.now() }]
        saveConversations(fresh)
        setActiveConvId('default')
        return fresh
      }
      saveConversations(updated)
      if (activeConvId === id) setActiveConvId(updated[0].id)
      return updated
    })
  }

  const handleReact = (msgId, reaction) => {
    updateConversation(activeConvId, c => ({
      ...c,
      messages: c.messages.map(m => m.id === msgId ? { ...m, reaction: m.reaction === reaction ? null : reaction } : m),
    }))
  }

  const clearConversation = () => {
    updateConversation(activeConvId, c => ({ ...c, messages: [WELCOME_MSG], title: 'New Conversation' }))
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-fade-up">
      {/* Conversation History Sidebar */}
      {sidebarOpen && (
        <div className="w-56 flex-shrink-0 flex flex-col card overflow-hidden">
          <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chats</span>
            <button onClick={newConversation} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all" title="New chat">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {conversations.map(c => (
              <div key={c.id}
                className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all ${activeConvId === c.id ? 'bg-indigo-500/15 border border-indigo-500/20' : 'hover:bg-white/[0.04]'}`}
                onClick={() => setActiveConvId(c.id)}>
                <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${activeConvId === c.id ? 'text-indigo-400' : 'text-slate-600'}`} />
                <span className="text-xs text-slate-300 truncate flex-1">{c.title}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteConversation(c.id) }}
                  className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col card overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(v => !v)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.07] transition-all">
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI Risk Copilot</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400">Online · Powered by Anthropic Claude</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {risks.length > 0 && (
              <span className="text-[10px] font-medium text-slate-500 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-full">
                {risks.length} risks in context
              </span>
            )}
            <button onClick={clearConversation} className="btn-ghost text-xs" title="Clear conversation">
              <RefreshCw className="w-3.5 h-3.5" />Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} onReact={handleReact} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts — show only when few messages */}
        {messages.length <= 2 && !loading && (
          <div className="px-5 pb-3 flex-shrink-0">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Suggested</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUGGESTED_PROMPTS.map(sp => (
                <button key={sp.label} onClick={() => sendMessage(sp.prompt)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.06] transition-all text-left group">
                  <sp.icon className={`w-3.5 h-3.5 flex-shrink-0 ${sp.color}`} />
                  <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors leading-snug">{sp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-2 focus-within:border-indigo-500/40 transition-colors">
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 resize-none outline-none py-1.5 px-2 max-h-32 leading-relaxed"
              placeholder="Ask me anything about your risks…"
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/20">
              {loading
                ? <RefreshCw className="w-4 h-4 text-white animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-700 mt-2">
            Press Enter to send · Shift+Enter for new line · AI may make mistakes — verify critical decisions
          </p>
        </div>
      </div>
    </div>
  )
}
