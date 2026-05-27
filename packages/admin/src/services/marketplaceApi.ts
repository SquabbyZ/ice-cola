import api from './api';

export type MarketplaceItemType = 'skill' | 'mcp' | 'plugin' | 'expert';

export type MarketplaceItemStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

type ResourceId = string | number;

interface ApiEnvelope<T> {
  code?: number;
  data: T;
  message?: string;
}

interface BackendPagination {
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

interface BackendMarketplaceItemsResponse {
  items: BackendMarketplaceItem[];
  pagination: BackendPagination;
}

interface BackendMarketplaceItem extends Partial<MarketplaceItem> {
  author_name?: string;
  category_name?: string;
  category_slug?: string;
  created_at?: string;
  updated_at?: string;
}

interface BackendSubmission extends Partial<Submission> {
  item_name?: string;
  item_type?: MarketplaceItemType;
  submitter_name?: string;
  review_note?: string;
  reviewer_name?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MarketplaceItem {
  id: number;
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
  id: number;
  name: string;
  slug: string;
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

export interface GetItemsParams {
  type?: MarketplaceItemType;
  status?: MarketplaceItemStatus;
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  includeAll?: boolean;
}

export interface GetSubmissionsParams {
  status?: SubmissionStatus;
  page?: number;
  pageSize?: number;
}

export interface CreateMarketplaceItemDto {
  type: MarketplaceItemType;
  name: string;
  slug: string;
  version?: string;
  description?: string;
  author?: string;
  category?: string;
  config_schema?: Record<string, any>;
  tags?: string[];
  icon?: string;
  color?: string;
}

export interface UpdateMarketplaceItemDto {
  name?: string;
  version?: string;
  description?: string;
  category?: string;
  status?: MarketplaceItemStatus;
  config_schema?: Record<string, any>;
  tags?: string[];
  icon?: string;
  color?: string;
}

function resourcePath(basePath: string, id: ResourceId, suffix = '') {
  return `${basePath}/${encodeURIComponent(String(id))}${suffix}`;
}

function mapMarketplaceItem(item: BackendMarketplaceItem): MarketplaceItem {
  return {
    id: Number(item.id),
    name: item.name ?? '',
    type: item.type ?? 'skill',
    version: item.version ?? '',
    author: item.author ?? item.author_name ?? '',
    status: item.status ?? 'draft',
    install_count: Number(item.install_count ?? 0),
    rating: Number(item.rating ?? 0),
    category: item.category ?? item.category_slug ?? item.category_name ?? '',
    description: item.description ?? '',
    createdAt: item.createdAt ?? item.created_at ?? '',
    updatedAt: item.updatedAt ?? item.updated_at ?? '',
  };
}

function mapSubmission(submission: BackendSubmission): Submission {
  return {
    id: String(submission.id ?? ''),
    itemName: submission.itemName ?? submission.item_name ?? '',
    itemType: submission.itemType ?? submission.item_type ?? 'skill',
    version: submission.version ?? '',
    submitter: submission.submitter ?? submission.submitter_name ?? '',
    description: submission.description ?? '',
    status: submission.status ?? 'pending',
    reviewNote: submission.reviewNote ?? submission.review_note ?? '',
    reviewer: submission.reviewer ?? submission.reviewer_name ?? '',
    createdAt: submission.createdAt ?? submission.created_at ?? '',
    reviewedAt: submission.reviewedAt ?? submission.reviewed_at ?? submission.updated_at ?? '',
  };
}

function paginateSubmissions(submissions: Submission[], params: GetSubmissionsParams): PaginatedResponse<Submission> {
  const page = params.page ?? 1;
  const limit = (params.pageSize ?? submissions.length) || 20;
  const start = (page - 1) * limit;

  return {
    data: submissions.slice(start, start + limit),
    meta: {
      total: submissions.length,
      page,
      limit,
    },
  };
}

export async function getMarketplaceItems(params: GetItemsParams) {
  const { includeAll, pageSize, ...rest } = params;
  const response = await api.get<ApiEnvelope<BackendMarketplaceItemsResponse>>('/marketplace/items', {
    params: {
      ...rest,
      ...(pageSize !== undefined ? { limit: pageSize } : {}),
      ...(includeAll ? { includeAll: 'true' } : {}),
    },
  });
  const { items, pagination } = response.data.data;

  return {
    data: items.map(mapMarketplaceItem),
    meta: {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
    },
  };
}

export async function getMarketplaceItem(id: ResourceId) {
  const response = await api.get<ApiEnvelope<BackendMarketplaceItem>>(resourcePath('/marketplace/items', id));
  return mapMarketplaceItem(response.data.data);
}

export async function updateMarketplaceItem(id: ResourceId, data: UpdateMarketplaceItemDto) {
  const response = await api.put<ApiEnvelope<BackendMarketplaceItem>>(resourcePath('/marketplace/items', id), data);
  return mapMarketplaceItem(response.data.data);
}

export async function deleteMarketplaceItem(id: ResourceId) {
  const response = await api.delete<ApiEnvelope<null>>(resourcePath('/marketplace/items', id));
  return response.data.data;
}

export async function getSubmissions(params: GetSubmissionsParams) {
  const response = await api.get<ApiEnvelope<BackendSubmission[]>>('/marketplace/submissions', {
    params: params.status ? { status: params.status } : {},
  });
  return paginateSubmissions(response.data.data.map(mapSubmission), params);
}

export async function approveSubmission(id: ResourceId) {
  const response = await api.post<ApiEnvelope<unknown>>(resourcePath('/marketplace/submissions', id, '/approve'));
  return response.data.data;
}

export async function rejectSubmission(id: ResourceId, reason: string) {
  const response = await api.post<ApiEnvelope<unknown>>(resourcePath('/marketplace/submissions', id, '/reject'), { comment: reason });
  return response.data.data;
}

export async function getCategories() {
  const response = await api.get<ApiEnvelope<MarketplaceCategory[]>>('/marketplace/categories');
  return response.data.data;
}

export async function syncSkillsFromSkillsSh() {
  const response = await api.post<ApiEnvelope<{ categoriesCreated: number; skillsCreated: number; errors: string[] }>>('/marketplace/sync/skills-sh');
  return response.data.data;
}

export async function adminUpdateItem(id: ResourceId, data: { status?: MarketplaceItemStatus }) {
  const response = await api.put<ApiEnvelope<BackendMarketplaceItem>>(resourcePath('/marketplace/items', id, '/admin'), data);
  return mapMarketplaceItem(response.data.data);
}

export async function adminDeleteItem(id: ResourceId) {
  const response = await api.delete<ApiEnvelope<null>>(resourcePath('/marketplace/items', id, '/admin'));
  return response.data.data;
}

export async function createMarketplaceItem(data: CreateMarketplaceItemDto) {
  const response = await api.post<ApiEnvelope<BackendMarketplaceItem>>('/marketplace/items', data);
  return mapMarketplaceItem(response.data.data);
}

export async function syncMcps() {
  const response = await api.post<ApiEnvelope<{ created: number; updated: number; errors: string[] }>>('/marketplace/sync/mcps');
  return response.data.data;
}
