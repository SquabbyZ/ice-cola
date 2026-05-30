import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  Bot,
  Clock,
  Settings,
  Plus,
  Cog,
  Inbox,
  Sparkles,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConversationStore } from '@/stores/conversations';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chat';
import { getTeamId } from '@/lib/team';
import SettingsModal from './SettingsModal';
import { LingqiStatusCard } from './LingqiStatusCard';
import { useLingqiStore } from '@/stores/lingqi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

const menuItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', descKey: 'nav.dashboard' },
  { path: '/chat', icon: MessageSquare, labelKey: 'nav.chat', descKey: 'nav.chatDesc' },
  { path: '/extensions', icon: ShoppingBag, labelKey: 'nav.extensions', descKey: 'nav.extensions' },
  { path: '/experts', icon: Bot, labelKey: 'nav.experts', descKey: 'nav.experts' },
  { path: '/tasks', icon: Clock, labelKey: 'nav.tasks', descKey: 'nav.tasks' },
  { path: '/skills', icon: Sparkles, labelKey: 'nav.skills', descKey: 'nav.skills' },
  { path: '/lingqi', icon: Sparkles, labelKey: 'nav.lingqi', descKey: 'nav.lingqiDesc' },
  { path: '/mcp', icon: Cog, labelKey: 'nav.mcp', descKey: 'nav.mcp' },
  { path: '/workorders', icon: Inbox, labelKey: 'nav.workorders', descKey: 'nav.workorders' },
];

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { createConversation } = useConversationStore();
  const { user, logout } = useAuthStore();
  const { setMessages } = useChatStore();
  const { status: lingqiStatus, loadLingqi } = useLingqiStore();

  const teamId = getTeamId(user);

  useEffect(() => {
    if (!teamId) {
      return;
    }

    void loadLingqi(teamId);
  }, [teamId, loadLingqi]);

  const isPathActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNewConversation = async () => {
    if (!teamId) {
      return;
    }

    try {
      const conversation = await createConversation(teamId, '');
      setMessages([]);
      navigate(`/chat/${conversation.id}`);
    } catch {
      navigate('/chat');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const goToProfile = () => {
    navigate('/profile');
  };

  const getNavLabel = (item: typeof menuItems[number]): string => {
    if ('label' in item) {
      return item.label as string;
    }

    return t(item.labelKey) as string;
  };

  const getNavDescription = (item: typeof menuItems[number]): string => {
    if ('desc' in item) {
      return item.desc as string;
    }

    return t(item.descKey) as string;
  };

  const renderNavItem = (item: typeof menuItems[number]) => {
    const isActive = isPathActive(item.path);
    const navLabel = getNavLabel(item);
    const navDescription = getNavDescription(item);
    const navLink = (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === '/'}
        aria-label={navLabel}
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 ${
          isActive
            ? 'bg-amber-50/90 text-stone-950 shadow-sm shadow-amber-900/10 ring-1 ring-amber-200/80'
            : 'text-stone-500 hover:text-stone-950 hover:bg-amber-50/60'
        } ${isCollapsed ? 'justify-center px-0' : ''}`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-mint rounded-full" />
        )}
        <item.icon
          className={`w-4.5 h-4.5 flex-shrink-0 ${isCollapsed ? 'text-base' : ''}`}
          strokeWidth={1.75}
        />
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="truncate">{navLabel}</span>
            <span className="text-[10px] text-zinc-400 font-normal truncate">
              {navDescription}
            </span>
          </div>
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.path}>
          <TooltipTrigger asChild>
            {navLink}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-zinc-900 text-white border-0">
            <p>{navDescription}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return navLink;
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={`${
          isCollapsed ? 'w-16' : 'w-60'
        } pavilion-shell border-r flex flex-col transition-all duration-300 ease-out`}
      >
        {/* Header: New Chat + Collapse Toggle (right side) */}
        <div className="p-3 relative">
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleNewConversation}
                className="flex-1 gap-2 btn-ice rounded-xl h-10 shadow-lg shadow-zinc-200/50 transition-all duration-200 active:scale-[0.98] focus-visible:ring-emerald-300"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span className="text-sm font-medium">{t('nav.newChat')}</span>
              </Button>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                aria-label="收起侧边栏"
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleNewConversation}
                    aria-label="新建对话"
                    className="w-full h-10 flex items-center justify-center rounded-xl btn-ice shadow-lg shadow-zinc-200/50 transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-zinc-900 text-white border-0">
                  <p>{t('nav.newChat')}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    aria-label="展开侧边栏"
                    className="w-full h-10 flex items-center justify-center rounded-xl bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-zinc-900 text-white border-0">
                  <p>{t('sidebar.expand')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <div className="w-full px-2.5 pb-3">
          <LingqiStatusCard
            status={lingqiStatus}
            isCollapsed={isCollapsed}
            onOpen={() => navigate('/lingqi')}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
          {menuItems.map(renderNavItem)}
        </nav>

        {/* Bottom: User Menu */}
        <div className={`w-full flex p-2.5 border-t border-zinc-200/60 space-y-1 ${isCollapsed ? 'justify-center' : ''}`}>
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="打开用户菜单"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 ${
                  isCollapsed ? 'justify-center' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-watermelon flex items-center justify-center shadow-sm flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`}>
                  <UserCircle className="w-4 h-4 text-white" />
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-zinc-700 truncate">
                      {user?.name || user?.email?.split('@')[0] || '用户'}
                    </span>
                    {user?.team && (
                      <span className="text-[10px] text-zinc-400 truncate">
                        {user.team.name}
                      </span>
                    )}
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-64 p-2 rounded-xl shadow-lg shadow-zinc-200/50 border border-zinc-100/50">
              <div className="px-3 py-2.5 mb-1">
                <p className="text-sm font-semibold text-zinc-900">
                  {user?.name || '未设置姓名'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{user?.email}</p>
                {user?.team && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gradient-mint text-white text-[10px] font-medium">
                      {user.team.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">{user.team.role}</span>
                  </div>
                )}
              </div>
              <DropdownMenuSeparator className="my-1.5 bg-zinc-100" />
              <DropdownMenuItem
                onClick={goToProfile}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-50 focus:bg-zinc-50"
              >
                <UserCircle className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-700">{t('nav.profile')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-50 focus:bg-zinc-50"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                <span className="text-sm text-zinc-700">{t('nav.settings')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5 bg-zinc-100" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-red-50 focus:bg-red-50 group"
              >
                <LogOut className="w-4 h-4 text-zinc-400 group-hover:text-red-600" />
                <span className="text-sm text-red-600 font-medium">{t('nav.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Settings Modal */}
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;