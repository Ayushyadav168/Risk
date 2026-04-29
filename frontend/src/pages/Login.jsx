import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'
import useAuthStore from '../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login(form.email, form.password)
    if (result.success) navigate('/dashboard')
    else setError(result.error || 'Invalid email or password. Please try again.')
  }

  return (
    <div className="min-h-screen bg-[#060b18] flex items-center justify-center relative overflow-hidden px-4">

      {/* Animated gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Card */}
      <div className={`relative w-full max-w-[420px] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

        {/* Glow behind card */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-violet-500/10 rounded-3xl blur-xl" />

        <div className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/60">

          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
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
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-slate-400 text-sm mt-1.5">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com"
                required
                autoFocus
                className="w-full px-4 py-3.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3.5 pr-12 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.07] transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-slate-600">New to RiskIQ?</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Register link */}
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white transition-all text-sm font-medium"
          >
            Create a free account
          </Link>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-600 mt-6">
            By signing in, you agree to our{' '}
            <span className="text-slate-500 hover:text-slate-400 cursor-pointer transition-colors">Terms</span>
            {' '}&{' '}
            <span className="text-slate-500 hover:text-slate-400 cursor-pointer transition-colors">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  )
}
