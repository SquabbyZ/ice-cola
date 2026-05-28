/**
 * Extension Service - 扩展商店服务层
 *
 * 通过 REST API 管理扩展（admin 市场维护）
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface Extension {
  id: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  category?: string;
  icon?: string;
  color?: string;
  homepage?: string;
  repository?: string;
  downloads?: number;
  enabled?: boolean;
  user_enabled?: boolean;
  config?: any;
  installedAt?: string;
}

export class ExtensionService {
  async getAllExtensions(category?: string, search?: string): Promise<Extension[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (search) params.set('search', search);
    const res = await fetch(`${API_BASE}/api/extensions?${params}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return json.data || [];
  }

  async getCategories(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/api/extensions/categories`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return json.data || [];
  }

  async getInstalledExtensions(): Promise<Extension[]> {
    const res = await fetch(`${API_BASE}/api/extensions/installed`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return json.data || [];
  }

  async installExtension(extensionId: string): Promise<void> {
    await fetch(`${API_BASE}/api/extensions/${extensionId}/install`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  }

  async uninstallExtension(extensionId: string): Promise<void> {
    await fetch(`${API_BASE}/api/extensions/${extensionId}/install`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }
}
