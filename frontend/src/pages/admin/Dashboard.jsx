import React from 'react';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';
import { TrendingUp, Users, Briefcase, DollarSign } from 'lucide-react';

export const Dashboard = () => {
  const { data: revenue, loading: revenueLoading } = useRevenue();
  const { brands, loading: brandsLoading } = useBrands();
  const { team, loading: teamLoading } = useTeam();

  const totalRevenue = revenue?.reduce((sum, item) => 
    sum + (item.revenue_shopee || 0) + (item.revenue_tiktok || 0), 0) || 0;

  if (revenueLoading || brandsLoading || teamLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <DollarSign className="text-primary-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            Rp {totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Active Brands</p>
            <Briefcase className="text-primary-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-800">{brands?.length || 0}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Team Members</p>
            <Users className="text-primary-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-800">{team?.length || 0}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Total Sessions</p>
            <TrendingUp className="text-primary-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-800">{revenue?.length || 0}</p>
        </div>
      </div>

      {/* Recent Revenue */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Revenue</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Time</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Brand</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {revenue?.slice(0, 5).map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-700">{item.date}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{item.time}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{item.brands?.brand_name}</td>
                  <td className="py-3 px-4 text-sm text-gray-700 text-right">
                    Rp {((item.revenue_shopee || 0) + (item.revenue_tiktok || 0)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;