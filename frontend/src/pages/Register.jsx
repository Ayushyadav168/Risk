import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, ArrowRight, Sparkles, User, Building2, Mail, Lock } from 'lucide-react'
import useAuthStore from '../store/authStore'

function getStrength(pwd) {
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return score
}

const STRENGTH_META = [
  { label: '', color: 'bg-slate-700', text: '' },
  { label: 'Weak',   color: 'bg-red-500',     text: 'text-red-400' },
  { label: 'Fair',   color: 'bg-amber-500',   text: 'text-amber-400' },
  { label: 'Good',   color: 'bg-yellow-400',  text: 'text-yellow-400' },
  { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-400' },
]

function Field({ label, icon: Icon, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />}
        {children}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '', full_name: '', organization_name: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))
  const strength = getStrength(form.password)
  const meta = STRENGTH_META[strength] || STRENGTH_META[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    const result = await register(form)
    if (result.success) navigate('/dashboard')
    else setError(result.error || 'Registration failed. Please try again.')
  }

  const inputCls = (hasIcon = true) =>
    `w-full py-3.5 ${hasIcon ? 'pl-11 pr-4' : 'px-4'} bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all text-sm`

  return (
    <div className="min-h-screen bg-[#060b18] flex items-center justify-center relative overflow-hidden px-4 py-10">

      {/* Gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Card */}
      <div className={`relative w-full max-w-[440px] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-indigo-500/10 rounded-3xl blur-xl" />

        <div className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/60">

          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-7">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight">RiskIQ</span>
              <div className="flex items-center gap-1 -mt-0.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] text-indigo-400 font-medium tracking-widest uppercase">Platform</span>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-7">
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="text-slate-400 text-sm mt-1.5">Start managing risks smarter — it's free</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name + Org side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={set('full_name')}
                    placeholder="John Smith"
                    className="w-full pl-10 pr-3 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={form.organization_name}
                    onChange={set('organization_name')}
                    placeholder="Company"
                    className="w-full pl-10 pr-3 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@company.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-12 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength meter */}
              {form.password.length > 0 && (
                <div className="pt-1">
                  <div className="flex gap-1 mb-1.5">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? meta.color : 'bg-white/[0.08]'}`} />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${meta.text}`}>{meta.label} password</p>
                </div>
              )}
            </div>

            {/* Terms */}
            <p className="text-xs text-slate-500 leading-relaxed pt-1">
              By creating an account you agree to our{' '}
              <span className="text-indigo-400 cursor-pointer hover:text-indigo-300 transition-colors">Terms of Service</span>
              {' '}and{' '}
              <span className="text-indigo-400 cursor-pointer hover:text-indigo-300 transition-colors">Privacy Policy</span>.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
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
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-slate-600">Already have an account?</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white transition-all text-sm font-medium"
          >
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  )
}
