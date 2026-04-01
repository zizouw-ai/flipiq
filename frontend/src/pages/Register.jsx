import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

function CheckItem({ met, label }) {
  return (
    <div className={`flex items-center gap-2 text-sm transition-colors ${met ? 'text-green-400' : 'text-surface-500'}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${met ? 'bg-green-500/20 border-green-500/50' : 'border-surface-600'}`}>
        {met && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <span>{label}</span>
    </div>
  )
}

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState('')
  const { register, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  }), [password])

  const allRequirementsMet = Object.values(passwordChecks).every(Boolean)
  const passwordsMatch = password && confirmPassword && password === confirmPassword

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    setValidationError('')

    if (!allRequirementsMet) {
      setValidationError('Password does not meet all requirements')
      return
    }

    if (!passwordsMatch) {
      setValidationError('Passwords do not match')
      return
    }

    const success = await register(name, email, password)
    if (success) {
      navigate('/login', { state: { message: 'Account created! Please sign in.' } })
    }
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
          <h2 className="text-xl font-semibold text-surface-100 mb-6">Create Account</h2>

          {(error || validationError) && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error || validationError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-surface-800/50 border border-surface-700/30 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                placeholder="Your name"
              />
            </div>

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

            {password && (
              <div className="p-3 rounded-lg bg-surface-800/50 border border-surface-700/30 space-y-2">
                <p className="text-xs font-medium text-surface-400 uppercase tracking-wide">Password Requirements</p>
                <CheckItem met={passwordChecks.length} label="At least 8 characters" />
                <CheckItem met={passwordChecks.uppercase} label="One uppercase letter" />
                <CheckItem met={passwordChecks.number} label="One number" />
                <CheckItem met={passwordChecks.special} label="One special character" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-surface-800/50 border border-surface-700/30 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>

            {confirmPassword && (
              <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-400' : 'text-surface-500'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${passwordsMatch ? 'bg-green-500/20 border-green-500/50' : 'border-surface-600'}`}>
                  {passwordsMatch && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span>Passwords match</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !allRequirementsMet || !passwordsMatch}
              className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-surface-400 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
