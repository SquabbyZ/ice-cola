import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMarketplaceItems, getMarketplaceItem, updateMarketplaceItem, deleteMarketplaceItem, getSubmissions, approveSubmission, rejectSubmission, getCategories } from './marketplaceApi';

// Mock api
vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from './api';

describe('marketplaceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMarketplaceItems', () => {
    it('calls API with correct params', async () => {
      const mockResponse = {
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 20 },
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await getMarketplaceItems({ type: 'mcp', page: 2 });

      expect(api.get).toHaveBeenCalledWith('/marketplace/items', {
        params: { type: 'mcp', page: 2 },
      });
      expect(result.data).toEqual([]);
    });
  });

  describe('getMarketplaceItem', () => {
    it('calls API with item id', async () => {
      const mockItem = {
        id: '1',
        name: 'Test Item',
        type: 'mcp' as const,
        version: '1.0.0',
        author: 'Author',
        status: 'active' as const,
        install_count: 10,
        rating: 4.5,
        category: 'AI',
        description: 'Test',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };
      vi.mocked(api.get).mockResolvedValue({ data: { data: mockItem } });

      const result = await getMarketplaceItem('1');

      expect(api.get).toHaveBeenCalledWith('/marketplace/items/1');
      expect(result.data).toEqual(mockItem);
    });
  });

  describe('updateMarketplaceItem', () => {
    it('calls API with update data', async () => {
      vi.mocked(api.put).mockResolvedValue({ data: { data: {} } });

      await updateMarketplaceItem('1', { status: 'active', category: 'AI' });

      expect(api.put).toHaveBeenCalledWith('/marketplace/items/1', {
        status: 'active',
        category: 'AI',
      });
    });
  });

  describe('deleteMarketplaceItem', () => {
    it('calls API with delete', async () => {
      vi.mocked(api.delete).mockResolvedValue({ data: {} });

      await deleteMarketplaceItem('1');

      expect(api.delete).toHaveBeenCalledWith('/marketplace/items/1');
    });
  });

  describe('getSubmissions', () => {
    it('calls API with status filter', async () => {
      const mockResponse = {
        data: {
          data: [],
          meta: { total: 0, page: 1, limit: 20 },
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      await getSubmissions({ status: 'pending' });

      expect(api.get).toHaveBeenCalledWith('/marketplace/submissions', {
        params: { status: 'pending' },
      });
    });
  });

  describe('approveSubmission', () => {
    it('calls approve endpoint', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      await approveSubmission('1');

      expect(api.post).toHaveBeenCalledWith('/marketplace/submissions/1/approve');
    });
  });

  describe('rejectSubmission', () => {
    it('calls reject endpoint with reason', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: {} });

      await rejectSubmission('1', 'Not meeting standards');

      expect(api.post).toHaveBeenCalledWith('/marketplace/submissions/1/reject', {
        reason: 'Not meeting standards',
      });
    });
  });

  describe('getCategories', () => {
    it('returns categories', async () => {
      const mockCategories = {
        data: {
          data: [
            { id: '1', name: 'AI' },
            { id: '2', name: 'Tools' },
          ],
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockCategories);

      const result = await getCategories();

      expect(api.get).toHaveBeenCalledWith('/marketplace/categories');
      expect(result.data).toHaveLength(2);
    });
  });
});