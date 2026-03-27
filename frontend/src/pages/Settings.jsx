import { useState, useEffect } from 'react';
import { api } from '../api';

const STORE_TIERS = ['none', 'basic', 'premium', 'anchor'];
const TABS = [
  { id: 'general', label: '⚙️ General', icon: '⚙️' },
  { id: 'auction-houses', label: '🏛️ Auction Houses', icon: '🏛️' },
  { id: 'shipping', label: '📦 Shipping', icon: '📦' },
  { id: 'templates', label: '📋 Templates', icon: '📋' },
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
  const [newTemplate, setNewTemplate] = useState({ name: '', category: '', sale_channel: 'ebay' });

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
                  onChange={e => set('province', e.target.value)} id="setting-province">
                  {Object.entries(provinces).map(([code, info]) => (
                    <option key={code} value={code}>{info.name} — {info.rate}% {info.type}</option>
                  ))}
                </select>
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
          <h2 className="text-lg font-semibold text-surface-200 mb-4">🏛️ Auction House Configurations</h2>
          <p className="text-xs text-surface-500 mb-4">Manage preset and custom auction house fee structures</p>
          <div className="space-y-3">
            {auctionHouses.map(h => (
              <div key={h.id} className={`p-4 rounded-xl border transition-all ${
                h.is_default ? 'border-brand-500/40 bg-brand-600/10' : 'border-surface-700/30 bg-surface-800/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-200">{h.name}</span>
                    {h.is_default ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600/30 text-brand-400 border border-brand-500/30">DEFAULT</span> : null}
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
                <div className="flex gap-4 text-xs text-surface-400">
                  <span>Premium: {h.buyer_premium_pct}%</span>
                  <span>Handling: {h.handling_fee_mode === 'flat' ? `$${h.handling_fee_flat}` : h.handling_fee_mode === 'pct' ? `${h.handling_fee_pct}%` : 'None'}</span>
                  <span>Tax: {h.tax_pct}%</span>
                  <span>CC: {h.credit_card_surcharge_pct}%</span>
                </div>
                {editingHouse === h.id && (
                  <div className="mt-3 pt-3 border-t border-surface-700/30 grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-surface-500">Tax Applies To:</span> <span className="text-surface-300 ml-1">{h.tax_applies_to}</span></div>
                    <div><span className="text-surface-500">Online Fee:</span> <span className="text-surface-300 ml-1">{h.online_bidding_fee_pct}%</span></div>
                    <div><span className="text-surface-500">Payment:</span> <span className="text-surface-300 ml-1">{h.payment_methods}</span></div>
                    <div><span className="text-surface-500">Currency:</span> <span className="text-surface-300 ml-1">{h.currency}</span></div>
                  </div>
                )}
              </div>
            ))}
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

      {/* ── TEMPLATES TAB ── */}
      {tab === 'templates' && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">📋 Item Templates</h2>
          <p className="text-xs text-surface-500 mb-4">Save parameter presets for quick loading in the Calculator</p>
          <div className="space-y-2 mb-6">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-700/30 bg-surface-800/30">
                <div>
                  <span className="text-sm text-surface-200 font-medium">{t.name}</span>
                  <span className="text-xs text-surface-500 ml-2">{t.category || 'No category'}</span>
                  <span className="text-xs text-surface-500 ml-2">· {t.sale_channel}</span>
                </div>
                <button onClick={async () => {
                  await api.deleteTemplate(t.id);
                  api.listTemplates().then(setTemplates);
                }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            ))}
            {templates.length === 0 && <p className="text-xs text-surface-500 text-center py-4">No templates yet. Create one below.</p>}
          </div>
          <div className="p-4 rounded-xl border border-surface-700/30 bg-surface-800/20">
            <h3 className="text-sm font-medium text-surface-300 mb-3">Create Template</h3>
            <div className="grid grid-cols-3 gap-3">
              <input className="input-field" placeholder="Template Name" value={newTemplate.name}
                onChange={e => setNewTemplate(t => ({ ...t, name: e.target.value }))} />
              <input className="input-field" placeholder="Category" value={newTemplate.category}
                onChange={e => setNewTemplate(t => ({ ...t, category: e.target.value }))} />
              <select className="input-field" value={newTemplate.sale_channel}
                onChange={e => setNewTemplate(t => ({ ...t, sale_channel: e.target.value }))}>
                <option value="ebay">eBay</option>
                <option value="facebook_local">FB Local</option>
                <option value="facebook_shipped">FB Shipped</option>
                <option value="poshmark">Poshmark</option>
                <option value="kijiji">Kijiji</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button onClick={async () => {
              if (!newTemplate.name) return;
              await api.createTemplate(newTemplate);
              api.listTemplates().then(setTemplates);
              setNewTemplate({ name: '', category: '', sale_channel: 'ebay' });
            }} className="btn-primary mt-3 text-sm">+ Create Template</button>
          </div>
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
