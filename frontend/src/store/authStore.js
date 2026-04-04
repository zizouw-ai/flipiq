import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const API_BASE = import.meta.env.VITE_API_URL || (isLocalhost ? '' : 'https://flipiq-backend-production-5109.up.railway.app/api')
const API = `${API_BASE}/api`

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      devMode: false,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            const message = err.detail || err.message || err.error || (typeof err === 'object' && Object.keys(err).length > 0 ? JSON.stringify(err) : 'Login failed')
            throw new Error(message)
          }
          const data = await res.json()
          set({
            token: data.access_token,
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            devMode: false,
          })
          return true
        } catch (err) {
          const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
          set({ isLoading: false, error: errorMessage })
          return false
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            const message = err.detail || err.message || err.error || (typeof err === 'object' && Object.keys(err).length > 0 ? JSON.stringify(err) : 'Registration failed')
            throw new Error(message)
          }
          set({ isLoading: false })
          return true
        } catch (err) {
          const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
          set({ isLoading: false, error: errorMessage })
          return false
        }
      },

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
          devMode: false,
        })
      },

      enableDevMode: () => {
        set({
          devMode: true,
          isAuthenticated: true,
          user: { email: 'dev@local', name: 'Developer' },
          token: 'dev-token',
        })
      },

      clearError: () => set({ error: null }),

      getAuthHeaders: () => {
        const { token, devMode } = get()
        if (devMode) return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        return token
          ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
          : { 'Content-Type': 'application/json' }
      },
    }),
    {
      name: 'flipiq-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        devMode: state.devMode,
      }),
    }
  )
)
