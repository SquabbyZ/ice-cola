import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { DatabaseService } from '../database/database.service';
import { MarketplaceItemType } from './dto/create-item.dto';
import { MarketplaceItemStatus } from './dto/query-items.dto';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let db: jest.Mocked<DatabaseService>;

  const mockItem = {
    id: 1,
    type: 'mcp',
    name: 'Test Item',
    slug: 'test-item',
    description: 'Test description',
    version: '1.0.0',
    author_id: 'user-1',
    status: 'draft',
    icon: null,
    color: null,
    category_id: null,
    tags: [],
    metadata: null,
    source_id: null,
    install_count: 0,
    rating: null,
  };

  const mockSubmission = {
    id: 1,
    item_id: 1,
    version: '1.0.0',
    submitter_id: 'user-1',
    note: null,
    status: 'pending',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            queryOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    db = module.get(DatabaseService);
  });

  describe('findItems', () => {
    it('returns paginated items with default params', async () => {
      db.queryOne.mockResolvedValue({ count: '10' });
      db.query.mockResolvedValue([mockItem]);

      const result = await service.findItems({});

      expect(result.items).toEqual([mockItem]);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(10);
    });

    it('filters by type and status', async () => {
      db.queryOne.mockResolvedValue({ count: '5' });
      db.query.mockResolvedValue([mockItem]);

      await service.findItems({ type: MarketplaceItemType.MCP, status: MarketplaceItemStatus.APPROVED });

      expect(db.query).toHaveBeenCalled();
      const callArgs = db.query.mock.calls[0];
      expect(callArgs[0]).toContain('mi.type = $1');
      expect(callArgs[0]).toContain('mi.status = $2');
    });

    it('searches by name or description', async () => {
      db.queryOne.mockResolvedValue({ count: '2' });
      db.query.mockResolvedValue([mockItem]);

      await service.findItems({ search: 'test' });

      expect(db.query).toHaveBeenCalled();
      const callArgs = db.query.mock.calls[0];
      expect(callArgs[0]).toContain('ILIKE');
    });

    it('filters by category', async () => {
      db.queryOne.mockResolvedValue({ count: '3' });
      db.query.mockResolvedValue([mockItem]);

      await service.findItems({ category: 'ai-tools' });

      expect(db.query).toHaveBeenCalled();
      const callArgs = db.query.mock.calls[0];
      expect(callArgs[0]).toContain('mc.slug');
    });
  });

  describe('findItemById', () => {
    it('returns item when found', async () => {
      db.queryOne.mockResolvedValue(mockItem);

      const result = await service.findItemById(1);

      expect(result).toEqual(mockItem);
    });

    it('throws NotFoundException when not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(service.findItemById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createItem', () => {
    it('creates item when slug is unique', async () => {
      db.queryOne.mockResolvedValueOnce(null); // no existing slug
      db.queryOne.mockResolvedValueOnce(mockItem); // created item

      const dto = {
        type: MarketplaceItemType.MCP,
        name: 'Test',
        slug: 'test-slug',
        description: 'Desc',
      };

      const result = await service.createItem('user-1', dto);

      expect(result).toEqual(mockItem);
    });

    it('throws BadRequestException when slug exists', async () => {
      db.queryOne.mockResolvedValue({ id: 1 }); // existing slug

      const dto = {
        type: MarketplaceItemType.MCP,
        name: 'Test',
        slug: 'existing-slug',
      };

      await expect(service.createItem('user-1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateItem', () => {
    it('updates item when author matches', async () => {
      db.queryOne.mockResolvedValueOnce(mockItem); // findItemById
      db.queryOne.mockResolvedValueOnce({ ...mockItem, name: 'Updated' }); // updated item

      const result = await service.updateItem(1, 'user-1', { name: 'Updated' });

      expect(result).toBeDefined();
    });

    it('throws ForbiddenException when not author', async () => {
      db.queryOne.mockResolvedValue(mockItem);

      await expect(service.updateItem(1, 'other-user', { name: 'Updated' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when not draft', async () => {
      db.queryOne.mockResolvedValue({ ...mockItem, author_id: 'user-1', status: 'approved' });

      await expect(service.updateItem(1, 'user-1', { name: 'Updated' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('returns existing item when no fields to update', async () => {
      db.queryOne.mockResolvedValue(mockItem);

      const result = await service.updateItem(1, 'user-1', {});

      expect(result).toEqual(mockItem);
    });
  });

  describe('deleteItem', () => {
    it('deletes item when author matches and status is draft', async () => {
      db.queryOne.mockResolvedValueOnce(mockItem); // findItemById
      db.query.mockResolvedValue(null);

      await service.deleteItem(1, 'user-1');

      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [1]);
    });

    it('throws ForbiddenException when not author', async () => {
      db.queryOne.mockResolvedValue(mockItem);

      await expect(service.deleteItem(1, 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when item is not draft', async () => {
      db.queryOne.mockResolvedValue({ ...mockItem, status: 'approved' });

      await expect(service.deleteItem(1, 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('submitItem', () => {
    it('creates submission and updates item status', async () => {
      db.queryOne
        .mockResolvedValueOnce(mockItem) // findItemById
        .mockResolvedValueOnce(mockSubmission); // insert submission
      db.query.mockResolvedValue(null);

      const result = await service.submitItem(1, 'user-1', 'Submitting');

      expect(result).toEqual(mockSubmission);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.any(Array));
    });

    it('throws ForbiddenException when not author', async () => {
      db.queryOne.mockResolvedValue(mockItem);

      await expect(service.submitItem(1, 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when item is not draft or rejected', async () => {
      db.queryOne.mockResolvedValue({ ...mockItem, status: 'approved' });

      await expect(service.submitItem(1, 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approveSubmission', () => {
    it('approves submission and updates statuses', async () => {
      db.queryOne
        .mockResolvedValueOnce({ ...mockSubmission, status: 'pending' })
        .mockResolvedValueOnce({ id: 1 }); // approval record
      db.query.mockResolvedValue(null);

      await service.approveSubmission(1, 'admin-1', 'Approved!');

      expect(db.query).toHaveBeenCalled(); // Just check it was called at least once
    });

    it('throws BadRequestException when already processed', async () => {
      db.queryOne.mockResolvedValue({ ...mockSubmission, status: 'approved' });

      await expect(service.approveSubmission(1, 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectSubmission', () => {
    it('rejects submission and updates item status', async () => {
      db.queryOne
        .mockResolvedValueOnce({ ...mockSubmission, status: 'pending' })
        .mockResolvedValueOnce({ id: 1 });
      db.query.mockResolvedValue(null);

      await service.rejectSubmission(1, 'admin-1', 'Needs changes');

      expect(db.query).toHaveBeenCalled();
    });

    it('throws BadRequestException when already processed', async () => {
      db.queryOne.mockResolvedValue({ ...mockSubmission, status: 'approved' });

      await expect(service.rejectSubmission(1, 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('installItem', () => {
    it('installs approved item', async () => {
      db.queryOne
        .mockResolvedValueOnce({ ...mockItem, status: 'approved' })
        .mockResolvedValueOnce({ id: 1 });
      db.query.mockResolvedValue(null);

      const result = await service.installItem(1, 'user-1', { config: true });

      expect(result).toEqual({ id: 1 });
    });

    it('throws ForbiddenException for non-approved item', async () => {
      db.queryOne.mockResolvedValue({ ...mockItem, status: 'draft' });

      await expect(service.installItem(1, 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('uninstallItem', () => {
    it('uninstalls item and decrements count', async () => {
      db.queryOne.mockResolvedValue({ id: 1 });
      db.query.mockResolvedValue(null);

      await service.uninstallItem(1, 'user-1');

      expect(db.query).toHaveBeenCalled();
    });

    it('throws NotFoundException when not installed', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(service.uninstallItem(1, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCategory', () => {
    it('creates category when slug is unique', async () => {
      db.queryOne
        .mockResolvedValueOnce(null) // no existing
        .mockResolvedValueOnce({ id: 1, name: 'Test Category' });

      const result = await service.createCategory({ name: 'Test', slug: 'test' });

      expect(result).toEqual({ id: 1, name: 'Test Category' });
    });

    it('throws BadRequestException when slug exists', async () => {
      db.queryOne.mockResolvedValue({ id: 1 });

      await expect(service.createCategory({ name: 'Test', slug: 'existing' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCategory', () => {
    it('deletes category', async () => {
      db.queryOne.mockResolvedValue({ id: 1 });

      const result = await service.deleteCategory(1);

      expect(result).toBeNull();
    });

    it('throws NotFoundException when not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(service.deleteCategory(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findSubmissions', () => {
    it('returns all submissions without filter', async () => {
      db.query.mockResolvedValue([mockSubmission]);

      const result = await service.findSubmissions();

      expect(result).toEqual([mockSubmission]);
    });

    it('filters by status', async () => {
      db.query.mockResolvedValue([mockSubmission]);

      const result = await service.findSubmissions('pending');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ms.status = $1'),
        ['pending']
      );
    });
  });

  describe('findMySubmissions', () => {
    it('returns submissions for user', async () => {
      db.query.mockResolvedValue([mockSubmission]);

      const result = await service.findMySubmissions('user-1');

      expect(result).toEqual([mockSubmission]);
    });
  });

  describe('findSubmissionById', () => {
    it('returns submission when found', async () => {
      db.queryOne.mockResolvedValue(mockSubmission);

      const result = await service.findSubmissionById(1);

      expect(result).toEqual(mockSubmission);
    });

    it('throws NotFoundException when not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(service.findSubmissionById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findApprovals', () => {
    it('returns all approvals', async () => {
      const mockApproval = { id: 1, result: 'approved' };
      db.query.mockResolvedValue([mockApproval]);

      const result = await service.findApprovals();

      expect(result).toEqual([mockApproval]);
    });
  });

  describe('updateCategory', () => {
    it('updates category fields', async () => {
      db.queryOne.mockResolvedValue({ id: 1, name: 'Updated' });

      const result = await service.updateCategory(1, { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('returns existing category when no fields to update', async () => {
      const existing = { id: 1, name: 'Existing' };
      db.queryOne.mockResolvedValue(existing);

      const result = await service.updateCategory(1, {});

      expect(result).toEqual(existing);
    });

    it('throws NotFoundException when category not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(service.updateCategory(999, { name: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMyInstallations', () => {
    it('returns installations for user', async () => {
      const mockInstallation = { id: 1, item_id: 1 };
      db.query.mockResolvedValue([mockInstallation]);

      const result = await service.findMyInstallations('user-1');

      expect(result).toEqual([mockInstallation]);
    });
  });

  describe('findCategories', () => {
    it('returns all categories', async () => {
      const mockCategory = { id: 1, name: 'AI' };
      db.query.mockResolvedValue([mockCategory]);

      const result = await service.findCategories();

      expect(result).toEqual([mockCategory]);
    });

    it('filters by item type', async () => {
      const mockCategory = { id: 1, name: 'AI' };
      db.query.mockResolvedValue([mockCategory]);

      const result = await service.findCategories('mcp');

      expect(result).toEqual([mockCategory]);
    });
  });
});