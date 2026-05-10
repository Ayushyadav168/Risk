import React, { useState, useEffect, useRef } from 'react'
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Users,
  Copy, Check, ExternalLink, Calendar, Plus, ArrowLeft,
  Clock, Link2, RefreshCw, MessageSquare
} from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/authStore'
import { useNavigate, useSearchParams } from 'react-router-dom'

const JITSI_DOMAIN = 'meet.jit.si'

function MeetingCard({ meeting, onJoin, onDelete, isOwner }) {
  const [copied, setCopied] = useState(false)
  const now = new Date()
  const sched = new Date(meeting.scheduled_at)
  const minsUntil = Math.round((sched - now) / 60000)
  const isLive = meeting.status === 'live' || (minsUntil >= -5 && minsUntil <= meeting.duration_min)
  const isPast = minsUntil < -meeting.duration_min

  const copyLink = () => {
    navigator.clipboard?.writeText(meeting.room_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`p-4 bg-white/[0.03] border rounded-2xl transition-all ${
      isLive ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'border-white/[0.07]'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            )}
            {isPast && (
              <span className="px-2 py-0.5 bg-slate-500/10 border border-slate-500/20 rounded-full text-[10px] text-slate-500">Ended</span>
            )}
            {!isLive && !isPast && (
              <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] text-indigo-400">
                {minsUntil > 60 ? `In ${Math.round(minsUntil/60)}h` : `In ${minsUntil}m`}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-white truncate">{meeting.title}</h3>
          {meeting.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{meeting.description}</p>
          )}
        </div>
        {isOwner && !isPast && (
          <button onClick={() => onDelete(meeting.id)}
            className="text-slate-700 hover:text-red-400 transition-colors text-xs">✕</button>
        )}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {sched.toLocaleDateString()} {sched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {meeting.participant_count} participants
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {meeting.duration_min} min
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onJoin(meeting)}
          disabled={isPast}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            meeting.is_google_meet
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : isLive
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : isPast
              ? 'bg-white/[0.03] text-slate-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          {isPast ? 'Ended' : meeting.is_google_meet ? 'Open Google Meet' : isLive ? 'Join Now' : 'Join Meeting'}
        </button>
        <button onClick={copyLink}
          className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl text-xs text-slate-400 transition-all flex items-center gap-1.5">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy Link'}
        </button>
      </div>
    </div>
  )
}

function JitsiCall({ roomId, displayName, onLeave }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    const loadJitsi = () => {
      if (!window.JitsiMeetExternalAPI) {
        setTimeout(loadJitsi, 500)
        return
      }
      apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName: roomId,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          enableWelcomePage: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: ['microphone','camera','closedcaptions','desktop','chat','raisehand','videoquality','participants-pane','tileview','hangup'],
          DEFAULT_BACKGROUND: '#060b18',
        },
        userInfo: { displayName },
      })
      apiRef.current.addEventListener('readyToClose', onLeave)
    }

    // Load Jitsi script if not already loaded
    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script')
      script.src = `https://${JITSI_DOMAIN}/external_api.js`
      script.onload = loadJitsi
      document.head.appendChild(script)
    } else {
      loadJitsi()
    }

    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose() } catch {}
      }
    }
  }, [roomId, displayName, onLeave])

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-2 bg-[#07101f] border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-300">Live Call · Room: <code className="text-indigo-400">{roomId}</code></span>
        </div>
        <button onClick={onLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 rounded-lg text-xs text-red-400 transition-all">
          <PhoneOff className="w-3.5 h-3.5" />
          Leave Call
        </button>
      </div>
      <div ref={containerRef} className="flex-1" />
    </div>
  )
}

export default function VideoCall() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(false)
  const [inCall, setInCall] = useState(false)
  const [currentRoom, setCurrentRoom] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', scheduled_at: '', duration_min: 30, meet_link: '', participant_emails: ''
  })
  const [creating, setCreating] = useState(false)
  const [quickRoom, setQuickRoom] = useState('')

  useEffect(() => {
    fetchMeetings()
    // Auto-join from URL param
    const room = searchParams.get('room')
    if (room) { setCurrentRoom(room); setInCall(true) }
  }, [])

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const res = await api.get('/meetings/')
      setMeetings(res.data)
    } catch {}
    setLoading(false)
  }

  const joinMeeting = async (meeting) => {
    // If meeting has a Google Meet link, open in new tab
    if (meeting.meet_link) {
      window.open(meeting.meet_link, '_blank', 'noopener,noreferrer')
      return
    }
    // Otherwise use Jitsi embed
    try {
      const res = await api.post(`/meetings/${meeting.id}/join`)
      setCurrentRoom(res.data.room_id)
      setInCall(true)
    } catch {
      setCurrentRoom(meeting.room_id)
      setInCall(true)
    }
  }

  const startInstantCall = () => {
    const room = quickRoom.trim() || `riskiq-instant-${Date.now().toString(36)}`
    setCurrentRoom(room)
    setInCall(true)
  }

  const createMeeting = async () => {
    if (!form.title || !form.scheduled_at) return
    setCreating(true)
    try {
      const emails = form.participant_emails.split(',').map(e => e.trim()).filter(Boolean)
      await api.post('/meetings/', {
        title: form.title,
        description: form.description,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_min: form.duration_min,
        meet_link: form.meet_link || null,
        participant_emails: emails,
      })
      setForm({ title: '', description: '', scheduled_at: '', duration_min: 30, meet_link: '', participant_emails: '' })
      setShowCreate(false)
      await fetchMeetings()
    } catch {}
    setCreating(false)
  }

  const deleteMeeting = async (id) => {
    try { await api.delete(`/meetings/${id}`); await fetchMeetings() } catch {}
  }

  const displayName = user?.full_name || user?.email || 'RiskIQ User'

  if (inCall && currentRoom) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 bg-[#060b18]">
        <JitsiCall
          roomId={currentRoom}
          displayName={displayName}
          onLeave={() => { setInCall(false); setCurrentRoom(null) }}
        />
      </div>
    )
  }

  const upcomingMeetings = meetings.filter(m => {
    const sched = new Date(m.scheduled_at)
    return (Date.now() - sched.getTime()) < m.duration_min * 60000
  })
  const pastMeetings = meetings.filter(m => {
    const sched = new Date(m.scheduled_at)
    return (Date.now() - sched.getTime()) >= m.duration_min * 60000
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Video Meetings</h1>
          <p className="text-slate-400 text-sm mt-1">Schedule Google Meet calls or start instant Jitsi sessions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium text-white transition-all">
            <Calendar className="w-4 h-4" />
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* Instant call */}
      <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Start Instant Call</h3>
            <p className="text-xs text-slate-400">Jump into a meeting right now — no scheduling needed</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text" value={quickRoom}
            onChange={e => setQuickRoom(e.target.value)}
            placeholder="Custom room name (optional)"
            className="flex-1 px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
          />
          <button onClick={startInstantCall}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-2">
            <Video className="w-4 h-4" />
            Join Now
          </button>
        </div>
      </div>

      {/* Scheduled meetings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Upcoming Meetings</h2>
          <button onClick={fetchMeetings}
            className="text-slate-600 hover:text-slate-400 p-1.5 hover:bg-white/[0.04] rounded-lg transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {upcomingMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
            <Calendar className="w-8 h-8 text-slate-700" />
            <p className="text-slate-500 text-sm">No upcoming meetings</p>
            <button onClick={() => setShowCreate(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300">Schedule one →</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingMeetings.map(m => (
              <MeetingCard
                key={m.id} meeting={m}
                onJoin={joinMeeting}
                onDelete={deleteMeeting}
                isOwner={m.created_by_id === user?.id || user?.role === 'owner'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past meetings */}
      {pastMeetings.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">Past Meetings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pastMeetings.slice(0, 4).map(m => (
              <MeetingCard
                key={m.id} meeting={m}
                onJoin={joinMeeting}
                onDelete={deleteMeeting}
                isOwner={m.created_by_id === user?.id || user?.role === 'owner'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create meeting modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f1729] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="font-semibold text-white text-sm">Schedule Meeting</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Meeting Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  placeholder="Q4 Risk Review"
                  className="w-full px-3 py-2.5 bg-[#0d1426] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  placeholder="Agenda or notes..."
                  rows={2}
                  className="w-full px-3 py-2.5 bg-[#0d1426] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Date & Time *</label>
                  <input type="datetime-local" value={form.scheduled_at}
                    onChange={e => setForm(f => ({...f, scheduled_at: e.target.value}))}
                    className="w-full px-3 py-2.5 bg-[#0d1426] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/60" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Duration (min)</label>
                  <input type="number" value={form.duration_min}
                    onChange={e => setForm(f => ({...f, duration_min: parseInt(e.target.value) || 30}))}
                    className="w-full px-3 py-2.5 bg-[#0d1426] border border-white/[0.08] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/60" />
                </div>
              </div>
              {/* Google Meet Link */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-medium">Google Meet Link <span className="text-slate-600">(recommended)</span></label>
                  <a href="https://meet.google.com/new" target="_blank" rel="noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Create Meet →
                  </a>
                </div>
                <input value={form.meet_link} onChange={e => setForm(f => ({...f, meet_link: e.target.value}))}
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  className="w-full px-3 py-2.5 bg-[#0d1426] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/40" />
                <p className="text-[10px] text-slate-600">Leave blank to use Jitsi (embedded video call)</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Invite Participants (emails, comma separated)</label>
                <input value={form.participant_emails}
                  onChange={e => setForm(f => ({...f, participant_emails: e.target.value}))}
                  placeholder="john@example.com, jane@example.com"
                  className="w-full px-3 py-2.5 bg-[#0d1426] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60" />
                <p className="text-[10px] text-slate-600">Invited users will receive a direct message with the meeting link</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-sm text-slate-400 transition-all">
                  Cancel
                </button>
                <button onClick={createMeeting} disabled={creating || !form.title || !form.scheduled_at}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2">
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  {creating ? 'Scheduling...' : 'Schedule Meeting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
