import api from './api';

// --- Types ---

export type MarketplaceItemType = 'skill' | 'mcp' | 'plugin';

export type MarketplaceItemStatus = 'active' | 'inactive' | 'archived';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface MarketplaceItem {
  id: string;
  name: string;
  type: MarketplaceItemType;
  version: string;
  author: string;
  status: MarketplaceItemStatus;
  install_count: number;
  rating: number;
  category: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
}

export interface Submission {
  id: string;
  itemName: string;
  itemType: MarketplaceItemType;
  version: string;
  submitter: string;
  description: string;
  status: SubmissionStatus;
  reviewNote: string;
  reviewer: string;
  createdAt: string;
  reviewedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// --- API Functions ---

export interface GetItemsParams {
  type?: MarketplaceItemType;
  status?: MarketplaceItemStatus;
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
}

export async function getMarketplaceItems(params: GetItemsParams) {
  const response = await api.get<PaginatedResponse<MarketplaceItem>>('/marketplace/items', { params });
  return response.data;
}

export async function getMarketplaceItem(id: string) {
  const response = await api.get<{ data: MarketplaceItem }>(`/marketplace/items/${id}`);
  return response.data;
}

export async function updateMarketplaceItem(id: string, data: Partial<Pick<MarketplaceItem, 'status' | 'category'>>) {
  const response = await api.put<{ data: MarketplaceItem }>(`/marketplace/items/${id}`, data);
  return response.data;
}

export async function deleteMarketplaceItem(id: string) {
  const response = await api.delete(`/marketplace/items/${id}`);
  return response.data;
}

export interface GetSubmissionsParams {
  status?: SubmissionStatus;
  page?: number;
  pageSize?: number;
}

export async function getSubmissions(params: GetSubmissionsParams) {
  const response = await api.get<PaginatedResponse<Submission>>('/marketplace/submissions', { params });
  return response.data;
}

export async function approveSubmission(id: string) {
  const response = await api.post(`/marketplace/submissions/${id}/approve`);
  return response.data;
}

export async function rejectSubmission(id: string, reason: string) {
  const response = await api.post(`/marketplace/submissions/${id}/reject`, { reason });
  return response.data;
}

export async function getCategories() {
  const response = await api.get<{ data: MarketplaceCategory[] }>('/marketplace/categories');
  return response.data;
}

export async function syncSkillsFromSkillsSh() {
  const response = await api.post<{ data: { categoriesCreated: number; skillsCreated: number; errors: string[] } }>('/marketplace/sync/skills-sh');
  return response.data;
}
