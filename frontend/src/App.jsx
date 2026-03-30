import { Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { api } from './api'
import Calculator from './pages/Calculator'
import AuctionTracker from './pages/AuctionTracker'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import AllItems from './pages/AllItems'

const navItems = [
  { path: '/', label: 'Calculator', icon: '⚡' },
  { path: '/auctions', label: 'Auction Tracker', icon: '🔨' },
  { path: '/items', label: 'All Items', icon: '📦' },
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
]

export const CurrencyContext = createContext({ currency: 'CAD', rate: 1, toggle: () => {} })

export function useCurrency() { return useContext(CurrencyContext) }

export default function App() {
  const [currency, setCurrency] = useState('CAD')
  const [rate, setRate] = useState({ cad_to_usd: 0.73, usd_to_cad: 1.37 })

  useEffect(() => {
    api.getCurrencyRate().then(setRate).catch(() => {})
  }, [])

  const toggle = () => setCurrency(c => c === 'CAD' ? 'USD' : 'CAD')
  const convert = (v) => currency === 'USD' ? +(v * rate.cad_to_usd).toFixed(2) : v
  const symbol = currency === 'CAD' ? 'C$' : 'US$'

  return (
    <CurrencyContext.Provider value={{ currency, rate, toggle, convert, symbol }}>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <nav className="w-64 glass border-r border-surface-700/30 p-6 flex flex-col fixed h-full z-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
              FlipIQ
            </h1>
            <p className="text-xs text-surface-400 mt-1">Multi-Channel Reseller Calculator</p>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
                      : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/30'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
          {/* Currency Toggle */}
          <div className="mt-auto pt-4 border-t border-surface-700/30 space-y-3">
            <button onClick={toggle} id="currency-toggle"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700/30 hover:bg-surface-700/30 transition-all duration-200 group">
              <span className="text-xs text-surface-400 group-hover:text-surface-300">{currency === 'CAD' ? '🇨🇦 CAD' : '🇺🇸 USD'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400 border border-brand-500/20">
                {currency === 'CAD' ? `1 CAD = ${rate.cad_to_usd} USD` : `1 USD = ${rate.usd_to_cad} CAD`}
              </span>
            </button>
            <p className="text-xs text-surface-500 text-center">v2.0 · Phase 1</p>
          </div>
        </nav>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8 min-h-screen">
          <Routes>
            <Route path="/" element={<Calculator />} />
            <Route path="/auctions" element={<AuctionTracker />} />
            <Route path="/items" element={<AllItems />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </CurrencyContext.Provider>
  )
}
