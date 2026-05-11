import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { PlannerServiceImpl } from './planner.service';
import { DatabaseService } from '../../database/database.service';

describe('PlannerServiceImpl', () => {
  let service: PlannerServiceImpl;
  let db: jest.Mocked<DatabaseService>;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannerServiceImpl,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            queryOne: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://hermes-agent:9119'),
          },
        },
      ],
    }).compile();

    service = module.get<PlannerServiceImpl>(PlannerServiceImpl);
    db = module.get(DatabaseService);
    httpService = module.get(HttpService);
  });

  describe('getPlan', () => {
    it('returns plan when found', async () => {
      const mockRecord = {
        id: 'plan-1',
        conversation_id: 'conv-1',
        plan_data: JSON.stringify({
          id: 'plan-1',
          conversationId: 'conv-1',
          userInput: 'test',
          steps: [],
          status: 'planning',
        }),
        created_at: new Date(),
      };
      db.queryOne.mockResolvedValue(mockRecord);

      const result = await service.getPlan('plan-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('plan-1');
    });

    it('returns null when not found', async () => {
      db.queryOne.mockResolvedValue(null);

      const result = await service.getPlan('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updatePlanStatus', () => {
    it('updates plan status', async () => {
      db.query.mockResolvedValue([]);

      await service.updatePlanStatus('plan-1', 'completed');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        ['completed', 'plan-1']
      );
    });
  });

  describe('updateStepResult', () => {
    it('updates step result successfully', async () => {
      const mockPlan = {
        id: 'plan-1',
        conversationId: 'conv-1',
        userInput: 'test',
        steps: [
          {
            id: 'step-1',
            order: 1,
            description: 'Step 1',
            toolName: 'test',
            input: {},
            status: 'pending' as const,
          },
        ],
        status: 'planning' as const,
        createdAt: new Date(),
      };
      db.queryOne
        .mockResolvedValueOnce({
          id: 'plan-1',
          plan_data: JSON.stringify(mockPlan),
          created_at: new Date(),
        }) // getPlan
        .mockResolvedValueOnce({ id: 'plan-1' }) // savePlan check
        .mockResolvedValue([]); // savePlan update

      await service.updateStepResult('plan-1', 'step-1', { result: 'success' });

      expect(db.query).toHaveBeenCalled();
    });

    it('throws error when plan not found', async () => {
      db.queryOne.mockResolvedValue(null);

      await expect(
        service.updateStepResult('nonexistent', 'step-1', {})
      ).rejects.toThrow('Plan nonexistent not found');
    });

    it('throws error when step not found in plan', async () => {
      const mockPlan = {
        id: 'plan-1',
        conversationId: 'conv-1',
        userInput: 'test',
        steps: [],
        status: 'planning' as const,
        createdAt: new Date(),
      };
      db.queryOne.mockResolvedValue({
        id: 'plan-1',
        plan_data: JSON.stringify(mockPlan),
        created_at: new Date(),
      });

      await expect(
        service.updateStepResult('plan-1', 'nonexistent', {})
      ).rejects.toThrow('Step nonexistent not found in plan plan-1');
    });

    it('marks step as failed when error is provided', async () => {
      const mockPlan = {
        id: 'plan-1',
        conversationId: 'conv-1',
        userInput: 'test',
        steps: [
          {
            id: 'step-1',
            order: 1,
            description: 'Step 1',
            toolName: 'test',
            input: {},
            status: 'pending' as const,
          },
        ],
        status: 'planning' as const,
        createdAt: new Date(),
      };
      db.queryOne
        .mockResolvedValueOnce({
          id: 'plan-1',
          plan_data: JSON.stringify(mockPlan),
          created_at: new Date(),
        })
        .mockResolvedValueOnce({ id: 'plan-1' })
        .mockResolvedValue([]);

      await service.updateStepResult('plan-1', 'step-1', undefined, 'Error occurred');

      expect(db.query).toHaveBeenCalled();
    });
  });

  describe('plan (with HTTP call)', () => {
    it('uses fallback plan when hermes-agent fails', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('Network error')) as any);
      db.queryOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue([]);

      const result = await service.plan('user input', 'conv-1');

      expect(result).toBeDefined();
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].toolName).toBe('ai_chat');
    });

    it('uses fallback when response format is invalid', async () => {
      const mockResponse = {
        data: {
          response: 'Not a JSON response',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
      httpService.post.mockReturnValue(of(mockResponse) as any);
      db.queryOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue([]);

      const result = await service.plan('user input', 'conv-1');

      expect(result).toBeDefined();
      expect(result.steps[0].toolName).toBe('ai_chat');
    });
  });
});