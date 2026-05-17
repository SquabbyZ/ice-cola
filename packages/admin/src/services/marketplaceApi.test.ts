import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getMarketplaceItems,
  getMarketplaceItem,
  updateMarketplaceItem,
  deleteMarketplaceItem,
  getSubmissions,
  approveSubmission,
  rejectSubmission,
  getCategories,
  adminUpdateItem,
  adminDeleteItem,
  syncMcps,
} from './marketplaceApi';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from './api';

const backendItem = {
  id: 1,
  name: 'Test Item',
  type: 'mcp' as const,
  version: '1.0.0',
  author_name: 'Author',
  status: 'approved' as const,
  install_count: 10,
  rating: 4.5,
  category_slug: 'tool',
  description: 'Test',
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
};

describe('marketplaceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMarketplaceItems', () => {
    it('maps pageSize to backend limit and normalizes items', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          data: {
            items: [backendItem],
            pagination: { total: 1, page: 2, limit: 10 },
          },
        },
      });

      const result = await getMarketplaceItems({ type: 'mcp', page: 2, pageSize: 10 });

      expect(api.get).toHaveBeenCalledWith('/marketplace/items', {
        params: { type: 'mcp', page: 2, limit: 10 },
      });
      expect(result).toEqual({
        data: [
          {
            id: 1,
            name: 'Test Item',
            type: 'mcp',
            version: '1.0.0',
            author: 'Author',
            status: 'approved',
            install_count: 10,
            rating: 4.5,
            category: 'tool',
            description: 'Test',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-02',
          },
        ],
        meta: { total: 1, page: 2, limit: 10 },
      });
    });

    it('passes includeAll for admin queries', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          data: {
            items: [],
            pagination: { total: 0, page: 1, limit: 20 },
          },
        },
      });

      await getMarketplaceItems({ type: 'mcp', includeAll: true });

      expect(api.get).toHaveBeenCalledWith('/marketplace/items', {
        params: { type: 'mcp', includeAll: 'true' },
      });
    });
  });

  describe('getMarketplaceItem', () => {
    it('encodes item id and returns normalized payload', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { data: backendItem } });

      const result = await getMarketplaceItem('1/../2');

      expect(api.get).toHaveBeenCalledWith('/marketplace/items/1%2F..%2F2');
      expect(result.id).toBe(1);
      expect(result.author).toBe('Author');
    });
  });

  describe('updateMarketplaceItem', () => {
    it('encodes item id and returns normalized payload', async () => {
      vi.mocked(api.put).mockResolvedValue({ data: { data: backendItem } });

      const result = await updateMarketplaceItem('1/../2', { status: 'approved', category: 'AI' });

      expect(api.put).toHaveBeenCalledWith('/marketplace/items/1%2F..%2F2', {
        status: 'approved',
        category: 'AI',
      });
      expect(result.name).toBe('Test Item');
    });
  });

  describe('deleteMarketplaceItem', () => {
    it('encodes item id and returns null payload', async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { data: null } });

      const result = await deleteMarketplaceItem('1/../2');

      expect(api.delete).toHaveBeenCalledWith('/marketplace/items/1%2F..%2F2');
      expect(result).toBeNull();
    });
  });

  describe('adminUpdateItem', () => {
    it('encodes item id and calls admin update endpoint', async () => {
      vi.mocked(api.put).mockResolvedValue({ data: { data: backendItem } });

      const result = await adminUpdateItem('1/../2', { status: 'approved' });

      expect(api.put).toHaveBeenCalledWith('/marketplace/items/1%2F..%2F2/admin', {
        status: 'approved',
      });
      expect(result.status).toBe('approved');
    });
  });

  describe('adminDeleteItem', () => {
    it('encodes item id and returns null payload', async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: { data: null } });

      const result = await adminDeleteItem('1/../2');

      expect(api.delete).toHaveBeenCalledWith('/marketplace/items/1%2F..%2F2/admin');
      expect(result).toBeNull();
    });
  });

  describe('syncMcps', () => {
    it('returns sync result payload', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: {
          data: { created: 2, updated: 1, errors: [] },
        },
      });

      const result = await syncMcps();

      expect(api.post).toHaveBeenCalledWith('/marketplace/sync/mcps');
      expect(result).toEqual({ created: 2, updated: 1, errors: [] });
    });
  });

  describe('getSubmissions', () => {
    it('returns locally paginated normalized submissions', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          data: [
            {
              id: 1,
              item_name: 'Skill One',
              item_type: 'skill',
              version: '1.0.0',
              submitter_name: 'Alice',
              status: 'pending',
              note: 'Review me',
              created_at: '2024-01-01',
            },
            {
              id: 2,
              item_name: 'Skill Two',
              item_type: 'skill',
              version: '1.0.1',
              submitter_name: 'Bob',
              status: 'pending',
              note: 'Review me too',
              created_at: '2024-01-02',
            },
          ],
        },
      });

      const result = await getSubmissions({ status: 'pending', page: 2, pageSize: 1 });

      expect(api.get).toHaveBeenCalledWith('/marketplace/submissions', {
        params: { status: 'pending' },
      });
      expect(result).toEqual({
        data: [
          {
            id: '2',
            itemName: 'Skill Two',
            itemType: 'skill',
            version: '1.0.1',
            submitter: 'Bob',
            description: '',
            status: 'pending',
            reviewNote: '',
            reviewer: '',
            createdAt: '2024-01-02',
            reviewedAt: '',
          },
        ],
        meta: { total: 2, page: 2, limit: 1 },
      });
    });
  });

  describe('approveSubmission', () => {
    it('encodes submission id and returns payload', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 1 } } });

      const result = await approveSubmission('1/../2');

      expect(api.post).toHaveBeenCalledWith('/marketplace/submissions/1%2F..%2F2/approve');
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('rejectSubmission', () => {
    it('encodes submission id and sends backend comment field', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 1 } } });

      const result = await rejectSubmission('1/../2', 'Not meeting standards');

      expect(api.post).toHaveBeenCalledWith('/marketplace/submissions/1%2F..%2F2/reject', {
        comment: 'Not meeting standards',
      });
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('getCategories', () => {
    it('returns category payload', async () => {
      const categories = [
        { id: 1, name: 'AI', slug: 'ai' },
        { id: 2, name: 'Tools', slug: 'tool' },
      ];
      vi.mocked(api.get).mockResolvedValue({ data: { data: categories } });

      const result = await getCategories();

      expect(api.get).toHaveBeenCalledWith('/marketplace/categories');
      expect(result).toEqual(categories);
    });
  });
});
