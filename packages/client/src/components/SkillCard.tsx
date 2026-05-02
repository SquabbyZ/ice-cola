import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Download, Settings, MoreVertical, Trash2, Edit2, Upload, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Skill } from '@/stores/skillsStore';

interface SkillCardProps {
  skill: Skill;
  onInstall?: (id: string) => void;
  onUninstall?: (id: string) => void;
  onEnable?: (id: string) => void;
  onDisable?: (id: string) => void;
  onEdit?: (skill: Skill) => void;
  onDelete?: (id: string) => void;
  onPublish?: (id: string) => void;
  onVersionHistory?: (id: string) => void;
  showActions?: boolean;
}

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  onInstall,
  onUninstall,
// onEnable,
// onDisable,
  onEdit,
  onDelete,
  onPublish,
// onVersionHistory,
  showActions = true,
}) => {
const [showMenu, setShowMenu] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [editForm, setEditForm] = useState({
    name: skill.name,
    description: skill.description,
    version: skill.version,
    icon: skill.icon,
    category: skill.category,
    tags: skill.tags.join(', '),
  });
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const menuHeight = 180; // approximate menu height
      let top = rect.bottom;
      // If menu would go below viewport, position it above the button
      if (rect.bottom + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight;
      }
      setMenuPosition({
        top: top + 4,
        left: rect.left,
      });
    }
  }, [showMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMenu && menuButtonRef.current) {
        // Check if click is inside the menu button or the menu portal
        const menuPortal = document.querySelector('[data-menu-portal]');
        if (menuButtonRef.current.contains(e.target as Node)) return;
        if (menuPortal && menuPortal.contains(e.target as Node)) return;
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const statusLabels: Record<string, { text: string; color: string }> = {
    personal: { text: '个人', color: 'bg-gray-100 text-gray-600' },
    team_pending: { text: '待团队审批', color: 'bg-yellow-100 text-yellow-700' },
    team: { text: '团队已发布', color: 'bg-blue-100 text-blue-700' },
    marketplace_pending: { text: '待市场审批', color: 'bg-orange-100 text-orange-700' },
    marketplace: { text: '已发布市场', color: 'bg-emerald-100 text-emerald-700' },
  };

  const handleInstall = () => {
    setIsInstalled(true);
    onInstall?.(skill.id);
  };

  const handleUninstall = () => {
    setShowUninstallConfirm(true);
  };

  const confirmUninstall = () => {
    setIsInstalled(false);
    onUninstall?.(skill.id);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>);
    }
    return stars;
  };

  const status = statusLabels[skill.status] || statusLabels.personal;

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200/80 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      {skill.status !== 'personal' && (
        <div className="absolute top-4 right-4 z-10">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>
            {status.text}
          </span>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md">
            {skill.icon || '🛠️'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{skill.name}</h3>
            <p className="text-sm text-gray-500 mt-1">by {skill.authorId}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-4">{skill.description}</p>

        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-1">{renderStars(skill.ratings)} <span className="text-sm font-semibold ml-1">{skill.ratings}</span></div>
          <div className="flex items-center gap-1 text-gray-500 text-sm"><Download className="w-4 h-4" /> {skill.installs}</div>
          <div className="ml-auto"><Badge variant="secondary" className="font-mono text-xs">v{skill.version}</Badge></div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {skill.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg">#{tag}</span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isInstalled ? (
            <Button size="sm" className="flex-1 gap-2" onClick={handleInstall}>
              <Download className="w-4 h-4" /> 安装
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => setShowConfig(true)}>
                <Settings className="w-4 h-4" /> 配置
              </Button>
              <Button size="sm" variant="ghost" onClick={handleUninstall}>卸载</Button>
            </>
          )}

          {showActions && (
            <div className="relative">
              <Button size="icon" variant="ghost" ref={menuButtonRef} onClick={() => setShowMenu(!showMenu)}>
                <MoreVertical className="w-4 h-4" />
              </Button>
              {showMenu && ReactDOM.createPortal(
                <div
                  data-menu-portal="true"
                  className="fixed bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[140px] z-[9999] max-h-[80vh] overflow-y-auto"
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  {skill.status === 'personal' && (
                    <>
                      <button onClick={() => { setEditForm({
                          name: skill.name,
                          description: skill.description,
                          version: skill.version,
                          icon: skill.icon,
                          category: skill.category,
                          tags: skill.tags.join(', '),
                        }); setShowEdit(true); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                        <Edit2 className="w-4 h-4" /> 编辑
                      </button>
                      <button onClick={() => { setShowVersions(true); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> 版本历史
                      </button>
                      <button onClick={() => { onPublish?.(skill.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-indigo-600">
                        <Upload className="w-4 h-4" /> 发布到团队
                      </button>
                    </>
                  )}
                  <button onClick={() => { onDelete?.(skill.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> 删除
                  </button>
                </div>,
                document.body
              )}
            </div>
          )}
        </div>
      </div>

      {showConfig && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-indigo-50 to-purple-50">{skill.icon}</div>
                <div><h3 className="font-bold">{skill.name}</h3><p className="text-xs text-gray-500">Skill 配置</p></div>
              </div>
              <button onClick={() => setShowConfig(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">配置面板暂未实现</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <Button onClick={() => setShowConfig(false)}>关闭</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showEdit && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-indigo-50 to-purple-50">{editForm.icon || '🛠️'}</div>
                <div><h3 className="font-bold">编辑 Skill</h3><p className="text-xs text-gray-500">{skill.name}</p></div>
              </div>
              <button onClick={() => setShowEdit(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">版本</label>
                <input
                  type="text"
                  value={editForm.version}
                  onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                <input
                  type="text"
                  value={editForm.icon}
                  onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="🛠️"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="开发">开发</option>
                  <option value="生产力">生产力</option>
                  <option value="工具">工具</option>
                  <option value="写作">写作</option>
                  <option value="分析">分析</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签（逗号分隔）</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="code, review, programming"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowEdit(false)}>取消</Button>
              <Button onClick={() => {
                const updatedSkill = {
                  ...skill,
                  name: editForm.name,
                  description: editForm.description,
                  version: editForm.version,
                  icon: editForm.icon,
                  category: editForm.category,
                  tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
                };
                onEdit?.(updatedSkill);
                setShowEdit(false);
              }}>保存</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showVersions && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-indigo-50 to-purple-50">{skill.icon}</div>
                <div><h3 className="font-bold">版本历史</h3><p className="text-xs text-gray-500">{skill.name}</p></div>
              </div>
              <button onClick={() => setShowVersions(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-500 mb-4">当前版本：v{skill.version}</p>
              <div className="space-y-3">
                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">v{skill.version}</span>
                    <span className="text-xs text-gray-500">{new Date(skill.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600">当前版本</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 opacity-60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-500">v1.0.0</span>
                    <span className="text-xs text-gray-400">2026-04-01</span>
                  </div>
                  <p className="text-sm text-gray-400">初始版本</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <Button onClick={() => setShowVersions(false)}>关闭</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={showUninstallConfirm}
        onOpenChange={setShowUninstallConfirm}
        title="确认卸载"
        description={`确定要卸载 "${skill.name}" 吗？`}
        confirmText="卸载"
        cancelText="取消"
        onConfirm={confirmUninstall}
        variant="destructive"
      />
    </div>
  );
};