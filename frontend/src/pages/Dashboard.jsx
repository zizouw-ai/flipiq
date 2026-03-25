import { useState, useEffect } from 'react';
import { api, CHANNELS, CHANNEL_MAP } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, ScatterChart, Scatter, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

function fmt(v) { return v != null ? `$${Number(v).toFixed(2)}` : '$0.00'; }
function pct(v) { return v != null ? `${Number(v).toFixed(1)}%` : '0.0%'; }

const CHART_TOOLTIP = { contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 } };

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [roiCat, setRoiCat] = useState([]);
  const [bestWorst, setBestWorst] = useState({ best: [], worst: [] });
  const [feeBreak, setFeeBreak] = useState([]);
  const [profitAuction, setProfitAuction] = useState([]);
  const [cumProfit, setCumProfit] = useState([]);
  const [channelData, setChannelData] = useState([]);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', category: '', auction_name: '', channel: '' });
  const [chartChannel, setChartChannel] = useState('all');

  const load = () => {
    api.getKPIs(filters).then(setKpis).catch(() => {});
    api.getMonthlyChart(chartChannel).then(setMonthly).catch(() => {});
    api.getRoiByCategory().then(setRoiCat).catch(() => {});
    api.getBestWorst().then(setBestWorst).catch(() => {});
    api.getFeeBreakdown().then(setFeeBreak).catch(() => {});
    api.getProfitPerAuction().then(setProfitAuction).catch(() => {});
    api.getCumulativeProfit(chartChannel).then(setCumProfit).catch(() => {});
    api.getChannelSummary().then(setChannelData).catch(() => {});
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    api.getMonthlyChart(chartChannel).then(setMonthly).catch(() => {});
    api.getCumulativeProfit(chartChannel).then(setCumProfit).catch(() => {});
  }, [chartChannel]);

  const applyFilters = () => load();

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
        Profitability Dashboard
      </h1>
      <p className="text-surface-400 text-sm mb-6">Track your reselling performance across all platforms</p>

      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="text-xs text-surface-400 block mb-1">From</label>
            <input type="date" className="input-field !py-2 !text-xs" value={filters.date_from}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} id="filter-from" />
          </div>
          <div>
            <label className="text-xs text-surface-400 block mb-1">To</label>
            <input type="date" className="input-field !py-2 !text-xs" value={filters.date_to}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} id="filter-to" />
          </div>
          <div>
            <label className="text-xs text-surface-400 block mb-1">Category</label>
            <input className="input-field !py-2 !text-xs" value={filters.category} placeholder="Any"
              onChange={e => setFilters(f => ({ ...f, category: e.target.value }))} id="filter-category" />
          </div>
          <div>
            <label className="text-xs text-surface-400 block mb-1">Auction</label>
            <input className="input-field !py-2 !text-xs" value={filters.auction_name} placeholder="Any"
              onChange={e => setFilters(f => ({ ...f, auction_name: e.target.value }))} id="filter-auction" />
          </div>
          <div>
            <label className="text-xs text-surface-400 block mb-1">Channel</label>
            <select className="input-field !py-2 !text-xs" value={filters.channel}
              onChange={e => setFilters(f => ({ ...f, channel: e.target.value }))} id="filter-channel">
              <option value="">All Channels</option>
              {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <button onClick={applyFilters} className="btn-primary !py-2 !text-xs" id="apply-filters-btn">Apply</button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total Invested" value={fmt(kpis.total_invested)} icon="💰" />
          <KpiCard label="Total Revenue" value={fmt(kpis.total_revenue)} icon="📈" />
          <KpiCard label="Net Profit" value={fmt(kpis.total_profit)} icon="🎯"
            color={kpis.total_profit >= 0 ? 'text-success-400' : 'text-danger-400'} />
          <KpiCard label="Overall ROI" value={pct(kpis.overall_roi)} icon="📊"
            color={kpis.overall_roi >= 0 ? 'text-success-400' : 'text-danger-400'} />
          <KpiCard label="Platform Fee Leak" value={fmt(kpis.total_ebay_fees)} icon="🕳️" color="text-warning-400" />
          <KpiCard label="Avg Profit/Item" value={fmt(kpis.avg_profit_per_item)} icon="📦" />
          <KpiCard label="Sell-Through" value={pct(kpis.sell_through_rate)} icon="🏷️" />
          <KpiCard label="Avg Days to Sell" value={`${kpis.avg_days_to_sell} days`} icon="⏱️" />
        </div>
      )}

      {/* Channel Performance Cards */}
      {channelData.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">📊 Channel Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {channelData.map(ch => {
              const channelInfo = CHANNEL_MAP[ch.channel];
              return (
                <div key={ch.channel} className="glass-card p-4 group hover:scale-[1.02] transition-transform duration-200"
                  style={{ borderColor: channelInfo?.color + '30' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: channelInfo?.color }} />
                    <span className="text-xs font-semibold text-surface-300">{channelInfo?.label?.split(' ')[0] || ch.channel}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs text-surface-400">Revenue: <span className="text-surface-200 font-medium">{fmt(ch.revenue)}</span></div>
                    <div className="text-xs text-surface-400">Profit: <span className={`font-medium ${ch.profit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>{fmt(ch.profit)}</span></div>
                    <div className="text-xs text-surface-400">ROI: <span className="text-surface-200 font-medium">{pct(ch.avg_roi)}</span></div>
                    <div className="text-xs text-surface-400">Items: <span className="text-surface-200 font-medium">{ch.count}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Channel Filter */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-surface-400 font-medium">Filter Charts:</span>
        <select className="input-field !py-1.5 !text-xs !w-auto" value={chartChannel}
          onChange={e => setChartChannel(e.target.value)} id="chart-channel-filter">
          <option value="all">All Channels</option>
          {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Channel Pie */}
        <ChartCard title="🧩 Revenue by Channel">
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={channelData} dataKey="revenue" nameKey="label" cx="50%" cy="50%"
                  outerRadius={100} label={({ label, percent }) => `${label?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                  {channelData.map(ch => (
                    <Cell key={ch.channel} fill={CHANNEL_MAP[ch.channel]?.color || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP} formatter={v => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Net Profit by Channel Bar */}
        <ChartCard title="💰 Net Profit by Channel">
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickFormatter={v => v?.split(' ')[0]} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => fmt(v)} />
                <Bar dataKey="profit" name="Net Profit" radius={[4, 4, 0, 0]}>
                  {channelData.map(ch => (
                    <Cell key={ch.channel} fill={CHANNEL_MAP[ch.channel]?.color || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Avg ROI by Channel */}
        <ChartCard title="📈 Avg ROI% by Channel">
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...channelData].sort((a, b) => b.avg_roi - a.avg_roi)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={10} width={90}
                  tickFormatter={v => v?.split(' ')[0]} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => `${v}%`} />
                <Bar dataKey="avg_roi" name="Avg ROI %" radius={[0, 4, 4, 0]}>
                  {[...channelData].sort((a, b) => b.avg_roi - a.avg_roi).map(ch => (
                    <Cell key={ch.channel} fill={CHANNEL_MAP[ch.channel]?.color || '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Fee Leak by Channel (stacked by month) */}
        <ChartCard title="🕳️ Fee Leak by Channel Over Time">
          {feeBreak.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={feeBreak}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => fmt(v)} />
                <Legend />
                <Area type="monotone" dataKey="ebay" name="eBay" stackId="1" fill="#3b82f6" fillOpacity={0.6} stroke="#3b82f6" />
                <Area type="monotone" dataKey="facebook_shipped" name="FB Shipped" stackId="1" fill="#f97316" fillOpacity={0.6} stroke="#f97316" />
                <Area type="monotone" dataKey="poshmark" name="Poshmark" stackId="1" fill="#ec4899" fillOpacity={0.6} stroke="#ec4899" />
                <Area type="monotone" dataKey="no_fees" name="No Fees" stackId="1" fill="#22c55e" fillOpacity={0.3} stroke="#22c55e" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Monthly Revenue vs Cost vs Profit */}
        <ChartCard title="📊 Monthly Revenue vs. Cost vs. Profit">
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => fmt(v)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Cost" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* ROI by Category */}
        <ChartCard title="📈 ROI% by Category">
          {roiCat.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={roiCat} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="category" stroke="#64748b" fontSize={10} width={120} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => `${v}%`} />
                <Bar dataKey="roi_pct" name="ROI %" fill="#a78bfa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Best & Worst Items */}
        <ChartCard title="🏆 Best & Worst Items by Profit">
          {bestWorst.best.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...bestWorst.best.slice(0, 5), ...bestWorst.worst.slice(-5)]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={100} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => fmt(v)} />
                <Bar dataKey="net_profit" name="Profit" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Cumulative Profit */}
        <ChartCard title="📈 Cumulative Profit Over Time">
          {cumProfit.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cumProfit}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => fmt(v)} />
                <Line type="monotone" dataKey="cumulative_profit" name="Cumulative Profit" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Profit Per Auction */}
        <ChartCard title="🎯 Profit Per Auction Session">
          {profitAuction.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="total_cost" name="Total Cost" stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                <YAxis dataKey="total_profit" name="Total Profit" stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => fmt(v)} labelFormatter={() => ''} />
                <Scatter name="Auctions" data={profitAuction} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Platform Comparison Table */}
      {channelData.length > 0 && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">📋 Platform Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  <th className="text-left p-3 text-surface-400 font-medium">Channel</th>
                  <th className="text-right p-3 text-surface-400 font-medium">Items Sold</th>
                  <th className="text-right p-3 text-surface-400 font-medium">Revenue</th>
                  <th className="text-right p-3 text-surface-400 font-medium">Fees Paid</th>
                  <th className="text-right p-3 text-surface-400 font-medium">Net Profit</th>
                  <th className="text-right p-3 text-surface-400 font-medium">Avg ROI%</th>
                </tr>
              </thead>
              <tbody>
                {channelData.map(ch => (
                  <tr key={ch.channel} className="border-b border-surface-700/20 hover:bg-surface-700/20 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHANNEL_MAP[ch.channel]?.color }} />
                        <span className="text-surface-200 font-medium">{CHANNEL_MAP[ch.channel]?.label || ch.channel}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-surface-300">{ch.count}</td>
                    <td className="p-3 text-right text-surface-300">{fmt(ch.revenue)}</td>
                    <td className="p-3 text-right text-warning-400">{fmt(ch.fees)}</td>
                    <td className={`p-3 text-right font-medium ${ch.profit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                      {fmt(ch.profit)}
                    </td>
                    <td className="p-3 text-right text-surface-300">{pct(ch.avg_roi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, color = 'text-surface-100' }) {
  return (
    <div className="glass-card p-5 group hover:scale-[1.02] transition-transform duration-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-surface-400 font-medium">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-surface-200 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[280px] flex items-center justify-center text-surface-500 text-sm">
      No data yet — add auctions and mark items as sold
    </div>
  );
}
