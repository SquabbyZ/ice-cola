import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../commons/email.service';
import { ConfigService, CONFIG_KEYS } from '../admin-admin/config.service';
import { CreateTeamDto, UpdateTeamDto, UpdateMemberRoleDto } from './dto/team.dto';

export interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: Date;
}

export interface TeamRow {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  teamId: string | null;
  role: string;
}

@Injectable()
export class TeamsService {
  constructor(
    private db: DatabaseService,
    @Inject(forwardRef(() => EmailService))
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async createTeam(ownerId: string, dto: CreateTeamDto) {
    return this.db.transaction(async (client) => {
      // Create team
      const teamId = this.generateUUID();
      const teamResult = await client.query(
        `INSERT INTO teams (id, name, "createdAt", "updatedAt")
         VALUES ($1, $2, NOW(), NOW())
         RETURNING *`,
        [teamId, dto.name]
      );
      const team = teamResult.rows[0];

      // Update user's team and set as OWNER
      await client.query(
        `UPDATE users SET "teamId" = $1, role = 'OWNER', "updatedAt" = NOW() WHERE id = $2`,
        [teamId, ownerId]
      );

      // Create default quota for team
      await client.query(
        `INSERT INTO quotas (id, "teamId", "totalAmt", "usedAmt", "period", "resetDay", "createdAt", "updatedAt")
         VALUES ($1, $2, 1000, 0, 30, 1, NOW(), NOW())`,
        [this.generateUUID(), teamId]
      );

      return team;
    });
  }

  async getTeam(teamId: string) {
    const team = await this.db.queryOne<TeamRow>(
      'SELECT * FROM teams WHERE id = $1',
      [teamId]
    );
    if (!team) {
      throw new NotFoundException('团队不存在');
    }
    return team;
  }

  async getMyTeams(userId: string) {
    // Get teams where user is a member via users table
    const users = await this.db.query<UserRow>(
      `SELECT u.*, t.name as team_name
       FROM users u
       LEFT JOIN teams t ON u."teamId" = t.id
       WHERE u.id = $1 AND u."teamId" IS NOT NULL`,
      [userId]
    );

    return users.map(u => ({
      id: u.teamId,
      name: (u as any).team_name,
      role: u.role,
    }));
  }

  async getTeamMembers(teamId: string) {
    const members = await this.db.query<any>(
      `SELECT u.id, u.email, u.name, u.role, u."createdAt" as "joinedAt"
       FROM users u
       WHERE u."teamId" = $1
       ORDER BY
         CASE u.role
           WHEN 'OWNER' THEN 1
           WHEN 'ADMIN' THEN 2
           WHEN 'MEMBER' THEN 3
         END,
         u."createdAt" ASC`,
      [teamId]
    );
    return members;
  }

  async addMember(teamId: string, email: string, role: 'OWNER' | 'ADMIN' | 'MEMBER') {
    // Check if user exists
    const user = await this.db.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // Check if already in a team
    if ((user as any).teamId) {
      throw new BadRequestException('用户已在其他团队中');
    }

    // Add user to team
    await this.db.query(
      `UPDATE users SET "teamId" = $1, role = $2, "updatedAt" = NOW() WHERE id = $3`,
      [teamId, role, (user as any).id]
    );

    return this.getTeamMembers(teamId);
  }

  async updateMemberRole(teamId: string, userId: string, dto: UpdateMemberRoleDto) {
    // Verify user is in this team
    const user = await this.db.queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND "teamId" = $2',
      [userId, teamId]
    );

    if (!user) {
      throw new NotFoundException('团队成员不存在');
    }

    // Cannot change OWNER role
    if (user.role === 'OWNER') {
      throw new BadRequestException('无法修改团队所有者的角色');
    }

    await this.db.query(
      `UPDATE users SET role = $1, "updatedAt" = NOW() WHERE id = $2`,
      [dto.role, userId]
    );

    return this.getTeamMembers(teamId);
  }

  async removeMember(teamId: string, userId: string) {
    // Verify user is in this team
    const user = await this.db.queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND "teamId" = $2',
      [userId, teamId]
    );

    if (!user) {
      throw new NotFoundException('团队成员不存在');
    }

    // Cannot remove OWNER
    if (user.role === 'OWNER') {
      throw new BadRequestException('无法移除团队所有者');
    }

    await this.db.query(
      `UPDATE users SET "teamId" = NULL, role = 'MEMBER', "updatedAt" = NOW() WHERE id = $1`,
      [userId]
    );

    return { success: true };
  }

  async updateTeam(teamId: string, dto: UpdateTeamDto) {
    const team = await this.getTeam(teamId);

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }

    if (updates.length === 0) {
      return team;
    }

    updates.push(`"updatedAt" = NOW()`);
    values.push(teamId);

    const result = await this.db.queryOne<TeamRow>(
      `UPDATE teams SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result;
  }

  async leaveTeam(teamId: string, userId: string) {
    const user = await this.db.queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND "teamId" = $2',
      [userId, teamId]
    );

    if (!user) {
      throw new NotFoundException('不是团队成员');
    }

    if (user.role === 'OWNER') {
      throw new BadRequestException('团队所有者无法退出，请先转让所有权');
    }

    await this.db.query(
      `UPDATE users SET "teamId" = NULL, role = 'MEMBER', "updatedAt" = NOW() WHERE id = $1`,
      [userId]
    );

    return { success: true };
  }

  // Team invitation methods
  async sendInvitation(teamId: string, inviterUserId: string, email: string, role: 'OWNER' | 'ADMIN' | 'MEMBER') {
    // Check if team exists
    const team = await this.getTeam(teamId);

    // Check if inviter is a member of the team (and has permission - OWNER or ADMIN)
    const inviter = await this.db.queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND "teamId" = $2',
      [inviterUserId, teamId]
    );

    if (!inviter) {
      throw new NotFoundException('您不是团队成员');
    }

    if (inviter.role !== 'OWNER' && inviter.role !== 'ADMIN') {
      throw new BadRequestException('只有团队所有者或管理员可以邀请新成员');
    }

    // Check if user is already in this team
    const existingUser = await this.db.findUserByEmail(email);
    if (existingUser && (existingUser as any).teamId === teamId) {
      throw new BadRequestException('该用户已在团队中');
    }

    // Check if invited user is already registered
    if (!existingUser) {
      throw new NotFoundException('被邀请人必须是已注册用户');
    }

    // Generate invitation token (64 characters)
    const token = this.generateToken();

    // Invitation expires in 3 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    // Create invitation record
    const invitation = await this.db.createTeamInvitation({
      teamId,
      email,
      invitedBy: inviterUserId,
      token,
      role,
      expiresAt,
    });

    // Get inviter name
    const inviterName = inviter.name || inviter.email;

    // Get client URL from config
    const clientUrlConfig = await this.configService.getConfig(CONFIG_KEYS.CLIENT_URL);
    const clientUrl = clientUrlConfig?.value || 'http://localhost:5173';

    // Send invitation email
    await this.emailService.sendTeamInviteEmail(
      email,
      inviterName,
      team.name,
      `${clientUrl}/invite?token=${token}`
    );

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expires_at,
    };
  }

  async validateInvitation(token: string) {
    try {
      const invitation = await this.db.findTeamInvitationByToken(token);

      if (!invitation) {
        return {
          valid: false,
          message: '邀请不存在',
        };
      }

      if (invitation.status !== 'pending') {
        return {
          valid: false,
          message: '邀请已失效',
        };
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return {
          valid: false,
          message: '邀请已过期',
        };
      }

      // Get team info - catch error if team doesn't exist
      let teamName = 'Unknown Team';
      try {
        const team = await this.getTeam(invitation.team_id);
        teamName = team.name;
      } catch (e) {
        // Team might have been deleted
      }

      // Get inviter info
      let inviterName = 'Unknown';
      try {
        const inviter = await this.db.findUserById(invitation.invited_by);
        inviterName = inviter?.name || inviter?.email || 'Unknown';
      } catch (e) {
        // Inviter might have been deleted
      }

      return {
        valid: true,
        teamId: invitation.team_id,
        teamName,
        inviterName,
        email: invitation.email,
        expiresAt: invitation.expires_at,
      };
    } catch (error) {
      console.error('validateInvitation error:', error);
      return {
        valid: false,
        message: '邀请验证失败',
      };
    }
  }

  async acceptInvitation(token: string, userId: string) {
    // Find invitation by token
    const invitation = await this.db.findTeamInvitationByToken(token);

    if (!invitation) {
      throw new NotFoundException('邀请不存在');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('邀请已失效');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw new BadRequestException('邀请已过期');
    }

    // Find user by id
    const user = await this.db.findUserById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // Check if user's email matches the invitation
    if (user.email !== invitation.email) {
      throw new BadRequestException('邀请邮箱与用户邮箱不匹配');
    }

    // Check if user is already in a team
    if ((user as any).teamId) {
      throw new BadRequestException('用户已在其他团队中');
    }

    // Add user to team
    await this.db.query(
      `UPDATE users SET "teamId" = $1, role = $2, "updatedAt" = NOW() WHERE id = $3`,
      [invitation.team_id, invitation.role, userId]
    );

    // Update invitation status
    await this.db.updateTeamInvitationStatus(invitation.id, 'accepted');

    return { success: true, teamId: invitation.team_id };
  }

  async revokeInvitation(invitationId: string, userId: string) {
    // Find invitation
    const invitation = await this.db.findTeamInvitationById(invitationId);

    if (!invitation) {
      throw new NotFoundException('邀请不存在');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('邀请已失效');
    }

    // Check if user has permission (must be the inviter or team OWNER/ADMIN)
    const user = await this.db.queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND "teamId" = $2',
      [userId, invitation.team_id]
    );

    if (!user) {
      throw new NotFoundException('您不是团队成员');
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN' && userId !== invitation.invited_by) {
      throw new BadRequestException('只有团队所有者或管理员可以撤回邀请');
    }

    // Delete invitation
    await this.db.deleteTeamInvitation(invitationId);

    return { success: true };
  }

  async getTeamInvitations(teamId: string, userId: string) {
    // Verify user is a member of the team
    const user = await this.db.queryOne<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND "teamId" = $2',
      [userId, teamId]
    );

    if (!user) {
      throw new NotFoundException('不是团队成员');
    }

    // Get all invitations for the team
    const invitations = await this.db.findTeamInvitationsByTeamId(teamId);

    return invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      invitedBy: inv.invited_by,
      inviterName: (inv as any).inviter_name,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
    }));
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}
