import React, { useEffect, useState } from 'react';
import type { TeamSkillAccessPolicy } from '@/services/skill-service';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useSkillsStore } from '@/stores/skillsStore';
import type { SkillVersion } from '@/stores/skillsStore';
import { useAuthStore } from '@/stores/authStore';
import { useWorkordersStore } from '@/stores/workordersStore';
import { SkillCard } from '@/components/SkillCard';
import { getTeamId } from '@/lib/team';
import { CreateSkillDialog } from '@/components/CreateSkillDialog';
import { SkillVersionHistory } from '@/components/SkillVersionHistory';

const CATEGORIES = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'development', labelKey: 'skills.categoryDevelopment' },
  { key: 'productivity', labelKey: 'skills.categoryProductivity' },
  { key: 'tools', labelKey: 'skills.categoryTools' },
  { key: 'writing', labelKey: 'skills.categoryWriting' },
  { key: 'analytics', labelKey: 'skills.categoryAnalytics' },
];

const Skills: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'marketplace' | 'team' | 'personal'>('marketplace');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; skillId: string | null; skillName: string }>({ open: false, skillId: null, skillName: '' });
  const [publishConfirm, setPublishConfirm] = useState<{ open: boolean; skillId: string | null; skillName: string }>({ open: false, skillId: null, skillName: '' });
  const [teamApprovalConfirm, setTeamApprovalConfirm] = useState<{ open: boolean; skillId: string | null; skillName: string; action: 'approve' | 'reject' | null }>({ open: false, skillId: null, skillName: '', action: null });
  const [marketplaceConfirm, setMarketplaceConfirm] = useState<{ open: boolean; skillId: string | null; skillName: string }>({ open: false, skillId: null, skillName: '' });
  const [publishAccessMode, setPublishAccessMode] = useState<TeamSkillAccessPolicy['mode']>('all');
  const [publishUserIds, setPublishUserIds] = useState('');
  const [publishMinimumRole, setPublishMinimumRole] = useState<'MEMBER' | 'ADMIN' | 'OWNER'>('MEMBER');
  const [teamRejectComment, setTeamRejectComment] = useState('');
  const [marketplaceNote, setMarketplaceNote] = useState('');
  const [marketplaceAccessMode, setMarketplaceAccessMode] = useState<TeamSkillAccessPolicy['mode']>('all');
  const [marketplaceUserIds, setMarketplaceUserIds] = useState('');
  const [marketplaceMinimumRole, setMarketplaceMinimumRole] = useState<'MEMBER' | 'ADMIN' | 'OWNER'>('MEMBER');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [versionHistory, setVersionHistory] = useState<{ open: boolean; skillId: string | null; versions: SkillVersion[]; currentVersion: string }>({ open: false, skillId: null, versions: [], currentVersion: '' });
  const [previewVersion, setPreviewVersion] = useState<SkillVersion | null>(null);
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
    updateSkill,
    deleteSkill,
    createSkill,
    getVersions,
    revertToVersion,
    requestPublishToTeam,
    approveTeamPublish,
    rejectTeamPublish,
    requestPublishToMarketplace,
    setSearchQuery,
    setSelectedCategory,
    getFilteredSkills,
  } = useSkillsStore();

  const user = useAuthStore(state => state.user);
  const teamId = getTeamId(user);
  const createWorkorder = useWorkordersStore(state => state.createWorkorder);
  const canReviewTeamSkills = user?.team?.role === 'OWNER' || user?.team?.role === 'ADMIN';

  useEffect(() => {
    loadPersonalSkills();
    if (teamId) {
      loadTeamSkills(teamId);
      loadMarketplaceSkills(teamId);
    }
  }, [loadPersonalSkills, loadTeamSkills, loadMarketplaceSkills, teamId]);

  const getCurrentSkills = () => {
    switch (activeTab) {
      case 'marketplace': return getFilteredSkills(marketplaceSkills);
      case 'team': return getFilteredSkills(teamSkills);
      case 'personal': return getFilteredSkills(personalSkills);
    }
  };

  const currentSkills = getCurrentSkills();
  const selectedPublishUserIds = publishUserIds.split(',').map(id => id.trim()).filter(Boolean);
  const isPublishConfirmDisabled = publishAccessMode === 'users' && selectedPublishUserIds.length === 0;
  const getPublishAccessPolicy = (): TeamSkillAccessPolicy => {
    if (publishAccessMode === 'users') {
      return { mode: 'users', userIds: selectedPublishUserIds };
    }
    if (publishAccessMode === 'role') {
      return { mode: 'role', minimumRole: publishMinimumRole };
    }
    return { mode: 'all' };
  };

  const selectedMarketplaceUserIds = marketplaceUserIds.split(',').map(id => id.trim()).filter(Boolean);
  const isMarketplaceConfirmDisabled = marketplaceAccessMode === 'users' && selectedMarketplaceUserIds.length === 0;
  const getMarketplaceAccessPolicy = (): TeamSkillAccessPolicy => {
    if (marketplaceAccessMode === 'users') {
      return { mode: 'users', userIds: selectedMarketplaceUserIds };
    }
    if (marketplaceAccessMode === 'role') {
      return { mode: 'role', minimumRole: marketplaceMinimumRole };
    }
    return { mode: 'all' };
  };
  const counts = {
    marketplace: marketplaceSkills.length,
    team: teamSkills.filter(s => s.status === 'team_pending').length,
    personal: personalSkills.length,
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-zinc-50/50">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-zinc-900 tracking-tight mb-2">
                  {t('skills.title')}
                </h1>
                <p className="text-zinc-500 text-sm lg:text-base">
                  {t('skills.subtitle')}
                </p>
              </div>
              <Badge className="bg-zinc-100/80 text-zinc-600 border-zinc-200/50 px-4 py-2">
                <Package className="w-4 h-4 mr-1.5" />
                {marketplaceSkills.length} {t('skills.skillsCount')}
              </Badge>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-zinc-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('skills.searchPlaceholder')}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-sm text-zinc-400 flex-shrink-0">{t('skills.category')}:</span>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    selectedCategory === cat.key
                      ? 'bg-zinc-900 text-white shadow-md'
                      : 'bg-white text-zinc-600 border border-zinc-200/50 hover:bg-zinc-50'
                  }`}
                >
                  {t(cat.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div className="flex gap-2">
              {[
                { id: 'marketplace' as const, label: t('skills.marketplace'), count: counts.marketplace },
                { id: 'team' as const, label: t('skills.myTeam'), count: counts.team },
                { id: 'personal' as const, label: t('skills.mySkills'), count: counts.personal },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-300/50'
                      : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/50'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            {activeTab === 'personal' && (
              <Button className="btn-ice gap-2 px-5" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                <Sparkles className="w-4 h-4" />
                {t('skills.create')}
              </Button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 glass-panel rounded-xl border-red-200/50 text-red-600">{error}</div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 bg-zinc-200/30 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : currentSkills.length === 0 ? (
            <div className="bento-tile p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-100/80 flex items-center justify-center">
                <Package className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">{t('skills.noSkills')}</h3>
              <p className="text-zinc-500 text-sm">
                {activeTab === 'personal' ? t('skills.createFirst') : t('skills.noSkillsInCategory')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {currentSkills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  showActions={activeTab === 'personal' || activeTab === 'team'}
                  showBadge={activeTab === 'team'}
                  onEdit={(s) => updateSkill(s.id, s)}
                  onDelete={(id) => {
                    setDeleteConfirm({ open: true, skillId: id, skillName: skill.name });
                  }}
                  onPublish={(id) => {
                    setPublishAccessMode('all');
                    setPublishUserIds('');
                    setPublishMinimumRole('MEMBER');
                    setPublishConfirm({ open: true, skillId: id, skillName: skill.name });
                  }}
                  onApproveTeam={canReviewTeamSkills ? (id) => {
                    setTeamRejectComment('');
                    setTeamApprovalConfirm({ open: true, skillId: id, skillName: skill.name, action: 'approve' });
                  } : undefined}
                  onRejectTeam={canReviewTeamSkills ? (id) => {
                    setTeamRejectComment('');
                    setTeamApprovalConfirm({ open: true, skillId: id, skillName: skill.name, action: 'reject' });
                  } : undefined}
                  onPublishMarketplace={canReviewTeamSkills ? (id) => {
                    setMarketplaceNote('');
                    setMarketplaceAccessMode('all');
                    setMarketplaceUserIds('');
                    setMarketplaceMinimumRole('MEMBER');
                    setMarketplaceConfirm({ open: true, skillId: id, skillName: skill.name });
                  } : undefined}
                  onVersionHistory={async (id) => {
                    const versions = await getVersions(id);
                    setVersionHistory({ open: true, skillId: id, versions, currentVersion: skill.version });
                  }}
                  onUse={(id) => navigate('/chat', { state: { selectedSkillIds: [id] } })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title={t('skills.confirmDeleteTitle')}
        description={`${t('skills.confirmDeleteDesc')} "${deleteConfirm.skillName}"? ${t('skills.actionUnreversible')}`}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
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
        title={t('skills.publishToTeam')}
        description={`${t('skills.publishDesc')} "${publishConfirm.skillName}"?`}
        confirmText={t('skills.publish')}
        cancelText={t('common.cancel')}
        confirmDisabled={isPublishConfirmDisabled}
        onConfirm={async () => {
          if (publishConfirm.skillId) {
            await requestPublishToTeam(publishConfirm.skillId, getPublishAccessPolicy());
          }
        }}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm hover:bg-zinc-50">
              <input
                type="radio"
                name="teamAccessMode"
                checked={publishAccessMode === 'all'}
                onChange={() => setPublishAccessMode('all')}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-zinc-900">所有宗门成员可用</span>
                <span className="text-xs text-zinc-500">宗门发布通过后，当前宗门所有成员都能使用。</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm hover:bg-zinc-50">
              <input
                type="radio"
                name="teamAccessMode"
                checked={publishAccessMode === 'users'}
                onChange={() => setPublishAccessMode('users')}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="block font-medium text-zinc-900">指定成员可用</span>
                <span className="text-xs text-zinc-500">输入允许使用的用户 ID，多个 ID 用英文逗号分隔。</span>
                {publishAccessMode === 'users' && (
                  <input
                    type="text"
                    value={publishUserIds}
                    onChange={e => setPublishUserIds(e.target.value)}
                    placeholder="user-id-1, user-id-2"
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                  />
                )}
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm hover:bg-zinc-50">
              <input
                type="radio"
                name="teamAccessMode"
                checked={publishAccessMode === 'role'}
                onChange={() => setPublishAccessMode('role')}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="block font-medium text-zinc-900">按最小角色可用</span>
                <span className="text-xs text-zinc-500">只有达到所选宗门角色的成员才能使用。</span>
                {publishAccessMode === 'role' && (
                  <select
                    value={publishMinimumRole}
                    onChange={e => setPublishMinimumRole(e.target.value as 'MEMBER' | 'ADMIN' | 'OWNER')}
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                  >
                    <option value="MEMBER">MEMBER 及以上</option>
                    <option value="ADMIN">ADMIN 及以上</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                )}
              </span>
            </label>
          </div>
          {isPublishConfirmDisabled && <p className="text-xs text-red-500">指定成员可用时至少需要填写一个用户 ID。</p>}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={teamApprovalConfirm.open}
        onOpenChange={(open) => setTeamApprovalConfirm({ ...teamApprovalConfirm, open })}
        title={teamApprovalConfirm.action === 'approve' ? '通过宗门发布' : '拒绝宗门发布'}
        description={teamApprovalConfirm.action === 'approve'
          ? `确认将 "${teamApprovalConfirm.skillName}" 发布到宗门？`
          : `确认拒绝 "${teamApprovalConfirm.skillName}" 的宗门发布申请？`}
        confirmText={teamApprovalConfirm.action === 'approve' ? '通过' : '拒绝'}
        cancelText={t('common.cancel')}
        variant={teamApprovalConfirm.action === 'reject' ? 'destructive' : 'default'}
        onConfirm={async () => {
          if (!teamApprovalConfirm.skillId) return;
          if (teamApprovalConfirm.action === 'approve') {
            await approveTeamPublish(teamApprovalConfirm.skillId);
            return;
          }
          await rejectTeamPublish(teamApprovalConfirm.skillId, teamRejectComment.trim());
        }}
      >
        {teamApprovalConfirm.action === 'reject' && (
          <textarea
            value={teamRejectComment}
            onChange={e => setTeamRejectComment(e.target.value)}
            rows={3}
            placeholder="填写拒绝原因（可选）"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
          />
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={marketplaceConfirm.open}
        onOpenChange={(open) => setMarketplaceConfirm({ ...marketplaceConfirm, open })}
        title="提交到秘籍市场"
        description={`确认将宗门秘籍 "${marketplaceConfirm.skillName}" 提交到市场审批？`}
        confirmText="提交审批"
        cancelText={t('common.cancel')}
        confirmDisabled={isMarketplaceConfirmDisabled}
        onConfirm={async () => {
          if (marketplaceConfirm.skillId && teamId) {
            await createWorkorder({
              type: 'skill',
              targetId: marketplaceConfirm.skillId,
              targetName: marketplaceConfirm.skillName,
              teamId,
              note: marketplaceNote.trim() || undefined,
              visibilityScope: getMarketplaceAccessPolicy(),
            });
          }
        }}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm hover:bg-zinc-50">
              <input
                type="radio"
                name="marketplaceAccessMode"
                checked={marketplaceAccessMode === 'all'}
                onChange={() => setMarketplaceAccessMode('all')}
                className="mt-1"
              />
              <span>
                <span className="block font-medium text-zinc-900">所有成员可见</span>
                <span className="text-xs text-zinc-500">审批通过后，所有成员都能在市场看到。</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm hover:bg-zinc-50">
              <input
                type="radio"
                name="marketplaceAccessMode"
                checked={marketplaceAccessMode === 'users'}
                onChange={() => setMarketplaceAccessMode('users')}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="block font-medium text-zinc-900">指定成员可见</span>
                <span className="text-xs text-zinc-500">输入允许使用的用户 ID，多个 ID 用英文逗号分隔。</span>
                {marketplaceAccessMode === 'users' && (
                  <input
                    type="text"
                    value={marketplaceUserIds}
                    onChange={e => setMarketplaceUserIds(e.target.value)}
                    placeholder="user-id-1, user-id-2"
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                  />
                )}
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 text-sm hover:bg-zinc-50">
              <input
                type="radio"
                name="marketplaceAccessMode"
                checked={marketplaceAccessMode === 'role'}
                onChange={() => setMarketplaceAccessMode('role')}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="block font-medium text-zinc-900">按最小角色可见</span>
                <span className="text-xs text-zinc-500">只有达到所选角色的成员才能看到。</span>
                {marketplaceAccessMode === 'role' && (
                  <select
                    value={marketplaceMinimumRole}
                    onChange={e => setMarketplaceMinimumRole(e.target.value as 'MEMBER' | 'ADMIN' | 'OWNER')}
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
                  >
                    <option value="MEMBER">MEMBER 及以上</option>
                    <option value="ADMIN">ADMIN 及以上</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                )}
              </span>
            </label>
          </div>
          {isMarketplaceConfirmDisabled && <p className="text-xs text-red-500">指定成员可见时至少需要填写一个用户 ID。</p>}
          <textarea
            value={marketplaceNote}
            onChange={e => setMarketplaceNote(e.target.value)}
            rows={3}
            placeholder="给市场管理员的备注（可选）"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
          />
        </div>
      </ConfirmDialog>

      <CreateSkillDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={async (data) => {
          if (!teamId) {
            return;
          }

          await createSkill(teamId, {
            ...data,
            authorId: user?.id || '',
            status: 'personal',
            ratings: 0,
            installs: 0,
          } as any);
          loadPersonalSkills();
        }}
      />

      {versionHistory.open && versionHistory.skillId && (
        <SkillVersionHistory
          versions={versionHistory.versions}
          currentVersion={versionHistory.currentVersion}
          onPreview={(version) => {
            setPreviewVersion(version);
          }}
          onRevert={async (versionId) => {
            await revertToVersion(versionHistory.skillId!, versionId);
            setVersionHistory({ open: false, skillId: null, versions: [], currentVersion: '' });
            loadPersonalSkills();
          }}
          onClose={() => setVersionHistory({ open: false, skillId: null, versions: [], currentVersion: '' })}
        />
      )}

      {previewVersion && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="font-bold text-zinc-900">版本预览</h3>
                <p className="text-xs text-zinc-500">v{previewVersion.version}</p>
              </div>
              <button onClick={() => setPreviewVersion(null)} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <pre className="text-sm text-zinc-700 whitespace-pre-wrap font-mono bg-zinc-50 rounded-xl p-4 border border-zinc-200/50">
                {previewVersion.content || '(无内容)'}
              </pre>
            </div>
            <div className="px-6 py-4 bg-zinc-50 flex justify-end">
              <Button variant="outline" onClick={() => setPreviewVersion(null)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Skills;
