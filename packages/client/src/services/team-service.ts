import axios from 'axios';

const API_BASE = '';

export interface Team {
  id: string;
  name: string;
  role?: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: Date;
}

export interface Invitation {
  valid: boolean;
  teamId?: string;
  teamName?: string;
  inviterName?: string;
  email?: string;
  expiresAt?: string;
  message?: string;
}

class TeamService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getMyTeams(): Promise<Team[]> {
    const response = await axios.get(`${API_BASE}/teams/my`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async getTeam(teamId: string): Promise<Team> {
    const response = await axios.get(`${API_BASE}/teams/${teamId}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async createTeam(name: string): Promise<Team> {
    const response = await axios.post(
      `${API_BASE}/teams`,
      { name },
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async updateTeam(teamId: string, name: string): Promise<Team> {
    const response = await axios.put(
      `${API_BASE}/teams/${teamId}`,
      { name },
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const response = await axios.get(`${API_BASE}/teams/${teamId}/members`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async addMember(teamId: string, email: string, role: string): Promise<TeamMember[]> {
    const response = await axios.post(
      `${API_BASE}/teams/${teamId}/members`,
      { email, role },
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async updateMemberRole(teamId: string, userId: string, role: string): Promise<TeamMember[]> {
    const response = await axios.put(
      `${API_BASE}/teams/${teamId}/members/${userId}/role`,
      { role },
      { headers: this.getAuthHeaders() }
    );
    return response.data.data;
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await axios.delete(`${API_BASE}/teams/${teamId}/members/${userId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  async leaveTeam(teamId: string): Promise<void> {
    await axios.post(`${API_BASE}/teams/${teamId}/leave`, {}, {
      headers: this.getAuthHeaders(),
    });
  }

  // Invitation methods
  async getInvitationByToken(token: string): Promise<Invitation> {
    const response = await axios.get(`${API_BASE}/teams/invitations/${token}/validate`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async acceptInvitation(token: string): Promise<void> {
    await axios.post(`/teams/invitations/${token}/accept`, {}, {
      headers: this.getAuthHeaders(),
    });
  }

  async sendTeamInvite(teamId: string, email: string): Promise<void> {
    await axios.post(`${API_BASE}/teams/${teamId}/invite`, { email }, {
      headers: this.getAuthHeaders(),
    });
  }

  async getTeamInvitations(teamId: string): Promise<Invitation[]> {
    const response = await axios.get(`${API_BASE}/teams/${teamId}/invitations`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  async revokeTeamInvitation(invitationId: string): Promise<void> {
    await axios.delete(`${API_BASE}/teams/invitations/${invitationId}`, {
      headers: this.getAuthHeaders(),
    });
  }
}

export const teamService = new TeamService();
