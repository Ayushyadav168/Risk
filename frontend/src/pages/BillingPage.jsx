import React, { useState, useEffect } from 'react'
import { CreditCard, Zap, Shield, Crown, Check, ArrowRight, AlertCircle, Star, Loader } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { billingAPI } from '../lib/api'
import { formatDate } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

const PLAN_META = {
  free:       { icon: Shield,  color: 'text-slate-500',   ring: 'border-slate-200 dark:border-slate-700',  badge: null },
  pro:        { icon: Zap,     color: 'text-primary-600', ring: 'border-primary-500 ring-2 ring-primary-500/20', badge: 'Most Popular' },
  enterprise: { icon: Crown,   color: 'text-amber-600',   ring: 'border-amber-400 ring-2 ring-amber-400/20', badge: 'Best Value' },
}

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export default function BillingPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState({})
  const [subscription, setSubscription] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [billing, setBilling] = useState('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [plansRes, subRes, invRes] = await Promise.all([
        billingAPI.getPlans(),
        billingAPI.getSubscription(),
        billingAPI.getInvoices(),
      ])
      setPlans(plansRes.data || {})
      setSubscription(subRes.data || {})
      setInvoices(invRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleUpgrade = async (planId) => {
    if (planId === 'enterprise') {
      window.open('mailto:sales@riskiq.com?subject=Enterprise Plan Inquiry', '_blank')
      return
    }
    if (planId === subscription?.plan) return
    setCheckoutLoading(planId)
    setErrorMsg('')
    try {
      const orderRes = await billingAPI.createOrder({ plan: planId, billing_cycle: billing })
      const orderData = orderRes.data
      if (orderData.demo_mode) {
        const verifyRes = await billingAPI.verifyPayment({
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_demo_${Date.now()}`,
          razorpay_signature: 'demo_sig',
          plan: planId, billing_cycle: billing,
        })
        setSubscription(prev => ({ ...prev, plan: planId }))
        setSuccessMsg(`🎉 ${verifyRes.data.message} (Demo Mode)`)
        load()
        return
      }
      const loaded = await loadRazorpay()
      if (!loaded) { setErrorMsg('Razorpay failed to load.'); return }
      const rzp = new window.Razorpay({
        key: orderData.key_id, amount: orderData.amount, currency: orderData.currency,
        name: 'RiskIQ Platform', description: `${orderData.plan_name} — ${billing}`,
        order_id: orderData.order_id, theme: { color: '#6366F1' },
        handler: async (response) => {
          try {
            const verifyRes = await billingAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId, billing_cycle: billing,
            })
            setSuccessMsg(`🎉 ${verifyRes.data.message}`)
            load()
          } catch { setErrorMsg('Payment verification failed.') }
        },
        modal: { ondismiss: () => setCheckoutLoading('') },
      })
      rzp.open()
    } catch (e) { setErrorMsg(e.response?.data?.detail || 'Payment initiation failed') }
    finally { setCheckoutLoading('') }
  }

  const fmt = (paise) => paise === 0 ? '₹0' : `₹${(paise / 100).toLocaleString('en-IN')}`

  if (loading) return <div className="flex items-center justify-center h-64"><Loader className="w-8 h-8 animate-spin text-primary-500" /></div>

  const currentPlan = subscription?.plan || 'free'

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Billing & Plans</h2>
        <p className="text-slate-500 text-sm">Manage your subscription and billing history</p>
      </div>

      {/* Current Plan Banner */}
      {subscription && (
        <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-primary-100 text-sm">Current Plan</p>
              <p className="text-2xl font-bold capitalize">{currentPlan}</p>
              {subscription.expires_at && <p className="text-primary-200 text-xs mt-1">Renews {formatDate(subscription.expires_at)}</p>}
            </div>
            <div className="text-right">
              <p className="text-primary-100 text-sm">Usage</p>
              <p className="font-semibold">{subscription.assessments_used || 0} / {subscription.assessment_limit === -1 ? '∞' : subscription.assessment_limit} assessments</p>
              <p className="font-semibold">{subscription.team_members || 0} / {subscription.team_limit === -1 ? '∞' : subscription.team_limit} team members</p>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400">
          <Check className="w-5 h-5 flex-shrink-0" />{successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />{errorMsg}
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>Monthly</span>
        <button onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative w-12 h-6 rounded-full transition-colors ${billing === 'yearly' ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${billing === 'yearly' ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
        <span className={`text-sm font-medium ${billing === 'yearly' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
          Yearly <span className="text-emerald-500 font-bold">Save 17%</span>
        </span>
      </div>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {['free', 'pro', 'enterprise'].map(planId => {
          const plan = plans[planId]
          if (!plan) return null
          const meta = PLAN_META[planId]
          const Icon = meta.icon
          const price = billing === 'yearly' ? plan.price_yearly : plan.price_monthly
          const isCurrent = currentPlan === planId
          const isLoading = checkoutLoading === planId

          return (
            <Card key={planId} className={`relative flex flex-col ${meta.ring} transition-all hover:shadow-lg`}>
              {meta.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold bg-primary-500 text-white">{meta.badge}</div>
              )}
              <CardContent className="flex flex-col flex-1 pt-8 pb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2.5 rounded-xl ${planId === 'pro' ? 'bg-primary-100 dark:bg-primary-900/30' : planId === 'enterprise' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{plan.name}</h3>
                </div>
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{fmt(price)}</span>
                    {price > 0 && <span className="text-slate-500 mb-1">/{billing === 'yearly' ? 'yr' : 'mo'}</span>}
                  </div>
                  {billing === 'yearly' && price > 0 && (
                    <p className="text-xs text-emerald-600 mt-1">{fmt(Math.round(price / 12))}/month billed annually</p>
                  )}
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {(plan.features || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium">
                    <Check className="w-4 h-4" />Current Plan
                  </div>
                ) : (
                  <Button className="w-full"
                    variant={planId === 'pro' ? 'primary' : 'outline'}
                    onClick={() => handleUpgrade(planId)} loading={isLoading}>
                    {planId === 'free' ? 'Downgrade' : planId === 'enterprise' ? 'Contact Sales' : 'Upgrade Now'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Invoice History */}
      {invoices.length > 0 && (
        <Card>
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary-500" />Billing History
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {invoices.map((inv, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{inv.plan} Plan</p>
                  <p className="text-xs text-slate-400">{inv.billing_cycle} · {inv.payment_id}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">₹{inv.amount?.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-slate-400">{inv.paid_at ? formatDate(inv.paid_at) : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400 text-center">
        <strong>Demo Mode:</strong> Add your <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">RAZORPAY_KEY_ID</code> &amp; <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">RAZORPAY_KEY_SECRET</code> in <code>backend/.env</code> to go live.
      </div>
    </div>
  )
}
