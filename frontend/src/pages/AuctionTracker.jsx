import { useState, useEffect } from 'react';
import { api, CHANNELS, CHANNEL_MAP } from '../api';
import ShippingCostField from '../components/ShippingCostField';
import AlertBanner from '../components/AlertBanner';
import LoadProfileButton from '../components/LoadTemplateButton';

const STATUSES = ['unlisted', 'listed', 'sold', 'unsold'];
const STATUS_COLORS = {
  unlisted: 'bg-surface-600/30 text-surface-300',
  listed: 'bg-brand-600/20 text-brand-400',
  sold: 'bg-success-500/20 text-success-400',
  unsold: 'bg-danger-500/20 text-danger-400',
};

function fmt(v) { return v != null ? `$${Number(v).toFixed(2)}` : '—'; }

export default function AuctionTracker() {
  const [auctions, setAuctions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [aForm, setAForm] = useState({ name: '', date: '', total_hammer: '0', payment_method: 'etransfer', notes: '', auction_house_config_id: null });
  const [iForm, setIForm] = useState({
    name: '', hammer_price: '', category: 'Most Categories (Default)',
    payment_method: 'etransfer', status: 'unlisted', list_price: '',
    sold_price: '', sell_date: '', shipping_cost_actual: '0',
    shipping_charged_buyer: '0', promoted_pct: '0', sale_channel: 'ebay', notes: '',
    lot_number: '', estimated_resale: '', platform_sold_on: '',
  });

  const loadAuctions = () => api.listAuctions().then(setAuctions).catch(() => {});
  const loadAuction = (id) => api.getAuction(id).then(a => { setSelectedAuction(a); setSelectedId(id); }).catch(() => {});

  useEffect(() => { loadAuctions(); }, []);

  const createAuction = async () => {
    await api.createAuction({ ...aForm, total_hammer: parseFloat(aForm.total_hammer) || 0 });
    setShowForm(false); setAForm({ name: '', date: '', total_hammer: '0', payment_method: 'etransfer', notes: '' });
    loadAuctions();
  };

  const deleteAuction = async (id) => {
    if (!confirm('Delete this auction and all items?')) return;
    await api.deleteAuction(id);
    if (selectedId === id) { setSelectedId(null); setSelectedAuction(null); }
    loadAuctions();
  };

  const createItem = async () => {
    if (!selectedId) return;
    const data = {
      ...iForm,
      hammer_price: parseFloat(iForm.hammer_price) || 0,
      list_price: iForm.list_price ? parseFloat(iForm.list_price) : null,
      sold_price: iForm.sold_price ? parseFloat(iForm.sold_price) : null,
      shipping_cost_actual: parseFloat(iForm.shipping_cost_actual) || 0,
      shipping_charged_buyer: parseFloat(iForm.shipping_charged_buyer) || 0,
      promoted_pct: parseFloat(iForm.promoted_pct) || 0,
      sale_channel: iForm.sale_channel,
      lot_number: iForm.lot_number || null,
      estimated_resale: iForm.estimated_resale ? parseFloat(iForm.estimated_resale) : null,
      platform_sold_on: iForm.platform_sold_on || null,
    };
    await api.createItem(selectedId, data);
    setShowItemForm(false);
    resetItemForm();
    loadAuction(selectedId);
  };

  const updateItem = async () => {
    const data = {
      ...iForm,
      hammer_price: parseFloat(iForm.hammer_price) || 0,
      list_price: iForm.list_price ? parseFloat(iForm.list_price) : null,
      sold_price: iForm.sold_price ? parseFloat(iForm.sold_price) : null,
      shipping_cost_actual: parseFloat(iForm.shipping_cost_actual) || 0,
      shipping_charged_buyer: parseFloat(iForm.shipping_charged_buyer) || 0,
      promoted_pct: parseFloat(iForm.promoted_pct) || 0,
      sale_channel: iForm.sale_channel,
      lot_number: iForm.lot_number || null,
      estimated_resale: iForm.estimated_resale ? parseFloat(iForm.estimated_resale) : null,
      platform_sold_on: iForm.platform_sold_on || null,
    };
    await api.updateItem(editItem.id, data);
    setEditItem(null); setShowItemForm(false);
    resetItemForm();
    loadAuction(selectedId);
  };

  const deleteItem = async (id) => {
    if (!confirm('Delete this item?')) return;
    await api.deleteItem(id);
    loadAuction(selectedId);
  };

  const resetItemForm = () => setIForm({
    name: '', hammer_price: '', category: 'Most Categories (Default)',
    payment_method: 'etransfer', status: 'unlisted', list_price: '',
    sold_price: '', sell_date: '', shipping_cost_actual: '0',
    shipping_charged_buyer: '0', promoted_pct: '0', sale_channel: 'ebay', notes: '',
    lot_number: '', estimated_resale: '', platform_sold_on: '',
  });

  const startEditItem = (item) => {
    setEditItem(item);
    setIForm({
      name: item.name, hammer_price: String(item.hammer_price),
      category: item.category, payment_method: item.payment_method,
      status: item.status, list_price: item.list_price ? String(item.list_price) : '',
      sold_price: item.sold_price ? String(item.sold_price) : '',
      sell_date: item.sell_date || '', shipping_cost_actual: String(item.shipping_cost_actual),
      shipping_charged_buyer: String(item.shipping_charged_buyer),
      promoted_pct: String(item.promoted_pct),
      sale_channel: item.sale_channel || 'ebay', notes: item.notes,
      lot_number: item.lot_number || '', estimated_resale: item.estimated_resale ? String(item.estimated_resale) : '',
      platform_sold_on: item.platform_sold_on || '',
    });
    setShowItemForm(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            Auction Tracker
          </h1>
          <p className="text-surface-400 text-sm mt-1">Log Encore Auction sessions and track your inventory</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" id="new-auction-btn">
          + New Auction
        </button>
      </div>

      {/* New Auction Form */}
      {showForm && (
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <h2 className="text-lg font-semibold mb-4 text-surface-200">New Auction Session</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Auction Name</label>
              <input className="input-field" value={aForm.name} onChange={e => setAForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Encore March 24" id="auction-name" />
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Date</label>
              <input type="date" className="input-field" value={aForm.date}
                onChange={e => setAForm(f => ({ ...f, date: e.target.value }))} id="auction-date" />
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Total Hammer</label>
              <input type="number" className="input-field" value={aForm.total_hammer}
                onChange={e => setAForm(f => ({ ...f, total_hammer: e.target.value }))} id="auction-hammer" />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs text-surface-400 mb-1 block">Notes</label>
            <textarea className="input-field" rows={2} value={aForm.notes}
              onChange={e => setAForm(f => ({ ...f, notes: e.target.value }))} id="auction-notes" />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createAuction} className="btn-primary" id="save-auction-btn">Save Auction</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Auction List */}
        <div className="space-y-3">
          {auctions.length === 0 && (
            <div className="glass-card p-8 text-center text-surface-500">
              <div className="text-3xl mb-2">🔨</div>
              <p>No auctions yet. Create one to start tracking!</p>
            </div>
          )}
          {auctions.map(a => (
            <div key={a.id} onClick={() => loadAuction(a.id)}
              className={`glass-card p-4 cursor-pointer transition-all duration-200 ${
                selectedId === a.id ? 'border-brand-500/30 shadow-lg shadow-brand-500/5' : ''
              }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-surface-200">{a.name}</h3>
                  <p className="text-xs text-surface-400 mt-1">{a.date} · {a.item_count} items</p>
                  <p className="text-sm text-brand-400 mt-1">{fmt(a.total_hammer)} total hammer</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteAuction(a.id); }}
                  className="text-surface-500 hover:text-danger-400 transition-colors text-lg">×</button>
              </div>
            </div>
          ))}
        </div>

        {/* Auction Detail + Items */}
        <div className="lg:col-span-2">
          {selectedAuction ? (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-surface-200">{selectedAuction.name}</h2>
                <div className="flex gap-2">
                  <button onClick={() => api.exportAuction(selectedAuction.id)}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-surface-700/50 border border-surface-600/30 text-surface-300 hover:text-surface-100 hover:bg-surface-600/50 transition-all" id="export-auction-btn">
                    📥 Export
                  </button>
                  <button onClick={() => { resetItemForm(); setEditItem(null); setShowItemForm(!showItemForm); }}
                    className="btn-primary text-sm" id="add-item-btn">
                    + Add Item
                  </button>
                </div>
              </div>

              {/* Item Form */}
              {showItemForm && (
                <div className="glass-card p-6 mb-6 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="font-semibold text-surface-200">{editItem ? 'Edit Item' : 'New Item'}</h3>
                    <LoadProfileButton
                      onLoad={(profile) => {
                        setIForm(f => ({
                          ...f,
                          name: profile.item_name || f.name,
                          sale_channel: profile.sale_channel || f.sale_channel,
                          promoted_pct: String(profile.promoted_listing_pct || f.promoted_pct),
                          shipping_charged_buyer: profile.buyer_shipping_charge ? String(profile.buyer_shipping_charge) : f.shipping_charged_buyer,
                          // For Fixed Cost profiles, also fill the hammer price
                          ...(profile.profile_type === 'fixed' && profile.fixed_buy_price
                            ? { hammer_price: String(profile.fixed_buy_price) }
                            : {}),
                        }));
                      }}
                      onClear={() => {
                        setIForm({ name: '', hammer_price: '', status: 'unlisted', list_price: '', sold_price: '',
                          sell_date: '', shipping_cost_actual: '', shipping_charged_buyer: '', promoted_pct: '',
                          sale_channel: 'ebay', notes: '' });
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Item Name</label>
                      <input className="input-field" value={iForm.name} onChange={e => setIForm(f => ({ ...f, name: e.target.value }))} id="item-name" />
                    </div>
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Hammer Price</label>
                      <input type="number" className="input-field" value={iForm.hammer_price}
                        onChange={e => setIForm(f => ({ ...f, hammer_price: e.target.value }))} id="item-hammer" />
                    </div>
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Status</label>
                      <select className="input-field" value={iForm.status}
                        onChange={e => setIForm(f => ({ ...f, status: e.target.value }))} id="item-status">
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">List Price</label>
                      <input type="number" className="input-field" value={iForm.list_price}
                        onChange={e => setIForm(f => ({ ...f, list_price: e.target.value }))} id="item-list-price" />
                    </div>
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Sold Price</label>
                      <input type="number" className="input-field" value={iForm.sold_price}
                        onChange={e => setIForm(f => ({ ...f, sold_price: e.target.value }))} id="item-sold-price" />
                    </div>
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Sell Date</label>
                      <input type="date" className="input-field" value={iForm.sell_date}
                        onChange={e => setIForm(f => ({ ...f, sell_date: e.target.value }))} id="item-sell-date" />
                    </div>
                    <ShippingCostField value={iForm.shipping_cost_actual}
                      onChange={v => setIForm(f => ({ ...f, shipping_cost_actual: v }))} />
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Buyer Shipping Charge</label>
                      <input type="number" className="input-field" value={iForm.shipping_charged_buyer}
                        onChange={e => setIForm(f => ({ ...f, shipping_charged_buyer: e.target.value }))} id="item-buyer-ship" />
                    </div>
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Promoted %</label>
                      <input type="number" className="input-field" value={iForm.promoted_pct}
                        onChange={e => setIForm(f => ({ ...f, promoted_pct: e.target.value }))} id="item-promoted" />
                    </div>
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Sale Channel</label>
                      <select className="input-field" value={iForm.sale_channel}
                        onChange={e => setIForm(f => ({ ...f, sale_channel: e.target.value }))} id="item-channel">
                        {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Channel fee badge */}
                  {iForm.sale_channel === 'kijiji' && (
                    <div className="bg-success-400/10 border border-success-400/20 rounded-xl p-3 mt-4 text-sm text-success-400">
                      🟢 No platform fees — full profit kept
                    </div>
                  )}
                  {iForm.sale_channel === 'facebook_local' && (
                    <div className="bg-success-400/10 border border-success-400/20 rounded-xl p-3 mt-4 text-sm text-success-400">
                      🟢 Local cash sale — no fees, no shipping
                    </div>
                  )}
                  {iForm.sale_channel === 'facebook_shipped' && (
                    <div className="bg-warning-400/10 border border-warning-400/20 rounded-xl p-3 mt-4 text-sm text-warning-400">
                      📦 Fee: 10% of sale price (min $0.80)
                    </div>
                  )}
                  {iForm.sale_channel === 'poshmark' && (
                    <div className="bg-danger-400/10 border border-danger-400/20 rounded-xl p-3 mt-4 text-sm text-danger-400">
                      👜 Fee: 20% if ≥ C$20 / flat C$3.95 if under C$20
                    </div>
                  )}

                  {/* Break-Even Alert */}
                  {iForm.hammer_price && (iForm.sold_price || iForm.list_price) && (
                    <div className="mt-4">
                      <AlertBanner
                        hammerPrice={iForm.hammer_price}
                        sellPrice={iForm.sold_price || iForm.list_price}
                        channel={iForm.sale_channel}
                        shippingCost={iForm.shipping_cost_actual}
                        paymentMethod={iForm.payment_method}
                        promotedPct={iForm.promoted_pct}
                        buyerShippingCharge={iForm.shipping_charged_buyer}
                      />
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="text-xs text-surface-400 mb-1 block">Notes</label>
                    <textarea className="input-field" rows={2} value={iForm.notes}
                      onChange={e => setIForm(f => ({ ...f, notes: e.target.value }))} id="item-notes" />
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <button onClick={editItem ? updateItem : createItem} className="btn-primary" id="save-item-btn">
                      {editItem ? 'Update Item' : 'Add Item'}
                    </button>
                    <button onClick={() => { setShowItemForm(false); setEditItem(null); }} className="btn-secondary">Cancel</button>
                  </div>
                </div>
              )}

              {/* Items Table */}
              {selectedAuction.items && selectedAuction.items.length > 0 ? (
                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-700/50">
                          <th className="text-left p-4 text-surface-400 font-medium">Item</th>
                          <th className="text-right p-4 text-surface-400 font-medium">Hammer</th>
                          <th className="text-right p-4 text-surface-400 font-medium">Buy Cost</th>
                          <th className="text-center p-4 text-surface-400 font-medium">Channel</th>
                          <th className="text-center p-4 text-surface-400 font-medium">Status</th>
                          <th className="text-right p-4 text-surface-400 font-medium">Sold</th>
                          <th className="text-right p-4 text-surface-400 font-medium">Profit</th>
                          <th className="text-right p-4 text-surface-400 font-medium">ROI</th>
                          <th className="text-center p-4 text-surface-400 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAuction.items.map(item => (
                          <tr key={item.id} className="border-b border-surface-700/20 hover:bg-surface-700/20 transition-colors">
                            <td className="p-4 text-surface-200 font-medium">{item.name}</td>
                            <td className="p-4 text-right text-surface-300">{fmt(item.hammer_price)}</td>
                            <td className="p-4 text-right text-surface-300">{fmt(item.buy_cost_total)}</td>
                            <td className="p-4 text-center">
                              <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: (CHANNEL_MAP[item.sale_channel]?.color || '#64748b') + '20', color: CHANNEL_MAP[item.sale_channel]?.color || '#64748b' }}>
                                {CHANNEL_MAP[item.sale_channel]?.label?.split(' ')[0] || 'eBay'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`status-badge ${STATUS_COLORS[item.status]}`}>{item.status}</span>
                            </td>
                            <td className="p-4 text-right text-surface-300">{item.sold_price ? fmt(item.sold_price) : '—'}</td>
                            <td className={`p-4 text-right font-medium ${(item.net_profit || 0) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                              {item.net_profit != null ? fmt(item.net_profit) : '—'}
                            </td>
                            <td className="p-4 text-right text-surface-300">
                              {item.roi_pct != null ? `${item.roi_pct.toFixed(1)}%` : '—'}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex gap-2 justify-center">
                                <button onClick={() => startEditItem(item)}
                                  className="text-brand-400 hover:text-brand-300 text-xs font-medium">Edit</button>
                                <button onClick={() => deleteItem(item.id)}
                                  className="text-danger-400 hover:text-danger-300 text-xs font-medium">Del</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-8 text-center text-surface-500">
                  No items in this auction yet.
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 flex items-center justify-center text-surface-500 h-64">
              <div className="text-center">
                <div className="text-4xl mb-3">🔨</div>
                <p>Select an auction to view items</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
