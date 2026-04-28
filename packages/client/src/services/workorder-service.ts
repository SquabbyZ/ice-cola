import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Workorder {
  id: string;
  type: 'skill' | 'mcp' | 'extension';
  targetId: string;
  targetName: string;
  targetIcon: string;
  applicantId: string;
  applicantName: string;
  approvers: { id: string; name: string }[];
  teamId: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
}

export interface WorkorderHistory {
  id: string;
  workorderId: string;
  type: 'skill' | 'mcp' | 'extension';
  targetName: string;
  approverId: string;
  approverName: string;
  result: 'approved' | 'rejected';
  comment?: string;
  processedAt: string;
}

class WorkorderService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * 获取工单列表
   */
  async getList(teamId: string): Promise<Workorder[]> {
    const response = await axios.get(`${API_BASE}/teams/${teamId}/workorders`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data || response.data;
  }

  /**
   * 获取工单历史
   */
  async getHistory(teamId: string): Promise<WorkorderHistory[]> {
    const response = await axios.get(`${API_BASE}/teams/${teamId}/workorders/history`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.data || response.data;
  }

  /**
   * 审批通过
   */
  async approve(workorderId: string, comment?: string): Promise<void> {
    await axios.post(
      `${API_BASE}/workorders/${workorderId}/approve`,
      { comment },
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  /**
   * 审批拒绝
   */
  async reject(workorderId: string, comment: string): Promise<void> {
    await axios.post(
      `${API_BASE}/workorders/${workorderId}/reject`,
      { comment },
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  /**
   * 批量审批通过
   */
  async batchApprove(workorderIds: string[], comment?: string): Promise<void> {
    await axios.post(
      `${API_BASE}/workorders/batch-approve`,
      { ids: workorderIds, comment },
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  /**
   * 批量审批拒绝
   */
  async batchReject(workorderIds: string[], comment: string): Promise<void> {
    await axios.post(
      `${API_BASE}/workorders/batch-reject`,
      { ids: workorderIds, comment },
      {
        headers: this.getAuthHeaders(),
      }
    );
  }
}

export const workorderService = new WorkorderService();
