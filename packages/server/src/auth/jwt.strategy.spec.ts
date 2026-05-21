import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy({ get: jest.fn().mockReturnValue('secret') } as unknown as ConfigService);
  });

  it('returns user payload for access tokens', async () => {
    await expect(strategy.validate({
      sub: 'user-1',
      email: 'user@example.com',
      teamId: 'team-1',
      role: 'MEMBER',
      type: 'access',
    })).resolves.toEqual({
      sub: 'user-1',
      id: 'user-1',
      email: 'user@example.com',
      teamId: 'team-1',
      role: 'MEMBER',
    });
  });

  it('rejects refresh tokens', async () => {
    await expect(strategy.validate({
      sub: 'user-1',
      teamId: 'team-1',
      role: 'MEMBER',
      type: 'refresh',
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('fails closed when JWT secret is missing', () => {
    expect(() => new JwtStrategy({ get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService)).toThrow(
      'JWT_SECRET is not configured',
    );
  });
});
