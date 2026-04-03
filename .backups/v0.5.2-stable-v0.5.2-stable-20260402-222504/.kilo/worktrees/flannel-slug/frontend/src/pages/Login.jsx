import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, enableDevMode, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    const success = await login(email, password)
    if (success) {
      navigate('/')
    }
  }

  const handleDevMode = () => {
    enableDevMode()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            FlipIQ
          </h1>
          <p className="text-surface-400 mt-2">Multi-Channel Reseller Calculator</p>
        </div>

        <div className="glass rounded-2xl p-8 border border-surface-700/30">
          <h2 className="text-xl font-semibold text-surface-100 mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-surface-800/50 border border-surface-700/30 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-surface-800/50 border border-surface-700/30 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-surface-400 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
                Create one
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-surface-700/30">
            <button
              onClick={handleDevMode}
              className="w-full py-2 px-4 rounded-lg bg-surface-700/50 hover:bg-surface-600/50 text-surface-300 text-sm font-medium transition-all border border-surface-600/30"
            >
              Dev Mode (Skip Login)
            </button>
            <p className="text-xs text-surface-500 text-center mt-2">
              For local testing without authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
