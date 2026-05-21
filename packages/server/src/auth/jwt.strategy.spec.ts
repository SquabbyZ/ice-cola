import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { DatabaseService } from '../database/database.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let db: jest.Mocked<Pick<DatabaseService, 'findUserById'>>;

  beforeEach(() => {
    db = {
      findUserById: jest.fn(),
    };

    strategy = new JwtStrategy(
      { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService,
      db as unknown as DatabaseService,
    );
  });

  it('uses the current database team and role instead of stale JWT claims', async () => {
    db.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      teamId: 'team-1',
      role: 'OWNER',
    } as any);

    await expect(strategy.validate({ sub: 'user-1', type: 'access', teamId: '', role: 'MEMBER' } as any)).resolves.toEqual({
      sub: 'user-1',
      id: 'user-1',
      email: 'user@example.com',
      teamId: 'team-1',
      role: 'OWNER',
    });
  });

  it('keeps null team state when the current user has no team', async () => {
    db.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      teamId: null,
      role: 'MEMBER',
    } as any);

    await expect(strategy.validate({ sub: 'user-1', type: 'access', teamId: 'old-team', role: 'OWNER' } as any)).resolves.toMatchObject({
      teamId: null,
      role: 'MEMBER',
    });
  });

  it('rejects tokens without a valid subject', async () => {
    await expect(strategy.validate({ type: 'access', teamId: 'team-1', role: 'MEMBER' } as any)).rejects.toThrow(UnauthorizedException);
    expect(db.findUserById).not.toHaveBeenCalled();
  });

  it('rejects tokens when the user no longer exists', async () => {
    db.findUserById.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'user-1', type: 'access', teamId: 'team-1', role: 'MEMBER' } as any)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects refresh tokens', async () => {
    await expect(strategy.validate({
      sub: 'user-1',
      teamId: 'team-1',
      role: 'MEMBER',
      type: 'refresh',
    } as any)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.findUserById).not.toHaveBeenCalled();
  });

  it('fails closed when JWT secret is missing', () => {
    expect(() => new JwtStrategy(
      { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService,
      db as unknown as DatabaseService,
    )).toThrow('JWT_SECRET environment variable is not set');
  });
});
