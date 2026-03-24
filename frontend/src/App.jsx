import { Routes, Route, NavLink } from 'react-router-dom'
import Calculator from './pages/Calculator'
import AuctionTracker from './pages/AuctionTracker'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'

const navItems = [
  { path: '/', label: 'Calculator', icon: '⚡' },
  { path: '/auctions', label: 'Auction Tracker', icon: '🔨' },
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function App() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <nav className="w-64 glass border-r border-surface-700/30 p-6 flex flex-col fixed h-full z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            FlipIQ
          </h1>
          <p className="text-xs text-surface-400 mt-1">eBay Reseller Calculator</p>
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
        <div className="text-xs text-surface-500 mt-auto pt-4 border-t border-surface-700/30">
          <p>🇨🇦 CAD · Encore → eBay</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8 min-h-screen">
        <Routes>
          <Route path="/" element={<Calculator />} />
          <Route path="/auctions" element={<AuctionTracker />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
