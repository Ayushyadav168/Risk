import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageSquare, Send, Hash, Bell, AtSign, Users,
  Plus, Search, Circle, RefreshCw, Megaphone, Phone
} from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/authStore'
import { useNavigate } from 'react-router-dom'

const CHANNELS = [
  { id: 'general',       icon: Hash,      label: 'General',       desc: 'Team-wide discussion' },
  { id: 'announcements', icon: Megaphone, label: 'Announcements', desc: 'Admin broadcasts' },
  { id: 'direct',        icon: AtSign,    label: 'Direct Messages', desc: 'Private conversations' },
]

const COLORS = ['bg-indigo-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-pink-500','bg-sky-500','bg-orange-500']
const avatarColor = (id) => COLORS[(id || 0) % COLORS.length]

function Avatar({ name, userId, size = 'sm' }) {
  const initials = (name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} ${avatarColor(userId)} rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initials}
    </div>
  )
}

function MessageBubble({ msg, isOwn }) {
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={`flex gap-2.5 items-start group ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && <Avatar name={msg.sender_name} userId={msg.sender_id} />}
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOwn && (
          <span className="text-[11px] text-slate-500 mb-1 px-1">{msg.sender_name}</span>
        )}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isOwn
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white/[0.05] border border-white/[0.08] text-slate-200 rounded-tl-sm'
        }`}>
          {msg.content.split('\n').map((line, i) => {
            const bold = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            return <p key={i} dangerouslySetInnerHTML={{ __html: bold || '&nbsp;' }} />
          })}
        </div>
        <span className="text-[10px] text-slate-700 mt-1 px-1">{time}</span>
      </div>
    </div>
  )
}

function DateDivider({ date }) {
  const d = new Date(date)
  const label = d.toDateString() === new Date().toDateString() ? 'Today'
    : d.toDateString() === new Date(Date.now()-86400000).toDateString() ? 'Yesterday'
    : d.toLocaleDateString()
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/[0.06]" />
      <span className="text-[10px] text-slate-600 font-medium">{label}</span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  )
}

export default function Messenger() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [channel, setChannel] = useState('general')
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [dmUser, setDmUser] = useState(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const [searchUser, setSearchUser] = useState('')
  const bottomRef = useRef(null)
  const pollRef = useRef(null)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/messages/', { params: { channel, limit: 60 } })
      setMessages(res.data)
    } catch {}
    setLoading(false)
  }, [channel])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/messages/users')
      setUsers(res.data)
    } catch {}
  }

  const fetchUnread = async () => {
    try {
      const res = await api.get('/messages/unread-count')
      setUnread(res.data.count)
    } catch {}
  }

  useEffect(() => {
    fetchMessages()
    fetchUsers()
    fetchUnread()
    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(() => { fetchMessages(); fetchUnread() }, 5000)
    return () => clearInterval(pollRef.current)
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      const payload = { content: text, channel }
      if (channel === 'direct' && dmUser) payload.receiver_id = dmUser.id
      await api.post('/messages/', payload)
      await fetchMessages()
    } catch {}
    setSending(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const date = msg.created_at.split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  const currentUser = user
  const filteredUsers = users.filter(u =>
    (u.name || u.email).toLowerCase().includes(searchUser.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#060b18] -m-6">

      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-white/[0.06] flex flex-col bg-[#07101f]">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Messenger</h2>
            {unread > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
            )}
          </div>
        </div>

        {/* Channels */}
        <div className="p-3">
          <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2 px-1">Channels</p>
          {CHANNELS.map(ch => {
            const Icon = ch.icon
            return (
              <button
                key={ch.id}
                onClick={() => { setChannel(ch.id); setDmUser(null) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs mb-0.5 transition-all ${
                  channel === ch.id && !dmUser
                    ? 'bg-indigo-500/15 text-white border border-indigo-500/20'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{ch.label}</span>
              </button>
            )
          })}
        </div>

        {/* Direct Messages */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider mb-2 px-1">Direct Messages</p>
          <div className="relative mb-2">
            <Search className="w-3 h-3 text-slate-600 absolute left-2.5 top-2.5" />
            <input
              type="text" value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              placeholder="Find person..."
              className="w-full pl-7 pr-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-white placeholder-slate-700 focus:outline-none"
            />
          </div>
          {filteredUsers.map(u => (
            <button
              key={u.id}
              onClick={() => { setChannel('direct'); setDmUser(u) }}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-xs mb-0.5 transition-all ${
                dmUser?.id === u.id
                  ? 'bg-indigo-500/15 text-white border border-indigo-500/20'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              }`}
            >
              <Avatar name={u.name} userId={u.id} size="sm" />
              <div className="text-left min-w-0">
                <p className="truncate font-medium">{u.name}</p>
                <p className="text-[10px] text-slate-600 truncate capitalize">{u.role}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Quick join call */}
        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => navigate('/video-call')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            Start Video Call
          </button>
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#07101f]/50">
          <div className="flex items-center gap-3">
            {dmUser ? (
              <>
                <Avatar name={dmUser.name} userId={dmUser.id} />
                <div>
                  <p className="text-sm font-bold text-white">{dmUser.name}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{dmUser.role}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                  {(() => { const Ch = CHANNELS.find(c => c.id === channel); return Ch ? <Ch.icon className="w-4 h-4 text-indigo-400" /> : null })()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">#{channel}</p>
                  <p className="text-[10px] text-slate-500">{CHANNELS.find(c => c.id === channel)?.desc}</p>
                </div>
              </>
            )}
          </div>
          <button onClick={fetchMessages} className="p-1.5 hover:bg-white/[0.05] rounded-lg text-slate-500 hover:text-slate-300">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && !messages.length ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-5 h-5 text-slate-600 animate-spin" />
            </div>
          ) : !messages.length ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-slate-700" />
              </div>
              <p className="text-slate-500 text-sm">No messages yet. Say something!</p>
            </div>
          ) : (
            <div className="space-y-1 max-w-3xl mx-auto">
              {Object.entries(grouped).map(([date, msgs]) => (
                <div key={date}>
                  <DateDivider date={date} />
                  <div className="space-y-3">
                    {msgs.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isOwn={msg.sender_id === currentUser?.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#07101f]/50">
          <div className="max-w-3xl mx-auto">
            {channel === 'announcements' && currentUser?.role !== 'owner' && currentUser?.role !== 'admin' ? (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                <Megaphone className="w-4 h-4" />
                This is a read-only announcements channel. Only admins can post here.
              </div>
            ) : (
              <div className="flex items-end gap-3 p-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus-within:border-indigo-500/40 transition-all">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={dmUser ? `Message ${dmUser.name}...` : `Message #${channel}...`}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 resize-none focus:outline-none leading-relaxed max-h-32 overflow-y-auto"
                  onInput={e => {
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
                  }}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || sending}
                  className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 flex items-center justify-center transition-all flex-shrink-0"
                >
                  {sending
                    ? <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                    : <Send className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>
            )}
            <p className="text-[10px] text-slate-700 text-center mt-2">Enter to send · Shift+Enter for new line · Auto-refreshes every 5s</p>
          </div>
        </div>
      </div>
    </div>
  )
}
