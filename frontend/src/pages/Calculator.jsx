import { useState, useEffect } from 'react';
import { api, CHANNELS, CHANNEL_MAP } from '../api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const MODES = [
  { id: 1, label: 'Forward Pricing', desc: 'Buy → Sell Price' },
  { id: 2, label: 'Reverse Lookup', desc: 'Sold → Profit' },
  { id: 3, label: 'Lot Splitter', desc: 'Split lot costs' },
  { id: 4, label: 'Max Ad Spend', desc: 'Ad budget calc' },
  { id: 5, label: 'Price Sensitivity', desc: 'Live slider' },
];

function fmt(v) { return v !== null && v !== undefined ? `$${Number(v).toFixed(2)}` : '—'; }
function pct(v) { return v !== null && v !== undefined ? `${Number(v).toFixed(2)}%` : '—'; }

const NO_AD_CHANNELS = ['facebook_local', 'facebook_shipped', 'poshmark', 'kijiji', 'other'];

export default function Calculator() {
  const [mode, setMode] = useState(1);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    hammer_price: '', payment_method: 'etransfer',
    shipping_cost_actual: '0', buyer_shipping_charge: '0',
    promoted_pct: '0', category: 'Most Categories (Default)',
    has_store: false, top_rated: false, below_standard: false,
    insertion_fee: false, target_profit_dollar: '', target_profit_pct: '',
    sold_price: '', total_hammer_price: '', num_items: '2',
    per_item_sell_price: '', sell_price: '',
    sale_channel: 'ebay',
  });

  const [profitType, setProfitType] = useState('dollar');
  const [sliderValue, setSliderValue] = useState(50);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const num = (v) => v === '' ? undefined : parseFloat(v);
  const ch = form.sale_channel;
  const isEbay = ch === 'ebay';
  const noFeeChannel = ch === 'kijiji' || ch === 'facebook_local';
  const isMode4Disabled = NO_AD_CHANNELS.includes(ch);

  const calculate = async () => {
    setLoading(true);
    try {
      let data;
      const base = {
        payment_method: form.payment_method,
        shipping_cost_actual: num(form.shipping_cost_actual) || 0,
        buyer_shipping_charge: num(form.buyer_shipping_charge) || 0,
        promoted_pct: num(form.promoted_pct) || 0,
        category: form.category,
        has_store: form.has_store,
        top_rated: form.top_rated,
        below_standard: form.below_standard,
        insertion_fee: form.insertion_fee,
        sale_channel: ch,
      };

      if (mode === 1) {
        data = await api.calcMode1({
          ...base, hammer_price: num(form.hammer_price),
          ...(profitType === 'dollar'
            ? { target_profit_dollar: num(form.target_profit_dollar) }
            : { target_profit_pct: num(form.target_profit_pct) }),
        });
      } else if (mode === 2) {
        data = await api.calcMode2({
          ...base, sold_price: num(form.sold_price), hammer_price: num(form.hammer_price),
        });
      } else if (mode === 3) {
        data = await api.calcMode3({
          ...base, total_hammer_price: num(form.total_hammer_price),
          num_items: parseInt(form.num_items) || 2,
          per_item_sell_price: num(form.per_item_sell_price) || null,
          ...(profitType === 'dollar'
            ? { target_profit_dollar: num(form.target_profit_dollar) }
            : { target_profit_pct: num(form.target_profit_pct) }),
        });
      } else if (mode === 4) {
        data = await api.calcMode4({
          ...base, sell_price: num(form.sell_price), hammer_price: num(form.hammer_price),
          ...(profitType === 'dollar'
            ? { target_profit_dollar: num(form.target_profit_dollar) }
            : { target_profit_pct: num(form.target_profit_pct) }),
        });
      } else if (mode === 5) {
        data = await api.calcMode5({
          ...base, hammer_price: num(form.hammer_price), num_points: 50,
        });
      }
      setResult(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const sliderData = result?.mode === 'price_sensitivity' ? result.data_points : null;
  const currentSliderPoint = sliderData ? sliderData[Math.min(sliderValue, sliderData.length - 1)] : null;

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
        Pricing Calculator
      </h1>
      <p className="text-surface-400 text-sm mb-6">Calculate optimal sell prices across platforms</p>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" id="mode-selector">
        {MODES.map(m => (
          <button key={m.id}
            onClick={() => {
              if (m.id === 4 && isMode4Disabled) return;
              setMode(m.id); setResult(null);
            }}
            disabled={m.id === 4 && isMode4Disabled}
            title={m.id === 4 && isMode4Disabled ? `Ad spend not applicable on ${CHANNEL_MAP[ch]?.label}` : ''}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              m.id === 4 && isMode4Disabled
                ? 'opacity-40 cursor-not-allowed glass-card text-surface-500'
                : mode === m.id
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30 shadow-lg shadow-brand-500/10'
                  : 'glass-card text-surface-400 hover:text-surface-200 cursor-pointer'
            }`}>
            <div className="font-semibold">{m.label}</div>
            <div className="text-xs opacity-60 mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="glass-card p-6 lg:col-span-1">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">📥 Inputs</h2>

          {/* Channel Selector — TOP OF INPUTS */}
          <Label text="Selling On" />
          <select value={ch} onChange={e => { set('sale_channel', e.target.value); setResult(null); }}
            className="input-field mb-3" id="channel-select">
            {CHANNELS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* Channel Info Banner */}
          {ch === 'kijiji' && (
            <div className="bg-success-400/10 border border-success-400/20 rounded-xl p-3 mb-4 text-sm text-success-400">
              🟢 Kijiji = zero overhead. Every dollar above buy cost is pure profit.
            </div>
          )}
          {ch === 'facebook_local' && (
            <div className="bg-success-400/10 border border-success-400/20 rounded-xl p-3 mb-4 text-sm text-success-400">
              🟢 Local cash sale — no fees, no shipping
            </div>
          )}
          {ch === 'facebook_shipped' && (
            <div className="bg-warning-400/10 border border-warning-400/20 rounded-xl p-3 mb-4 text-sm text-warning-400">
              📦 Fee: 10% of sale price (min $0.80)
            </div>
          )}
          {ch === 'poshmark' && (
            <div className="bg-danger-400/10 border border-danger-400/20 rounded-xl p-3 mb-4 text-sm text-danger-400">
              👜 Fee: 20% if ≥ C$20 / flat C$3.95 if under C$20. Shipping: Poshmark provides prepaid label to buyer.
            </div>
          )}

          {/* Hammer Price (modes 1,2,4,5) or Total Hammer (mode 3) */}
          {mode === 3 ? (
            <>
              <Label text="Total Hammer Price (Lot)" />
              <Input value={form.total_hammer_price} onChange={v => set('total_hammer_price', v)} prefix="$" id="total-hammer" />
              <Label text="Number of Items" />
              <Input value={form.num_items} onChange={v => set('num_items', v)} id="num-items" />
              <Label text="Per-Item Sell Price (optional)" />
              <Input value={form.per_item_sell_price} onChange={v => set('per_item_sell_price', v)} prefix="$" id="per-item-price" />
            </>
          ) : (
            <>
              <Label text="Hammer Price" />
              <Input value={form.hammer_price} onChange={v => set('hammer_price', v)} prefix="$" id="hammer-price" />
            </>
          )}

          {mode === 2 && (
            <>
              <Label text="Sold Price" />
              <Input value={form.sold_price} onChange={v => set('sold_price', v)} prefix="$" id="sold-price" />
            </>
          )}
          {mode === 4 && (
            <>
              <Label text="Sell Price" />
              <Input value={form.sell_price} onChange={v => set('sell_price', v)} prefix="$" id="sell-price" />
            </>
          )}

          {/* Payment Method */}
          <Label text="Payment Method" />
          <div className="flex gap-2 mb-4" id="payment-toggle">
            <ToggleBtn active={form.payment_method === 'etransfer'} onClick={() => set('payment_method', 'etransfer')}>E-Transfer</ToggleBtn>
            <ToggleBtn active={form.payment_method === 'credit_card'} onClick={() => set('payment_method', 'credit_card')}>Credit Card</ToggleBtn>
          </div>

          {mode !== 5 && (
            <>
              <Label text={noFeeChannel ? 'Shipping Cost (locked)' : 'Your Shipping Cost'} />
              <Input value={noFeeChannel ? '0' : form.shipping_cost_actual}
                onChange={v => !noFeeChannel && set('shipping_cost_actual', v)}
                prefix="$" id="ship-cost" disabled={noFeeChannel} />
              {noFeeChannel && <p className="text-xs text-success-400 mb-2">Local pickup only</p>}

              {isEbay && (
                <>
                  <Label text="Buyer Shipping Charge" />
                  <Input value={form.buyer_shipping_charge} onChange={v => set('buyer_shipping_charge', v)} prefix="$" id="buyer-ship" />
                </>
              )}
              {isEbay && (
                <>
                  <Label text="Promoted Listing %" />
                  <Input value={form.promoted_pct} onChange={v => set('promoted_pct', v)} suffix="%" id="promoted-pct" />
                </>
              )}
              {ch === 'poshmark' && (
                <p className="text-xs text-surface-400 mb-2">Shipping: $0.00 — Poshmark provides prepaid label to buyer</p>
              )}
            </>
          )}

          {/* Category — only for eBay */}
          {isEbay && (
            <>
              <Label text="eBay Category" />
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="input-field mb-4" id="category-select">
                {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <div className="flex flex-col gap-2 mb-4">
                <Toggle label="eBay Store" checked={form.has_store} onChange={v => set('has_store', v)} id="toggle-store" />
                <Toggle label="Top Rated Seller" checked={form.top_rated} onChange={v => set('top_rated', v)} id="toggle-top-rated" />
                <Toggle label="Below Standard" checked={form.below_standard} onChange={v => set('below_standard', v)} id="toggle-below" />
                <Toggle label="Insertion Fee ($0.35)" checked={form.insertion_fee} onChange={v => set('insertion_fee', v)} id="toggle-insertion" />
              </div>
            </>
          )}

          {/* Target profit (modes 1, 3, 4) */}
          {[1, 3, 4].includes(mode) && (
            <>
              <Label text="Target Profit" />
              <div className="flex gap-2 mb-2">
                <ToggleBtn active={profitType === 'dollar'} onClick={() => setProfitType('dollar')}>$ Amount</ToggleBtn>
                <ToggleBtn active={profitType === 'percent'} onClick={() => setProfitType('percent')}>% Margin</ToggleBtn>
              </div>
              {profitType === 'dollar'
                ? <Input value={form.target_profit_dollar} onChange={v => set('target_profit_dollar', v)} prefix="$" id="target-dollar" />
                : <Input value={form.target_profit_pct} onChange={v => set('target_profit_pct', v)} suffix="%" id="target-pct" />
              }
            </>
          )}

          {/* Platform fee preview */}
          {!isEbay && ch !== 'other' && (
            <div className="bg-surface-800/50 rounded-xl p-3 mt-3 text-xs text-surface-400">
              <span className="font-medium text-surface-300">Platform Fee: </span>
              {noFeeChannel ? (
                <span className="text-success-400 font-semibold">$0.00 — No fees</span>
              ) : ch === 'facebook_shipped' ? (
                <span className="text-warning-400">10% of sale price (min $0.80)</span>
              ) : ch === 'poshmark' ? (
                <span className="text-danger-400">20% ≥ C$20 / flat C$3.95 under C$20</span>
              ) : null}
            </div>
          )}

          <button onClick={calculate} disabled={loading || (mode === 4 && isMode4Disabled)}
            className="btn-primary w-full mt-4" id="calculate-btn">
            {loading ? 'Calculating...' : '⚡ Calculate'}
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {result && !result.error && (
            <>
              {/* Channel fees result for non-eBay */}
              {result.channel_fees && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="text-lg font-semibold text-surface-200 mb-4">
                    🏷️ {CHANNEL_MAP[result.channel]?.label || result.channel} Fee Breakdown
                  </h2>
                  <div className="space-y-2">
                    <Row label="Platform Fee" value={fmt(result.channel_fees.platform_fee)}
                      highlight={result.channel_fees.platform_fee === 0} />
                    <Row label="Shipping Deduction" value={fmt(result.channel_fees.shipping_deduction)} />
                    <Row label="Channel" value={CHANNEL_MAP[result.channel]?.label} />
                  </div>
                </div>
              )}

              {/* Mode 5 Slider */}
              {mode === 5 && sliderData && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="text-lg font-semibold text-surface-200 mb-4">🎚️ Price Sensitivity Slider</h2>
                  <input type="range" min="0" max={sliderData.length - 1} value={sliderValue}
                    onChange={e => setSliderValue(parseInt(e.target.value))}
                    className="w-full accent-brand-500 mb-4" id="price-slider" />
                  {currentSliderPoint && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <KpiMini label="Sell Price" value={fmt(currentSliderPoint.sell_price)} />
                      <KpiMini label="Net Profit" value={fmt(currentSliderPoint.net_profit)} color={currentSliderPoint.net_profit >= 0 ? 'text-success-400' : 'text-danger-400'} />
                      <KpiMini label="ROI" value={pct(currentSliderPoint.roi_pct)} />
                      <KpiMini label="Max Ad %" value={isEbay ? pct(currentSliderPoint.max_ad_pct) : 'N/A'} />
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={sliderData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="sell_price" tickFormatter={v => `$${v}`} stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                        formatter={(v, name) => [name.includes('%') ? pct(v) : fmt(v), name]} />
                      <Legend />
                      <Line type="monotone" dataKey="net_profit" name="Net Profit $" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="roi_pct" name="ROI %" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="margin_pct" name="Margin %" stroke="#a78bfa" strokeWidth={2} dot={false} />
                      {isEbay && <Line type="monotone" dataKey="max_ad_pct" name="Max Ad %" stroke="#fbbf24" strokeWidth={2} dot={false} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Encore Cost Breakdown */}
              {result.encore_breakdown && (
                <BreakdownCard title="🏷️ Encore Auction Cost Breakdown" data={result.encore_breakdown} />
              )}
              {result.lot_encore_breakdown && (
                <BreakdownCard title="🏷️ Lot — Encore Cost Breakdown" data={result.lot_encore_breakdown} />
              )}
              {result.per_unit_encore_breakdown && (
                <BreakdownCard title="📦 Per-Unit Encore Cost" data={result.per_unit_encore_breakdown} />
              )}

              {/* eBay Fees Breakdown */}
              {result.ebay_fees && (
                <BreakdownCard title="🛒 eBay Fees Breakdown" data={result.ebay_fees} />
              )}

              {/* Profit Summary */}
              {result.profit && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="text-lg font-semibold text-surface-200 mb-4">💰 Profit Summary</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {result.sell_price && <KpiMini label="Sell Price" value={fmt(result.sell_price)} />}
                    {result.breakeven_price && <KpiMini label="Break-Even" value={fmt(result.breakeven_price)} />}
                    <KpiMini label="Net Payout" value={fmt(result.profit.net_payout)} />
                    <KpiMini label="Net Profit" value={fmt(result.profit.net_profit)}
                      color={result.profit.net_profit >= 0 ? 'text-success-400' : 'text-danger-400'} />
                    <KpiMini label="ROI" value={pct(result.profit.roi_pct)}
                      color={result.profit.roi_pct >= 0 ? 'text-success-400' : 'text-danger-400'} />
                    <KpiMini label="Margin" value={pct(result.profit.margin_pct)} />
                  </div>
                </div>
              )}

              {/* Mode 2 Verdict */}
              {result.verdict && (
                <div className={`glass-card p-6 text-center text-xl font-bold animate-fade-in ${
                  result.verdict.includes('❌') ? 'border-danger-500/30' : 'border-success-500/30'
                }`}>
                  {result.verdict}
                </div>
              )}

              {/* Mode 4 Max Ad Spend */}
              {result.max_promoted_pct !== undefined && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="text-lg font-semibold text-surface-200 mb-4">📢 Max Ad Spend</h2>
                  <div className="text-3xl font-bold mb-2" style={{ color: result.max_promoted_pct >= 0 ? '#22c55e' : '#ef4444' }}>
                    {pct(result.max_promoted_pct)}
                  </div>
                  {result.alert && (
                    <div className="bg-danger-500/10 border border-danger-500/20 rounded-xl p-4 mt-4">
                      <p className="text-danger-400 font-semibold">⚠️ {result.alert}</p>
                      {result.alternative_sell_prices && (
                        <div className="mt-3 text-sm text-surface-300">
                          <p className="font-medium mb-2">Required sell prices for ad spend:</p>
                          {Object.entries(result.alternative_sell_prices).map(([k, v]) => (
                            <div key={k} className="flex justify-between py-1">
                              <span>At {k} ad spend:</span>
                              <span className="text-brand-400">{v ? fmt(v) : 'N/A'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3 Items */}
              {result.items && result.items.length > 0 && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="text-lg font-semibold text-surface-200 mb-4">📦 Per-Unit Breakdown ({result.num_items} items)</h2>
                  <p className="text-surface-400 text-sm mb-3">Per-unit buy cost: {fmt(result.per_unit_buy_cost)}</p>
                  {result.items[0]?.profit && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <KpiMini label="Unit Sell Price" value={fmt(result.items[0].sell_price || result.items[0].sold_price)} />
                      <KpiMini label="Unit Net Profit" value={fmt(result.items[0].profit.net_profit)}
                        color={result.items[0].profit.net_profit >= 0 ? 'text-success-400' : 'text-danger-400'} />
                      <KpiMini label="Unit ROI" value={pct(result.items[0].profit.roi_pct)} />
                      <KpiMini label="Total Lot Profit" value={fmt(result.items[0].profit.net_profit * result.num_items)}
                        color={result.items[0].profit.net_profit >= 0 ? 'text-success-400' : 'text-danger-400'} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {result?.error && (
            <div className="glass-card p-6 border-danger-500/30 animate-fade-in">
              <p className="text-danger-400">❌ {result.error}</p>
            </div>
          )}
          {!result && (
            <div className="glass-card p-12 flex items-center justify-center text-surface-500">
              <div className="text-center">
                <div className="text-4xl mb-3">⚡</div>
                <p className="text-lg">Enter your numbers and hit Calculate</p>
                <p className="text-sm mt-1">Results will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function Label({ text }) {
  return <label className="block text-xs font-medium text-surface-400 mb-1 mt-3">{text}</label>;
}

function Input({ value, onChange, prefix, suffix, id, disabled }) {
  return (
    <div className="relative mb-1">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm">{prefix}</span>}
      <input type="number" value={value} onChange={e => onChange(e.target.value)} id={id}
        disabled={disabled}
        className={`input-field ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-7' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 text-sm">{suffix}</span>}
    </div>
  );
}

function Toggle({ label, checked, onChange, id }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-surface-300" id={id}>
      <div className={`w-9 h-5 rounded-full relative transition-all duration-200 ${checked ? 'bg-brand-600' : 'bg-surface-600'}`}
        onClick={() => onChange(!checked)}>
        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${checked ? 'left-4.5' : 'left-0.5'}`} />
      </div>
      {label}
    </label>
  );
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
      active ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-surface-700/30 text-surface-400 border border-transparent hover:text-surface-200'
    }`}>{children}</button>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between py-1.5 text-surface-300">
      <span className="text-sm">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-success-400' : ''}`}>{value}</span>
    </div>
  );
}

function BreakdownCard({ title, data }) {
  const labels = {
    hammer_price: 'Hammer Price', buyers_premium: "Buyer's Premium (16%)",
    handling_fee: 'Handling Fee', subtotal_before_tax: 'Subtotal Before Tax',
    hst: 'HST (13%)', cc_surcharge: 'Credit Card Surcharge (2%)',
    total_buy_cost: 'Total Buy Cost', payment_method: 'Payment Method',
    sell_price: 'Sell Price', buyer_shipping_charge: 'Buyer Shipping',
    fvf_pct: 'FVF Rate', fvf_amount: 'Final Value Fee',
    processing_fee: 'Processing Fee', promoted_pct: 'Promoted %',
    promoted_fee: 'Promoted Fee', insertion_fee: 'Insertion Fee',
    total_ebay_fees: 'Total eBay Fees',
  };
  const isCurrency = k => !['payment_method', 'fvf_pct', 'promoted_pct'].includes(k);
  const totals = ['total_buy_cost', 'total_ebay_fees'];
  return (
    <div className="glass-card p-6 animate-slide-in">
      <h2 className="text-lg font-semibold text-surface-200 mb-4">{title}</h2>
      <div className="space-y-2">
        {Object.entries(data).filter(([k]) => labels[k]).map(([k, v]) => (
          <div key={k} className={`flex justify-between py-1.5 ${totals.includes(k) ? 'border-t border-surface-600/50 pt-3 mt-2 font-bold text-surface-100' : 'text-surface-300'}`}>
            <span className="text-sm">{labels[k]}</span>
            <span className={`text-sm font-medium ${
              totals.includes(k) ? 'text-brand-400' : k === 'cc_surcharge' && v > 0 ? 'text-warning-400' : ''
            }`}>
              {k === 'payment_method' ? (v === 'etransfer' ? 'E-Transfer' : 'Credit Card')
                : k.includes('pct') ? pct(v) : isCurrency(k) ? fmt(v) : v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiMini({ label, value, color = 'text-surface-100' }) {
  return (
    <div className="bg-surface-800/50 rounded-xl p-4">
      <div className="text-xs text-surface-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
