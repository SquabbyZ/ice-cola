import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { teamService, type Team, type TeamMember } from '@/services/team-service';
import InviteMemberDialog from '@/components/InviteMemberDialog';
import { toast } from 'sonner';
import {
  User,
  Users,
  Mail,
  Plus,
  Settings,
  Shield,
  Crown,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [actionLoading, setActionLoading] = useState(false);

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
      toast.error('加载团队成员失败');
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error('请输入团队名称');
      return;
    }

    setActionLoading(true);
    try {
      const team = await teamService.createTeam(newTeamName.trim());
      setTeams([...teams, team]);
      setSelectedTeam(team);
      setShowCreateTeam(false);
      setNewTeamName('');
      toast.success('团队创建成功');

      // Update auth store with new team info
      const updatedUser = { ...user!, team: { id: team.id, name: team.name, role: 'OWNER' } };
      useAuthStore.setState({ user: updatedUser as any });
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建团队失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !selectedTeam) {
      toast.error('请输入邮箱地址');
      return;
    }

    setActionLoading(true);
    try {
      const updatedMembers = await teamService.addMember(selectedTeam.id, inviteEmail.trim(), inviteRole);
      setMembers(updatedMembers);
      setShowInviteMember(false);
      setInviteEmail('');
      setInviteRole('MEMBER');
      toast.success('邀请成功');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '邀请成员失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!selectedTeam) return;

    if (!confirm(`确定要移除成员 ${memberEmail} 吗？`)) return;

    setActionLoading(true);
    try {
      await teamService.removeMember(selectedTeam.id, memberId);
      setMembers(members.filter(m => m.id !== memberId));
      toast.success('已移除成员');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '移除成员失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!selectedTeam) return;

    if (!confirm('确定要退出该团队吗？')) return;

    setActionLoading(true);
    try {
      await teamService.leaveTeam(selectedTeam.id);
      const remainingTeams = teams.filter(t => t.id !== selectedTeam.id);
      setTeams(remainingTeams);
      setSelectedTeam(remainingTeams.length > 0 ? remainingTeams[0] : null);
      toast.success('已退出团队');

      // Update auth store - user no longer has team
      const updatedUser = { ...user!, team: null };
      useAuthStore.setState({ user: updatedUser as any });
    } catch (error: any) {
      toast.error(error.response?.data?.message || '退出团队失败');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Badge className="bg-yellow-500"><Crown className="w-3 h-3 mr-1" /> 所有者</Badge>;
      case 'ADMIN':
        return <Badge className="bg-blue-500"><Shield className="w-3 h-3 mr-1" /> 管理员</Badge>;
      default:
        return <Badge variant="secondary">成员</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">个人中心</h1>
            <p className="text-gray-600">管理你的账号、团队和设置</p>
          </div>

          {/* 用户信息 */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                账号信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{user?.name || '未设置姓名'}</h3>
                  <p className="text-gray-500 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </p>
                </div>
                {user?.team && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">所在团队</p>
                    <p className="font-semibold">{user.team.name}</p>
                    {getRoleBadge(user.team.role)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 团队管理 */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  团队管理
                </CardTitle>
                {!selectedTeam && !showCreateTeam && (
                  <Button onClick={() => setShowCreateTeam(true)} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    创建团队
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCreateTeam ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">创建新团队</h4>
                  <div className="flex gap-2">
                    <Input
                      placeholder="团队名称"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
                    />
                    <Button onClick={handleCreateTeam} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '创建'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : selectedTeam ? (
                <div className="space-y-4">
                  {/* 团队选择器 */}
                  {teams.length > 1 && (
                    <div className="flex gap-2 border-b pb-2">
                      {teams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => setSelectedTeam(team)}
                          className={`px-3 py-1 rounded-full text-sm ${
                            selectedTeam.id === team.id
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 当前团队信息 */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-lg">{selectedTeam.name}</h4>
                      <p className="text-sm text-gray-500">
                        角色: {getRoleBadge(selectedTeam.role || user?.team?.role)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {user?.team?.role === 'OWNER' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowInviteMember(true)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            邀请成员
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLeaveTeam}
                            disabled={actionLoading}
                          >
                            退出团队
                          </Button>
                        </>
                      )}
                      {user?.team?.role === 'MEMBER' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLeaveTeam}
                          disabled={actionLoading}
                        >
                          退出团队
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 成员列表 */}
                  <div>
                    <h5 className="font-medium mb-3">团队成员 ({members.length})</h5>
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {member.name?.charAt(0) || member.email.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{member.name || '未命名'}</p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getRoleBadge(member.role)}
                            {member.id !== user?.id && (user?.team?.role === 'OWNER' || user?.team?.role === 'ADMIN') && member.role !== 'OWNER' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id, member.email)}
                                disabled={actionLoading}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                移除
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>你还没有加入任何团队</p>
                  <p className="text-sm">创建团队开始协作</p>
                </div>
              )}
            </CardContent>
          </Card>
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
    </div>
  );
};

export default Profile;