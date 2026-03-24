const API = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const api = {
  // Calculator
  getCategories: () => request('/calculator/categories'),
  calcEncoreCost: (data) => request('/calculator/encore-cost', { method: 'POST', body: JSON.stringify(data) }),
  calcMode1: (data) => request('/calculator/mode1', { method: 'POST', body: JSON.stringify(data) }),
  calcMode2: (data) => request('/calculator/mode2', { method: 'POST', body: JSON.stringify(data) }),
  calcMode3: (data) => request('/calculator/mode3', { method: 'POST', body: JSON.stringify(data) }),
  calcMode4: (data) => request('/calculator/mode4', { method: 'POST', body: JSON.stringify(data) }),
  calcMode5: (data) => request('/calculator/mode5', { method: 'POST', body: JSON.stringify(data) }),

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
  getMonthlyChart: () => request('/dashboard/charts/monthly'),
  getRoiByCategory: () => request('/dashboard/charts/roi-by-category'),
  getBestWorst: () => request('/dashboard/charts/best-worst'),
  getFeeBreakdown: () => request('/dashboard/charts/fee-breakdown'),
  getProfitPerAuction: () => request('/dashboard/charts/profit-per-auction'),
  getCumulativeProfit: () => request('/dashboard/charts/cumulative-profit'),

  // Settings
  getSettings: () => request('/settings/'),
  updateSetting: (key, value) => request('/settings/', { method: 'PUT', body: JSON.stringify({ key, value }) }),
  updateSettingsBulk: (settings) => request('/settings/bulk', { method: 'PUT', body: JSON.stringify(settings) }),
};
