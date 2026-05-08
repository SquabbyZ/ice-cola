import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConversationStore } from '@/stores/conversations';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chat';
import SettingsModal from './SettingsModal';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '工作台', desc: 'Dashboard' },
  { path: '/chat', icon: MessageSquare, label: 'Claw', desc: 'AI 对话' },
  { path: '/extensions', icon: ShoppingBag, label: '扩展', desc: 'Extensions' },
  { path: '/experts', icon: Bot, label: '专家', desc: 'Experts' },
  { path: '/tasks', icon: Clock, label: '任务', desc: 'Scheduled' },
  { path: '/skills', icon: Sparkles, label: 'Skills', desc: 'Marketplace' },
  { path: '/mcp', icon: Cog, label: 'MCP', desc: 'Servers' },
  { path: '/workorders', icon: Inbox, label: '工单', desc: 'Workorders' },
];

const Sidebar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { createConversation } = useConversationStore();
  const user = useAuthStore((state) => state.user);
  const { setMessages } = useChatStore();

  const teamId = user?.team?.id || 'default';

  const isPathActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNewConversation = async () => {
    try {
      await createConversation(teamId, '');
      setMessages([]);
      navigate('/chat');
    } catch {
      // Handle error silently
    }
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-60'
      } bg-zinc-50/50 border-r border-zinc-200/60 flex flex-col transition-all duration-300 ease-out`}
    >
      {/* Header: New Chat + Collapse */}
      <div className="p-3 space-y-2">
        {!isCollapsed ? (
          <Button
            onClick={handleNewConversation}
            className="w-full gap-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl h-10 shadow-lg shadow-zinc-200/50 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span className="text-sm font-medium">新建对话</span>
          </Button>
        ) : (
          <button
            onClick={handleNewConversation}
            className="w-full h-10 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-200/50 transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-full flex items-center justify-center py-1.5 rounded-lg transition-all duration-200 ${
            isCollapsed
              ? 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/80'
              : 'bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/80'
          }`}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ease-out ${isCollapsed ? 'rotate-180' : ''}`}
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

      {/* Navigation */}
      <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = isPathActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white text-zinc-900 shadow-sm shadow-zinc-200/80'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/60'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-mint rounded-full" />
              )}
              <item.icon
                className={`w-4.5 h-4.5 flex-shrink-0 ${
                  isCollapsed ? 'text-base' : ''
                }`}
                strokeWidth={1.75}
              />
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{item.label}</span>
                  <span className="text-[10px] text-zinc-400 font-normal truncate">
                    {item.desc}
                  </span>
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom: Settings */}
      <div className="p-2.5 border-t border-zinc-200/60">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-white/60 transition-all duration-200 ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Settings className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={1.75} />
          {!isCollapsed && <span>设置</span>}
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </aside>
  );
};

export default Sidebar;