import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const ALERT_STYLES = {
  red:    'bg-red-500/15 border-red-500/30 text-red-300',
  orange: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
  yellow: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300',
  green:  'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  none:   'hidden',
};

/**
 * AlertBanner — Bug Fix 5
 * Auto-fires on price changes via onChange/useEffect.
 * Props:
 *   hammerPrice, sellPrice, channel, shippingCost, paymentMethod, promotedPct, category, buyerShippingCharge
 */
export default function AlertBanner({
  hammerPrice, sellPrice, channel = 'ebay', shippingCost = 0,
  paymentMethod = 'etransfer', promotedPct = 0, category = 'Most Categories (Default)',
  buyerShippingCharge = 0, targetMarginPct = 30,
}) {
  const [alert, setAlert] = useState(null);

  const fetchAlert = useCallback(() => {
    const hp = parseFloat(hammerPrice);
    const sp = parseFloat(sellPrice);
    if (!hp || hp <= 0 || !sp || sp <= 0) {
      setAlert(null);
      return;
    }
    api.getAlert({
      hammer_price: hp, sell_price: sp, channel,
      shipping_cost: parseFloat(shippingCost) || 0,
      payment_method: paymentMethod,
      target_margin_pct: parseFloat(targetMarginPct) || 30,
      promoted_pct: parseFloat(promotedPct) || 0,
      category, buyer_shipping_charge: parseFloat(buyerShippingCharge) || 0,
    }).then(setAlert).catch(() => setAlert(null));
  }, [hammerPrice, sellPrice, channel, shippingCost, paymentMethod, promotedPct, category, buyerShippingCharge, targetMarginPct]);

  useEffect(() => {
    const timer = setTimeout(fetchAlert, 300); // Debounce 300ms
    return () => clearTimeout(timer);
  }, [fetchAlert]);

  if (!alert || alert.level === 'none') return null;

  return (
    <div className={`px-4 py-3 rounded-lg border text-sm ${ALERT_STYLES[alert.level] || ''}`}
      id="alert-banner">
      <p className="font-medium">{alert.message}</p>
      {alert.net_profit !== undefined && (
        <p className="text-xs mt-1 opacity-80">
          Net: ${alert.net_profit?.toFixed(2)} · ROI: {alert.roi_pct?.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
