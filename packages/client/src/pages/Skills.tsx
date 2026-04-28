import React, { useEffect, useState } from 'react';
import { Search, Package, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useSkillsStore } from '@/stores/skillsStore';
import { SkillCard } from '@/components/SkillCard';

const CATEGORIES = ['全部', '开发', '生产力', '工具', '写作', '分析'];

const Skills: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'team' | 'personal'>('marketplace');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; skillId: string | null; skillName: string }>({ open: false, skillId: null, skillName: '' });
  const [publishConfirm, setPublishConfirm] = useState<{ open: boolean; skillId: string | null; skillName: string }>({ open: false, skillId: null, skillName: '' });
  const {
    personalSkills,
    teamSkills,
    marketplaceSkills,
    searchQuery,
    selectedCategory,
    isLoading,
    error,
    loadPersonalSkills,
    loadTeamSkills,
    loadMarketplaceSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    setSearchQuery,
    setSelectedCategory,
    getFilteredSkills,
  } = useSkillsStore();

  useEffect(() => {
    loadPersonalSkills();
    loadTeamSkills('team-001');
    loadMarketplaceSkills('team-001');
  }, [loadPersonalSkills, loadTeamSkills, loadMarketplaceSkills]);

  const getCurrentSkills = () => {
    switch (activeTab) {
      case 'marketplace': return getFilteredSkills(marketplaceSkills);
      case 'team': return getFilteredSkills(teamSkills);
      case 'personal': return getFilteredSkills(personalSkills);
    }
  };

  const currentSkills = getCurrentSkills();
  const counts = {
    marketplace: marketplaceSkills.length,
    team: teamSkills.filter(s => s.status === 'team_pending').length,
    personal: personalSkills.length,
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                  Skill 市场
                </h1>
                <p className="text-gray-600 text-base lg:text-lg">发现并安装强大的 AI 技能，增强你的助手能力</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 px-4 py-2">
                  <Package className="w-4 h-4 mr-1.5" />
                  {marketplaceSkills.length} 个 Skill
                </Badge>
              </div>
            </div>
          </div>

          <div className="mb-8 space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索 Skill 名称、描述或标签..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-sm text-gray-500 flex-shrink-0">分类:</span>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border-2 ${
                    selectedCategory === cat
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mb-8 bg-gray-100/50 p-1.5 rounded-xl w-fit">
            <button onClick={() => setActiveTab('marketplace')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'marketplace' ? 'bg-white shadow-md text-primary' : 'text-gray-600 hover:text-gray-900'}`}>
              市场 ({counts.marketplace})
            </button>
            <button onClick={() => setActiveTab('team')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'team' ? 'bg-white shadow-md text-primary' : 'text-gray-600 hover:text-gray-900'}`}>
              我的团队 ({counts.team})
            </button>
            <button onClick={() => setActiveTab('personal')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'personal' ? 'bg-white shadow-md text-primary' : 'text-gray-600 hover:text-gray-900'}`}>
              我的 Skill ({counts.personal})
            </button>
          </div>

          {activeTab === 'personal' && (
            <div className="mb-6 flex justify-end">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                <Sparkles className="w-4 h-4" />
                创建 Skill
              </Button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : currentSkills.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">暂无 Skill</h3>
              <p className="text-gray-500 mb-8">
                {activeTab === 'personal' ? '创建你的第一个 Skill 开始吧' : '该分类下暂无 Skill'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {currentSkills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  showActions={activeTab === 'personal'}
                  onEdit={(s) => {
                    updateSkill(s.id, s);
                  }}
                  onDelete={(id) => {
                    setDeleteConfirm({ open: true, skillId: id, skillName: skill.name });
                  }}
                  onPublish={(id) => {
                    setPublishConfirm({ open: true, skillId: id, skillName: skill.name });
                  }}
                  onVersionHistory={(id) => console.log('Version history:', id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="确认删除"
        description={`确定要删除 "${deleteConfirm.skillName}" 吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={() => {
          if (deleteConfirm.skillId) {
            deleteSkill(deleteConfirm.skillId);
          }
        }}
        variant="destructive"
      />

      <ConfirmDialog
        open={publishConfirm.open}
        onOpenChange={(open) => setPublishConfirm({ ...publishConfirm, open })}
        title="发布到团队"
        description={`确定要发布 "${publishConfirm.skillName}" 到团队吗？`}
        confirmText="发布"
        cancelText="取消"
        onConfirm={() => {
          if (publishConfirm.skillId) {
            useSkillsStore.getState().requestPublishToTeam(publishConfirm.skillId);
          }
        }}
      />
    </>
  );
};

export default Skills;
