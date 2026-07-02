import { AdminAuditService, AuditLogInput, AuditLogRow } from './admin-audit.service';
import { DatabaseService } from '../database/database.service';
import { AppError } from '../common/interfaces/errors';

describe('AdminAuditService', () => {
  let service: AdminAuditService;
  let db: jest.Mocked<DatabaseService>;

  const baseInput: AuditLogInput = {
    adminId: 'admin-1',
    action: 'admin.user.remove',
    targetId: 'target-1',
    targetEmail: 'target@example.com',
    metadata: { foo: 'bar' },
    ip: '127.0.0.1',
    userAgent: 'jest-test',
  };

  const mockRow: AuditLogRow = {
    id: 'log-1',
    adminId: 'admin-1',
    action: 'admin.user.remove',
    targetId: 'target-1',
    targetEmail: 'target@example.com',
    metadata: { foo: 'bar' },
    ip: '127.0.0.1',
    userAgent: 'jest-test',
    createdAt: new Date('2026-07-02T00:00:00Z'),
  };

  beforeEach(() => {
    db = {
      query: jest.fn(),
      queryOne: jest.fn(),
    } as unknown as jest.Mocked<DatabaseService>;

    service = new AdminAuditService(db);
  });

  describe('log()', () => {
    it('inserts a row with all fields and calls query once with correct SQL', async () => {
      db.query.mockResolvedValueOnce([]);

      await service.log(baseInput);

      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (db.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('INSERT INTO admin_audit_logs');
      expect(sql).toContain('"adminId"');
      expect(sql).toContain('action');
      expect(sql).toContain('"targetId"');
      expect(sql).toContain('"targetEmail"');
      expect(sql).toContain('metadata');
      expect(sql).toContain('ip');
      expect(sql).toContain('"userAgent"');
      expect(params).toEqual([
        'admin-1',
        'admin.user.remove',
        'target-1',
        'target@example.com',
        JSON.stringify({ foo: 'bar' }),
        '127.0.0.1',
        'jest-test',
      ]);
    });

    it('serialises metadata to JSONB (JSON string) when provided', async () => {
      db.query.mockResolvedValueOnce([]);

      await service.log({
        ...baseInput,
        metadata: { oldRole: 'MEMBER', newRole: 'ADMIN' },
      });

      const [, params] = (db.query as jest.Mock).mock.calls[0];
      expect(params[4]).toBe('{"oldRole":"MEMBER","newRole":"ADMIN"}');
    });

    it('passes null for optional fields when omitted', async () => {
      db.query.mockResolvedValueOnce([]);

      await service.log({
        adminId: 'admin-1',
        action: 'admin.user.change_password',
      });

      const [, params] = (db.query as jest.Mock).mock.calls[0];
      expect(params).toEqual([
        'admin-1',
        'admin.user.change_password',
        null,
        null,
        null,
        null,
        null,
      ]);
    });

    it('throws AppError AUDIT_LOG_FAILED when db throws', async () => {
      db.query.mockRejectedValue(new Error('connection lost'));

      await expect(service.log(baseInput)).rejects.toBeInstanceOf(AppError);
      await expect(service.log(baseInput)).rejects.toMatchObject({
        code: 'AUDIT_LOG_FAILED',
      });
    });
  });

  describe('list()', () => {
    it('calls SQL with LIMIT/OFFSET bound to limit=50 offset=0 and no adminId filter', async () => {
      db.query.mockResolvedValueOnce([mockRow]);

      const result = await service.list({ limit: 50 });

      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (db.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('SELECT');
      expect(sql).toContain('FROM admin_audit_logs');
      expect(sql).toContain('ORDER BY "createdAt" DESC');
      expect(sql).toMatch(/LIMIT\s+\$\d+/);
      expect(sql).toMatch(/OFFSET\s+\$\d+/);
      expect(sql).not.toMatch(/WHERE\s+"adminId"/);
      expect(params).toEqual([50, 0]);
      expect(result).toEqual([mockRow]);
    });

    it('calls SQL with the given limit and offset', async () => {
      db.query.mockResolvedValueOnce([]);

      await service.list({ limit: 50, offset: 100 });

      const [sql, params] = (db.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/LIMIT\s+\$1/);
      expect(sql).toMatch(/OFFSET\s+\$2/);
      expect(params).toEqual([50, 100]);
    });

    it('adds WHERE "adminId" = $1 when adminId filter is given', async () => {
      db.query.mockResolvedValueOnce([]);

      await service.list({ limit: 25, offset: 0, adminId: 'admin-1' });

      const [sql, params] = (db.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/WHERE\s+"adminId"\s*=\s*\$1/);
      expect(sql).toMatch(/LIMIT\s+\$2/);
      expect(sql).toMatch(/OFFSET\s+\$3/);
      expect(params).toEqual(['admin-1', 25, 0]);
    });

    it('orders by createdAt DESC', async () => {
      db.query.mockResolvedValueOnce([mockRow]);

      await service.list({ limit: 10 });

      const [sql] = (db.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/ORDER BY\s+"createdAt"\s+DESC/);
    });

    it('list({}) returns rows including one with adminId: null (no WHERE filter)', async () => {
      const nullRow: AuditLogRow = {
        ...mockRow,
        id: 'log-null',
        adminId: null,
      };
      db.query.mockResolvedValueOnce([mockRow, nullRow]);

      const result = await service.list({});

      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (db.query as jest.Mock).mock.calls[0];
      expect(sql).not.toMatch(/WHERE\s+"adminId"/);
      expect(params).toEqual([50, 0]);
      expect(result).toHaveLength(2);
      expect(result[0].adminId).toBe('admin-1');
      expect(result[1].adminId).toBeNull();
    });
  });

  describe('log() with adminId: null', () => {
    it('writes a row successfully with NULL passed for $1 (unauthenticated reset path)', async () => {
      db.query.mockResolvedValueOnce([]);

      await expect(
        service.log({
          adminId: null,
          action: 'admin.user.reset_password',
          targetId: 'target-1',
          targetEmail: 'target@example.com',
        }),
      ).resolves.toBeUndefined();

      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (db.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('INSERT INTO admin_audit_logs');
      expect(params[0]).toBeNull();
      expect(params[1]).toBe('admin.user.reset_password');
      expect(params[2]).toBe('target-1');
      expect(params[3]).toBe('target@example.com');
    });
  });

  describe('log() with ip + userAgent (S-5 capture)', () => {
    it('passes ip and userAgent as $6 and $7 in the INSERT params', async () => {
      db.query.mockResolvedValueOnce([]);

      await service.log({
        adminId: 'admin-1',
        action: 'admin.user.remove',
        targetId: 'target-1',
        ip: '1.2.3.4',
        userAgent: 'Mozilla/5.0',
      });

      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (db.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('INSERT INTO admin_audit_logs');
      expect(sql).toContain('ip');
      expect(sql).toContain('"userAgent"');
      expect(params[5]).toBe('1.2.3.4');
      expect(params[6]).toBe('Mozilla/5.0');
    });

    it('passes null for $6 and $7 when both ip and userAgent are explicitly null', async () => {
      db.query.mockResolvedValueOnce([]);

      await expect(
        service.log({
          adminId: 'admin-1',
          action: 'admin.user.update_role',
          ip: null,
          userAgent: null,
        }),
      ).resolves.toBeUndefined();

      expect(db.query).toHaveBeenCalledTimes(1);
      const [, params] = (db.query as jest.Mock).mock.calls[0];
      expect(params[5]).toBeNull();
      expect(params[6]).toBeNull();
    });

    it('still passes null for $6 and $7 when ip/userAgent are omitted (no change to existing behaviour)', async () => {
      db.query.mockResolvedValueOnce([]);

      await service.log({
        adminId: 'admin-1',
        action: 'admin.user.change_password',
        targetId: 'admin-1',
      });

      expect(db.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (db.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('INSERT INTO admin_audit_logs');
      expect(params[5]).toBeNull();
      expect(params[6]).toBeNull();
    });
  });
});
