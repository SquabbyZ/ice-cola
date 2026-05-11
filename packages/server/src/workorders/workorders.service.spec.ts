import { Test, TestingModule } from '@nestjs/testing';
import { WorkordersService } from './workorders.service';
import { DatabaseService } from '../database/database.service';

describe('WorkordersService', () => {
  let service: WorkordersService;
  let db: jest.Mocked<DatabaseService>;

  const mockWorkorder = {
    id: 'wo-1',
    team_id: 'team-1',
    type: 'skill_publish',
    target_name: 'Test Skill',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkordersService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            queryOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkordersService>(WorkordersService);
    db = module.get(DatabaseService);
  });

  describe('findAll', () => {
    it('returns all workorders for team', async () => {
      const mockWorkorders = [mockWorkorder];
      db.query.mockResolvedValue(mockWorkorders);

      const result = await service.findAll('team-1');

      expect(result).toEqual(mockWorkorders);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE team_id = $1'),
        ['team-1']
      );
    });

    it('returns empty array when no workorders', async () => {
      db.query.mockResolvedValue([]);

      const result = await service.findAll('team-1');

      expect(result).toEqual([]);
    });
  });

  describe('findHistory', () => {
    it('returns workorder history for team', async () => {
      const mockHistory = [{
        id: 'history-1',
        workorderId: 'wo-1',
        teamId: 'team-1',
        type: 'skill_publish',
        result: 'approved',
        processedAt: new Date(),
      }];
      db.query.mockResolvedValue(mockHistory);

      const result = await service.findHistory('team-1');

      expect(result).toEqual(mockHistory);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "teamId" = $1'),
        ['team-1']
      );
    });

    it('returns empty array when no history', async () => {
      db.query.mockResolvedValue([]);

      const result = await service.findHistory('team-1');

      expect(result).toEqual([]);
    });
  });

  describe('approve', () => {
    it('approves workorder and creates history', async () => {
      const mockUpdated = { ...mockWorkorder, status: 'approved' };
      db.queryOne.mockResolvedValue(mockUpdated);
      db.query.mockResolvedValue(null);

      const result = await service.approve('wo-1', 'user-1', 'Approved');

      expect(result?.status).toBe('approved');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining("status = 'approved'"),
        ['wo-1']
      );
      expect(db.query).toHaveBeenCalled(); // history insert
    });

    it('returns null when workorder not found', async () => {
      db.queryOne.mockResolvedValue(null);

      const result = await service.approve('nonexistent', 'user-1');

      expect(result).toBeNull();
    });

    it('approves without comment', async () => {
      const mockUpdated = { ...mockWorkorder, status: 'approved' };
      db.queryOne.mockResolvedValue(mockUpdated);
      db.query.mockResolvedValue(null);

      const result = await service.approve('wo-1', 'user-1');

      expect(result?.status).toBe('approved');
    });
  });

  describe('reject', () => {
    it('rejects workorder and creates history', async () => {
      const mockUpdated = { ...mockWorkorder, status: 'rejected' };
      db.queryOne.mockResolvedValue(mockUpdated);
      db.query.mockResolvedValue(null);

      const result = await service.reject('wo-1', 'user-1', 'Rejected due to issues');

      expect(result?.status).toBe('rejected');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining("status = 'rejected'"),
        ['wo-1']
      );
    });

    it('returns null when workorder not found', async () => {
      db.queryOne.mockResolvedValue(null);

      const result = await service.reject('nonexistent', 'user-1', 'Not found');

      expect(result).toBeNull();
    });
  });

  describe('batchApprove', () => {
    it('approves multiple workorders', async () => {
      const mockUpdated = { ...mockWorkorder, status: 'approved' };
      db.queryOne.mockResolvedValue(mockUpdated);
      db.query.mockResolvedValue(null);

      const results = await service.batchApprove(['wo-1', 'wo-2'], 'user-1', 'Batch approved');

      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('approved');
    });

    it('handles empty array', async () => {
      const results = await service.batchApprove([], 'user-1');

      expect(results).toEqual([]);
    });
  });

  describe('batchReject', () => {
    it('rejects multiple workorders', async () => {
      const mockUpdated = { ...mockWorkorder, status: 'rejected' };
      db.queryOne.mockResolvedValue(mockUpdated);
      db.query.mockResolvedValue(null);

      const results = await service.batchReject(['wo-1', 'wo-2'], 'user-1', 'Batch rejected');

      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('rejected');
    });

    it('handles empty array', async () => {
      const results = await service.batchReject([], 'user-1', ' rejection');

      expect(results).toEqual([]);
    });
  });
});