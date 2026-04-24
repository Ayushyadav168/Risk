import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Zap, Building2, Shield, Star, ArrowRight, AlertCircle, Crown, Loader } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { billingAPI } from '../lib/api'
import useAuthStore from '../store/authStore'

const PLAN_ICONS = { free: Shield, pro: Zap, enterprise: Crown }
const PLAN_COLORS = {
  free: 'border-slate-200 dark:border-slate-700',
  pro: 'border-primary-500 ring-2 ring-primary-500/20',
  enterprise: 'border-amber-400 ring-2 ring-amber-400/20',
}
const PLAN_BADGE = {
  free: null,
  pro: { label: 'Most Popular', color: 'bg-primary-500 text-white' },
  enterprise: { label: 'Best Value', color: 'bg-amber-500 text-white' },
}

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Pricing() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [billing, setBilling] = useState('monthly')
  const [plans, setPlans] = useState({})
  const [currentPlan, setCurrentPlan] = useState('free')
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const plansRes = await billingAPI.getPlans()
        setPlans(plansRes.data)
        if (isAuthenticated()) {
          const subRes = await billingAPI.getSubscription()
          setCurrentPlan(subRes.data.plan)
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const handleUpgrade = async (planId) => {
    if (!isAuthenticated()) { navigate('/register'); return }
    if (planId === 'free' || planId === currentPlan) return
    if (planId === 'enterprise') {
      window.open('mailto:sales@riskiq.com?subject=Enterprise Plan Inquiry', '_blank')
      return
    }

    setCheckoutLoading(planId)
    setErrorMsg('')
    try {
      // Create Razorpay order
      const orderRes = await billingAPI.createOrder({ plan: planId, billing_cycle: billing })
      const orderData = orderRes.data

      // Demo mode — no real Razorpay key
      if (orderData.demo_mode) {
        const verifyRes = await billingAPI.verifyPayment({
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_demo_${Date.now()}`,
          razorpay_signature: 'demo_sig',
          plan: planId,
          billing_cycle: billing,
        })
        setCurrentPlan(planId)
        setSuccessMsg(`🎉 ${verifyRes.data.message} (Demo Mode — add real Razorpay keys to go live)`)
        return
      }

      // Real Razorpay checkout
      const loaded = await loadRazorpay()
      if (!loaded) { setErrorMsg('Razorpay failed to load. Check your connection.'); return }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'RiskIQ Platform',
        description: `${orderData.plan_name} Plan — ${billing}`,
        order_id: orderData.order_id,
        image: '/logo.png',
        prefill: { name: user?.full_name || '', email: user?.email || '' },
        theme: { color: '#6366F1' },
        handler: async (response) => {
          try {
            const verifyRes = await billingAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
              billing_cycle: billing,
            })
            setCurrentPlan(planId)
            setSuccessMsg(`🎉 ${verifyRes.data.message}`)
          } catch (e) {
            setErrorMsg('Payment verification failed. Contact support.')
          }
        },
        modal: { ondismiss: () => setCheckoutLoading('') },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (e) {
      setErrorMsg(e.response?.data?.detail || 'Failed to initiate payment')
    } finally {
      setCheckoutLoading('')
    }
  }

  const formatPrice = (paise) => {
    if (paise === 0) return '₹0'
    return `₹${(paise / 100).toLocaleString('en-IN')}`
  }

  const planOrder = ['free', 'pro', 'enterprise']

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <Star className="w-4 h-4" /> Simple, Transparent Pricing
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100">
          Choose your plan
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg max-w-xl mx-auto">
          Start free. Upgrade when you need AI insights, advanced reports, and team collaboration.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>Monthly</span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-12 h-6 rounded-full transition-colors ${billing === 'yearly' ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === 'yearly' ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
          <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
            Yearly <span className="text-emerald-500 font-bold ml-1">Save 17%</span>
          </span>
        </div>
      </div>

      {/* Success / Error banners */}
      {successMsg && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400">
            <Check className="w-5 h-5 flex-shrink-0" /> {successMsg}
            <Button size="sm" className="ml-auto" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </div>
        </div>
      )}
      {errorMsg && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {errorMsg}
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex justify-center py-20"><Loader className="w-8 h-8 animate-spin text-primary-500" /></div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {planOrder.map((planId) => {
              const plan = plans[planId]
              if (!plan) return null
              const Icon = PLAN_ICONS[planId]
              const badge = PLAN_BADGE[planId]
              const price = billing === 'yearly' ? plan.price_yearly : plan.price_monthly
              const isCurrent = currentPlan === planId
              const isLoading = checkoutLoading === planId

              return (
                <Card key={planId} className={`relative flex flex-col ${PLAN_COLORS[planId]} transition-all hover:shadow-lg`}>
                  {badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold ${badge.color}`}>
                      {badge.label}
                    </div>
                  )}
                  <CardContent className="flex flex-col flex-1 pt-8 pb-6">
                    {/* Icon + Plan name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2.5 rounded-xl ${planId === 'pro' ? 'bg-primary-100 dark:bg-primary-900/30' : planId === 'enterprise' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                        <Icon className={`w-5 h-5 ${planId === 'pro' ? 'text-primary-600' : planId === 'enterprise' ? 'text-amber-600' : 'text-slate-500'}`} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                          {formatPrice(price)}
                        </span>
                        {price > 0 && <span className="text-slate-500 dark:text-slate-400 mb-1">/{billing === 'yearly' ? 'yr' : 'mo'}</span>}
                      </div>
                      {billing === 'yearly' && price > 0 && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          {formatPrice(Math.round(price / 12))}/month — billed annually
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 mb-8 flex-1">
                      {(plan.features || []).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {isCurrent ? (
                      <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium">
                        <Check className="w-4 h-4" /> Current Plan
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        variant={planId === 'pro' ? 'primary' : planId === 'enterprise' ? 'ghost' : 'outline'}
                        onClick={() => handleUpgrade(planId)}
                        loading={isLoading}
                        disabled={!!checkoutLoading}
                      >
                        {planId === 'free' ? 'Get Started Free' : planId === 'enterprise' ? 'Contact Sales' : 'Upgrade Now'}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Razorpay demo note */}
        <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400 text-center">
          <strong>Demo Mode:</strong> Razorpay is integrated but runs in sandbox. Add your <code>RAZORPAY_KEY_ID</code> & <code>RAZORPAY_KEY_SECRET</code> in <code>backend/.env</code> to go live.
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-8">Frequently Asked Questions</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { q: 'Can I upgrade or downgrade anytime?', a: 'Yes. Upgrades are instant. Downgrades take effect at the end of your billing cycle.' },
              { q: 'Is there a free trial for Pro?', a: 'The Free plan is free forever with core features. Pro adds AI insights and unlimited assessments.' },
              { q: 'What payment methods are supported?', a: 'All major cards, UPI, Net Banking, and Wallets via Razorpay.' },
              { q: 'Do you offer refunds?', a: 'Yes — full refund within 7 days of purchase, no questions asked.' },
              { q: 'Is my data secure?', a: 'All data is encrypted at rest and in transit. We are SOC 2 compliant.' },
              { q: 'Can I export my data?', a: 'Yes — Pro and Enterprise users can export full risk registers to PDF and Excel.' },
            ].map(({ q, a }) => (
              <div key={q} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">{q}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
