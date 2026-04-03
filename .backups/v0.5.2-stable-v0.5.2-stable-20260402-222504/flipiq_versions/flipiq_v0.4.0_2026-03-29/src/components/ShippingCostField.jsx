import { useState, useEffect } from 'react';
import { api } from '../api';

/**
 * ShippingCostField — Quick-pick buttons + plain $ input
 * Props:
 *   value: current shipping cost (number or string)
 *   onChange: (newValue: string) => void
 */
export default function ShippingCostField({ value, onChange }) {
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    api.listShippingPresets().then(data => {
      setPresets(data.slice(0, 5)); // max 5 quick picks
    }).catch(() => {});
  }, []);

  return (
    <div>
      <label className="block text-xs text-surface-400 mb-1">Your Shipping Cost</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
        <input type="number" value={value} onChange={e => onChange(e.target.value)}
          className="input-field pl-7 w-full" placeholder="0" step="0.01" id="ship-cost" />
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] text-surface-500 self-center mr-1">Quick:</span>
          {presets.map(p => (
            <button key={p.id} type="button"
              onClick={() => onChange(String(p.cost_cad))}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-150 ${
                String(value) === String(p.cost_cad)
                  ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                  : 'bg-surface-700/40 text-surface-400 border border-surface-600/20 hover:text-surface-200 hover:bg-surface-600/40'
              }`}>
              {p.cost_cad === 0 ? 'Free' : `$${p.cost_cad}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
