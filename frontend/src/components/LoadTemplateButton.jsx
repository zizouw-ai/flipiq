import { useState, useEffect } from 'react';
import { api, CHANNELS, CHANNEL_MAP } from '../api';

/**
 * LoadProfileButton — Searchable modal for loading Product Profiles.
 * Props:
 *   onLoad: (profile) => void — fills form fields from selected profile
 *   onClear: () => void — clears form when "start fresh" is clicked
 */
export default function LoadProfileButton({ onLoad, onClear }) {
  const [profiles, setProfiles] = useState([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      api.listTemplates().then(setProfiles).catch(() => {});
    }
  }, [open]);

  const filtered = profiles.filter(p =>
    (p.item_name || p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(!open)} type="button"
        className="px-3 py-2 rounded-lg text-xs font-medium bg-surface-700/50 border border-surface-600/30 text-surface-300 hover:text-surface-100 hover:bg-surface-600/50 transition-all"
        id="load-profile-btn">
        📋 Load Product Profile
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-surface-800 border border-surface-600/30 rounded-xl shadow-2xl z-50 p-3 animate-fade-in">
          {/* Clear option */}
          <button type="button"
            onClick={() => { onClear?.(); setOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-700/50 transition-all text-sm text-surface-400 mb-2 border-b border-surface-700/30 pb-3">
            ✖ Don't use a profile — start fresh
          </button>

          {profiles.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-surface-400">No profiles saved yet</p>
              <a href="/settings" className="text-xs text-brand-400 hover:underline mt-1 inline-block">
                Create one in Settings → Profiles
              </a>
            </div>
          ) : (
            <>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search profiles..." autoFocus
                className="input-field text-xs w-full mb-2" />
              <div className="max-h-56 overflow-y-auto space-y-1">
                {filtered.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => { onLoad(p); setOpen(false); setSearch(''); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-700/50 transition-all">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-surface-200 font-medium">{p.item_name || p.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        p.profile_type === 'fixed'
                          ? 'bg-accent-500/20 text-accent-400'
                          : 'bg-brand-500/20 text-brand-400'
                      }`}>
                        {p.profile_type === 'fixed' ? 'Fixed Cost' : 'Auction'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700/50 text-surface-400">
                        {CHANNEL_MAP[p.sale_channel]?.label || p.sale_channel}
                      </span>
                      {p.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700/50 text-surface-400">
                          {p.category}
                        </span>
                      )}
                      {p.target_margin_pct > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-700/50 text-surface-400">
                          {p.target_margin_pct}% margin
                        </span>
                      )}
                    </div>
                    {p.profile_type === 'auction' && (
                      <p className="text-[10px] text-surface-500 mt-1 italic">
                        Auction Profile — enter today's hammer price below
                      </p>
                    )}
                    {p.profile_type === 'fixed' && p.fixed_buy_price && (
                      <p className="text-[10px] text-surface-500 mt-1">
                        Buy: ${p.fixed_buy_price} {p.typical_sell_price ? `· Sell: ~$${p.typical_sell_price}` : ''}
                      </p>
                    )}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-surface-500 text-center py-2">No matches</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
