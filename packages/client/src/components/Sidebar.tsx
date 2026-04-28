import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  Bot,
  Clock,
  Settings,
  Plus,
  Cog,
  Menu,
  X,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SettingsModal from './SettingsModal';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '工作台' },
  { path: '/chat', icon: MessageSquare, label: 'Claw' },
  { path: '/extensions', icon: ShoppingBag, label: '扩展商店' },
  { path: '/experts', icon: Bot, label: '专家系统' },
  { path: '/tasks', icon: Clock, label: '定时任务' },
  { path: '/skills', icon: Bot, label: 'Skill 市场' },
  { path: '/mcp', icon: Bot, label: 'MCP 市场' },
  { path: '/workorders', icon: Inbox, label: '工单中心' },
];

const Sidebar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300`}>
      {/* 折叠按钮和新建对话按钮 - 同一行 */}
      <div className="p-2 flex items-center gap-4">
        {!isCollapsed && (
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-1 px-4 py-1.5 text-sm flex-1 max-w-[calc(100%-32px)]">
            <Plus className="w-4 h-4" />
            新建对话
          </Button>
        )}
        <div className="flex-shrink-0">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `group flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
            onMouseEnter={() => setHoveredItem(item.path)}
            onMouseLeave={() => setHoveredItem(null)}
            title={isCollapsed ? item.label : undefined}
          >
            <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </div>
            {!isCollapsed && item.path === '/chat' && hoveredItem === item.path && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSettingsOpen(true);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
              >
                <Cog className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 space-y-1">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full transition-colors`}
          title={isCollapsed ? '设置' : undefined}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">设置</span>}
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </aside>
  );
};

export default Sidebar;
