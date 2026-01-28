import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineCurrencyDollar,
  HiOutlineViewGrid,
  HiOutlineCube,
  HiOutlineUsers,
  HiOutlineLogout,
  HiOutlineX,
  HiOutlineChevronDown
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const menuItems = [
    {
      name: 'Dashboard',
      icon: HiOutlineHome,
      path: '/dashboard'
    },
    {
      name: 'Capital',
      icon: HiOutlineCurrencyDollar,
      path: '/dashboard/capital'
    },
    {
      name: 'Animals',
      icon: GiSheep,
      path: '/dashboard/animals',
      submenu: [
        { name: 'All Animals', path: '/dashboard/animals' },
        { name: 'Add Animal', path: '/dashboard/animals/add' }
      ]
    },
    {
      name: 'Pens',
      icon: HiOutlineViewGrid,
      path: '/dashboard/pens',
      submenu: [
        { name: 'All Pens', path: '/dashboard/pens' },
        { name: 'Add Pen', path: '/dashboard/pens/add' }
      ]
    },
    {
      name: 'Stock',
      icon: HiOutlineCube,
      path: '/dashboard/stock',
      submenu: [
        { name: 'All Stock', path: '/dashboard/stock' },
        { name: 'Add Stock', path: '/dashboard/stock/add' }
      ]
    },
    {
      name: 'Employees',
      icon: HiOutlineUsers,
      path: '/dashboard/employees',
      submenu: [
        { name: 'All Employees', path: '/dashboard/employees' },
        { name: 'Add Employee', path: '/dashboard/employees/add' }
      ]
    }
  ];

  const toggleSubmenu = (name) => {
    setExpandedMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const isSubmenuActive = (item) => {
    if (item.submenu) {
      return item.submenu.some(sub => location.pathname === sub.path);
    }
    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sheep_farm_user');
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-gradient-to-b from-emerald-800 to-emerald-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-emerald-700">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <GiSheep className="w-8 h-8 text-white" />
            <span className="text-lg font-bold">Sheep Farm</span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-emerald-700"
          >
            <HiOutlineX className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => (
              <li key={item.name}>
                {item.submenu ? (
                  <div>
                    <button
                      onClick={() => toggleSubmenu(item.name)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                        isSubmenuActive(item)
                          ? 'bg-emerald-700 text-white'
                          : 'text-emerald-100 hover:bg-emerald-700/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <HiOutlineChevronDown
                        className={`w-4 h-4 transition-transform ${
                          expandedMenus[item.name] ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {expandedMenus[item.name] && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {item.submenu.map((sub) => (
                          <li key={sub.path}>
                            <Link
                              to={sub.path}
                              onClick={() => setIsOpen(false)}
                              className={`block px-4 py-2 rounded-lg transition-colors ${
                                isActive(sub.path)
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-emerald-200 hover:bg-emerald-700/50'
                              }`}
                            >
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-emerald-700 text-white'
                        : 'text-emerald-100 hover:bg-emerald-700/50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-emerald-700">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-emerald-100 hover:bg-emerald-700/50 rounded-lg transition-colors"
          >
            <HiOutlineLogout className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
