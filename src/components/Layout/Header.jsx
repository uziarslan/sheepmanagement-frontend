import React from 'react';
import { HiOutlineMenu, HiOutlineBell, HiOutlineUser } from 'react-icons/hi';

const Header = ({ setSidebarOpen, user }) => {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side - Menu button and title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <HiOutlineMenu className="w-6 h-6" />
          </button>
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-gray-800">
              {user?.farmName || 'Sheep Farm Management'}
            </h2>
            <p className="text-sm text-gray-500">Welcome back!</p>
          </div>
        </div>

        {/* Right side - Notifications and Profile */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          {/* <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full">
            <HiOutlineBell className="w-6 h-6" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button> */}

          {/* Profile dropdown */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-700">{user?.name || 'Admin'}</p>
              <p className="text-xs text-gray-500">{user?.role || 'Administrator'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <HiOutlineUser className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
