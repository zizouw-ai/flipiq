// API base URL - hardcoded for Railway, relative for local dev
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const API_BASE = import.meta.env.VITE_API_URL || (isLocalhost ? '' : 'https://flipiq-backend-production-5109.up.railway.app/api')
const API = `${API_BASE}/api`

import { useAuthStore } from './store/authStore'
