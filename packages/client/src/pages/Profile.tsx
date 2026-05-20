import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth-service';
import { teamService, type Team, type TeamMember } from '@/services/team-service';
import InviteMemberDialog from '@/components/InviteMemberDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import {
  Users,
  Mail,
  Plus,
  Shield,
  Crown,
  Loader2,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
  LogOut,
} from 'lucide-react';

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, refreshSession } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; email: string } | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadMembers(selectedTeam.id);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    try {
      const data = await teamService.getMyTeams();
      setTeams(data);
      if (data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (teamId: string) => {
    try {
      const data = await teamService.getTeamMembers(teamId);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast.error(t('profile.loadMembersFailed'));
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error(t('profile.enterTeamNameError'));
      return;
    }

    setActionLoading(true);
    try {
      const name = newTeamName.trim();
      const team = await teamService.createTeam(name);
      setTeams((prevTeams) => [...prevTeams, team]);
      setSelectedTeam(team);
      setShowCreateTeam(false);
      setNewTeamName('');
      toast.success(t('profile.createTeamSuccess'));

      try {
        await refreshSession();
      } catch (refreshError) {
        console.error('Failed to refresh session after creating team:', refreshError);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('profile.createTeamFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = (memberId: string, memberEmail: string) => {
    if (!selectedTeam) return;
    setMemberToRemove({ id: memberId, email: memberEmail });
    setShowRemoveMember(true);
  };

  const confirmRemoveMember = async () => {
    if (!selectedTeam || !memberToRemove) return;

    setActionLoading(true);
    try {
      const teamId = selectedTeam.id;
      await teamService.removeMember(teamId, memberToRemove.id);
      setMembers((prevMembers) => prevMembers.filter((m) => m.id !== memberToRemove.id));
      toast.success(t('profile.removeSuccess'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('profile.removeFailed'));
    } finally {
      setActionLoading(false);
      setShowRemoveMember(false);
      setMemberToRemove(null);
    }
  };

  const handleLeaveTeam = async () => {
    if (!selectedTeam) return;
    setShowLeaveConfirm(true);
  };

  const confirmLeaveTeam = async () => {
    if (!selectedTeam) return;

    setActionLoading(true);
    try {
      const teamId = selectedTeam.id;
      await teamService.leaveTeam(teamId);
      const remainingTeams = teams.filter((t) => t.id !== teamId);
      setTeams(() => remainingTeams);
      setSelectedTeam(remainingTeams.length > 0 ? remainingTeams[0] : null);
      toast.success(t('profile.leaveSuccess'));

      try {
        await refreshSession();
      } catch (refreshError) {
        console.error('Failed to refresh session after leaving team:', refreshError);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('profile.leaveFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const currentTeamRole = selectedTeam?.role ?? user?.team?.role ?? '';

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200/50"><Crown className="w-3 h-3 mr-1" /> {t('profile.roleOwner')}</Badge>;
      case 'ADMIN':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200/50"><Shield className="w-3 h-3 mr-1" /> {t('profile.roleAdmin')}</Badge>;
      default:
        return <Badge variant="secondary" className="bg-zinc-100/80 text-zinc-600">{t('profile.roleMember')}</Badge>;
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError(t('profile.enterCurrentPasswordError'));
      return;
    }
    if (!newPassword) {
      setPasswordError(t('profile.enterNewPasswordError'));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t('profile.passwordMinLengthError'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordsNotMatchError'));
      return;
    }

    setActionLoading(true);
    try {
      await authService.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success(t('profile.passwordChangeSuccess'));
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error.response?.data?.message || t('profile.passwordChangeFailed');
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-zinc-50/50">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50/50">
      <div className="max-w-[1200px] mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-zinc-900 tracking-tight mb-2">
            {t('profile.title')}
          </h1>
          <p className="text-zinc-500 text-sm lg:text-base">
            {t('profile.subtitle')}
          </p>
        </div>

        {/* User Info */}
        <div className="bento-tile p-6 mb-6 animate-fade-in-up">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100/80 flex items-center justify-center">
                <span className="text-2xl font-bold text-zinc-600">
                  {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">
                  {user?.name || t('profile.noName')}
                </h2>
                <p className="text-sm text-zinc-500 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="rounded-xl border-zinc-200/50 hover:bg-zinc-100"
            >
              <Key className="w-4 h-4 mr-2" />
              {t('profile.changePassword')}
            </Button>
          </div>

          {user?.team && (
            <div className="flex items-center gap-4 p-4 bg-zinc-50/50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-zinc-100/80 flex items-center justify-center">
                <Users className="w-5 h-5 text-zinc-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-zinc-500">{t('profile.teams')}</p>
                <p className="font-semibold text-zinc-900">{user.team.name}</p>
              </div>
              {getRoleBadge(user.team.role)}
            </div>
          )}

          {showChangePassword && (
            <div className="mt-6 pt-6 border-t border-zinc-100/50">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">{t('profile.changePassword')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">{t('profile.currentPassword')}</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={t('profile.enterCurrentPassword')}
                      className="pr-10 bg-white border-zinc-200/50 rounded-xl h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">{t('profile.newPassword')}</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('profile.enterNewPasswordMin')}
                      className="pr-10 bg-white border-zinc-200/50 rounded-xl h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">{t('profile.confirmPassword')}</label>
                  <div className="relative">
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('profile.enterConfirmPassword')}
                      className="pr-10 bg-white border-zinc-200/50 rounded-xl h-11"
                      onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              {passwordError && (
                <p className="text-sm text-red-500 mt-3 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {passwordError}
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleChangePassword}
                  disabled={actionLoading}
                  className="btn-ice rounded-xl"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t('profile.confirmModify')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  className="rounded-xl border-zinc-200/50 hover:bg-zinc-100"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Team Management */}
        <div className="bento-tile p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100/80 flex items-center justify-center">
                <Users className="w-5 h-5 text-zinc-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">{t('profile.teamManagement')}</h2>
                <p className="text-sm text-zinc-500">{t('profile.teamManagement')}</p>
              </div>
            </div>
            {!selectedTeam && !showCreateTeam && (
              <Button onClick={() => setShowCreateTeam(true)} className="btn-ice rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                {t('profile.createTeam')}
              </Button>
            )}
          </div>

          {showCreateTeam ? (
            <div className="p-4 bg-zinc-50/50 rounded-xl">
              <h3 className="text-sm font-medium text-zinc-700 mb-3">{t('profile.createNewTeam')}</h3>
              <div className="flex gap-3">
                <Input
                  placeholder={t('profile.enterTeamName')}
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                  className="max-w-xs bg-white border-zinc-200/50 rounded-xl h-11"
                />
                <Button onClick={handleCreateTeam} disabled={actionLoading} className="btn-ice rounded-xl">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('profile.create')}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateTeam(false)} className="rounded-xl border-zinc-200/50">
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : selectedTeam ? (
            <div className="space-y-4">
              {/* Team Selector */}
              {teams.length > 1 && (
                <div className="flex flex-wrap gap-2 pb-4 border-b border-zinc-100/50">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedTeam.id === team.id
                          ? 'bg-zinc-900 text-white shadow-md'
                          : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/50'
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Current Team */}
              <div className="flex items-center justify-between p-5 bg-zinc-50/50 rounded-xl">
                <div>
                  <h3 className="font-semibold text-zinc-900 text-lg">{selectedTeam.name}</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    {t('profile.teamRole')}: {getRoleBadge(currentTeamRole)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {currentTeamRole === 'OWNER' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowInviteMember(true)}
                        className="rounded-xl border-zinc-200/50 hover:bg-zinc-100"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('profile.inviteMember')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLeaveTeam}
                        disabled={actionLoading}
                        className="rounded-xl border-red-200/50 text-red-500 hover:bg-red-50 hover:border-red-300"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        {t('profile.leaveTeam')}
                      </Button>
                    </>
                  )}
                  {currentTeamRole === 'MEMBER' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLeaveTeam}
                      disabled={actionLoading}
                      className="rounded-xl border-red-200/50 text-red-500 hover:bg-red-50 hover:border-red-300"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      退出团队
                    </Button>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div>
                <h4 className="text-sm font-medium text-zinc-700 mb-3">{t('profile.teamMembers', { count: members.length })}</h4>
                <div className="space-y-3">
                  {members.map((member, index) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-zinc-50/50 rounded-xl animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100/80 flex items-center justify-center">
                          <span className="text-sm font-medium text-zinc-600">
                            {member.name?.charAt(0) || member.email.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{member.name || t('profile.unnamed')}</p>
                          <p className="text-xs text-zinc-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(member.role)}
                        {member.id !== user?.id && (currentTeamRole === 'OWNER' || currentTeamRole === 'ADMIN') && member.role !== 'OWNER' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id, member.email)}
                            disabled={actionLoading}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                          >
                            {t('profile.remove')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100/80 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 mb-2">{t('profile.noTeam')}</h3>
              <p className="text-sm text-zinc-500 mb-4">{t('profile.createToStart')}</p>
              <Button onClick={() => setShowCreateTeam(true)} className="btn-ice rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                {t('profile.createTeam')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Dialog */}
      {selectedTeam && (
        <InviteMemberDialog
          open={showInviteMember}
          onOpenChange={setShowInviteMember}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
        />
      )}

      <ConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        title={t('profile.leaveTeamTitle')}
        description={t('profile.confirmLeaveTeam', { name: selectedTeam?.name })}
        confirmText={t('profile.leaveBtn')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={confirmLeaveTeam}
      />

      <ConfirmDialog
        open={showRemoveMember}
        onOpenChange={setShowRemoveMember}
        title={t('profile.removeMemberTitle')}
        description={t('profile.confirmRemoveMember', { email: memberToRemove?.email })}
        confirmText={t('profile.removeBtn')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={confirmRemoveMember}
      />
    </div>
  );
};

export default Profile;