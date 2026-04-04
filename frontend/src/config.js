/**
 * FlipIQ Configuration - Single Source of Truth
 * Production-grade configuration module for API URLs
 */

// Detect environment
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

// Vite env var is baked in at build time
const VITE_API_URL = import.meta.env.VITE_API_URL || ''

// Base URL: empty string for dev (Vite proxy), full URL for production
export const API_BASE_URL = isLocalhost
  ? ''                          // Dev: relative paths, Vite proxy forwards to localhost:8000
  : VITE_API_URL                // Production: baked in at build time

// Full API URL with /api suffix
export const API_URL = API_BASE_URL.replace(/\/$/, '') + '/api'

// Debug logging
const DEBUG = import.meta.env.DEV || false

function log(...args) {
  if (DEBUG) console.log('[CONFIG]', ...args)
}

log('Environment:', isLocalhost ? 'development' : 'production')
log('API_BASE_URL:', API_BASE_URL || '(relative)')
log('API_URL:', API_URL)

/**
 * Universal API fetch helper
 * @param {string} path - API path (e.g., '/auth/login')
 * @param {object} options - fetch options
 * @returns {Promise<any>} JSON response
 */
export async function apiFetch(path, options = {}) {
  const url = `${API_URL}${path}`
  log('Fetching:', url, options.method || 'GET')
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: defaultHeaders,
    })
    
    log('Response:', res.status, path)
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const message = err.detail || err.message || err.error || `API Error ${res.status}`
      throw new Error(message)
    }
    
    return res.json()
  } catch (err) {
    log('Fetch error:', err.message)
    throw err
  }
}

/**
 * Download file helper (for exports)
 * @param {string} path - API path
 * @param {object} options - fetch options
 */
export async function downloadFile(path, options = {}) {
  const url = `${API_URL}${path}`
  
  try {
    const res = await fetch(url, options)
    
    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error')
      throw new Error(`Download Error ${res.status}: ${errText}`)
    }
    
    const blob = await res.blob()
    const disposition = res.headers.get('content-disposition') || ''
    const match = disposition.match(/filename="(.+)"/)
    const filename = match ? match[1] : 'export.xlsx'
    
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    }, 100)
  } catch (err) {
    console.error('Download failed:', err)
    throw err
  }
}
