// API base URL - uses environment variable for Railway, falls back to relative path for local dev
const API_BASE = import.meta.env.VITE_API_URL || '';
const API = `${API_BASE}/api`;

import { useAuthStore } from './store/authStore'

async function request(url, options = {}) {
  const authHeaders = useAuthStore.getState().getAuthHeaders()
  const isDevMode = useAuthStore.getState().devMode
  const res = await fetch(`${API}${url}`, {
    headers: { ...authHeaders, ...options.headers },
    ...options,
  });
  if (res.status === 401 && !isDevMode) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }
  if (res.status === 401 && isDevMode) {
    throw new Error('Dev mode: Please enable dev mode again')
  }
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

async function downloadFile(url) {
  const authHeaders = useAuthStore.getState().getAuthHeaders()
  const isDevMode = useAuthStore.getState().devMode
  const res = await fetch(`${API}${url}`, {
    headers: authHeaders.Authorization ? { Authorization: authHeaders.Authorization } : {},
  });
  if (res.status === 401 && !isDevMode) {
    useAuthStore.getState().logout()
    window.location.href = '/login'
    throw new Error('Session expired. Please log in again.')
  }
  if (res.status === 401 && isDevMode) {
    throw new Error('Dev mode: Please enable dev mode again')
  }
  if (!res.ok) throw new Error(`Download Error: ${res.status}`);
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : 'export.xlsx';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const CHANNELS = [
  { value: 'ebay', label: 'eBay', color: '#3b82f6' },
  { value: 'facebook_local', label: 'Facebook Marketplace – Local Pickup', color: '#22c55e' },
  { value: 'facebook_shipped', label: 'Facebook Marketplace – Shipped', color: '#f97316' },
  { value: 'poshmark', label: 'Poshmark', color: '#ec4899' },
  { value: 'kijiji', label: 'Kijiji', color: '#a78bfa' },
  { value: 'other', label: 'Other (no fees)', color: '#64748b' },
];

export const CHANNEL_MAP = Object.fromEntries(CHANNELS.map(c => [c.value, c]));

export const api = {
  // Auth
  login: async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Login failed')
    }
    return res.json()
  },

  register: async (name, email, password) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Registration failed')
    }
    return res.json()
  },

  logout: () => {
    useAuthStore.getState().logout()
  },

  getMe: () => request('/auth/me'),

  // Calculator
  getCategories: () => request('/calculator/categories'),
  calcEncoreCost: (data) => request('/calculator/encore-cost', { method: 'POST', body: JSON.stringify(data) }),
  calcMode1: (data) => request('/calculator/mode1', { method: 'POST', body: JSON.stringify(data) }),
  calcMode2: (data) => request('/calculator/mode2', { method: 'POST', body: JSON.stringify(data) }),
  calcMode3: (data) => request('/calculator/mode3', { method: 'POST', body: JSON.stringify(data) }),
  calcMode4: (data) => request('/calculator/mode4', { method: 'POST', body: JSON.stringify(data) }),
  calcMode5: (data) => request('/calculator/mode5', { method: 'POST', body: JSON.stringify(data) }),
  getAlert: (data) => request('/calculator/alert', { method: 'POST', body: JSON.stringify(data) }),

  // Auctions
  listAuctions: () => request('/auctions/'),
  createAuction: (data) => request('/auctions/', { method: 'POST', body: JSON.stringify(data) }),
  getAuction: (id) => request(`/auctions/${id}`),
  updateAuction: (id, data) => request(`/auctions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAuction: (id) => request(`/auctions/${id}`, { method: 'DELETE' }),

  // Items
  listItems: (auctionId) => request(`/auctions/${auctionId}/items`),
  createItem: (auctionId, data) => request(`/auctions/${auctionId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/auctions/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/auctions/items/${id}`, { method: 'DELETE' }),

  // Dashboard
  getKPIs: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString();
    return request(`/dashboard/kpis${qs ? '?' + qs : ''}`);
  },
  getChannelSummary: () => request('/dashboard/charts/by-channel'),
  getMonthlyChart: (channel) => {
    const qs = channel && channel !== 'all' ? `?channel=${channel}` : '';
    return request(`/dashboard/charts/monthly${qs}`);
  },
  getRoiByCategory: () => request('/dashboard/charts/roi-by-category'),
  getBestWorst: () => request('/dashboard/charts/best-worst'),
  getFeeBreakdown: () => request('/dashboard/charts/fee-breakdown'),
  getProfitPerAuction: () => request('/dashboard/charts/profit-per-auction'),
  getCumulativeProfit: (channel) => {
    const qs = channel && channel !== 'all' ? `?channel=${channel}` : '';
    return request(`/dashboard/charts/cumulative-profit${qs}`);
  },

  // Settings
  getSettings: () => request('/settings/'),
  updateSetting: (key, value) => request('/settings/', { method: 'PUT', body: JSON.stringify({ key, value }) }),
  updateSettingsBulk: (settings) => request('/settings/bulk', { method: 'PUT', body: JSON.stringify(settings) }),

  // Auction Houses (Feature 1.1)
  listAuctionHouses: () => request('/auction-houses/'),
  createAuctionHouse: (data) => request('/auction-houses/', { method: 'POST', body: JSON.stringify(data) }),
  updateAuctionHouse: (id, data) => request(`/auction-houses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAuctionHouse: (id) => request(`/auction-houses/${id}`, { method: 'DELETE' }),
  setDefaultAuctionHouse: (id) => request(`/auction-houses/${id}/set-default`, { method: 'PUT' }),
  previewBuyCost: (data) => request('/auction-houses/preview', { method: 'POST', body: JSON.stringify(data) }),
  getProvinces: () => request('/auction-houses/provinces'),

  // Shipping Presets (Feature 1.3)
  listShippingPresets: () => request('/shipping-presets/'),
  createShippingPreset: (data) => request('/shipping-presets/', { method: 'POST', body: JSON.stringify(data) }),
  updateShippingPreset: (id, data) => request(`/shipping-presets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteShippingPreset: (id) => request(`/shipping-presets/${id}`, { method: 'DELETE' }),

  // Item Templates (Feature 1.4)
  listTemplates: () => request('/templates/'),
  getTemplate: (id) => request(`/templates/${id}`),
  createTemplate: (data) => request('/templates/', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id, data) => request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),

  // Currency (Feature 1.7)
  getCurrencyRate: () => request('/currency/rate'),

  // Export (Feature 1.6)
  exportAuction: (id) => downloadFile(`/export/auction/${id}`),
  exportInventory: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([_, v]) => v)).toString();
    return downloadFile(`/export/inventory${qs ? '?' + qs : ''}`);
  },
  exportDashboardSummary: (year) => downloadFile(`/export/dashboard/summary?year=${year}`),
  exportTaxSummary: (year) => downloadFile(`/export/tax-summary?year=${year}`),

  // All Items (cross-auction search)
  searchItems: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([_, v]) => v != null && v !== '')).toString();
    return request(`/items/search?${qs}`);
  },
  getItemsSummary: () => request('/items/summary'),
  getItemCategories: () => request('/items/categories'),
};
