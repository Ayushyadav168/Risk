import React, { useState } from 'react'
import { User, Bell, Shield, Moon, Sun, Monitor, Check, AlertCircle, Building2, Key, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import useAuthStore from '../store/authStore'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'appearance', label: 'Appearance', icon: Monitor },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
]

function TabContent({ id, user }) {
  const [saved, setSaved] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system')

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const applyTheme = (t) => {
    setTheme(t)
    localStorage.setItem('theme', t)
    if (t === 'dark') document.documentElement.classList.add('dark')
    else if (t === 'light') document.documentElement.classList.remove('dark')
    else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
  }

  if (id === 'profile') return (
    <div className="space-y-6">
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">{user?.full_name || 'User'}</h3>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <span className="inline-block mt-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-full capitalize">{user?.role || 'analyst'}</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Full Name" defaultValue={user?.full_name || ''} placeholder="John Doe" />
        <Input label="Email Address" defaultValue={user?.email || ''} type="email" placeholder="john@company.com" />
        <Input label="Job Title" placeholder="Chief Risk Officer" />
        <Input label="Phone" placeholder="+1 (555) 000-0000" type="tel" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bio</label>
        <textarea className="input-field resize-none" rows={3} placeholder="Brief description of your role..." />
      </div>
      <Button onClick={showSaved}>
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
      </Button>
    </div>
  )

  if (id === 'organization') return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Organization Name" placeholder="Acme Corp" />
        <Input label="Industry" placeholder="Finance, Tech, Healthcare..." />
        <Input label="Location" placeholder="New York, USA" />
        <Input label="Website" placeholder="https://acme.com" type="url" />
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Organization Size</label>
          <select className="input-field">
            <option value="startup">Startup (1–20)</option>
            <option value="small">Small (21–100)</option>
            <option value="medium" selected>Medium (101–500)</option>
            <option value="large">Large (500+)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Annual Revenue Range</label>
          <select className="input-field">
            {['Under $500K','$500K–$1M','$1M–$5M','$5M–$10M','$10M–$50M','$50M–$100M','$100M+'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <Button onClick={showSaved}>
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Organization</>}
      </Button>
    </div>
  )

  if (id === 'appearance') return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Theme</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Light', icon: Sun, preview: 'bg-white border-slate-200' },
            { value: 'dark', label: 'Dark', icon: Moon, preview: 'bg-slate-900 border-slate-700' },
            { value: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-white to-slate-900 border-slate-300' },
          ].map(({ value, label, icon: Icon, preview }) => (
            <button key={value} onClick={() => applyTheme(value)}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                theme === value ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}>
              <div className={`h-16 rounded-lg ${preview} border mb-2`} />
              <div className="flex items-center justify-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</span>
              </div>
              {theme === value && <Check className="absolute top-2 right-2 w-4 h-4 text-primary-500" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Dashboard Density</h4>
        <div className="flex gap-3">
          {['Comfortable', 'Compact'].map(d => (
            <button key={d} className="flex-1 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary-500 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all">
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Risk Color Scale</h4>
        <div className="flex items-center gap-1">
          {['bg-emerald-500', 'bg-yellow-400', 'bg-orange-500', 'bg-red-500', 'bg-red-700'].map((c, i) => (
            <div key={i} className={`${c} h-6 flex-1 rounded ${i === 0 ? 'rounded-l-full' : i === 4 ? 'rounded-r-full' : ''}`} />
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>Low Risk</span><span>High Risk</span>
        </div>
      </div>
    </div>
  )

  if (id === 'notifications') return (
    <div className="space-y-4">
      {[
        { label: 'High Risk Alerts', desc: 'Get notified when a risk score exceeds 8.0', defaultOn: true },
        { label: 'New Assessment Completed', desc: 'Notification when AI analysis finishes', defaultOn: true },
        { label: 'Report Ready', desc: 'Alert when a PDF report is ready to download', defaultOn: true },
        { label: 'Weekly Risk Digest', desc: 'Weekly summary of your risk landscape', defaultOn: false },
        { label: 'Mitigation Due Dates', desc: 'Reminder when mitigation actions are due', defaultOn: false },
        { label: 'Team Activity', desc: 'Notify on teammate actions in shared assessments', defaultOn: false },
      ].map(({ label, desc, defaultOn }) => (
        <div key={label} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div>
            <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked={defaultOn} className="sr-only peer" />
            <div className="w-10 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-700 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary-500"></div>
          </label>
        </div>
      ))}
      <Button onClick={showSaved}>
        {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Preferences</>}
      </Button>
    </div>
  )

  if (id === 'security') return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Key className="w-4 h-4" /> Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Current Password" type="password" placeholder="••••••••" />
          <Input label="New Password" type="password" placeholder="••••••••" />
          <Input label="Confirm New Password" type="password" placeholder="••••••••" />
          <Button variant="outline" size="sm" onClick={showSaved}>
            {saved ? <><Check className="w-4 h-4" /> Updated!</> : 'Update Password'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Two-Factor Authentication</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Add an extra layer of security to your account.</p>
              <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full mt-2 inline-block">Not enabled</span>
            </div>
            <Button variant="outline" size="sm">Enable 2FA</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Danger Zone</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-900">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Delete Account</p>
              <p className="text-xs text-red-500">This will permanently delete all your data.</p>
            </div>
            <Button variant="danger" size="sm">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return null
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user } = useAuthStore()

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h2>
        <p className="text-slate-500 text-sm">Manage your profile, organization, and preferences</p>
      </div>

      <div className="flex gap-6 flex-col sm:flex-row">
        {/* Tab nav */}
        <nav className="w-full sm:w-48 flex-shrink-0">
          <ul className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === id
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>{TABS.find(t => t.id === activeTab)?.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <TabContent id={activeTab} user={user} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
