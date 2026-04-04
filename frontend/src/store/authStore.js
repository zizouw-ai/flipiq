/**
 * FlipIQ Auth Store
 * Zustand store for authentication state
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { API_URL } from '../config'

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
          const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            const message = err.detail || err.message || err.error || 'Login failed'
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
          const errorMessage = err.message || String(err)
          set({ isLoading: false, error: errorMessage })
          return false
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            const message = err.detail || err.message || err.error || 'Registration failed'
            throw new Error(message)
          }
          set({ isLoading: false })
          return true
        } catch (err) {
          const errorMessage = err.message || String(err)
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
        const baseHeaders = { 'Content-Type': 'application/json' }
        if (devMode || token) {
          return { ...baseHeaders, Authorization: `Bearer ${token || 'dev-token'}` }
        }
        return baseHeaders
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
