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
  HiOutlineChevronDown,
  HiOutlineHeart,
  HiOutlineBeaker,
  HiOutlineShieldCheck,
  HiOutlineClipboardList
} from 'react-icons/hi';
import { GiSheep } from 'react-icons/gi';
import { useAuth } from '../../Context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});
  const { user, logout } = useAuth();

  const menuItems = [
    {
      name: 'Dashboard',
      icon: HiOutlineHome,
      path: '/dashboard',
      roles: ['Admin']
    },
    {
      name: 'Capital',
      icon: HiOutlineCurrencyDollar,
      path: '/dashboard/capital',
      roles: ['Admin']
    },
    {
      name: 'Liabilities',
      icon: HiOutlineClipboardList,
      path: '/dashboard/liabilities',
      roles: ['Admin']
    },
    {
      name: 'Animals',
      icon: GiSheep,
      path: '/dashboard/animals',
      submenu: [
        { name: 'All Animals', path: '/dashboard/animals' },
        { name: 'Add Animal', path: '/dashboard/animals/add' },
        { name: 'Bulk Upload', path: '/dashboard/animals/bulk-upload' },
        { name: 'Move to Pen', path: '/dashboard/animals/move-to-pen' }
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
        { name: 'Overview', path: '/dashboard/stock' },
        { 
          name: 'Medication', 
          path: '/dashboard/stock/medication',
          submenu: [
            { name: 'All Medications', path: '/dashboard/stock/medication' },
            { name: 'Add Medication', path: '/dashboard/stock/medication/add' },
            { name: 'Bulk Upload', path: '/dashboard/stock/medication/bulk-upload' }
          ]
        },
        { 
          name: 'Feeding', 
          path: '/dashboard/stock/feeding',
          submenu: [
            { name: 'All Feeding', path: '/dashboard/stock/feeding' },
            { name: 'Add Feeding', path: '/dashboard/stock/feeding/add' },
            { name: 'Bulk Upload', path: '/dashboard/stock/feeding/bulk-upload' }
          ]
        },
        { 
          name: 'Assets', 
          path: '/dashboard/stock/assets',
          submenu: [
            { name: 'All Assets', path: '/dashboard/stock/assets' },
            { name: 'Add Asset', path: '/dashboard/stock/assets/add' }
          ]
        }
      ]
    },
    {
      name: 'Employees',
      icon: HiOutlineUsers,
      path: '/dashboard/employees',
      roles: ['Admin'],
      submenu: [
        { name: 'All Employees', path: '/dashboard/employees' },
        { name: 'Add Employee', path: '/dashboard/employees/add' },
        { name: 'Advances / Loans', path: '/dashboard/employees/advances' },
        { name: 'Salaries', path: '/dashboard/employees/salaries' },
        { name: 'User Management', path: '/dashboard/employees/users' }
      ]
    },
    {
      name: 'Health',
      icon: HiOutlineHeart,
      path: '/dashboard/health',
      submenu: [
        { name: 'Treatment', path: '/dashboard/health/treatment' },
        { name: 'Cure Tracking', path: '/dashboard/health/cure-tracking' },
        { name: 'Deworming', path: '/dashboard/health/deworming' },
        { name: 'Body Weight', path: '/dashboard/health/body-weight' },
        { name: 'Body Temperature', path: '/dashboard/health/body-temperature' },
        { name: 'BCS', path: '/dashboard/health/bcs' },
        { name: 'Hoof Trimming', path: '/dashboard/health/hoof-trimming' },
        { name: 'Shearing', path: '/dashboard/health/shearing' }
      ]
    },
    {
      name: 'Feed',
      icon: HiOutlineBeaker,
      path: '/dashboard/feed',
      submenu: [
        { name: 'All Recipes', path: '/dashboard/feed/recipes' },
        { name: 'Create Recipe', path: '/dashboard/feed/recipes/add' },
        { name: 'Apply Recipe', path: '/dashboard/feed/apply' }
      ]
    },
    {
      name: 'Vaccination',
      icon: HiOutlineShieldCheck,
      path: '/dashboard/vaccination',
      submenu: [
        { name: 'All Vaccines', path: '/dashboard/vaccination/vaccines' },
        { name: 'Create Vaccine', path: '/dashboard/vaccination/vaccines/add' },
        { name: 'Apply Vaccine', path: '/dashboard/vaccination/apply' },
        { name: 'Application History', path: '/dashboard/vaccination/history' }
      ]
    },
    {
      name: 'Audit Logs',
      icon: HiOutlineShieldCheck,
      path: '/dashboard/admin/audit-logs',
      roles: ['Admin']
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
      return item.submenu.some(sub => {
        if (sub.submenu) {
          return sub.submenu.some(nestedSub => location.pathname === nestedSub.path);
        }
        return location.pathname === sub.path;
      });
    }
    return false;
  };

  const handleLogout = () => {
    logout();
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
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-gradient-to-b from-emerald-800 to-emerald-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
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
        <nav className="flex-1 overflow-y-auto py-4 min-h-0">
          <ul className="space-y-1 px-3">
            {menuItems
              .filter((item) => {
                if (!item.roles) return true;
                if (!user) return false;
                const userRole = (user.role || user.userRole || '').toString();
                return item.roles.some((r) => r.toString().toLowerCase() === userRole.toLowerCase());
              })
              .map((item) => (
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
                            {sub.submenu ? (
                              <div>
                                <button
                                  onClick={() => toggleSubmenu(sub.name)}
                                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors ${
                                    sub.submenu.some(nestedSub => location.pathname === nestedSub.path)
                                      ? 'bg-emerald-600 text-white'
                                      : 'text-emerald-200 hover:bg-emerald-700/50'
                                  }`}
                                >
                                  <span>{sub.name}</span>
                                  <HiOutlineChevronDown
                                    className={`w-3 h-3 transition-transform ${
                                      expandedMenus[sub.name] ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>
                                {expandedMenus[sub.name] && (
                                  <ul className="mt-1 ml-4 space-y-1">
                                    {sub.submenu.map((nestedSub) => (
                                      <li key={nestedSub.path}>
                                        <Link
                                          to={nestedSub.path}
                                          onClick={() => setIsOpen(false)}
                                          className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                            isActive(nestedSub.path)
                                              ? 'bg-emerald-500 text-white'
                                              : 'text-emerald-200 hover:bg-emerald-700/50'
                                          }`}
                                        >
                                          {nestedSub.name}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ) : (
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
                            )}
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
