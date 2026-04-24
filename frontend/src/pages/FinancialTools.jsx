import React, { useState } from 'react'
import {
  TrendingUp, AlertCircle, Calculator, BarChart3,
  CheckCircle2, ChevronDown, Globe
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import { financialAPI } from '../lib/api'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts'

const TABS = [
  { id: 'dcf',      label: 'DCF Analysis',   icon: TrendingUp,  desc: 'Discounted Cash Flow valuation & NPV' },
  { id: 'cashflow', label: 'Cash Flow Risk',  icon: BarChart3,   desc: 'Detect cash flow vulnerabilities' },
  { id: 'loan',     label: 'Loan Default',    icon: AlertCircle, desc: 'Estimate default probability' },
]

// ── Currency picker (local override for financial tools) ──────────────────────
function CurrencyPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-slate-400" />
      <span className="text-sm text-slate-500 dark:text-slate-400">Currency:</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none pl-3 pr-8 py-1.5 text-sm font-semibold border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code} — {c.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(amount, currencyCode, compact = false) {
  if (amount == null || isNaN(amount)) return '—'
  const cur = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0]
  if (compact) {
    let v = amount, s = ''
    if (Math.abs(v) >= 1e9)      { v /= 1e9; s = 'B' }
    else if (Math.abs(v) >= 1e6) { v /= 1e6; s = 'M' }
    else if (Math.abs(v) >= 1e3) { v /= 1e3; s = 'K' }
    return `${cur.symbol}${v.toFixed(1)}${s}`
  }
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${cur.symbol}${amount.toLocaleString()}`
  }
}

function sym(code) {
  return CURRENCIES.find(c => c.code === code)?.symbol || code
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function ResultCard({ label, value, sub, color = 'text-primary-500', highlight = false }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight
      ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20'
      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function RiskFlag({ flags }) {
  if (!flags || flags.length === 0) return (
    <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm">
      <CheckCircle2 className="w-4 h-4" /> No significant risk flags detected.
    </div>
  )
  return (
    <div className="space-y-2">
      {flags.map((f, i) => (
        <div key={i} className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
          f.severity === 'high'   ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' :
          f.severity === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
          'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{f.message || f}</span>
        </div>
      ))}
    </div>
  )
}

// ── DCF Tool ──────────────────────────────────────────────────────────────────
function DCFTool() {
  const { currency: globalCurrency } = useCurrency()
  const [currency, setCurrency] = useState(globalCurrency)
  const [form, setForm] = useState({
    cash_flows: '100000,120000,140000,160000,180000',
    discount_rate: 10,
    terminal_growth: 2,
    initial_investment: 500000,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRun = async () => {
    setError('')
    const flows = form.cash_flows.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
    if (flows.length === 0) { setError('Enter at least one cash flow value'); return }
    setLoading(true)
    try {
      const res = await financialAPI.dcf({
        cash_flows: flows,
        discount_rate: Number(form.discount_rate),
        terminal_growth_rate: Number(form.terminal_growth),
        initial_investment: Number(form.initial_investment),
      })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Calculation failed')
    } finally { setLoading(false) }
  }

  const chartData = result?.yearly_data || []
  const S = sym(currency)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary-500" />DCF Calculator
            </CardTitle>
            <CurrencyPicker value={currency} onChange={setCurrency} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Projected Cash Flows (comma-separated, in {currency})
            </label>
            <input
              className="input-field"
              value={form.cash_flows}
              onChange={e => setForm(p => ({ ...p, cash_flows: e.target.value }))}
              placeholder={`e.g. 100000, 120000, 150000, 180000, 200000`}
            />
            <p className="text-xs text-slate-400 mt-1">Annual cash flow projections separated by commas. Values are in {currency} ({S}).</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Discount Rate / WACC (%)</label>
              <input type="number" className="input-field" value={form.discount_rate}
                onChange={e => setForm(p => ({ ...p, discount_rate: e.target.value }))} min="0" max="100" step="0.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Terminal Growth Rate (%)</label>
              <input type="number" className="input-field" value={form.terminal_growth}
                onChange={e => setForm(p => ({ ...p, terminal_growth: e.target.value }))} min="0" max="20" step="0.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Investment ({S})</label>
              <input type="number" className="input-field" value={form.initial_investment}
                onChange={e => setForm(p => ({ ...p, initial_investment: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
          <Button onClick={handleRun} loading={loading} className="w-full sm:w-auto">
            <Calculator className="w-4 h-4" /> Run DCF Analysis
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ResultCard
              label={`NPV (${currency})`}
              value={fmt(result.npv, currency)}
              highlight
              color={result.npv >= 0 ? 'text-emerald-600' : 'text-red-600'}
              sub={result.npv >= 0 ? 'Positive — value creating' : 'Negative — value destroying'}
            />
            <ResultCard
              label="IRR"
              value={result.irr != null ? `${result.irr.toFixed(1)}%` : 'N/A'}
              color={result.irr > Number(form.discount_rate) ? 'text-emerald-600' : 'text-red-500'}
              sub={`vs ${form.discount_rate}% WACC`}
            />
            <ResultCard
              label="Payback Period"
              value={result.payback_period != null ? `${result.payback_period.toFixed(1)} yrs` : '> Project'}
              color="text-slate-700 dark:text-slate-200"
            />
            <ResultCard
              label={`Terminal Value (${currency})`}
              value={fmt(result.terminal_value, currency)}
              color="text-blue-500"
              sub="Gordon Growth Model"
            />
          </div>

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow vs Discounted Cash Flow ({currency})</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => fmt(v, currency, true)} />
                    <Tooltip formatter={v => fmt(v, currency)} />
                    <Bar dataKey="cash_flow" name="Cash Flow" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="discounted" name="Discounted CF" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Risk Assessment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <RiskFlag flags={result.risk_flags || []} />
              {result.recommendation && (
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl text-sm text-primary-800 dark:text-primary-300">
                  <strong>Recommendation:</strong> {result.recommendation}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Cash Flow Risk Tool ───────────────────────────────────────────────────────
function CashFlowTool() {
  const { currency: globalCurrency } = useCurrency()
  const [currency, setCurrency] = useState(globalCurrency)
  const [form, setForm] = useState({
    monthly_revenues: '80000,85000,90000,70000,65000,60000,75000,80000,90000,95000,100000,110000',
    monthly_expenses: '70000,72000,75000,80000,78000,76000,72000,70000,68000,72000,75000,80000',
    current_cash: 150000,
    credit_line: 50000,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    try {
      const revenues = form.monthly_revenues.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
      const expenses = form.monthly_expenses.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
      const res = await financialAPI.cashflow({
        monthly_revenues: revenues,
        monthly_expenses: expenses,
        current_cash_balance: Number(form.current_cash),
        credit_line: Number(form.credit_line),
      })
      setResult(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const chartData = result?.monthly_data?.map((d, i) => ({ month: months[i] || `M${i+1}`, ...d })) || []
  const S = sym(currency)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />Cash Flow Inputs
            </CardTitle>
            <CurrencyPicker value={currency} onChange={setCurrency} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Monthly Revenues — Jan to Dec (in {currency}, comma-separated)
            </label>
            <input className="input-field" value={form.monthly_revenues}
              onChange={e => setForm(p => ({ ...p, monthly_revenues: e.target.value }))}
              placeholder="80000, 85000, 90000, 70000 ..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Monthly Expenses — Jan to Dec (in {currency}, comma-separated)
            </label>
            <input className="input-field" value={form.monthly_expenses}
              onChange={e => setForm(p => ({ ...p, monthly_expenses: e.target.value }))}
              placeholder="70000, 72000, 75000, 80000 ..." />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current Cash Balance ({S})
              </label>
              <input type="number" className="input-field" value={form.current_cash}
                onChange={e => setForm(p => ({ ...p, current_cash: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Available Credit Line ({S})
              </label>
              <input type="number" className="input-field" value={form.credit_line}
                onChange={e => setForm(p => ({ ...p, credit_line: e.target.value }))} />
            </div>
          </div>
          <Button onClick={handleRun} loading={loading}>
            <BarChart3 className="w-4 h-4" /> Analyze Cash Flow
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ResultCard
              label={`Avg Monthly Net (${currency})`}
              value={fmt(result.avg_monthly_net, currency)}
              color={result.avg_monthly_net >= 0 ? 'text-emerald-600' : 'text-red-600'}
              highlight
            />
            <ResultCard
              label={`Lowest Month (${currency})`}
              value={fmt(result.lowest_month, currency)}
              color="text-red-500"
              sub="Cash low point"
            />
            <ResultCard
              label="Burn Rate"
              value={result.burn_rate != null ? `${result.burn_rate.toFixed(1)} mo` : 'N/A'}
              color="text-amber-500"
              sub="Months of runway"
            />
            <ResultCard
              label="Risk Score"
              value={`${result.risk_score?.toFixed(0) || 0}/100`}
              color={result.risk_score >= 70 ? 'text-red-600' : result.risk_score >= 40 ? 'text-amber-500' : 'text-emerald-600'}
              sub="Cash flow risk"
            />
          </div>

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Cash Flow — Revenue vs Expenses ({currency})</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v, currency, true)} />
                    <Tooltip formatter={v => fmt(v, currency)} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Bar dataKey="revenue"  name="Revenue"        fill="#10B981" radius={[4,4,0,0]} />
                    <Bar dataKey="expenses" name="Expenses"       fill="#EF4444" radius={[4,4,0,0]} />
                    <Bar dataKey="net"      name="Net Cash Flow"  fill="#0ea5e9" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Risk Flags</CardTitle></CardHeader>
            <CardContent><RiskFlag flags={result.risk_flags || []} /></CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Loan Default Tool ─────────────────────────────────────────────────────────
function LoanDefaultTool() {
  const { currency: globalCurrency } = useCurrency()
  const [currency, setCurrency] = useState(globalCurrency)
  const [form, setForm] = useState({
    credit_score: 680,
    loan_to_value: 75,
    debt_service_coverage: 1.2,
    loan_amount: 500000,
    loan_term: 5,
    industry: 'retail',
    collateral_type: 'property',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    try {
      const res = await financialAPI.loanDefault({
        ...form,
        credit_score: Number(form.credit_score),
        loan_to_value: Number(form.loan_to_value),
        debt_service_coverage: Number(form.debt_service_coverage),
        loan_amount: Number(form.loan_amount),
        loan_term: Number(form.loan_term),
      })
      setResult(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const probColor = (p) => p >= 30 ? 'text-red-600' : p >= 15 ? 'text-amber-500' : 'text-emerald-600'
  const S = sym(currency)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary-500" />Borrower / Loan Inputs
            </CardTitle>
            <CurrencyPicker value={currency} onChange={setCurrency} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Credit Score (300–850)</label>
              <input type="number" className="input-field" value={form.credit_score}
                onChange={e => setForm(p => ({ ...p, credit_score: e.target.value }))} min="300" max="850" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Loan-to-Value (%)</label>
              <input type="number" className="input-field" value={form.loan_to_value}
                onChange={e => setForm(p => ({ ...p, loan_to_value: e.target.value }))} min="0" max="200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">DSCR (Debt Service Coverage)</label>
              <input type="number" className="input-field" value={form.debt_service_coverage}
                onChange={e => setForm(p => ({ ...p, debt_service_coverage: e.target.value }))} step="0.1" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Loan Amount ({S})</label>
              <input type="number" className="input-field" value={form.loan_amount}
                onChange={e => setForm(p => ({ ...p, loan_amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Loan Term (years)</label>
              <input type="number" className="input-field" value={form.loan_term}
                onChange={e => setForm(p => ({ ...p, loan_term: e.target.value }))} min="1" max="30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Industry</label>
              <select className="input-field" value={form.industry}
                onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}>
                {['retail','manufacturing','technology','healthcare','real_estate','hospitality','agriculture','logistics','finance','banking','pharma','fmcg','energy','telecom'].map(i => (
                  <option key={i} value={i}>{i.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Currency note */}
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Loan amount is in <strong>{currency}</strong> ({S}). All monetary results will be displayed in {currency}.
          </p>

          <Button onClick={handleRun} loading={loading}>
            <Calculator className="w-4 h-4" /> Calculate Default Probability
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ResultCard
              label="Default Probability"
              value={`${result.default_probability?.toFixed(1)}%`}
              color={probColor(result.default_probability)}
              highlight
              sub={result.risk_band}
            />
            <ResultCard
              label="Risk Grade"
              value={result.risk_grade || '—'}
              color="text-slate-700 dark:text-slate-200"
              sub="Credit rating"
            />
            <ResultCard
              label={`Expected Loss (${currency})`}
              value={fmt(result.expected_loss, currency)}
              color="text-red-500"
              sub="On default"
            />
            <ResultCard
              label="Recommended Rate"
              value={result.recommended_rate ? `${result.recommended_rate.toFixed(2)}%` : 'N/A'}
              color="text-blue-500"
              sub="Risk-adjusted APR"
            />
          </div>

          <Card>
            <CardHeader><CardTitle>Default Probability Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {(result.factor_scores || []).map((f, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{f.factor}</span>
                      <span className={`font-medium ${f.score >= 70 ? 'text-red-500' : f.score >= 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {f.score?.toFixed(0)} / 100
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${f.score >= 70 ? 'bg-red-500' : f.score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${f.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <RiskFlag flags={result.risk_flags || []} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function FinancialTools() {
  const [activeTab, setActiveTab] = useState('dcf')
  const { currentCurrency, clientMode } = useCurrency()

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Financial Risk Tools</h2>
          <p className="text-slate-500 text-sm mt-1">
            DCF analysis, cash flow risk detection, and loan default estimation
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
          <span className="text-base">{currentCurrency.flag}</span>
          <span>
            {clientMode === 'indian' ? 'Indian Client' : 'Global Client'} ·{' '}
            <strong className="text-slate-700 dark:text-slate-300">{currentCurrency.code}</strong> default
          </span>
          <span className="text-xs text-slate-400">(change in top bar)</span>
        </div>
      </div>

      {/* Tab selector */}
      <div className="grid sm:grid-cols-3 gap-3">
        {TABS.map(({ id, label, icon: Icon, desc }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              activeTab === id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}>
            <div className={`p-2 rounded-lg flex-shrink-0 ${activeTab === id ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className={`font-medium text-sm ${activeTab === id ? 'text-primary-700 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {activeTab === 'dcf'      && <DCFTool />}
      {activeTab === 'cashflow' && <CashFlowTool />}
      {activeTab === 'loan'     && <LoanDefaultTool />}
    </div>
  )
}
