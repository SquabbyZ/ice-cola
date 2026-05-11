import { Test, TestingModule } from '@nestjs/testing';
import { QuotaService, TeamRole } from './quota.service';
import { DatabaseService } from '../database/database.service';
import { AppError } from '../common/interfaces/errors';

describe('QuotaService', () => {
  let service: QuotaService;
  let db: jest.Mocked<DatabaseService>;

  const mockQuota = {
    id: 'quota-1',
    teamId: 'team-1',
    totalAmt: '1000',
    usedAmt: '100',
    period: 30,
    resetDay: 1,
    resetAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        {
          provide: DatabaseService,
          useValue: {
            findQuotaByTeamId: jest.fn(),
            createQuota: jest.fn(),
            incrementQuotaUsed: jest.fn(),
            updateQuota: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
    db = module.get(DatabaseService);
  });

  describe('getQuota', () => {
    it('creates default quota when none exists', async () => {
      db.findQuotaByTeamId.mockResolvedValue(null);
      db.createQuota.mockResolvedValue({ ...mockQuota, totalAmt: '1000', usedAmt: '0' });

      const result = await service.getQuota('team-1');

      expect(result.teamId).toBe('team-1');
      expect(result.total).toBe(1000);
      expect(result.used).toBe(0);
      expect(result.remaining).toBe(1000);
      expect(result.isUnlimited).toBe(false);
    });

    it('returns existing quota', async () => {
      db.findQuotaByTeamId.mockResolvedValue(mockQuota);

      const result = await service.getQuota('team-1');

      expect(result.teamId).toBe('team-1');
      expect(result.total).toBe(1000);
      expect(result.used).toBe(100);
      expect(result.remaining).toBe(900);
    });

    it('handles unlimited quota', async () => {
      db.findQuotaByTeamId.mockResolvedValue({ ...mockQuota, totalAmt: '-1', usedAmt: '0' });

      const result = await service.getQuota('team-1');

      expect(result.isUnlimited).toBe(true);
      expect(result.remaining).toBe(-1);
    });
  });

  describe('checkQuota', () => {
    it('returns hasQuota true when quota is available', async () => {
      db.findQuotaByTeamId.mockResolvedValue(mockQuota);

      const result = await service.checkQuota('team-1');

      expect(result.hasQuota).toBe(true);
      expect(result.remaining).toBe(900);
      expect(result.unlimited).toBe(false);
    });

    it('returns hasQuota false when quota is exhausted', async () => {
      db.findQuotaByTeamId.mockResolvedValue({ ...mockQuota, usedAmt: '1000' });

      const result = await service.checkQuota('team-1');

      expect(result.hasQuota).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('returns unlimited when total is -1', async () => {
      db.findQuotaByTeamId.mockResolvedValue({ ...mockQuota, totalAmt: '-1', usedAmt: '500' });

      const result = await service.checkQuota('team-1');

      expect(result.hasQuota).toBe(true);
      expect(result.unlimited).toBe(true);
    });
  });

  describe('consumeQuota', () => {
    it('throws error when insufficient quota', async () => {
      db.findQuotaByTeamId.mockResolvedValue({ ...mockQuota, usedAmt: '950' });

      await expect(service.consumeQuota('team-1', 100)).rejects.toThrow(AppError);
    });

    it('consumes quota successfully', async () => {
      db.findQuotaByTeamId.mockResolvedValue(mockQuota);
      db.incrementQuotaUsed.mockResolvedValue(undefined);

      await service.consumeQuota('team-1', 100);

      expect(db.incrementQuotaUsed).toHaveBeenCalledWith('team-1', BigInt(100));
    });

    it('allows unlimited quota consumption', async () => {
      db.findQuotaByTeamId.mockResolvedValue({ ...mockQuota, totalAmt: '-1' });
      db.incrementQuotaUsed.mockResolvedValue(undefined);

      await service.consumeQuota('team-1', 1000000);

      expect(db.incrementQuotaUsed).toHaveBeenCalled();
    });
  });

  describe('recharge', () => {
    it('throws error when non-admin tries to recharge', async () => {
      await expect(
        service.recharge('team-1', 'user-1', 1000, null, TeamRole.MEMBER)
      ).rejects.toThrow(AppError);
    });

    it('creates new quota when none exists', async () => {
      db.findQuotaByTeamId.mockResolvedValue(null);
      db.createQuota.mockResolvedValue({ ...mockQuota, totalAmt: '500', usedAmt: '0' });

      const result = await service.recharge('team-1', 'user-1', 500, null, TeamRole.ADMIN);

      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(500);
    });

    it('adds to existing quota', async () => {
      db.findQuotaByTeamId.mockResolvedValue(mockQuota);
      db.updateQuota.mockResolvedValue(undefined);

      const result = await service.recharge('team-1', 'user-1', 500, null, TeamRole.ADMIN);

      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(1500);
    });
  });
});