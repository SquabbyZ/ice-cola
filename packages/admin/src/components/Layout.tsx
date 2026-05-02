import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User, Globe } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from './ui/button';

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

const Layout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { path: '/', label: t('nav.dashboard') },
    { path: '/users', label: t('nav.users') },
    { path: '/invitations', label: t('nav.invitations') },
    { path: '/settings', label: t('nav.settings') },
    { path: '/profile', label: t('nav.profile') },
  ];

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const getPageTitle = () => {
    const item = navItems.find((n) => n.path === location.pathname);
    return item?.label || t('nav.dashboard');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } bg-white shadow-lg transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {!sidebarCollapsed && (
            <span className="text-xl font-bold text-primary">Admin</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {sidebarCollapsed ? (
                <span className="mx-auto">{item.label[0]}</span>
              ) : (
                <span>{item.label}</span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-gray-800">
            {getPageTitle()}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Button variant="ghost" size="icon" title={currentLang.label}>
                <Globe className="h-5 w-5" />
              </Button>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[100px]">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md ${
                      currentLang.code === lang.code ? 'bg-gray-50 font-medium' : ''
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{user?.name || user?.email || 'Admin'}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;