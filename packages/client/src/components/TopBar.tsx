import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Settings, Bell, User, LogOut, ChevronDown, UserCircle } from 'lucide-react';
import { useGatewayStore } from '@/stores/gateway';
import { useTeamStore } from '@/stores/team';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const { isRunning, isConnected } = useGatewayStore();
  const { totalQuota, usedQuota } = useTeamStore();
  const { user, logout } = useAuthStore();

  const usagePercentage = totalQuota > 0 ? (usedQuota / totalQuota) * 100 : 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const goToProfile = () => {
    navigate('/profile');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-6">
      {/* Left: Logo + App Name - 响应式 */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base md:text-lg font-semibold text-gray-900 leading-tight">
              加冰可乐
            </h1>
            <p className="text-xs text-gray-500 -mt-0.5 hidden md:block">
              AI 办公助手
            </p>
          </div>
        </div>

        <span className="text-primary font-semibold text-base md:text-lg hidden lg:block">
          加冰可乐
        </span>
      </div>

      {/* Center: Search - 小屏隐藏 */}
      <div className="flex-1 max-w-2xl mx-4 md:mx-8 min-w-0 hidden md:block">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索工作区..."
            className="w-full h-9 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Right: Status + Actions - 响应式 */}
      <div className="flex items-center gap-3 md:gap-6">
        {/* Gateway Status - Icon only with Tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center cursor-pointer">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isRunning && isConnected
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-red-500'
                  }`}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRunning && isConnected ? '网关运行中' : '网关离线'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Quota - 小屏隐藏 */}
        <div className="flex items-center gap-2 hidden md:flex">
          <span className="text-sm text-gray-600">额度</span>
          <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>

        {/* Action Icons - 响应式 */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="w-4 h-4 text-gray-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
            <Bell className="w-4 h-4 text-gray-600" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 px-2 gap-2 rounded-full hover:bg-gray-100"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user?.name || user?.email || '用户'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || '未设置姓名'}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                {user?.team && (
                  <p className="text-xs text-primary mt-1">
                    {user.team.name} · {user.team.role}
                  </p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={goToProfile} className="cursor-pointer">
                <UserCircle className="w-4 h-4 mr-2" />
                个人中心
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
