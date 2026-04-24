import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Building2, Users, Zap, CheckCircle2, ArrowRight, ChevronLeft } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import useAuthStore from '../store/authStore'
import api from '../lib/api'

const STEPS = [
  { id: 0, title: 'Welcome to RiskIQ', subtitle: "Let's set up your workspace in 3 minutes" },
  { id: 1, title: 'About Your Business', subtitle: 'Help us personalize your risk templates' },
  { id: 2, title: 'Choose Your Focus', subtitle: 'Select the risk areas most relevant to you' },
  { id: 3, title: 'Invite Your Team', subtitle: 'Risk management is a team sport (optional)' },
  { id: 4, title: "You're all set!", subtitle: 'Your workspace is ready' },
]

const INDUSTRIES = [
  'Banking / NBFC', 'Technology / SaaS', 'Manufacturing', 'E-Commerce',
  'Healthcare', 'Logistics', 'Real Estate', 'Hospitality', 'Other',
]

const RISK_FOCUSES = [
  { id: 'financial', label: 'Financial Risk', icon: '💰', desc: 'Cash flow, debt, revenue' },
  { id: 'operational', label: 'Operational Risk', icon: '⚙️', desc: 'Processes, people, systems' },
  { id: 'market', label: 'Market Risk', icon: '📊', desc: 'Competition, pricing, demand' },
  { id: 'credit', label: 'Credit Risk', icon: '🏦', desc: 'Defaults, concentration' },
  { id: 'legal', label: 'Legal & Compliance', icon: '⚖️', desc: 'Regulations, contracts' },
  { id: 'technology', label: 'Technology Risk', icon: '🔒', desc: 'Cyber, data, infra' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    org_name: '', industry: '', size: 'medium', location: '',
    risk_focuses: [], invite_emails: [''],
  })

  const toggleFocus = (id) => {
    setForm(p => ({
      ...p,
      risk_focuses: p.risk_focuses.includes(id)
        ? p.risk_focuses.filter(r => r !== id)
        : [...p.risk_focuses, id],
    }))
  }

  const handleNext = async () => {
    if (step === 1) {
      // Save org info
      try {
        await api.put('/auth/organization', {
          name: form.org_name, industry: form.industry,
          size: form.size, location: form.location,
        })
      } catch (e) { console.error(e) }
    }
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      // Mark onboarding complete
      await api.post('/auth/complete-onboarding', {})
      navigate('/dashboard')
    } catch (e) {
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    navigate('/dashboard')
  }

  const currentStep = STEPS[step]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">RiskIQ</span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i <= step ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 animate-fadeIn">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{currentStep.title}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{currentStep.subtitle}</p>
          </div>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 my-6">
                {[
                  { icon: Shield, label: 'Identify Risks', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
                  { icon: Zap, label: 'AI Analysis', color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
                  { icon: CheckCircle2, label: 'Mitigate Fast', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className={`flex flex-col items-center gap-2 p-4 rounded-xl ${color}`}>
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center text-slate-700 dark:text-slate-300">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Hi <strong>{user?.full_name?.split(' ')[0] || 'there'}</strong>! We'll walk you through setting up
                your risk management workspace. This takes about 3 minutes.
              </p>
            </div>
          )}

          {/* Step 1: Business info */}
          {step === 1 && (
            <div className="space-y-4">
              <Input label="Organization Name" placeholder="Acme Corp"
                value={form.org_name} onChange={e => setForm(p => ({ ...p, org_name: e.target.value }))} />
              <Select label="Industry" value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}>
                <option value="">Select your industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i.toLowerCase().split('/')[0].trim()}>{i}</option>)}
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Organization Size" value={form.size} onChange={e => setForm(p => ({ ...p, size: e.target.value }))}>
                  <option value="startup">Startup (1–20)</option>
                  <option value="small">Small (21–100)</option>
                  <option value="medium">Medium (101–500)</option>
                  <option value="large">Large (500+)</option>
                </Select>
                <Input label="Location" placeholder="Mumbai, India"
                  value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Step 2: Risk Focus */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              {RISK_FOCUSES.map(({ id, label, icon, desc }) => (
                <button key={id} onClick={() => toggleFocus(id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    form.risk_focuses.includes(id)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}>
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                  {form.risk_focuses.includes(id) && <CheckCircle2 className="w-4 h-4 text-primary-500 ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Invite Team */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Invite colleagues to collaborate on risk assessments. You can always do this later.</p>
              {form.invite_emails.map((email, idx) => (
                <Input key={idx} type="email" placeholder={`colleague${idx + 1}@company.com`}
                  value={email} onChange={e => {
                    const emails = [...form.invite_emails]
                    emails[idx] = e.target.value
                    setForm(p => ({ ...p, invite_emails: emails }))
                  }} />
              ))}
              <button onClick={() => setForm(p => ({ ...p, invite_emails: [...p.invite_emails, ''] }))}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
                + Add another email
              </button>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="space-y-2">
                {[
                  'Your workspace is configured ✓',
                  'Risk templates are ready ✓',
                  `${form.risk_focuses.length || 'All'} risk categories selected ✓`,
                  'AI analysis is enabled ✓',
                ].map(text => (
                  <p key={text} className="text-sm text-slate-600 dark:text-slate-400">{text}</p>
                ))}
              </div>
              <div className="pt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-sm text-primary-700 dark:text-primary-400">
                <strong>Pro tip:</strong> Start with a New Assessment to immediately see your AI-powered risk report.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <div>
              {step > 0 && step < 4 && (
                <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step < 4 && step >= 2 && (
                <button onClick={step === 3 ? () => setStep(4) : handleNext} className="text-sm text-slate-400 hover:text-slate-600">
                  Skip
                </button>
              )}
              {step < 4 ? (
                <Button onClick={handleNext}>
                  {step === 0 ? 'Get Started' : 'Continue'} <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish} loading={loading}>
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Skip all */}
        {step < 4 && (
          <p className="text-center mt-4 text-xs text-slate-400">
            <button onClick={handleSkip} className="hover:text-slate-600 underline">Skip setup, go to dashboard</button>
          </p>
        )}
      </div>
    </div>
  )
}
