import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../Context/AuthContext';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <Header setSidebarOpen={setSidebarOpen} user={user} />

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 text-center text-sm text-gray-500 border-t border-gray-200 bg-white">
          © {new Date().getFullYear()} Sheep Farm Management System. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
