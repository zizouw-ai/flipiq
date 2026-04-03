import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, CHANNELS, CHANNEL_MAP } from '../api';

const STATUSES = ['unlisted', 'listed', 'sold', 'unsold'];
const STATUS_COLORS = {
  unlisted: 'bg-surface-600/30 text-surface-300',
  listed: 'bg-brand-600/20 text-brand-400',
  sold: 'bg-success-500/20 text-success-400',
  unsold: 'bg-danger-500/20 text-danger-400',
};

function fmt(v) { return v != null ? `$${Number(v).toFixed(2)}` : '—'; }
function fmtInt(v) { return v != null ? v.toLocaleString() : '—'; }

export default function AllItems() {
  // Data states
  const [items, setItems] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({
    total_items: 0,
    total_spent: 0,
    total_revenue: 0,
    total_profit: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, per_page: 50, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuctions, setSelectedAuctions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [profitMin, setProfitMin] = useState('');
  const [profitMax, setProfitMax] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selected item detail
  const [selectedItem, setSelectedItem] = useState(null);
  const [planInfo, setPlanInfo] = useState(null);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    api.getPlan().then(setPlanInfo).catch(() => {});
  }, []);

  const loadAuctions = useCallback(() => {
    api.listAuctions().then(setAuctions).catch(() => {});
  }, []);

  const loadCategories = useCallback(() => {
    api.getItemCategories().then(setCategories).catch(() => {});
  }, []);

  const searchItems = useCallback(() => {
    setLoading(true);
    const params = {
      q: searchQuery || undefined,
      auction_ids: selectedAuctions.length > 0 ? selectedAuctions.join(',') : undefined,
      status: statusFilter || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      price_min: priceMin ? parseFloat(priceMin) : undefined,
      price_max: priceMax ? parseFloat(priceMax) : undefined,
      profit_min: profitMin ? parseFloat(profitMin) : undefined,
      profit_max: profitMax ? parseFloat(profitMax) : undefined,
      channel: channelFilter !== 'all' ? channelFilter : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      page: pagination.page,
      per_page: pagination.per_page,
    };

    api.searchItems(params)
      .then(data => {
        setItems(data.items || []);
        setPagination(data.pagination || pagination);
        setSummary(data.summary || { total_items: 0, total_spent: 0, total_revenue: 0, total_profit: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [
    searchQuery, selectedAuctions, statusFilter, categoryFilter,
    dateFrom, dateTo, priceMin, priceMax, profitMin, profitMax,
    channelFilter, sortBy, sortOrder, pagination.page, pagination.per_page
  ]);

  // Initial load
  useEffect(() => {
    loadAuctions();
    loadCategories();
  }, [loadAuctions, loadCategories]);

  // Search when filters/pagination change (debounce search query)
  useEffect(() => {
    const timer = setTimeout(() => {
      searchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchItems]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setPagination(p => ({ ...p, page: newPage }));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedAuctions([]);
    setStatusFilter('');
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
    setPriceMin('');
    setPriceMax('');
    setProfitMin('');
    setProfitMax('');
    setChannelFilter('all');
    setSortBy('date');
    setSortOrder('desc');
    setPagination(p => ({ ...p, page: 1 }));
  };

  const exportToCSV = async (allItems = false) => {
    setExportError('');
    try {
      // Check if user has pro plan
      const planRes = await api.getPlan().catch(() => ({ plan: 'free' }));
      if (planRes.plan === 'free') {
        setExportError('Export feature is not available on your free plan.');
        return;
      }
      // Use API export which enforces plan limits
      const params = { start: dateFrom, end: dateTo, channel: channelFilter !== 'all' ? channelFilter : null };
      await api.exportInventory(params);
    } catch (err) {
      if (err.message?.includes('402') || err.message?.includes('feature_blocked')) {
        setExportError('Export feature is not available on your free plan.');
      } else {
        console.error('Export failed:', err);
      }
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedAuctions.length > 0) count++;
    if (statusFilter) count++;
    if (categoryFilter !== 'all') count++;
    if (dateFrom || dateTo) count++;
    if (priceMin || priceMax) count++;
    if (profitMin || profitMax) count++;
    if (channelFilter !== 'all') count++;
    return count;
  }, [searchQuery, selectedAuctions, statusFilter, categoryFilter, dateFrom, dateTo, priceMin, priceMax, profitMin, profitMax, channelFilter]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            All Items
          </h1>
          <p className="text-surface-400 text-sm mt-1">Cross-auction inventory search and export</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(false)} className="btn-secondary text-sm">
            📥 Export View
          </button>
        </div>
      </div>

      {/* Export Error Banner */}
      {exportError && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-amber-400 font-medium">{exportError}</p>
              <p className="text-amber-400/70 text-sm">Upgrade to Pro to unlock exports</p>
            </div>
          </div>
          <a href="/pricing" className="px-4 py-2 bg-amber-500 text-surface-900 rounded-lg font-medium hover:bg-amber-400 transition-colors text-sm">
            Upgrade Now →
          </a>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <p className="text-xs text-surface-400 mb-1">Total Items</p>
          <p className="text-2xl font-bold text-surface-200">{fmtInt(summary.total_items)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-surface-400 mb-1">Total Spent</p>
          <p className="text-2xl font-bold text-surface-200">{fmt(summary.total_spent)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-surface-400 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-success-400">{fmt(summary.total_revenue)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-surface-400 mb-1">Total Profit</p>
          <p className={`text-2xl font-bold ${(summary.total_profit || 0) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
            {fmt(summary.total_profit)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-200">Filters</h3>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-brand-400 hover:text-brand-300">
                  Clear ({activeFilterCount})
                </button>
              )}
            </div>

            {/* Search */}
            <div className="mb-4">
              <label className="text-xs text-surface-400 mb-1 block">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                placeholder="Name, description, notes..."
                className="input-field text-sm"
              />
            </div>

            {/* Auction Multi-Select */}
            <div className="mb-4">
              <label className="text-xs text-surface-400 mb-1 block">Auctions</label>
              <select
                multiple
                value={selectedAuctions}
                onChange={e => {
                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedAuctions(options);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className="input-field text-sm h-24"
              >
                {auctions.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-surface-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>

            {/* Status Filter */}
            <div className="mb-4">
              <label className="text-xs text-surface-400 mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                className="input-field text-sm"
              >
                <option value="">All Statuses</option>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="mb-4">
              <label className="text-xs text-surface-400 mb-1 block">Category</label>
              <select
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                className="input-field text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Channel Filter */}
            <div className="mb-4">
              <label className="text-xs text-surface-400 mb-1 block">Sale Channel</label>
              <select
                value={channelFilter}
                onChange={e => { setChannelFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                className="input-field text-sm"
              >
                <option value="all">All Channels</option>
                {CHANNELS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="mb-4">
              <label className="text-xs text-surface-400 mb-1 block">Date Range</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                className="input-field text-sm mb-2"
                placeholder="From"
              />
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                className="input-field text-sm"
                placeholder="To"
              />
            </div>

            {/* Price Range */}
            <div className="mb-4">
              <label className="text-xs text-surface-400 mb-1 block">Purchase Price</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={priceMin}
                  onChange={e => { setPriceMin(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  placeholder="Min"
                  className="input-field text-sm flex-1"
                />
                <input
                  type="number"
                  value={priceMax}
                  onChange={e => { setPriceMax(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  placeholder="Max"
                  className="input-field text-sm flex-1"
                />
              </div>
            </div>

            {/* Profit Range */}
            <div className="mb-4">
              <label className="text-xs text-surface-400 mb-1 block">Profit</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={profitMin}
                  onChange={e => { setProfitMin(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  placeholder="Min"
                  className="input-field text-sm flex-1"
                />
                <input
                  type="number"
                  value={profitMax}
                  onChange={e => { setProfitMax(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  placeholder="Max"
                  className="input-field text-sm flex-1"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="mb-4">
              <label className="text-xs text-surface-400 mb-1 block">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="input-field text-sm flex-1"
                >
                  <option value="date">Date</option>
                  <option value="price">Purchase Price</option>
                  <option value="profit">Profit</option>
                  <option value="status">Status</option>
                  <option value="name">Name</option>
                </select>
                <button
                  onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                  className="btn-secondary px-2 text-xs"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-surface-400">
              Showing {items.length} of {pagination.total} items
            </p>
            {pagination.total_pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn-secondary px-3 py-1 text-sm disabled:opacity-50"
                >
                  ←
                </button>
                <span className="text-sm text-surface-400">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.total_pages}
                  className="btn-secondary px-3 py-1 text-sm disabled:opacity-50"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="glass-card p-12 text-center text-surface-500">
              <div className="animate-spin text-2xl mb-3">⏳</div>
              <p>Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="glass-card p-12 text-center text-surface-500">
              <div className="text-3xl mb-3">📦</div>
              <p>No items found matching your filters.</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-brand-400 hover:text-brand-300 text-sm mt-2">
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700/50">
                      <th className="text-left p-3 text-surface-400 font-medium">Item</th>
                      <th className="text-left p-3 text-surface-400 font-medium">Auction</th>
                      <th className="text-right p-3 text-surface-400 font-medium">Purchase</th>
                      <th className="text-right p-3 text-surface-400 font-medium">Est. Resale</th>
                      <th className="text-right p-3 text-surface-400 font-medium">Sold</th>
                      <th className="text-center p-3 text-surface-400 font-medium">Status</th>
                      <th className="text-right p-3 text-surface-400 font-medium">Profit</th>
                      <th className="text-center p-3 text-surface-400 font-medium">Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="border-b border-surface-700/20 hover:bg-surface-700/20 cursor-pointer transition-colors"
                      >
                        <td className="p-3">
                          <div className="text-surface-200 font-medium">{item.name}</div>
                          <div className="text-xs text-surface-500">{item.category}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-surface-300">{item.auction_name}</div>
                          <div className="text-xs text-surface-500">{item.auction_date}</div>
                          {item.lot_number && (
                            <div className="text-xs text-brand-400">Lot #{item.lot_number}</div>
                          )}
                        </td>
                        <td className="p-3 text-right text-surface-300">{fmt(item.purchase_price)}</td>
                        <td className="p-3 text-right text-surface-300">
                          {item.estimated_resale ? fmt(item.estimated_resale) : '—'}
                        </td>
                        <td className="p-3 text-right text-surface-300">
                          {item.sold_price ? fmt(item.sold_price) : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`status-badge ${STATUS_COLORS[item.status]}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-medium ${(item.net_profit || 0) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                          {item.net_profit != null ? fmt(item.net_profit) : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className="text-xs font-medium px-2 py-1 rounded-full"
                            style={{
                              background: (CHANNEL_MAP[item.sale_channel]?.color || '#64748b') + '20',
                              color: CHANNEL_MAP[item.sale_channel]?.color || '#64748b'
                            }}
                          >
                            {(item.platform_sold_on || item.sale_channel).split('_')[0]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="glass-card max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-surface-200">{selectedItem.name}</h3>
                  <p className="text-sm text-surface-400">{selectedItem.category}</p>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-surface-500 hover:text-surface-300 text-xl">×</button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-surface-500">Auction</p>
                  <p className="text-surface-300">{selectedItem.auction_name}</p>
                  <p className="text-xs text-surface-500">{selectedItem.auction_date}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Lot Number</p>
                  <p className="text-surface-300">{selectedItem.lot_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Status</p>
                  <span className={`status-badge ${STATUS_COLORS[selectedItem.status]}`}>
                    {selectedItem.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Sale Channel</p>
                  <p className="text-surface-300">{CHANNEL_MAP[selectedItem.sale_channel]?.label || selectedItem.sale_channel}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-surface-800/50 rounded-xl">
                <div>
                  <p className="text-xs text-surface-500">Purchase Price</p>
                  <p className="text-lg font-medium text-surface-200">{fmt(selectedItem.purchase_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Est. Resale</p>
                  <p className="text-lg font-medium text-surface-200">{fmt(selectedItem.estimated_resale)}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Sold Price</p>
                  <p className="text-lg font-medium text-success-400">{fmt(selectedItem.sold_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Net Profit</p>
                  <p className={`text-lg font-medium ${(selectedItem.net_profit || 0) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                    {fmt(selectedItem.net_profit)}
                  </p>
                </div>
              </div>

              {selectedItem.notes && (
                <div className="mb-4">
                  <p className="text-xs text-surface-500 mb-1">Notes</p>
                  <p className="text-surface-300 text-sm whitespace-pre-wrap">{selectedItem.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <a
                  href={`/auctions`}
                  onClick={e => { e.preventDefault(); setSelectedItem(null); }}
                  className="btn-secondary flex-1 text-center text-sm"
                >
                  Close
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
