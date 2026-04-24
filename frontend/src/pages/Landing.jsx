import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Brain, BarChart3, FileText, TrendingUp, Lock, CheckCircle, ArrowRight, Star, ChevronRight } from 'lucide-react'

const features = [
  { icon: Brain, title: 'AI-Powered Analysis', desc: 'GPT-4 analyzes your business context to identify hidden risks and provide actionable recommendations in seconds.' },
  { icon: BarChart3, title: 'Interactive Heatmaps', desc: '5×5 risk heatmaps with drill-down capabilities. Visualize your entire risk landscape at a glance.' },
  { icon: TrendingUp, title: 'Financial Risk Tools', desc: 'DCF calculators, cash flow risk analysis, and loan default probability models built for risk professionals.' },
  { icon: FileText, title: 'One-Click Reports', desc: 'Generate PDF risk reports ready for board presentations, audits, and regulatory submissions instantly.' },
  { icon: Lock, title: 'Enterprise Security', desc: 'JWT authentication, encrypted data storage, and SOC 2 compliant infrastructure keep your data safe.' },
  { icon: Shield, title: 'Risk Register', desc: 'Centralized registry with filtering, severity scoring, ownership tracking, and mitigation management.' },
]

const steps = [
  { num: '01', title: 'Define Your Context', desc: 'Input your industry, organization size, revenue, and select risk categories relevant to your business.' },
  { num: '02', title: 'AI Risk Discovery', desc: 'Our AI analyzes your context against thousands of risk patterns to surface your most critical exposures.' },
  { num: '03', title: 'Manage & Mitigate', desc: 'Track risks, assign owners, implement mitigations, and generate board-ready reports automatically.' },
]

const pricing = [
  { name: 'Free', price: '$0', period: '/month', features: ['3 Assessments', '20 Risks', 'Basic Heatmap', 'PDF Reports', 'Email Support'], cta: 'Start Free', highlight: false },
  { name: 'Pro', price: '$49', period: '/month', features: ['Unlimited Assessments', 'Unlimited Risks', 'AI Analysis', 'Financial Tools', 'Priority Support', 'Custom Templates'], cta: 'Start Pro Trial', highlight: true },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Everything in Pro', 'SSO / SAML', 'API Access', 'Custom Integrations', 'Dedicated CSM', 'SLA Guarantee'], cta: 'Contact Sales', highlight: false },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">RiskIQ</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 font-medium transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 text-sm text-primary-400 mb-8">
            <Star className="w-4 h-4" />
            <span>AI-Powered Risk Intelligence Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
            Know Your Risks
            <br />
            <span className="bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">
              Before They Know You
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Enterprise risk management powered by AI. Identify, assess, and mitigate risks 10x faster with intelligent analysis, interactive heatmaps, and automated reporting.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-200 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-105"
            >
              Start Free Assessment
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-200 border border-slate-700"
            >
              View Demo
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500">
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> No credit card required</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Setup in 2 minutes</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> GDPR compliant</span>
          </div>
        </div>

        {/* Hero Dashboard Preview */}
        <div className="max-w-5xl mx-auto mt-20 relative">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-2 text-xs text-slate-500">RiskIQ Dashboard</span>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Total Risks', value: '24', color: 'text-blue-400' },
                { label: 'High Alerts', value: '3', color: 'text-red-400' },
                { label: 'Open Actions', value: '12', color: 'text-amber-400' },
                { label: 'Risk Score', value: '6.8', color: 'text-primary-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-900 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 bg-slate-900 rounded-xl p-4 h-32 flex items-center justify-center">
                <div className="grid grid-cols-5 gap-1 w-full">
                  {['#10B981','#F59E0B','#F59E0B','#EF4444','#EF4444',
                    '#10B981','#F59E0B','#EF4444','#EF4444','#DC2626',
                    '#F59E0B','#EF4444','#EF4444','#DC2626','#DC2626',
                    '#F59E0B','#EF4444','#DC2626','#DC2626','#DC2626',
                    '#EF4444','#DC2626','#DC2626','#DC2626','#DC2626',
                  ].map((color, i) => (
                    <div key={i} className="rounded aspect-square" style={{ backgroundColor: color, opacity: 0.7 }}></div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-2">Risk by Category</p>
                {['Financial', 'Operational', 'Market', 'Legal'].map((cat, i) => (
                  <div key={cat} className="flex items-center gap-2 mb-1.5">
                    <div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${[70, 55, 45, 30][i]}%` }}></div>
                    <span className="text-xs text-slate-500">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need for <span className="text-primary-400">Enterprise Risk Management</span></h2>
            <p className="text-slate-400 max-w-2xl mx-auto">A complete toolkit for identifying, assessing, and mitigating business risks with the power of artificial intelligence.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group bg-slate-800 hover:bg-slate-800/80 border border-slate-700 hover:border-primary-500/30 rounded-xl p-6 transition-all duration-300 hover:-translate-y-1">
                <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Risk Management in <span className="text-primary-400">3 Simple Steps</span></h2>
            <p className="text-slate-400">From setup to actionable insights in minutes, not months.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="relative text-center">
                <div className="text-7xl font-black text-slate-800 mb-4 leading-none">{num}</div>
                <h3 className="text-xl font-bold mb-3 text-primary-400">{title}</h3>
                <p className="text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent <span className="text-primary-400">Pricing</span></h2>
            <p className="text-slate-400">Start free. Scale when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map(({ name, price, period, features: feats, cta, highlight }) => (
              <div key={name} className={`relative rounded-2xl p-8 border ${highlight ? 'bg-primary-500/10 border-primary-500 shadow-xl shadow-primary-500/10' : 'bg-slate-800 border-slate-700'}`}>
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-lg font-bold mb-2">{name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black">{price}</span>
                  <span className="text-slate-400">{period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {feats.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    highlight 
                      ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25' 
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Take Control of Your Risk?</h2>
          <p className="text-slate-400 text-lg mb-10">Join hundreds of organizations using RiskIQ to protect their business with AI-powered risk intelligence.</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition-all duration-200 shadow-lg shadow-primary-500/25 hover:scale-105"
          >
            Start Your Free Assessment
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">RiskIQ</span>
          </div>
          <p className="text-slate-500 text-sm">© 2024 RiskIQ. All rights reserved. AI-Powered Risk Management Platform.</p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
