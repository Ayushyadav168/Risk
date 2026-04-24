import React, { createContext, useContext, useState, useCallback } from 'react'

// Exchange rates relative to INR (1 unit of currency = X INR)
// Updated approximate rates as of 2025
const RATES_TO_INR = {
  INR: 1,
  USD: 84.5,
  GBP: 107.2,
  EUR: 91.0,
  AED: 23.0,
  SGD: 62.5,
  JPY: 0.56,
  AUD: 54.0,
  CAD: 61.5,
  CHF: 95.0,
  HKD: 10.8,
  SAR: 22.5,
}

export const CURRENCIES = [
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee',         flag: '🇮🇳' },
  { code: 'USD', symbol: '$',  name: 'US Dollar',            flag: '🇺🇸' },
  { code: 'GBP', symbol: '£',  name: 'British Pound',        flag: '🇬🇧' },
  { code: 'EUR', symbol: '€',  name: 'Euro',                 flag: '🇪🇺' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',          flag: '🇦🇪' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar',     flag: '🇸🇬' },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',         flag: '🇯🇵' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar',    flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar',      flag: '🇨🇦' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc',          flag: '🇨🇭' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar',   flag: '🇭🇰' },
  { code: 'SAR', symbol: '﷼',  name: 'Saudi Riyal',          flag: '🇸🇦' },
]

export const CLIENT_MODES = [
  { id: 'indian',  label: 'Indian Client',  flag: '🇮🇳', defaultCurrency: 'INR' },
  { id: 'foreign', label: 'Global Client',  flag: '🌍', defaultCurrency: 'USD' },
]

const CurrencyContext = createContext(null)

export function CurrencyProvider({ children }) {
  const [clientMode, setClientMode] = useState(
    () => localStorage.getItem('clientMode') || 'indian'
  )
  const [currency, setCurrencyState] = useState(
    () => localStorage.getItem('currency') || 'INR'
  )

  const setCurrency = useCallback((code) => {
    setCurrencyState(code)
    localStorage.setItem('currency', code)
  }, [])

  const switchClientMode = useCallback((mode) => {
    setClientMode(mode)
    localStorage.setItem('clientMode', mode)
    const def = CLIENT_MODES.find(m => m.id === mode)?.defaultCurrency || 'INR'
    setCurrency(def)
  }, [setCurrency])

  /**
   * Convert an amount from INR to the selected currency and format it.
   * @param {number} amountInINR — value in Indian Rupees
   * @param {object} opts — { compact: true } for K/M/B abbreviation
   */
  const formatMoney = useCallback((amountInINR, opts = {}) => {
    if (amountInINR == null || isNaN(amountInINR)) return '—'
    const rate = RATES_TO_INR[currency] || 1
    const converted = amountInINR / rate
    const cur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]

    if (opts.compact) {
      let val = converted
      let suffix = ''
      if (Math.abs(val) >= 1_000_000_000) { val = val / 1_000_000_000; suffix = 'B' }
      else if (Math.abs(val) >= 1_000_000) { val = val / 1_000_000; suffix = 'M' }
      else if (Math.abs(val) >= 1_000)     { val = val / 1_000; suffix = 'K' }
      return `${cur.symbol}${val.toFixed(1)}${suffix}`
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(converted)
  }, [currency])

  const currentCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]

  return (
    <CurrencyContext.Provider value={{
      clientMode,
      switchClientMode,
      currency,
      setCurrency,
      currentCurrency,
      currencies: CURRENCIES,
      clientModes: CLIENT_MODES,
      formatMoney,
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
