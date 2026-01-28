import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineCurrencyDollar,
  HiOutlineViewGrid,
  HiOutlineCube,
  HiOutlineUsers,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineArrowRight
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { dashboardAPI } from '../../services/mockApi';
import { formatCurrency, formatNumber } from '../../utils/helpers';
import Card from '../../components/common/Card';
import { PageLoader } from '../../components/common/Spinner';

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue, link }) => {
  const colorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500'
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? (
                <HiOutlineTrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <HiOutlineTrendingDown className="w-4 h-4 mr-1" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {link && (
        <Link
          to={link}
          className="absolute bottom-0 left-0 right-0 bg-gray-50 py-2 px-4 flex items-center justify-between text-sm text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border-t"
        >
          <span>View Details</span>
          <HiOutlineArrowRight className="w-4 h-4" />
        </Link>
      )}
    </Card>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your sheep farm operations</p>
      </div>

      {/* Capital Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Total Capital</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.totalCapital)}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <HiOutlineCurrencyDollar className="w-8 h-8 text-white" />
            </div>
          </div>
          <Link
            to="/dashboard/capital"
            className="inline-flex items-center mt-4 text-emerald-100 hover:text-white text-sm font-medium"
          >
            Manage Capital <HiOutlineArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Available Balance</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.availableCapital)}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <HiOutlineTrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="mt-4 text-blue-100 text-sm">
            {((stats?.availableCapital / stats?.totalCapital) * 100).toFixed(1)}% of total capital
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Invested Amount</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(stats?.investedCapital)}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <HiOutlineTrendingDown className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="mt-4 text-purple-100 text-sm">
            {((stats?.investedCapital / stats?.totalCapital) * 100).toFixed(1)}% invested
          </p>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Animals"
          value={formatNumber(stats?.totalAnimals)}
          icon={GiSheep}
          color="emerald"
          trend="up"
          trendValue="+5 this month"
          link="/dashboard/animals"
        />
        <StatCard
          title="Active Pens"
          value={formatNumber(stats?.totalPens)}
          icon={HiOutlineViewGrid}
          color="blue"
          link="/dashboard/pens"
        />
        <StatCard
          title="Stock Items"
          value={formatNumber(stats?.totalStockItems)}
          icon={HiOutlineCube}
          color="orange"
          link="/dashboard/stock"
        />
        <StatCard
          title="Employees"
          value={formatNumber(stats?.totalEmployees)}
          icon={HiOutlineUsers}
          color="purple"
          link="/dashboard/employees"
        />
      </div>

      {/* Value Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Asset Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <GiSheep className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Animal Value</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats?.totalAnimalValue)}</p>
                </div>
              </div>
              <span className="text-emerald-600 text-sm font-medium">
                {stats?.activeAnimals} Active
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <HiOutlineCube className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Stock Value</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats?.totalStockValue)}</p>
                </div>
              </div>
              <span className="text-blue-600 text-sm font-medium">
                {stats?.totalStockItems} Items
              </span>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/dashboard/animals/add"
              className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors group"
            >
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <GiSheep className="w-6 h-6 text-white" />
              </div>
              <span className="mt-2 text-sm font-medium text-gray-700">Add Animal</span>
            </Link>

            <Link
              to="/dashboard/pens/add"
              className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <HiOutlineViewGrid className="w-6 h-6 text-white" />
              </div>
              <span className="mt-2 text-sm font-medium text-gray-700">Add Pen</span>
            </Link>

            <Link
              to="/dashboard/stock/add"
              className="flex flex-col items-center justify-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors group"
            >
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <HiOutlineCube className="w-6 h-6 text-white" />
              </div>
              <span className="mt-2 text-sm font-medium text-gray-700">Add Stock</span>
            </Link>

            <Link
              to="/dashboard/employees/add"
              className="flex flex-col items-center justify-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <HiOutlineUsers className="w-6 h-6 text-white" />
              </div>
              <span className="mt-2 text-sm font-medium text-gray-700">Add Employee</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
