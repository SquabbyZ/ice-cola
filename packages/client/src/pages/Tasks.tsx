import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock, Plus, Play, CheckCircle2, Loader2, XCircle,
  Search, Trash2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useTaskStore } from '@/stores/taskStore';

const STATUS_CONFIG: Record<string, { color: string; bg: string; labelKey: string }> = {
  running: { color: 'text-blue-600', bg: 'bg-blue-100', labelKey: 'tasks.running' },
  completed: { color: 'text-green-600', bg: 'bg-green-100', labelKey: 'tasks.completed' },
  failed: { color: 'text-red-600', bg: 'bg-red-100', labelKey: 'tasks.failed' },
  pending: { color: 'text-yellow-600', bg: 'bg-yellow-100', labelKey: 'tasks.pending' },
};

const TRIGGER_LABELS: Record<string, string> = {
  manual: '手动触发',
  scheduled: '定时执行',
  event: '事件触发',
};

const Tasks: React.FC = () => {
  const { t } = useTranslation();
  const {
    tasks, filterStatus, searchQuery, isLoading,
    loadTasks, createTask, deleteTask, runTask,
    setFilterStatus, setSearchQuery, getFilteredTasks,
  } = useTaskStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; taskId: string | null; taskName: string }>({
    open: false, taskId: null, taskName: '',
  });
  const [createForm, setCreateForm] = useState({ name: '', description: '', triggerType: 'manual' as const });

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = getFilteredTasks();
  const runningCount = tasks.filter(t => t.status === 'running').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const successRate = tasks.reduce((sum, t) => sum + t.runCount, 0) > 0
    ? Math.round((tasks.reduce((sum, t) => sum + t.successCount, 0) / tasks.reduce((sum, t) => sum + t.runCount, 0)) * 100)
    : 0;

  const statCards = [
    { label: t('tasks.running'), value: runningCount, icon: Play, color: 'blue' },
    { label: t('tasks.completed'), value: completedCount, icon: CheckCircle2, color: 'green' },
    { label: t('tasks.totalExecutions'), value: tasks.reduce((s, t) => s + t.runCount, 0), icon: Clock, color: 'zinc' },
    { label: t('tasks.successRate'), value: `${successRate}%`, icon: Loader2, color: 'emerald' },
  ];

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    await createTask({
      name: createForm.name.trim(),
      description: createForm.description.trim(),
      triggerType: createForm.triggerType,
    });
    setCreateForm({ name: '', description: '', triggerType: 'manual' });
    setCreateOpen(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} 小时前`;
    return d.toLocaleDateString('zh-CN');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50/50">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-zinc-900 tracking-tight mb-2">
                {t('tasks.title')}
              </h1>
              <p className="text-zinc-500 text-sm">{t('tasks.subtitle')}</p>
            </div>
            <Button className="btn-ice gap-2 px-5" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              {t('tasks.create')}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <div
                key={stat.label}
                className="bento-tile p-5 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100/80 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-zinc-500" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-zinc-900 font-mono tracking-tight">
                    {stat.value}
                  </span>
                  <span className="text-sm text-zinc-500 mt-1">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-zinc-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索练功安排..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'running', 'completed', 'failed', 'pending'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-zinc-900 text-white shadow-md'
                    : 'bg-white text-zinc-600 border border-zinc-200/50 hover:bg-zinc-50'
                }`}
              >
                {status === 'all' ? '全部' : t(STATUS_CONFIG[status]?.labelKey || status)}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-zinc-200/30 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bento-tile p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-100/80 flex items-center justify-center">
              <Clock className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">暂无练功安排</h3>
            <p className="text-zinc-500 mb-6 text-sm">点击上方按钮创建你的第一个自动化练功安排</p>
            <Button variant="outline" className="border-zinc-200 hover:bg-zinc-50 rounded-xl px-6" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> 创建练功安排
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => {
              const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={task.id}
                  className="bento-tile p-5 flex items-center gap-4 hover:shadow-md transition-all group"
                >
                  {/* Status Icon */}
                  <div className={`w-10 h-10 rounded-xl ${statusCfg.bg} flex items-center justify-center flex-shrink-0 ${statusCfg.color}`}>
                    {getStatusIcon(task.status)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-zinc-900 truncate">{task.name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                        {t(statusCfg.labelKey)}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-100 text-zinc-500">
                        {TRIGGER_LABELS[task.triggerType]}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 truncate">{task.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                      <span>执行 {task.runCount} 次</span>
                      <span>成功 {task.successCount} 次</span>
                      {task.lastRunAt && <span>上次运行: {formatTime(task.lastRunAt)}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {task.status !== 'running' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => runTask(task.id)}
                        title="立即运行"
                      >
                        <Play className="w-4 h-4 text-zinc-500" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteConfirm({ open: true, taskId: task.id, taskName: task.name })}
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {createOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">创建练功安排</h3>
                  <p className="text-xs text-zinc-500">新建一个自动化练功安排</p>
                </div>
              </div>
              <button onClick={() => setCreateOpen(false)} className="p-2 rounded-lg hover:bg-zinc-100">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">练功名称 *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="例如：每日数据备份"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">描述</label>
                <textarea
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="描述这次练功安排的目标"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">触发方式</label>
                <select
                  value={createForm.triggerType}
                  onChange={e => setCreateForm({ ...createForm, triggerType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="manual">手动触发</option>
                  <option value="scheduled">定时执行</option>
                  <option value="event">事件触发</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-zinc-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button onClick={handleCreate} disabled={!createForm.name.trim()}>
                <Plus className="w-4 h-4 mr-1" /> 创建
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="确认删除"
        description={`确定要删除练功安排 "${deleteConfirm.taskName}" 吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={() => {
          if (deleteConfirm.taskId) {
            deleteTask(deleteConfirm.taskId);
          }
        }}
        variant="destructive"
      />
    </div>
  );
};

export default Tasks;
