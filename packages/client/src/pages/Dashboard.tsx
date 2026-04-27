import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  BarChart3,
  Mail,
  Calendar,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  Puzzle,
  Clock,
  Zap
} from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useGatewayStore } from '@/stores/gateway';
import { useUsageStore } from '@/stores/usage';
import { useQuotaStore } from '@/stores/quota';
import { useExpertStore } from '@/stores/experts';
import { QuotaProgressBar } from '@/components/QuotaProgressBar';

const Dashboard: React.FC = () => {
  // 驱动 gateway 连接并同步状态到 useGatewayStore
  useGateway({ autoConnect: true });

  const { isRunning, isConnected } = useGatewayStore();
  const { stats, refreshAllStats } = useUsageStore();
  const { loadConfig, refreshStatus } = useQuotaStore();
  const { prompts: experts, loadPrompts } = useExpertStore();

  // 计算真实统计数据
  const activeSessions = stats.month.requestCount;
  const skillCount = experts.length;

  // 加载用量、配额和专家数据
  useEffect(() => {
    refreshAllStats();
    loadConfig();
    refreshStatus();
    loadPrompts();
  }, []);

  const workspaceActions = [
    { 
      title: '文档处理', 
      desc: '分析、总结并从复杂的 PDF 和文档中提取关键洞察。',
      icon: FileText,
      action: '启动工具'
    },
    { 
      title: '数据分析', 
      desc: '从原始电子表格数据生成图表和结构化报告。',
      icon: BarChart3,
      action: '启动工具'
    },
    { 
      title: '邮件助手', 
      desc: '自动起草专业回复并整理收件箱优先级。',
      icon: Mail,
      action: '启动工具'
    },
    { 
      title: '日程管理', 
      desc: '协调跨团队会议并解决时区冲突。',
      icon: Calendar,
      action: '启动工具'
    },
  ];

  return (
    <div className="flex-1 bg-gray-50">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Banner - 响应式 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 mb-6 md:mb-8 border border-blue-100">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="bg-white/80 text-xs gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI 助手 v1.0 已就绪
                  </Badge>
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 md:mb-3">
                  释放创意
                  <span className="text-primary">，成就现实</span>
                </h1>
                <p className="text-sm md:text-base text-muted-foreground max-w-xl mb-4 md:mb-6">
                  随时随地触发，本地完成。你的认知工作区已优化，准备好迎接今天的深度工作。
                </p>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  <Button size="sm" className="gap-2">
                    开始深度工作
                  </Button>
                  <Button variant="outline" size="sm" className="bg-white">
                    查看教程
                  </Button>
                </div>
              </div>
              <div className="hidden lg:block flex-shrink-0">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg">
                  <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-20 h-20 text-white/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards - 响应式网格 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                    {isRunning && isConnected ? '在线' : '离线'}
                  </Badge>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">{activeSessions}</h3>
                <p className="text-sm text-gray-500">活跃会话</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Puzzle className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">{skillCount}</h3>
                <p className="text-sm text-gray-500">Skill 数量</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">0</h3>
                <p className="text-sm text-gray-500">MCP 服务</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">0</h3>
                <p className="text-sm text-gray-500">定时任务</p>
              </CardContent>
            </Card>
          </div>

          {/* 配额进度 */}
          <div className="mb-6 md:mb-8">
            <QuotaProgressBar />
          </div>

          {/* Workspace Actions - 响应式 */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 gap-2">
              <h2 className="text-xl font-semibold text-gray-900">工作区工具</h2>
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                全部工具
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {workspaceActions.map((action, index) => (
                <Card key={index} className="hover:shadow-lg transition-all cursor-pointer group bg-white border-gray-200">
                  <CardContent className="p-4 md:p-6">
                    <div className="mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                        <action.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{action.desc}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                        {action.action}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Operations */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 md:mb-4 gap-2">
              <h2 className="text-xl font-semibold text-gray-900">最近会话</h2>
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                查看全部
              </Button>
            </div>
            <Card className="bg-white border-gray-200">
              <CardContent className="p-6 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>暂无会话记录</p>
                <p className="text-sm">开始对话以创建您的第一个会话</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
