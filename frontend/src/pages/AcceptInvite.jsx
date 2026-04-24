import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Shield, CheckCircle2, AlertCircle, Loader, User } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { teamAPI } from '../lib/api'
import useAuthStore from '../store/authStore'

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const token = params.get('token')

  const [step, setStep] = useState('loading')   // loading | setup | done | error
  const [inviteInfo, setInviteInfo] = useState(null)
  const [form, setForm] = useState({ full_name: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setStep('error'); return }
    setStep('setup')
  }, [token])

  const handleAccept = async () => {
    if (form.password && form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await teamAPI.acceptInvite({
        token,
        full_name: form.full_name || undefined,
        password: form.password || undefined,
      })
      if (res.data?.access_token) {
        localStorage.setItem('token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
      }
      setStep('done')
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (e) {
      setError(e.response?.data?.detail || 'Invalid or expired invite link')
      setStep('error')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">RiskIQ</span>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader className="w-10 h-10 animate-spin text-primary-500" />
              <p className="text-slate-500">Verifying invite...</p>
            </div>
          )}

          {step === 'setup' && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8 text-primary-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">You're invited!</h2>
                <p className="text-slate-500 text-sm mt-1">Complete your account setup to join the team</p>
              </div>

              <div className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}
                <Input label="Full Name" placeholder="Your name" value={form.full_name}
                  onChange={e => setForm(p => ({...p, full_name: e.target.value}))} />
                <Input label="Set Password" type="password" placeholder="Min 8 characters" value={form.password}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))} />
                <Input label="Confirm Password" type="password" value={form.confirm}
                  onChange={e => setForm(p => ({...p, confirm: e.target.value}))} />
                <Button className="w-full" onClick={handleAccept} loading={loading}>
                  Join Team
                </Button>
              </div>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Welcome to the team!</h2>
              <p className="text-slate-500 text-sm">Redirecting you to the dashboard...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Invalid Invite</h2>
              <p className="text-slate-500 text-sm">{error || 'This invite link is invalid or has expired.'}</p>
              <Button onClick={() => navigate('/login')}>Go to Login</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
