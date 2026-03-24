import { useState, useEffect } from 'react';
import { api } from '../api';

const STORE_TIERS = ['none', 'basic', 'premium', 'anchor'];

const SETTING_LABELS = {
  default_fvf_pct: 'Default FVF %',
  default_target_profit_pct: 'Default Target Profit %',
  default_payment_method: 'Payment Method',
  default_buyer_shipping: 'Default Buyer Shipping',
  store_tier: 'Store Tier',
  top_rated_seller: 'Top Rated Seller',
  below_standard: 'Below Standard',
  currency: 'Currency',
  default_promoted_pct: 'Default Promoted Listing %',
};

const CATEGORIES_DEFAULT = [
  { name: 'Most Categories (Default)', fvf: '13.6' },
  { name: 'Electronics', fvf: '13.25' },
  { name: 'Clothing', fvf: '13.25' },
  { name: 'Collectibles', fvf: '13.25' },
  { name: 'Musical Instruments', fvf: '6.7' },
  { name: 'Books', fvf: '14.95' },
];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(data => {
      const obj = {};
      data.forEach(s => { obj[s.key] = s.value; });
      setSettings(obj);
    }).catch(() => {});
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
    <div className="animate-fade-in max-w-3xl">
      <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
        Settings
      </h1>
      <p className="text-surface-400 text-sm mb-6">Configure your FlipIQ defaults — persisted to database</p>

      {/* General Settings */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-4">⚙️ General Defaults</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingField label="Default FVF %" type="number"
            value={settings.default_fvf_pct || ''} onChange={v => set('default_fvf_pct', v)} id="setting-fvf" />
          <SettingField label="Default Target Profit %" type="number"
            value={settings.default_target_profit_pct || ''} onChange={v => set('default_target_profit_pct', v)} id="setting-target" />
          <SettingField label="Default Promoted %" type="number"
            value={settings.default_promoted_pct || ''} onChange={v => set('default_promoted_pct', v)} id="setting-promoted" />

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
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-3 mt-6">
          <ToggleSetting label="Top Rated Seller" desc="10% discount on FVF"
            checked={settings.top_rated_seller === 'true'} onChange={v => set('top_rated_seller', String(v))} id="setting-top-rated" />
          <ToggleSetting label="Below Standard" desc="5% surcharge on FVF"
            checked={settings.below_standard === 'true'} onChange={v => set('below_standard', String(v))} id="setting-below" />
        </div>
      </div>

      {/* Category FVF Defaults */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-surface-200 mb-4">📋 Default FVF by Category</h2>
        <div className="space-y-3">
          {CATEGORIES_DEFAULT.map(cat => (
            <div key={cat.name} className="flex items-center justify-between py-2 border-b border-surface-700/30 last:border-0">
              <span className="text-sm text-surface-300">{cat.name}</span>
              <span className="text-sm text-brand-400 font-medium">{cat.fvf}%</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-surface-500 mt-3">
          Full category rates are loaded from the eBay categories in the calculator.
        </p>
      </div>

      {/* Save */}
      <button onClick={save} className="btn-primary w-full" id="save-settings-btn">
        {saved ? '✓ Saved!' : '💾 Save Settings'}
      </button>
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
