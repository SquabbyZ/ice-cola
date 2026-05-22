import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, User, ChevronDown, Cpu, LayoutDashboard, Users as UsersIcon, Mail, Settings, ShoppingBag, ShieldCheck, Ticket, ScrollText } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import AnimatedBackground from './AnimatedBackground';


interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const Layout: React.FC = () => {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const isAiPage = location.pathname.startsWith('/ai');

  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const navItems: NavItem[] = [
    { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/users', label: t('nav.users'), icon: UsersIcon },
    { path: '/invitations', label: t('nav.invitations'), icon: Mail },
    { path: '/settings', label: t('nav.settings'), icon: Settings },
    { path: '/profile', label: t('nav.profile'), icon: User },
    { path: '/marketplace', label: t('nav.marketplace'), icon: ShoppingBag },
    { path: '/approval-center', label: t('nav.approvalCenter'), icon: ShieldCheck },
    { path: '/redemption-codes', label: t('nav.redemptionCodes'), icon: Ticket },
    { path: '/lingqi-ledger', label: t('nav.lingqiLedger'), icon: ScrollText },
  ];

  const adminOnlyPaths = ['/settings', '/redemption-codes', '/lingqi-ledger'];
  const filteredNavItems = isAdmin
    ? navItems
    : navItems.filter((item) => !adminOnlyPaths.includes(item.path));

  const aiNavItems = [
    { path: '/ai/settings', label: t('ai.nav.settings') },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const sidebarVariants = {
    expanded: { width: '280px' },
    collapsed: { width: '80px' },
  };

  const navItemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-[100dvh] overflow-hidden bg-background">
        <AnimatedBackground />
        {/* Sidebar */}
        <motion.aside
          variants={sidebarVariants}
          initial={false}
          animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex flex-col bg-card border-r border-border relative overflow-hidden"
        >
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />

          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-border/50">
            <AnimatePresence mode="wait">
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm">IC</span>
                  </div>
                  <span className="text-lg font-semibold tracking-tight text-foreground">
                    {t('nav.admin')}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="shrink-0 hover:bg-muted/50"
                >
                  <motion.div
                    animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    {sidebarCollapsed ? (
                      <Menu className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )}
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <motion.div
                  key={item.path}
                  variants={navItemVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={item.path}
                    className={`group flex items-center gap-3 py-3 rounded-2xl ${
                      sidebarCollapsed ? 'justify-center px-0 w-full' : 'px-4'
                    }
                      transition-all duration-200 ease-out
                      ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    {sidebarCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`
                              w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                              transition-colors duration-200 cursor-pointer
                              ${
                                isActive
                                  ? 'bg-primary-foreground/20'
                                  : 'bg-muted group-hover:bg-muted-foreground/10'
                              }
                            `}
                          >
                            <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary-foreground' : ''}`} />
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                          transition-colors duration-200
                          ${
                            isActive
                              ? 'bg-primary-foreground/20'
                              : 'bg-muted group-hover:bg-muted-foreground/10'
                          }
                        `}
                      >
                        <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary-foreground' : ''}`} />
                      </motion.div>
                    )}
                    <AnimatePresence mode="wait">
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="text-sm font-medium truncate overflow-hidden flex-1"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.div>
              );
            })}

            {/* AI Models Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="pt-4"
            >
              {sidebarCollapsed ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      className={`
                        flex items-center justify-center py-3 rounded-2xl cursor-pointer
                        transition-all duration-200 w-full
                        ${isAiPage ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}
                      `}
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                          transition-colors duration-200
                          ${isAiPage ? 'bg-primary-foreground/20' : 'bg-muted hover:bg-muted-foreground/10'}
                        `}
                      >
                        <Cpu className={`h-[18px] w-[18px] ${isAiPage ? 'text-primary-foreground' : ''}`} />
                      </motion.div>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" align="start" className="w-48">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {t('ai.nav.title')}
                    </div>
                    {aiNavItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <DropdownMenuItem key={item.path} asChild>
                          <Link
                            to={item.path}
                            className={`
                              flex items-center gap-2 cursor-pointer
                              ${isActive ? 'text-primary font-medium' : 'text-foreground'}
                            `}
                          >
                            <Cpu className="h-4 w-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <div
                    className={`
                      flex items-center gap-3 py-3 rounded-2xl cursor-pointer
                      transition-all duration-200 w-full px-4
                      ${isAiPage ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
                    `}
                    onClick={() => setAiMenuOpen(!aiMenuOpen)}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                        transition-colors duration-200
                        ${isAiPage ? 'bg-primary-foreground/20' : 'bg-muted'}
                      `}
                    >
                      <Cpu className={`h-[18px] w-[18px] ${isAiPage ? 'text-primary-foreground' : ''}`} />
                    </motion.div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="flex-1 flex items-center justify-between overflow-hidden"
                      >
                        <span className="text-sm font-medium truncate">{t('ai.nav.title')}</span>
                        <motion.div
                          animate={{ rotate: aiMenuOpen ? 180 : 0 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {aiMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="ml-3 mt-2 space-y-1 overflow-hidden"
                      >
                        {aiNavItems.map((item) => {
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`
                                flex items-center gap-3 px-4 py-2.5 rounded-xl
                                transition-all duration-200
                                ${
                                  isActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }
                              `}
                            >
                              <span className="text-sm">{item.label}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          </nav>

          {/* User section at bottom */}
          <div className="p-3 border-t border-border/50">
            <div
              className={`
                flex items-center gap-3 py-3 rounded-2xl
                bg-muted/50 w-full
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              {sidebarCollapsed ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
                      <User className="h-[18px] w-[18px] text-primary-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.role === 'OWNER' ? 'Owner' : user?.role === 'ADMIN' ? 'Admin' : 'Member'}
                      </p>
                    </div>
                    <div className="border-t border-border/50 my-1" />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('sidebar.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0">
                    <User className="h-[18px] w-[18px] text-primary-foreground" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 min-w-0 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {user?.name || 'Admin'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.role === 'OWNER' ? 'Owner' : user?.role === 'ADMIN' ? 'Admin' : 'Member'}
                        </p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            className="hover:bg-destructive/10 hover:text-destructive shrink-0 h-8 w-8 mr-1"
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {t('sidebar.logout')}
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Page Content */}
          <main className="flex-1 overflow-auto p-6 bg-background">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Layout;