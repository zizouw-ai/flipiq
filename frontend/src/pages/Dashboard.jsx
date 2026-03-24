import { useState, useEffect } from 'react';
import { api } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, ScatterChart, Scatter, LineChart, Line
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
  const [filters, setFilters] = useState({ date_from: '', date_to: '', category: '', auction_name: '' });

  const load = () => {
    api.getKPIs(filters).then(setKpis).catch(() => {});
    api.getMonthlyChart().then(setMonthly).catch(() => {});
    api.getRoiByCategory().then(setRoiCat).catch(() => {});
    api.getBestWorst().then(setBestWorst).catch(() => {});
    api.getFeeBreakdown().then(setFeeBreak).catch(() => {});
    api.getProfitPerAuction().then(setProfitAuction).catch(() => {});
    api.getCumulativeProfit().then(setCumProfit).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const applyFilters = () => load();

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
        Profitability Dashboard
      </h1>
      <p className="text-surface-400 text-sm mb-6">Track your eBay reselling performance</p>

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
          <KpiCard label="eBay Fee Leak" value={fmt(kpis.total_ebay_fees)} icon="🕳️" color="text-warning-400" />
          <KpiCard label="Avg Profit/Item" value={fmt(kpis.avg_profit_per_item)} icon="📦" />
          <KpiCard label="Sell-Through" value={pct(kpis.sell_through_rate)} icon="🏷️" />
          <KpiCard label="Avg Days to Sell" value={`${kpis.avg_days_to_sell} days`} icon="⏱️" />
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <Bar dataKey="net_profit" name="Profit" fill={(entry) => entry?.net_profit >= 0 ? '#22c55e' : '#ef4444'} radius={[0, 4, 4, 0]}>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        {/* Fee Breakdown Over Time */}
        <ChartCard title="🕳️ eBay Fee Breakdown Over Time">
          {feeBreak.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={feeBreak}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `$${v}`} />
                <Tooltip {...CHART_TOOLTIP} formatter={v => fmt(v)} />
                <Legend />
                <Area type="monotone" dataKey="fvf" name="FVF" stackId="1" fill="#3b82f6" fillOpacity={0.6} stroke="#3b82f6" />
                <Area type="monotone" dataKey="processing" name="Processing" stackId="1" fill="#a78bfa" fillOpacity={0.6} stroke="#a78bfa" />
                <Area type="monotone" dataKey="promoted" name="Promoted" stackId="1" fill="#fbbf24" fillOpacity={0.6} stroke="#fbbf24" />
              </AreaChart>
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
      </div>
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
