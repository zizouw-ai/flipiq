import { useState, useEffect } from 'react';
import { api, CHANNELS, CHANNEL_MAP } from '../api';

const STORE_TIERS = ['none', 'basic', 'premium', 'anchor'];
const TABS = [
  { id: 'general', label: '⚙️ General', icon: '⚙️' },
  { id: 'auction-houses', label: '🏛️ Buy Cost Sources', icon: '🏛️' },
  { id: 'shipping', label: '📦 Shipping', icon: '📦' },
  { id: 'templates', label: '📋 Profiles', icon: '📋' },
];

export default function Settings() {
  const [tab, setTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);
  const [provinces, setProvinces] = useState({});
  const [auctionHouses, setAuctionHouses] = useState([]);
  const [shippingPresets, setShippingPresets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [editingHouse, setEditingHouse] = useState(null);
  const [newPreset, setNewPreset] = useState({ name: '', carrier: '', cost_cad: 0 });
  const [editingProfile, setEditingProfile] = useState(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showHouseForm, setShowHouseForm] = useState(false);
  const [editingHouseId, setEditingHouseId] = useState(null);
  const emptyHouseForm = {
    name: '',
    buyer_premium_pct: 0,
    handling_fee_flat: 0,
    handling_fee_pct: 0,
    handling_fee_mode: 'none',
    tax_pct: 13.0,
    tax_applies_to: 'subtotal',
    credit_card_surcharge_pct: 0,
    online_bidding_fee_pct: 0,
    payment_methods: 'etransfer,credit_card,cash',
    lot_handling: 'per_item',
    currency: 'CAD',
    notes: ''
  };
  const [houseForm, setHouseForm] = useState(emptyHouseForm);
  const EBAY_CATEGORIES = ['Most Categories (Default)', 'Books & Media', 'Clothing & Shoes', 'Collectibles', 'Electronics', 'Home & Garden', 'Musical Instruments', 'Sporting Goods', 'Toys & Hobbies', 'Video Games'];
  const emptyProfile = {
    profile_type: 'auction', item_name: '', category: '', sale_channel: 'ebay',
    promoted_listing_pct: '', target_margin_pct: '', target_profit_flat: '', target_mode: 'pct',
    buyer_shipping_charge: '', fixed_buy_price: '', typical_sell_price: '',
    ebay_category: 'Most Categories (Default)', ebay_store_toggle: 0, top_rated_toggle: 0,
    insertion_fee_toggle: 0, notes: '',
  };
  const [profileForm, setProfileForm] = useState(emptyProfile);

  useEffect(() => {
    api.getSettings().then(data => {
      const obj = {};
      data.forEach(s => { obj[s.key] = s.value; });
      setSettings(obj);
    }).catch(() => {});
    api.getProvinces().then(setProvinces).catch(() => {});
    api.listAuctionHouses().then(setAuctionHouses).catch(() => {});
    api.listShippingPresets().then(setShippingPresets).catch(() => {});
    api.listTemplates().then(setTemplates).catch(() => {});
  }, []);

  const set = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    const bulk = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
    await api.updateSettingsBulk(bulk);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const canAddAuctionHouse = () => {
    // For now, always allow in dev mode. Later check plan limits
    const customCount = auctionHouses.filter(h => h.user_id !== null).length;
    return customCount < 1; // Free plan: 1 custom config
  };

  const handleSaveAuctionHouse = async () => {
    if (!houseForm.name.trim()) {
      alert('Name is required');
      return;
    }
    const data = { ...houseForm };
    try {
      if (editingHouseId) {
        await api.updateAuctionHouse(editingHouseId, data);
      } else {
        await api.createAuctionHouse(data);
      }
      setShowHouseForm(false);
      setEditingHouseId(null);
      setHouseForm(emptyHouseForm);
      const houses = await api.listAuctionHouses();
      setAuctionHouses(houses);
    } catch (err) {
      alert(`Error: ${err.message || 'Failed to save'}`);
    }
  };

  const handleDuplicateAuctionHouse = (house) => {
    const dup = { ...house };
    dup.name = `${dup.name} (Copy)`;
    delete dup.id;
    delete dup.created_at;
    delete dup.is_default;
    setHouseForm(dup);
    setEditingHouseId(null);
    setShowHouseForm(true);
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
        Settings
      </h1>
      <p className="text-surface-400 text-sm mb-6">Configure FlipIQ defaults, auction houses, shipping, and templates</p>

      {/* Tab Nav */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-surface-800/50 border border-surface-700/30">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === t.id ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/30'
            }`} id={`tab-${t.id}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL TAB ── */}
      {tab === 'general' && (
        <>
          <div className="glass-card p-6 mb-6">
            <h2 className="text-lg font-semibold text-surface-200 mb-4">⚙️ General Defaults</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SettingField label="Default FVF %" type="number"
                value={settings.default_fvf_pct || ''} onChange={v => set('default_fvf_pct', v)} id="setting-fvf" />
              <SettingField label="Default Target Profit %" type="number"
                value={settings.default_target_profit_pct || ''} onChange={v => set('default_target_profit_pct', v)} id="setting-target" />
              <SettingField label="Default Promoted %" type="number"
                value={settings.default_promoted_pct || ''} onChange={v => set('default_promoted_pct', v)} id="setting-promoted" />
              <SettingField label="Default Target Margin %" type="number"
                value={settings.default_target_margin_pct || ''} onChange={v => set('default_target_margin_pct', v)} id="setting-margin" />

              <div>
                <label className="text-xs font-medium text-surface-400 mb-1 block">Payment Method</label>
                <select className="input-field" value={settings.default_payment_method || 'etransfer'}
                  onChange={e => set('default_payment_method', e.target.value)} id="setting-payment">
                  <option value="etransfer">E-Transfer</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-surface-400 mb-1 block">Buyer Shipping</label>
                <select className="input-field" value={settings.default_buyer_shipping || 'free'}
                  onChange={e => set('default_buyer_shipping', e.target.value)} id="setting-shipping">
                  <option value="free">Free Shipping</option>
                  <option value="passthrough">Pass-through to Buyer</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-surface-400 mb-1 block">Province</label>
                <select className="input-field" value={settings.province || 'ON'}
                  onChange={e => set('province', e.target.value)} id="setting-province"
                  disabled={settings.use_custom_tax === '1'}>
                  {Object.entries(provinces).map(([code, info]) => (
                    <option key={code} value={code}>{info.name} — {info.rate}% {info.type}</option>
                  ))}
                </select>
              </div>

              {/* Custom Tax Override */}
              <div className="col-span-full bg-surface-800/30 rounded-xl p-4 border border-surface-700/30">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input type="checkbox" checked={settings.use_custom_tax === '1'}
                    onChange={e => set('use_custom_tax', e.target.checked ? '1' : '0')}
                    className="w-4 h-4 rounded accent-brand-500" id="setting-custom-tax-toggle" />
                  <span className="text-sm text-surface-200 font-medium">Use custom tax rate (override province tax)</span>
                </label>
                {settings.use_custom_tax === '1' && (
                  <div className="grid grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Custom Tax Rate (%)</label>
                      <input type="number" className="input-field" step="0.01"
                        value={settings.custom_tax_pct || ''} placeholder="e.g. 8.5"
                        onChange={e => set('custom_tax_pct', e.target.value)} id="setting-custom-tax-rate" />
                    </div>
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Tax Label</label>
                      <input type="text" className="input-field"
                        value={settings.custom_tax_label || ''} placeholder="e.g. State/Local Tax"
                        onChange={e => set('custom_tax_label', e.target.value)} id="setting-custom-tax-label" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-surface-400 mb-1 block">Store Tier</label>
                <select className="input-field" value={settings.store_tier || 'none'}
                  onChange={e => set('store_tier', e.target.value)} id="setting-store-tier">
                  {STORE_TIERS.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}{t === 'none' ? ' (No Store)' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-surface-400 mb-1 block">Currency</label>
                <select className="input-field" value={settings.currency || 'CAD'}
                  onChange={e => set('currency', e.target.value)} id="setting-currency">
                  <option value="CAD">CAD 🇨🇦</option>
                  <option value="USD">USD 🇺🇸</option>
                </select>
              </div>

              <SettingField label="Monthly Profit Goal ($)" type="number"
                value={settings.monthly_profit_goal_cad || ''} onChange={v => set('monthly_profit_goal_cad', v)} id="setting-goal" />
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <ToggleSetting label="Top Rated Seller" desc="10% discount on FVF"
                checked={settings.top_rated_seller === 'true'} onChange={v => set('top_rated_seller', String(v))} id="setting-top-rated" />
              <ToggleSetting label="Below Standard" desc="5% surcharge on FVF"
                checked={settings.below_standard === 'true'} onChange={v => set('below_standard', String(v))} id="setting-below" />
            </div>
          </div>
          <button onClick={save} className="btn-primary w-full" id="save-settings-btn">
            {saved ? '✓ Saved!' : '💾 Save Settings'}
          </button>
        </>
      )}

      {/* ── AUCTION HOUSES TAB ── */}
      {tab === 'auction-houses' && (
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-surface-200">🏛️ Buy Cost Sources</h2>
          <button
            onClick={() => {
              setEditingHouseId(null);
              setHouseForm(emptyHouseForm);
              setShowHouseForm(true);
            }}
            className="btn-primary text-sm"
          >
            + New Buy Cost Source
          </button>
        </div>
        <p className="text-xs text-surface-500 mb-6">Select where you buy inventory. Each source has different fee structures.</p>

        <div className="space-y-4">
            {auctionHouses.map(h => (
              <div key={h.id} className={`p-4 rounded-xl border transition-all ${
                h.is_default ? 'border-brand-500/40 bg-brand-600/10' : 'border-surface-700/30 bg-surface-800/30'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-surface-200">{h.name.replace(/\s*\d+%$/, '')}</span>
              {h.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/30 text-brand-400 border border-brand-500/30">DEFAULT</span>}
              {h.user_id !== null && <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/30 text-accent-400 border border-accent-500/30">CUSTOM</span>}
            </div>
                    {h.notes && <p className="text-xs text-surface-500 mb-2">{h.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    {!h.is_default && (
                      <button onClick={async () => {
                        await api.setDefaultAuctionHouse(h.id);
                        api.listAuctionHouses().then(setAuctionHouses);
                      }} className="text-xs text-surface-400 hover:text-brand-400">Set Default</button>
                    )}
                    <button onClick={() => setEditingHouse(editingHouse === h.id ? null : h.id)}
                      className="text-xs text-surface-400 hover:text-surface-200">{editingHouse === h.id ? 'Close' : 'Details'}</button>
                  </div>
                </div>
                
  {/* Fee Summary - Compact View - Only show non-zero values */}
  <div className="flex flex-wrap gap-4 text-xs">
    {h.buyer_premium_pct > 0 && (
      <span className="text-surface-400">
        <span className="text-surface-500">Premium:</span>
        <span className="text-brand-400"> {h.buyer_premium_pct}%</span>
      </span>
    )}
    {(h.handling_fee_flat > 0 || h.handling_fee_pct > 0) && (
      <span className="text-surface-400">
        <span className="text-surface-500">Handling:</span>
        <span className="text-brand-400">
          {' '}{h.handling_fee_mode === 'flat' && h.handling_fee_flat > 0 ? `$${h.handling_fee_flat}` : h.handling_fee_mode === 'pct' && h.handling_fee_pct > 0 ? `${h.handling_fee_pct}%` : ''}
        </span>
      </span>
    )}
    <span className="text-surface-400">
      <span className="text-surface-500">Tax:</span>
      <span className={h.tax_pct > 0 ? 'text-brand-400' : 'text-surface-300'}> {h.tax_pct}%</span>
    </span>
    {h.credit_card_surcharge_pct > 0 && (
      <span className="text-surface-400">
        <span className="text-surface-500">CC Fee:</span>
        <span className="text-brand-400"> {h.credit_card_surcharge_pct}%</span>
      </span>
    )}
  </div>
                
                {/* Expanded Details */}
                {editingHouse === h.id && (
                  <div className="mt-4 pt-4 border-t border-surface-700/30">
                    {/* Warning for preset configs */}
                    {!h.name.includes('Custom') && (
                      <div className="mb-4 p-3 rounded-lg bg-surface-700/30 border border-surface-600/30">
                        <p className="text-xs text-surface-400">
                          <span className="text-brand-400">ℹ️</span> This is a preset configuration. 
                          {h.name.includes('Encore') 
                            ? 'Encore Auctions fees are set by the auction house and cannot be changed.'
                            : 'These are typical fees for this source type.'}
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-2 rounded-lg bg-surface-800/50">
                        <span className="text-surface-500 block mb-1">Buyer's Premium</span>
                        <span className="text-surface-200 font-medium">{h.buyer_premium_pct}%</span>
                        <p className="text-[10px] text-surface-500 mt-1">Added to hammer price</p>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-800/50">
                        <span className="text-surface-500 block mb-1">Handling Fee</span>
                        <span className="text-surface-200 font-medium">
                          {h.handling_fee_mode === 'flat' && h.handling_fee_flat > 0 ? `$${h.handling_fee_flat} flat` : 
                           h.handling_fee_mode === 'pct' ? `${h.handling_fee_pct}%` : 
                           'None'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-800/50">
                        <span className="text-surface-500 block mb-1">Tax Rate</span>
                        <span className="text-surface-200 font-medium">{h.tax_pct}%</span>
                        <p className="text-[10px] text-surface-500 mt-1">Applied to: {h.tax_applies_to}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-800/50">
                        <span className="text-surface-500 block mb-1">Credit Card Fee</span>
                        <span className="text-surface-200 font-medium">{h.credit_card_surcharge_pct}%</span>
                        <p className="text-[10px] text-surface-500 mt-1">If paying by CC</p>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-800/50">
                        <span className="text-surface-500 block mb-1">Payment Methods</span>
                        <span className="text-surface-200 font-medium">{h.payment_methods?.replace(/,/g, ', ') || 'Cash'}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-800/50">
                        <span className="text-surface-500 block mb-1">Currency</span>
                        <span className="text-surface-200 font-medium">{h.currency}</span>
                      </div>
                    </div>
                    
            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              {h.user_id !== null && (
                <>
                  <button
                    onClick={() => {
                      setEditingHouseId(h.id);
                      setHouseForm({ ...h });
                      setShowHouseForm(true);
                    }}
                    className="btn-secondary text-xs"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDuplicateAuctionHouse(h)}
                    className="text-xs text-accent-400 hover:text-accent-300"
                  >
                    📝 Duplicate
                  </button>
                </>
              )}
              
              {/* Delete available for ALL configs with confirmation */}
              <button
                onClick={async () => {
                  const isSystemPreset = h.user_id === null;
                  const message = isSystemPreset 
                    ? `Delete "${h.name}"?\n\n⚠️ This is a system preset. You can recreate it later, but it will be removed permanently.` 
                    : `Delete "${h.name}"?\n\nThis cannot be undone.`;
                  if (!confirm(message)) return;
                  await api.deleteAuctionHouse(h.id);
                  const houses = await api.listAuctionHouses();
                  setAuctionHouses(houses);
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                🗑️ Delete
              </button>
              
              {!h.is_default && (
                <button onClick={async () => {
                  await api.setDefaultAuctionHouse(h.id);
                  api.listAuctionHouses().then(setAuctionHouses);
                }} className="text-xs text-surface-400 hover:text-brand-400">
                  Set Default
                </button>
              )}
            </div>
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Create / Edit Form */}
        {showHouseForm && (
          <div className="p-5 rounded-xl border border-surface-600/30 bg-surface-800/20 animate-fade-in mt-6">
            <h3 className="text-sm font-semibold text-surface-200 mb-4">
              {editingHouseId ? 'Edit Buy Cost Source' : 'New Buy Cost Source'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Name *</label>
                <input
                  className="input-field"
                  value={houseForm.name}
                  onChange={e => setHouseForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. My Local Auction House"
                />
              </div>
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Currency</label>
                <select
                  className="input-field"
                  value={houseForm.currency}
                  onChange={e => setHouseForm(f => ({ ...f, currency: e.target.value }))}
                >
                  <option value="CAD">CAD 🇨🇦</option>
                  <option value="USD">USD 🇺🇸</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Buyer's Premium %</label>
                <input
                  type="number"
                  className="input-field"
                  step="0.1"
                  value={houseForm.buyer_premium_pct}
                  onChange={e => setHouseForm(f => ({ ...f, buyer_premium_pct: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Credit Card Fee %</label>
                <input
                  type="number"
                  className="input-field"
                  step="0.1"
                  value={houseForm.credit_card_surcharge_pct}
                  onChange={e => setHouseForm(f => ({ ...f, credit_card_surcharge_pct: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Online Bidding Fee %</label>
                <input
                  type="number"
                  className="input-field"
                  step="0.1"
                  value={houseForm.online_bidding_fee_pct}
                  onChange={e => setHouseForm(f => ({ ...f, online_bidding_fee_pct: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Tax Rate %</label>
                <input
                  type="number"
                  className="input-field"
                  step="0.1"
                  value={houseForm.tax_pct}
                  onChange={e => setHouseForm(f => ({ ...f, tax_pct: parseFloat(e.target.value) || 13.0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Handling Fee Mode</label>
                <select
                  className="input-field"
                  value={houseForm.handling_fee_mode}
                  onChange={e => setHouseForm(f => ({ ...f, handling_fee_mode: e.target.value }))}
                >
                  <option value="none">None</option>
                  <option value="flat">Flat Rate</option>
                  <option value="pct">Percentage</option>
                </select>
              </div>
              {houseForm.handling_fee_mode !== 'none' && (
                <div>
                  <label className="text-xs text-surface-400 mb-1 block">
                    {houseForm.handling_fee_mode === 'flat' ? 'Handling Fee $' : 'Handling Fee %'}
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    step="0.01"
                    value={houseForm.handling_fee_mode === 'flat' ? houseForm.handling_fee_flat : houseForm.handling_fee_pct}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setHouseForm(f => ({
                        ...f,
                        handling_fee_flat: houseForm.handling_fee_mode === 'flat' ? val : f.handling_fee_flat,
                        handling_fee_pct: houseForm.handling_fee_mode === 'pct' ? val : f.handling_fee_pct
                      }));
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Tax Applies To</label>
                <select
                  className="input-field"
                  value={houseForm.tax_applies_to}
                  onChange={e => setHouseForm(f => ({ ...f, tax_applies_to: e.target.value }))}
                >
                  <option value="subtotal">Subtotal + Premium</option>
                  <option value="hammer_only">Hammer Only</option>
                  <option value="all">All Fees</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-surface-400 mb-1 block">Payment Methods</label>
                <input
                  className="input-field"
                  value={houseForm.payment_methods}
                  onChange={e => setHouseForm(f => ({ ...f, payment_methods: e.target.value }))}
                  placeholder="etransfer,credit_card,cash"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-surface-400 mb-1 block">Notes (optional)</label>
              <textarea
                className="input-field"
                rows="3"
                value={houseForm.notes}
                onChange={e => setHouseForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Description or additional details..."
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveAuctionHouse}
                className="btn-primary"
              >
                {editingHouseId ? 'Update' : 'Create'} Buy Cost Source
              </button>
              <button
                onClick={() => {
                  setShowHouseForm(false);
                  setEditingHouseId(null);
                  setHouseForm(emptyHouseForm);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 rounded-lg bg-surface-800/30 border border-surface-700/30">
          <p className="text-xs text-surface-400">
            <span className="text-brand-400">💡 Tip:</span> Select the source that matches where you buy inventory.
            The default will be pre-selected when creating new auctions.
            <span className="text-accent-400">Custom Buy Cost</span> allows you to set your own fees for unique situations.
          </p>
        </div>
      </div>
    )}

      {/* ── SHIPPING TAB ── */}
      {tab === 'shipping' && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">📦 Shipping Rate Presets</h2>
          <div className="space-y-2 mb-6">
            {shippingPresets.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-700/30 bg-surface-800/30">
                <div>
                  <span className="text-sm text-surface-200">{p.name}</span>
                  <span className="text-xs text-surface-500 ml-2">{p.carrier}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-brand-400">${p.cost_cad.toFixed(2)}</span>
                  {p.max_weight_kg && <span className="text-[10px] text-surface-500">≤{p.max_weight_kg}kg</span>}
                  <button onClick={async () => {
                    await api.deleteShippingPreset(p.id);
                    api.listShippingPresets().then(setShippingPresets);
                  }} className="text-xs text-red-400 hover:text-red-300">×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl border border-surface-700/30 bg-surface-800/20">
            <h3 className="text-sm font-medium text-surface-300 mb-3">Add Custom Preset</h3>
            <div className="grid grid-cols-3 gap-3">
              <input className="input-field" placeholder="Name" value={newPreset.name}
                onChange={e => setNewPreset(p => ({ ...p, name: e.target.value }))} />
              <input className="input-field" placeholder="Carrier" value={newPreset.carrier}
                onChange={e => setNewPreset(p => ({ ...p, carrier: e.target.value }))} />
              <input className="input-field" type="number" placeholder="Cost $" value={newPreset.cost_cad || ''}
                onChange={e => setNewPreset(p => ({ ...p, cost_cad: parseFloat(e.target.value) || 0 }))} />
            </div>
            <button onClick={async () => {
              if (!newPreset.name) return;
              await api.createShippingPreset(newPreset);
              api.listShippingPresets().then(setShippingPresets);
              setNewPreset({ name: '', carrier: '', cost_cad: 0 });
            }} className="btn-primary mt-3 text-sm">+ Add Preset</button>
          </div>
        </div>
      )}

      {/* ── PRODUCT PROFILES TAB ── */}
      {tab === 'templates' && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-surface-200">📋 Product Profiles</h2>
              <p className="text-xs text-surface-500">Save product settings for quick loading in Auction Tracker</p>
            </div>
            <button onClick={() => {
              setEditingProfile(null);
              setProfileForm(emptyProfile);
              setShowProfileForm(true);
            }} className="btn-primary text-sm">+ New Product Profile</button>
          </div>

          {/* Profile Cards */}
          {!showProfileForm && (
            <div className="space-y-3">
              {templates.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-surface-700/30 bg-surface-800/30 hover:bg-surface-700/20 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-surface-200 font-semibold">{p.item_name || p.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          p.profile_type === 'fixed'
                            ? 'bg-accent-500/20 text-accent-400'
                            : 'bg-brand-500/20 text-brand-400'
                        }`}>
                          {p.profile_type === 'fixed' ? 'Fixed Cost' : 'Auction'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-700/50 text-surface-400">
                          {CHANNEL_MAP[p.sale_channel]?.label || p.sale_channel}
                        </span>
                        {p.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-700/50 text-surface-400">
                            {p.category}
                          </span>
                        )}
                        {p.target_margin_pct > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-700/50 text-surface-400">
                            {p.target_margin_pct}% margin
                          </span>
                        )}
                        {p.promoted_listing_pct > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-700/50 text-surface-400">
                            {p.promoted_listing_pct}% promoted
                          </span>
                        )}
                        {p.fixed_buy_price && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-400">
                            Buy: ${p.fixed_buy_price}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => {
                        setEditingProfile(p.id);
                        setProfileForm({
                          profile_type: p.profile_type || 'auction',
                          item_name: p.item_name || p.name || '',
                          category: p.category || '',
                          sale_channel: p.sale_channel || 'ebay',
                          promoted_listing_pct: p.promoted_listing_pct || '',
                          target_margin_pct: p.target_margin_pct || '',
                          target_profit_flat: p.target_profit_flat || '',
                          target_mode: p.target_mode || 'pct',
                          buyer_shipping_charge: p.buyer_shipping_charge || '',
                          fixed_buy_price: p.fixed_buy_price || '',
                          typical_sell_price: p.typical_sell_price || '',
                          ebay_category: p.ebay_category || 'Most Categories (Default)',
                          ebay_store_toggle: p.ebay_store_toggle || 0,
                          top_rated_toggle: p.top_rated_toggle || 0,
                          insertion_fee_toggle: p.insertion_fee_toggle || 0,
                          notes: p.notes || '',
                        });
                        setShowProfileForm(true);
                      }} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">✏️ Edit</button>
                      <button onClick={async () => {
                        if (!confirm('Delete this profile?')) return;
                        await api.deleteTemplate(p.id);
                        api.listTemplates().then(setTemplates);
                      }} className="text-xs text-red-400 hover:text-red-300 transition-colors">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-surface-400 mb-2">No profiles yet</p>
                  <p className="text-xs text-surface-500">Create your first product profile to speed up item entry</p>
                </div>
              )}
            </div>
          )}

          {/* Create / Edit Form */}
          {showProfileForm && (
            <div className="p-5 rounded-xl border border-surface-600/30 bg-surface-800/20 animate-fade-in">
              <h3 className="text-sm font-semibold text-surface-200 mb-4">
                {editingProfile ? 'Edit Profile' : 'New Product Profile'}
              </h3>

              {/* Profile Type Toggle */}
              <div className="flex gap-2 mb-5">
                {['auction', 'fixed'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setProfileForm(f => ({ ...f, profile_type: t }))}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      profileForm.profile_type === t
                        ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                        : 'bg-surface-700/40 text-surface-400 border border-surface-600/20 hover:text-surface-200'
                    }`}>
                    {t === 'auction' ? '🔨 Auction Profile' : '📦 Fixed Cost Profile'}
                  </button>
                ))}
              </div>

              {/* Product Name + Category */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-surface-400 mb-1 block">Product Name *</label>
                  <input className="input-field" value={profileForm.item_name} placeholder="e.g. Dyson V8"
                    onChange={e => setProfileForm(f => ({ ...f, item_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-surface-400 mb-1 block">Category Tag</label>
                  <input className="input-field" value={profileForm.category} placeholder="e.g. Vacuums, Electronics"
                    onChange={e => setProfileForm(f => ({ ...f, category: e.target.value }))} />
                </div>
              </div>

              {/* eBay Settings */}
              <div className="border border-surface-700/20 rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-surface-400 mb-3">eBay Settings</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">Sale Channel</label>
                    <select className="input-field" value={profileForm.sale_channel}
                      onChange={e => setProfileForm(f => ({ ...f, sale_channel: e.target.value }))}>
                      {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">eBay Category</label>
                    <select className="input-field" value={profileForm.ebay_category}
                      onChange={e => setProfileForm(f => ({ ...f, ebay_category: e.target.value }))}>
                      {EBAY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">Promoted %</label>
                    <input type="number" className="input-field" value={profileForm.promoted_listing_pct}
                      placeholder="5" step="0.1"
                      onChange={e => setProfileForm(f => ({ ...f, promoted_listing_pct: e.target.value }))} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-3">
                  {[['ebay_store_toggle', 'eBay Store'], ['top_rated_toggle', 'Top Rated'], ['insertion_fee_toggle', 'Insertion Fee']].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-xs text-surface-300 cursor-pointer">
                      <input type="checkbox" checked={profileForm[key] === 1}
                        onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.checked ? 1 : 0 }))}
                        className="w-3.5 h-3.5 rounded accent-brand-500" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Pricing Settings */}
              <div className="border border-surface-700/20 rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-surface-400 mb-3">Pricing Settings</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">Target Profit</label>
                    <div className="flex gap-1">
                      <select className="input-field w-20" value={profileForm.target_mode}
                        onChange={e => setProfileForm(f => ({ ...f, target_mode: e.target.value }))}>
                        <option value="pct">%</option>
                        <option value="flat">$</option>
                      </select>
                      <input type="number" className="input-field flex-1" placeholder="30"
                        value={profileForm.target_mode === 'pct' ? profileForm.target_margin_pct : profileForm.target_profit_flat}
                        onChange={e => setProfileForm(f => ({
                          ...f,
                          [f.target_mode === 'pct' ? 'target_margin_pct' : 'target_profit_flat']: e.target.value,
                        }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-surface-400 mb-1 block">Buyer Shipping</label>
                    <input type="number" className="input-field" placeholder="$0" step="0.01"
                      value={profileForm.buyer_shipping_charge}
                      onChange={e => setProfileForm(f => ({ ...f, buyer_shipping_charge: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Fixed Cost Fields (only for fixed profiles) */}
              {profileForm.profile_type === 'fixed' && (
                <div className="border border-accent-500/20 rounded-lg p-4 mb-4 bg-accent-500/5 animate-fade-in">
                  <p className="text-xs font-medium text-accent-400 mb-3">Fixed Cost — Buy Price</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Your Buy Price *</label>
                      <input type="number" className="input-field" placeholder="$45.00" step="0.01"
                        value={profileForm.fixed_buy_price}
                        onChange={e => setProfileForm(f => ({ ...f, fixed_buy_price: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-surface-400 mb-1 block">Typical Sell Price (hint)</label>
                      <input type="number" className="input-field" placeholder="$120.00" step="0.01"
                        value={profileForm.typical_sell_price}
                        onChange={e => setProfileForm(f => ({ ...f, typical_sell_price: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="mb-4">
                <label className="text-xs text-surface-400 mb-1 block">Notes</label>
                <textarea className="input-field" rows={2} value={profileForm.notes} placeholder="Optional notes..."
                  onChange={e => setProfileForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="btn-primary text-sm" onClick={async () => {
                  if (!profileForm.item_name.trim()) {
                    alert('Product Name is required'); return;
                  }
                  const payload = {
                    ...profileForm,
                    promoted_listing_pct: parseFloat(profileForm.promoted_listing_pct) || 0,
                    target_margin_pct: parseFloat(profileForm.target_margin_pct) || 0,
                    target_profit_flat: parseFloat(profileForm.target_profit_flat) || 0,
                    buyer_shipping_charge: parseFloat(profileForm.buyer_shipping_charge) || 0,
                    fixed_buy_price: profileForm.profile_type === 'fixed' ? (parseFloat(profileForm.fixed_buy_price) || null) : null,
                    typical_sell_price: profileForm.profile_type === 'fixed' ? (parseFloat(profileForm.typical_sell_price) || null) : null,
                  };
                  if (editingProfile) {
                    await api.updateTemplate(editingProfile, payload);
                  } else {
                    await api.createTemplate(payload);
                  }
                  api.listTemplates().then(setTemplates);
                  setShowProfileForm(false);
                  setEditingProfile(null);
                  setProfileForm(emptyProfile);
                }}>{editingProfile ? 'Update Profile' : 'Save Profile'}</button>
                <button className="btn-secondary text-sm" onClick={() => {
                  setShowProfileForm(false);
                  setEditingProfile(null);
                  setProfileForm(emptyProfile);
                }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingField({ label, type = 'text', value, onChange, id }) {
  return (
    <div>
      <label className="text-xs font-medium text-surface-400 mb-1 block">{label}</label>
      <input type={type} className="input-field" value={value}
        onChange={e => onChange(e.target.value)} id={id} />
    </div>
  );
}

function ToggleSetting({ label, desc, checked, onChange, id }) {
  return (
    <div className="flex items-center justify-between" id={id}>
      <div>
        <span className="text-sm text-surface-200 font-medium">{label}</span>
        <p className="text-xs text-surface-500">{desc}</p>
      </div>
      <div className={`w-11 h-6 rounded-full relative cursor-pointer transition-all duration-200 ${checked ? 'bg-brand-600' : 'bg-surface-600'}`}
        onClick={() => onChange(!checked)}>
        <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${checked ? 'left-5.5' : 'left-0.5'}`} />
      </div>
    </div>
  );
}
