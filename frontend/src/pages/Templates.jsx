import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ArrowRight, CheckCircle2, Building2, Code2, Factory, ShoppingCart, Heart, Truck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { templatesAPI, assessmentsAPI } from '../lib/api'
import { capitalize } from '../lib/utils'

const INDUSTRY_ICONS = {
  banking: Building2, technology: Code2, manufacturing: Factory,
  ecommerce: ShoppingCart, healthcare: Heart, logistics: Truck,
}
const INDUSTRY_COLORS = {
  banking: 'bg-blue-500', technology: 'bg-indigo-500', manufacturing: 'bg-orange-500',
  ecommerce: 'bg-pink-500', healthcare: 'bg-emerald-500', logistics: 'bg-amber-500',
}

// Built-in templates shown if API returns nothing
const BUILT_IN_TEMPLATES = [
  {
    id: 'bi-1', name: 'Banking & Financial Services', industry: 'banking',
    description: 'Comprehensive risk framework for banks, NBFCs, and financial institutions. Covers credit, market, liquidity, and regulatory risks.',
    risk_categories: ['financial', 'credit', 'market', 'operational', 'legal'],
    default_risks: [
      { name: 'Credit Default Risk', category: 'credit', probability: 'medium', impact: 'high', description: 'Borrower default leading to loss of principal and interest.' },
      { name: 'Interest Rate Risk', category: 'market', probability: 'high', impact: 'medium', description: 'NIM compression due to rate environment shifts.' },
      { name: 'Liquidity Risk', category: 'financial', probability: 'low', impact: 'high', description: 'Inability to meet short-term obligations during stress.' },
      { name: 'Regulatory Compliance', category: 'legal', probability: 'medium', impact: 'high', description: 'Non-compliance with RBI / Basel / AML regulations.' },
      { name: 'Cyber Fraud', category: 'operational', probability: 'medium', impact: 'high', description: 'Digital fraud, phishing, and unauthorized access.' },
    ],
  },
  {
    id: 'bi-2', name: 'SaaS Technology Company', industry: 'technology',
    description: 'Risk template for B2B/B2C SaaS startups and scale-ups. Focuses on data security, churn, infra reliability, and compliance.',
    risk_categories: ['operational', 'market', 'financial', 'legal', 'technology'],
    default_risks: [
      { name: 'Data Breach', category: 'technology', probability: 'medium', impact: 'high', description: 'Unauthorized access to customer data and PII.' },
      { name: 'Customer Churn Risk', category: 'market', probability: 'medium', impact: 'high', description: 'High churn from competitors or product-market misfit.' },
      { name: 'Infrastructure Outage', category: 'operational', probability: 'low', impact: 'high', description: 'Cloud/infra downtime affecting SLA commitments.' },
      { name: 'GDPR Non-Compliance', category: 'legal', probability: 'low', impact: 'high', description: 'Data processing without proper consent or DPAs.' },
      { name: 'Competitive Disruption', category: 'market', probability: 'high', impact: 'medium', description: 'Faster competitors eroding market share.' },
    ],
  },
  {
    id: 'bi-3', name: 'Manufacturing Operations', industry: 'manufacturing',
    description: 'Risk framework for industrial and manufacturing businesses. Addresses supply chain, equipment, safety, and regulatory risks.',
    risk_categories: ['operational', 'financial', 'market', 'legal'],
    default_risks: [
      { name: 'Supply Chain Disruption', category: 'operational', probability: 'medium', impact: 'high', description: 'Single-source dependency causing production halt.' },
      { name: 'Equipment Failure', category: 'operational', probability: 'medium', impact: 'medium', description: 'Critical machinery breakdown during production.' },
      { name: 'Raw Material Price Spike', category: 'market', probability: 'high', impact: 'medium', description: 'Commodity price volatility squeezing margins.' },
      { name: 'Environmental Compliance', category: 'legal', probability: 'low', impact: 'high', description: 'EPA/environmental regulation non-compliance fines.' },
      { name: 'Labor Shortage', category: 'operational', probability: 'medium', impact: 'medium', description: 'Skilled labor unavailability disrupting output.' },
    ],
  },
  {
    id: 'bi-4', name: 'E-Commerce & Retail', industry: 'ecommerce',
    description: 'Tailored for online retailers. Covers payment fraud, logistics, returns, and seasonal demand risks.',
    risk_categories: ['operational', 'financial', 'market', 'technology'],
    default_risks: [
      { name: 'Payment Fraud', category: 'technology', probability: 'high', impact: 'medium', description: 'Chargeback fraud and unauthorized transactions.' },
      { name: 'Logistics Failure', category: 'operational', probability: 'medium', impact: 'high', description: 'Last-mile delivery failures affecting customer experience.' },
      { name: 'Inventory Mismanagement', category: 'operational', probability: 'medium', impact: 'medium', description: 'Stockouts or overstock impacting cash flow.' },
      { name: 'Platform Dependency', category: 'market', probability: 'medium', impact: 'high', description: 'Over-reliance on Amazon/Shopify policy changes.' },
      { name: 'Seasonal Demand Risk', category: 'market', probability: 'high', impact: 'medium', description: 'Revenue concentration in peak seasons creating volatility.' },
    ],
  },
  {
    id: 'bi-5', name: 'Healthcare Organization', industry: 'healthcare',
    description: 'Risk framework for hospitals, clinics, and health-tech companies. Covers patient safety, data privacy, and regulatory compliance.',
    risk_categories: ['operational', 'legal', 'financial', 'technology'],
    default_risks: [
      { name: 'Patient Data Breach (HIPAA)', category: 'technology', probability: 'medium', impact: 'high', description: 'PHI exposure triggering HIPAA fines and reputational damage.' },
      { name: 'Malpractice Liability', category: 'legal', probability: 'low', impact: 'high', description: 'Medical negligence claims and litigation costs.' },
      { name: 'Regulatory Non-Compliance', category: 'legal', probability: 'medium', impact: 'high', description: 'FDA, CLIA, or state health board violations.' },
      { name: 'Supply Shortage (Pharmaceuticals)', category: 'operational', probability: 'medium', impact: 'high', description: 'Drug/device supply disruption affecting patient care.' },
      { name: 'Billing & Revenue Cycle Risk', category: 'financial', probability: 'medium', impact: 'medium', description: 'Claims denials and underpayment by insurers.' },
    ],
  },
  {
    id: 'bi-6', name: 'Logistics & Supply Chain', industry: 'logistics',
    description: 'Risk template for freight, 3PL, and supply chain businesses. Covers route risk, fuel, customs, and tech dependency.',
    risk_categories: ['operational', 'market', 'financial', 'legal'],
    default_risks: [
      { name: 'Route Disruption', category: 'operational', probability: 'high', impact: 'high', description: 'Geopolitical events or disasters blocking shipping lanes.' },
      { name: 'Fuel Cost Volatility', category: 'market', probability: 'high', impact: 'medium', description: 'Crude oil price spikes compressing operating margins.' },
      { name: 'Customs & Trade Risk', category: 'legal', probability: 'medium', impact: 'high', description: 'Tariff changes and customs delays disrupting timelines.' },
      { name: 'Fleet Maintenance Failure', category: 'operational', probability: 'medium', impact: 'medium', description: 'Vehicle breakdown causing delivery SLA breaches.' },
      { name: 'TMS/WMS System Failure', category: 'technology', probability: 'low', impact: 'high', description: 'Core logistics software downtime halting operations.' },
    ],
  },
]

export default function Templates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showUseModal, setShowUseModal] = useState(false)
  const [useForm, setUseForm] = useState({ title: '', location: '' })
  const [useLoading, setUseLoading] = useState(false)
  const [filterIndustry, setFilterIndustry] = useState('all')

  useEffect(() => {
    templatesAPI.list()
      .then(res => {
        const apiTemplates = res.data || []
        // Merge with built-ins, deduplicate by industry
        const industriesCovered = new Set(apiTemplates.map(t => t.industry))
        const extras = BUILT_IN_TEMPLATES.filter(t => !industriesCovered.has(t.industry))
        setTemplates([...apiTemplates, ...extras])
      })
      .catch(() => setTemplates(BUILT_IN_TEMPLATES))
      .finally(() => setLoading(false))
  }, [])

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template)
    setUseForm({ title: `${template.name} Risk Assessment`, location: '' })
    setShowUseModal(true)
  }

  const handleCreate = async () => {
    if (!useForm.title || !useForm.location) return
    setUseLoading(true)
    try {
      const categories = typeof selectedTemplate.risk_categories === 'string'
        ? JSON.parse(selectedTemplate.risk_categories)
        : selectedTemplate.risk_categories
      const res = await assessmentsAPI.create({
        title: useForm.title,
        description: `Created from template: ${selectedTemplate.name}`,
        industry: selectedTemplate.industry,
        organization_size: 'medium',
        annual_revenue: 0,
        location: useForm.location,
        risk_categories: categories,
      })
      navigate(`/assessments/${res.data.id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setUseLoading(false)
    }
  }

  const industries = ['all', ...new Set(templates.map(t => t.industry))]
  const filtered = filterIndustry === 'all' ? templates : templates.filter(t => t.industry === filterIndustry)

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Industry Templates</h2>
          <p className="text-slate-500 text-sm">Pre-built risk frameworks — start an assessment in seconds</p>
        </div>
        <select className="input-field w-auto" value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)}>
          {industries.map(i => <option key={i} value={i}>{i === 'all' ? 'All Industries' : capitalize(i)}</option>)}
        </select>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl p-6 text-white">
        <h3 className="text-lg font-bold">Start faster with expert-built frameworks</h3>
        <p className="text-primary-100 text-sm mt-1">Each template includes pre-identified risks, scoring weights, and mitigation strategies built for your industry.</p>
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          {[`${templates.length} Templates`, '6+ Industries', 'AI-Enhanced', 'Fully Editable'].map(f => (
            <span key={f} className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> {f}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(template => {
            const Icon = INDUSTRY_ICONS[template.industry] || BookOpen
            const colorClass = INDUSTRY_COLORS[template.industry] || 'bg-slate-500'
            const risks = typeof template.default_risks === 'string'
              ? JSON.parse(template.default_risks)
              : (template.default_risks || [])
            const cats = typeof template.risk_categories === 'string'
              ? JSON.parse(template.risk_categories)
              : (template.risk_categories || [])

            return (
              <Card key={template.id} className="hover:shadow-lg transition-all duration-200 flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 ${colorClass} rounded-xl flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm leading-snug">{template.name}</CardTitle>
                      <span className="text-xs text-slate-400 capitalize">{template.industry}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{template.description}</p>

                  {/* Categories */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Risk Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cats.slice(0, 5).map(c => (
                        <span key={c} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full capitalize">{c}</span>
                      ))}
                    </div>
                  </div>

                  {/* Sample risks */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">Included Risks ({risks.length})</p>
                    <ul className="space-y-1">
                      {risks.slice(0, 3).map((r, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.impact === 'high' ? 'bg-red-500' : r.impact === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          {r.name}
                        </li>
                      ))}
                      {risks.length > 3 && <li className="text-xs text-slate-400">+{risks.length - 3} more risks...</li>}
                    </ul>
                  </div>

                  <Button className="w-full mt-auto" onClick={() => handleUseTemplate(template)}>
                    Use Template <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Use Template Modal */}
      <Modal isOpen={showUseModal} onClose={() => setShowUseModal(false)} title={`Use: ${selectedTemplate?.name}`} size="md">
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm text-slate-600 dark:text-slate-400">
              This will create a new assessment pre-loaded with{' '}
              <strong>{(typeof selectedTemplate.default_risks === 'string' ? JSON.parse(selectedTemplate.default_risks) : selectedTemplate.default_risks || []).length}</strong>{' '}
              risks from the <strong>{selectedTemplate.name}</strong> template.
            </div>
            <Input
              label="Assessment Title *"
              value={useForm.title}
              onChange={e => setUseForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Q3 2024 Risk Review"
            />
            <Input
              label="Location *"
              value={useForm.location}
              onChange={e => setUseForm(p => ({ ...p, location: e.target.value }))}
              placeholder="e.g., New York, USA"
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowUseModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCreate} loading={useLoading} disabled={!useForm.title || !useForm.location}>
                Create Assessment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
