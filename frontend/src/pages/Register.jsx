import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, Eye, EyeOff, Mail, Lock, User, Building2,
  ArrowRight, CheckCircle, Star
} from 'lucide-react'
import useAuthStore from '../store/authStore'

// Password strength helper
function getStrength(pwd) {
  let score = 0
  if (pwd.length >= 8)              score++
  if (/[A-Z]/.test(pwd))           score++
  if (/[0-9]/.test(pwd))           score++
  if (/[^A-Za-z0-9]/.test(pwd))   score++
  return score // 0-4
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500']
const STRENGTH_TEXT  = ['', 'text-red-400', 'text-amber-400', 'text-yellow-400', 'text-emerald-400']

const PERKS = [
  'AI-powered risk assessments',
  'NSE / BSE market intelligence',
  'Real-time risk heatmap',
  'Automated PDF/Excel reports',
  'Team collaboration tools',
]

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '', full_name: '', organization_name: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const strength = getStrength(form.password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    const result = await register(form)
    if (result.success) navigate('/dashboard')
    else setError(result.error || 'Registration failed. Please try again.')
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — branding ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden bg-slate-950 flex-col justify-between p-12">

        {/* Orbs */}
        <div className="absolute top-[-80px] left-[-80px] w-[420px] h-[420px] rounded-full bg-primary-600/20 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full bg-violet-600/20 blur-[90px] animate-pulse" style={{ animationDelay: '1.5s' }} />

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">RiskIQ</span>
        </div>

        {/* Hero */}
        <div className="relative space-y-8">
          <div>
            <p className="text-primary-400 text-sm font-semibold uppercase tracking-widest mb-3">Free to get started</p>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Your complete<br />
              <span className="bg-gradient-to-r from-primary-400 to-violet-400 bg-clip-text text-transparent">
                risk command centre
              </span>
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed">
              Join teams using RiskIQ to identify, track and mitigate
              risks before they become problems.
            </p>
          </div>

          {/* Perks */}
          <ul className="space-y-3">
            {PERKS.map(p => (
              <li key={p} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>

          {/* Testimonial card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              "RiskIQ cut our risk assessment time by 70%. The AI analysis is remarkably accurate."
            </p>
            <p className="mt-2 text-slate-500 text-xs">— Risk Manager, Fortune 500 firm</p>
          </div>
        </div>

        <div className="relative text-xs text-slate-600">© 2025 RiskIQ · All rights reserved</div>
      </div>

      {/* ── Right panel — form ───────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-900 relative overflow-hidden">

        <div className="absolute top-0 left-0 w-96 h-96 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md relative">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">RiskIQ</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Create your account</h1>
            <p className="text-slate-400 mt-2">Start managing risks smarter — it's free</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <span className="w-4 h-4 rounded-full bg-red-500/20 flex-shrink-0 flex items-center justify-center text-red-400 font-bold text-xs">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name + Org row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={set('full_name')}
                    className="w-full pl-9 pr-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                    placeholder="John Smith"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Organization</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={form.organization_name}
                    onChange={set('organization_name')}
                    className="w-full pl-9 pr-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                    placeholder="Acme Corp"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  className="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength bar */}
              {form.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? STRENGTH_COLOR[strength] : 'bg-slate-700'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${STRENGTH_TEXT[strength]}`}>
                    {STRENGTH_LABEL[strength]} password
                  </p>
                </div>
              )}
            </div>

            {/* Terms */}
            <p className="text-xs text-slate-500 leading-relaxed">
              By creating an account you agree to our{' '}
              <span className="text-primary-400 cursor-pointer hover:text-primary-300">Terms of Service</span>
              {' '}and{' '}
              <span className="text-primary-400 cursor-pointer hover:text-primary-300">Privacy Policy</span>.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>Create Free Account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600">OR</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
