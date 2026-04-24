import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Building2, MapPin, DollarSign, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { assessmentsAPI, aiAPI, risksAPI } from '../lib/api'

const INDUSTRIES = [
  { value: 'banking', label: 'Banking / Financial Services' },
  { value: 'nbfc', label: 'NBFC / Lending' },
  { value: 'technology', label: 'Technology / SaaS' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'ecommerce', label: 'E-Commerce / Retail' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'logistics', label: 'Logistics / Supply Chain' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'other', label: 'Other' },
]

const SIZES = [
  { value: 'startup', label: 'Startup (1–20 employees)' },
  { value: 'small', label: 'Small (21–100 employees)' },
  { value: 'medium', label: 'Medium (101–500 employees)' },
  { value: 'large', label: 'Large (500+ employees)' },
]

const REVENUE_RANGES = [
  { value: 500000, label: 'Under $500K' },
  { value: 1000000, label: '$500K – $1M' },
  { value: 5000000, label: '$1M – $5M' },
  { value: 10000000, label: '$5M – $10M' },
  { value: 50000000, label: '$10M – $50M' },
  { value: 100000000, label: '$50M – $100M' },
  { value: 500000000, label: '$100M+' },
]

const RISK_CATEGORIES = [
  { id: 'financial', label: 'Financial Risk', desc: 'Cash flow, debt, liquidity', color: 'bg-blue-500' },
  { id: 'operational', label: 'Operational Risk', desc: 'Processes, systems, people', color: 'bg-purple-500' },
  { id: 'market', label: 'Market Risk', desc: 'Competition, pricing, demand', color: 'bg-amber-500' },
  { id: 'credit', label: 'Credit Risk', desc: 'Default, concentration', color: 'bg-red-500' },
  { id: 'legal', label: 'Legal & Compliance', desc: 'Regulatory, contracts', color: 'bg-emerald-500' },
  { id: 'technology', label: 'Technology Risk', desc: 'Cyber, data, systems', color: 'bg-indigo-500' },
  { id: 'reputational', label: 'Reputational Risk', desc: 'Brand, PR, trust', color: 'bg-pink-500' },
  { id: 'strategic', label: 'Strategic Risk', desc: 'Direction, M&A, pivots', color: 'bg-orange-500' },
]

const STEPS = ['Business Info', 'Risk Categories', 'Risk Analysis', 'Review']

export default function NewAssessment() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  const [assessment, setAssessment] = useState(null)
  const [aiRisks, setAiRisks] = useState([])

  const [form, setForm] = useState({
    title: '',
    description: '',
    industry: '',
    organization_size: '',
    annual_revenue: '',
    location: '',
    risk_categories: [],
  })

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const toggleCategory = (id) => {
    setForm(prev => ({
      ...prev,
      risk_categories: prev.risk_categories.includes(id)
        ? prev.risk_categories.filter(c => c !== id)
        : [...prev.risk_categories, id]
    }))
  }

  const handleNext = async () => {
    setError('')
    if (step === 0) {
      if (!form.title || !form.industry || !form.organization_size || !form.location) {
        setError('Please fill all required fields')
        return
      }
      setStep(1)
    } else if (step === 1) {
      if (form.risk_categories.length === 0) {
        setError('Select at least one risk category')
        return
      }
      // Create assessment
      setLoading(true)
      try {
        const res = await assessmentsAPI.create({
          ...form,
          annual_revenue: Number(form.annual_revenue) || 0,
        })
        setAssessment(res.data)
        setStep(2)
        // Trigger AI analysis
        await runAIAnalysis(res.data)
      } catch (e) {
        setError(e.response?.data?.detail || 'Failed to create assessment')
      } finally {
        setLoading(false)
      }
    } else if (step === 2) {
      setStep(3)
    }
  }

  const runAIAnalysis = async (assessmentData) => {
    setAiLoading(true)
    try {
      const res = await aiAPI.analyze({
        assessment_id: assessmentData.id,
        industry: assessmentData.industry,
        organization_size: assessmentData.organization_size,
        annual_revenue: assessmentData.annual_revenue,
        location: assessmentData.location,
        risk_categories: form.risk_categories,
      })
      setAiRisks(res.data.risks || [])
      // Update assessment with AI analysis
      setAssessment(prev => ({ ...prev, ...res.data.assessment_updates }))
    } catch (e) {
      console.error('AI analysis failed:', e)
      // Generate fallback risks
      setAiRisks(generateFallbackRisks(form.industry, form.risk_categories))
    } finally {
      setAiLoading(false)
    }
  }

  const generateFallbackRisks = (industry, categories) => {
    const riskMap = {
      financial: [{ name: 'Cash Flow Shortage', probability: 'medium', impact: 'high', description: 'Insufficient working capital to meet operational needs' }],
      credit: [{ name: 'Borrower Default Risk', probability: 'medium', impact: 'high', description: 'Credit exposure from potential borrower defaults' }],
      operational: [{ name: 'Process Failure', probability: 'medium', impact: 'medium', description: 'Critical business process breakdowns affecting operations' }],
      market: [{ name: 'Market Disruption', probability: 'high', impact: 'medium', description: 'Competitive or demand-side market shifts impacting revenue' }],
      legal: [{ name: 'Regulatory Non-Compliance', probability: 'low', impact: 'high', description: 'Failure to meet applicable regulatory requirements' }],
      technology: [{ name: 'Cybersecurity Breach', probability: 'medium', impact: 'high', description: 'Unauthorized access to systems or data' }],
      reputational: [{ name: 'Brand Damage', probability: 'low', impact: 'high', description: 'Negative publicity affecting customer trust and revenues' }],
      strategic: [{ name: 'Strategic Misalignment', probability: 'medium', impact: 'medium', description: 'Business strategy not aligned with market realities' }],
    }
    return categories.flatMap(cat => (riskMap[cat] || []).map(r => ({ ...r, category: cat })))
  }

  const handleSaveRisks = async () => {
    setLoading(true)
    try {
      for (const risk of aiRisks) {
        await risksAPI.create({
          assessment_id: assessment.id,
          name: risk.name,
          description: risk.description,
          category: risk.category,
          probability: risk.probability,
          impact: risk.impact,
          owner: risk.owner || '',
        })
      }
      navigate(`/assessments/${assessment.id}`)
    } catch (e) {
      setError('Failed to save risks')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">New Risk Assessment</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Identify, score and document business risks systematically</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step ? 'bg-emerald-500 text-white' :
                i === step ? 'bg-primary-500 text-white' :
                'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${i === step ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 transition-all ${i < step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 0: Business Info */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary-500" /> Business Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Assessment Title *"
              placeholder="e.g., Q2 2024 Annual Risk Review"
              value={form.title}
              onChange={e => updateForm('title', e.target.value)}
            />
            <Textarea
              label="Description"
              placeholder="Brief description of this assessment..."
              rows={3}
              value={form.description}
              onChange={e => updateForm('description', e.target.value)}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Industry *" value={form.industry} onChange={e => updateForm('industry', e.target.value)}>
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </Select>
              <Select label="Organization Size *" value={form.organization_size} onChange={e => updateForm('organization_size', e.target.value)}>
                <option value="">Select size...</option>
                {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Annual Revenue" value={form.annual_revenue} onChange={e => updateForm('annual_revenue', e.target.value)}>
                <option value="">Select range...</option>
                {REVENUE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
              <Input
                label="Location *"
                placeholder="e.g., New York, USA"
                value={form.location}
                onChange={e => updateForm('location', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Risk Categories */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary-500" /> Select Risk Categories</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Choose all risk categories relevant to your business. AI will generate specific risks for each.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {RISK_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    form.risk_categories.includes(cat.id)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cat.color}`} />
                  <div>
                    <div className="font-medium text-sm text-slate-800 dark:text-slate-200">{cat.label}</div>
                    <div className="text-xs text-slate-500">{cat.desc}</div>
                  </div>
                  {form.risk_categories.includes(cat.id) && (
                    <CheckCircle2 className="w-4 h-4 text-primary-500 ml-auto flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">{form.risk_categories.length} categories selected</p>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Risk Analysis */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-500" /> Risk Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary-200 dark:border-primary-900"></div>
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
                </div>
                <div className="text-center">
                  <p className="font-medium text-slate-700 dark:text-slate-300">Analyzing your business profile...</p>
                  <p className="text-sm text-slate-500 mt-1">Identifying risks for {form.industry} industry</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{aiRisks.length} risks identified by AI</p>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">AI Generated</span>
                </div>
                {aiRisks.map((risk, idx) => (
                  <div key={idx} className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{risk.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{risk.description}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        risk.category === 'financial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        risk.category === 'credit' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        risk.category === 'operational' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        risk.category === 'market' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        risk.category === 'legal' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      }`}>{risk.category}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Probability: <span className={`font-medium ${risk.probability === 'high' ? 'text-red-500' : risk.probability === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>{risk.probability}</span></span>
                      <span>Impact: <span className={`font-medium ${risk.impact === 'high' ? 'text-red-500' : risk.impact === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}>{risk.impact}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Review & Confirm</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Business Details</h4>
                {[
                  ['Title', form.title],
                  ['Industry', INDUSTRIES.find(i => i.value === form.industry)?.label || form.industry],
                  ['Size', SIZES.find(s => s.value === form.organization_size)?.label || form.organization_size],
                  ['Location', form.location],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Risk Summary</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Categories Selected</span>
                  <span className="font-medium">{form.risk_categories.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Risks Identified</span>
                  <span className="font-medium">{aiRisks.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">High Priority Risks</span>
                  <span className="font-medium text-red-500">{aiRisks.filter(r => r.impact === 'high').length}</span>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Click <strong>Save Assessment</strong> to save {aiRisks.length} AI-identified risks and view your full risk report.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => step === 0 ? navigate('/dashboard') : setStep(s => s - 1)}
          disabled={loading || aiLoading}
        >
          <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < 3 ? (
          <Button onClick={handleNext} loading={loading || aiLoading} disabled={step === 2 && aiLoading}>
            {step === 2 ? 'Continue to Review' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleSaveRisks} loading={loading}>
            Save Assessment <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
