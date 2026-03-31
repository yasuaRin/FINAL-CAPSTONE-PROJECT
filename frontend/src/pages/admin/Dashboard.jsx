import React, { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  DollarSign, 
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Building2,
  Smartphone,
  Award,
  RefreshCw
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';

export const Dashboard = () => {
  // ============================================
  // ALL HOOKS MUST BE CALLED IN THE SAME ORDER ON EVERY RENDER
  // ============================================
  
  // Fetch real data from Supabase via hooks
  const { data: revenue, loading: revenueLoading } = useRevenue();
  const { brands, risks, loading: brandsLoading } = useBrands();
  const { team, loading: teamLoading } = useTeam();

  // ── FIX: Timeout safety — if hooks are still loading after 8s, bail out ──
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!revenueLoading && !brandsLoading && !teamLoading) return;
    const timer = setTimeout(() => {
      if (revenueLoading || brandsLoading || teamLoading) {
        setTimedOut(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [revenueLoading, brandsLoading, teamLoading]);

  // Calculate all KPI metrics from real database data
  const kpis = useMemo(() => {
    // Total revenue from all live sessions
    const totalRevenue = revenue?.reduce((sum, item) => 
      sum + (item.revenue_shopee || 0) + (item.revenue_tiktok || 0), 0) || 0;
    
    // Active brands count (filter by status from brands table)
    const activeBrands = brands?.filter(b => b.brand_status === 'active').length || 0;
    
    // At-risk brands count (from risk-signals endpoint)
    const atRiskBrands = risks?.filter(r => r.risk_level === 'high').length || 0;
    
    // Total number of live sessions
    const totalSessions = revenue?.length || 0;
    
    // Total team members from staff table
    const totalTeamMembers = team?.length || 0;
    
    // Calculate top performer based on revenue generated
    const staffRevenue = {};
    revenue?.forEach(item => {
      const hostId = item.host_id;
      const amount = (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
      staffRevenue[hostId] = (staffRevenue[hostId] || 0) + amount;
    });
    
    let topPerformerName = 'N/A';
    let topPerformerRevenue = 0;
    Object.entries(staffRevenue).forEach(([hostId, total]) => {
      if (total > topPerformerRevenue) {
        topPerformerRevenue = total;
        const staffMember = team?.find(s => s.id === parseInt(hostId));
        topPerformerName = staffMember?.name || 'Unknown';
      }
    });

    // Calculate revenue growth (compare last 7 days vs previous 7 days)
    const today = new Date();
    const last7Days = revenue?.filter(item => {
      const itemDate = new Date(item.date);
      const daysDiff = (today - itemDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7 && daysDiff > 0;
    }) || [];
    
    const previous7Days = revenue?.filter(item => {
      const itemDate = new Date(item.date);
      const daysDiff = (today - itemDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 14 && daysDiff > 7;
    }) || [];
    
    const last7Total = last7Days.reduce((sum, item) => 
      sum + (item.revenue_shopee || 0) + (item.revenue_tiktok || 0), 0);
    const previous7Total = previous7Days.reduce((sum, item) => 
      sum + (item.revenue_shopee || 0) + (item.revenue_tiktok || 0), 0);
    
    const revenueGrowth = previous7Total > 0 
      ? ((last7Total - previous7Total) / previous7Total * 100).toFixed(1)
      : 0;

    return {
      totalRevenue,
      activeBrands,
      atRiskBrands,
      totalSessions,
      totalTeamMembers,
      topPerformer: topPerformerName,
      revenueGrowth
    };
  }, [revenue, brands, risks, team]);

  // Prepare chart data for revenue trend (last 7 days from database)
  const chartData = useMemo(() => {
    if (!revenue || revenue.length === 0) return [];
    
    const groupedByDate = {};
    const today = new Date();
    const last7Days = new Date();
    last7Days.setDate(today.getDate() - 7);
    
    revenue.forEach(item => {
      const itemDate = new Date(item.date);
      if (itemDate >= last7Days) {
        const date = item.date;
        const amount = (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
        if (!groupedByDate[date]) {
          groupedByDate[date] = { date, revenue: 0, sessions: 0 };
        }
        groupedByDate[date].revenue += amount;
        groupedByDate[date].sessions += 1;
      }
    });
    
    return Object.values(groupedByDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [revenue]);

  // Prepare platform breakdown from real database
  const platformData = useMemo(() => {
    if (!revenue || revenue.length === 0) return [];
    
    const shopeeTotal = revenue?.reduce((sum, item) => sum + (item.revenue_shopee || 0), 0) || 0;
    const tiktokTotal = revenue?.reduce((sum, item) => sum + (item.revenue_tiktok || 0), 0) || 0;
    const total = shopeeTotal + tiktokTotal;
    
    return [
      { 
        name: 'Shopee', 
        value: shopeeTotal, 
        color: '#EE4D2E',
        percentage: total > 0 ? (shopeeTotal / total * 100).toFixed(1) : 0
      },
      { 
        name: 'TikTok', 
        value: tiktokTotal, 
        color: '#010101',
        percentage: total > 0 ? (tiktokTotal / total * 100).toFixed(1) : 0
      }
    ];
  }, [revenue]);

  // Get recent revenue records from database (last 5)
  const recentRevenue = useMemo(() => {
    if (!revenue || revenue.length === 0) return [];
    return [...revenue]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [revenue]);

  // Get at-risk brands list from database
  const atRiskBrandsList = useMemo(() => {
    if (!risks || risks.length === 0) return [];
    return risks.filter(r => r.risk_level === 'high').slice(0, 5);
  }, [risks]);

  // KPI Cards Configuration (all values from database)
  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `Rp ${kpis.totalRevenue.toLocaleString()}`,
      trend: `${kpis.revenueGrowth > 0 ? '+' : ''}${kpis.revenueGrowth}%`,
      icon: DollarSign,
      borderColor: 'border-l-primary-500',
      bgColor: 'bg-primary-50',
      textColor: 'text-primary-600',
      trendColor: kpis.revenueGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'
    },
    {
      title: 'Active Brands',
      value: kpis.activeBrands,
      icon: Briefcase,
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'At-Risk Brands',
      value: kpis.atRiskBrands,
      icon: AlertTriangle,
      borderColor: 'border-l-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      title: 'Team Members',
      value: kpis.totalTeamMembers,
      icon: Users,
      borderColor: 'border-l-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Total Sessions',
      value: kpis.totalSessions,
      icon: TrendingUp,
      borderColor: 'border-l-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Top Performer',
      value: kpis.topPerformer,
      icon: Award,
      borderColor: 'border-l-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    }
  ];

  // ── FIX: Derive isLoading — treat timed-out state as "done loading" ──
  const isLoading = (revenueLoading || brandsLoading || teamLoading) && !timedOut;

  // ── FIX: Show timeout error with a reload button instead of hanging forever ──
  if (timedOut && (revenueLoading || brandsLoading || teamLoading)) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <AlertTriangle size={40} className="text-amber-500" />
        <p className="text-sm font-semibold text-gray-700">Data took too long to load</p>
        <p className="text-xs text-gray-400 text-center max-w-xs">
          One or more data sources did not respond in time. This may be a network or Supabase issue.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-sm text-gray-500">Loading dashboard data...</p>
      </div>
    );
  }

  // Return the main UI
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time overview from your database
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          Live from Supabase
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`bg-white rounded-xl shadow-sm border-l-4 ${card.borderColor} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
            >
              <div className="p-4">
                <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center mb-3`}>
                  <Icon size={18} className={card.textColor} />
                </div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-xl font-bold text-gray-800 mt-1">
                  {card.value}
                </p>
                {card.trend && (
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight size={12} className={card.trendColor} />
                    <span className={`text-xs font-medium ${card.trendColor}`}>
                      {card.trend}
                    </span>
                    <span className="text-xs text-gray-400">vs last week</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Revenue Trend</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last 7 days performance from live_sessions</p>
          </div>
          <div className="h-72 p-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickFormatter={(value) => `Rp ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value) => [`Rp ${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: 'none', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#revenueGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full text-gray-400">
                No revenue data available in database
              </div>
            )}
          </div>
        </div>

        {/* Platform Distribution */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Platform Distribution</h3>
            <p className="text-xs text-gray-400 mt-0.5">Revenue breakdown by platform</p>
          </div>
          <div className="p-4">
            {platformData.length > 0 && platformData[0].value > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`Rp ${value.toLocaleString()}`, 'Revenue']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  {platformData.map((platform, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: platform.color }}></div>
                      <span className="text-xs text-gray-600">
                        {platform.name}: {platform.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex justify-center items-center h-64 text-gray-400">
                No platform data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Revenue Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Recent Revenue</h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest 5 entries from live_sessions</p>
          </div>
          <div className="overflow-x-auto">
            {recentRevenue.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} /> Date
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building2 size={12} /> Brand
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-1">
                        <Smartphone size={12} /> Platform
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentRevenue.map((item) => {
                    const totalRevenue = (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-700">{item.date}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-800">
                          {item.brands?.brand_name || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${item.platform_id === 1 ? 'bg-orange-500' : 'bg-gray-900'}`}></span>
                            <span className="text-sm text-gray-600">
                              {item.platform_id === 1 ? 'Shopee' : 'TikTok'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-800">
                          Rp {totalRevenue.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-400">
                No revenue records found
              </div>
            )}
          </div>
        </div>

        {/* At-Risk Brands Monitor */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Critical Risk Monitor</h3>
            <p className="text-xs text-gray-400 mt-0.5">Brands requiring immediate attention</p>
          </div>
          <div className="overflow-x-auto">
            {atRiskBrandsList.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Brand</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Risk Level</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {atRiskBrandsList.map((risk, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">
                        {risk.brand_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {risk.risk_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          risk.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {risk.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {risk.risk_level === 'high' ? 'Revenue decline detected' : 'Below performance target'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-400">
                No at-risk brands found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Database Connection Status */}
      <div className="text-center text-xs text-gray-400 py-2">
        Data sourced from Supabase PostgreSQL • Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default Dashboard;