import { GatewayService } from './gateway.service';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AiModelsService } from '../ai-models/ai-models.service';
import { WebSocket } from 'ws';

type ExtensionFixture = {
  id: string;
  name: string;
  enabled: boolean;
};

describe('GatewayService extensions', () => {
  let service: GatewayService;
  let db: jest.Mocked<Pick<DatabaseService, 'findAllExtensions'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'verify' | 'signAsync'>>;
  const socket = {} as WebSocket;

  beforeEach(() => {
    db = {
      findAllExtensions: jest.fn(),
    };
    jwtService = {
      verify: jest.fn(),
      signAsync: jest.fn(),
    };

    service = new GatewayService(
      db as unknown as DatabaseService,
      jwtService as unknown as JwtService,
      {} as ConfigService,
      {} as HttpService,
      {} as AiModelsService,
    );
  });

  it('returns extension marketplace entries from the database', async () => {
    const extensions: ExtensionFixture[] = [
      { id: 'extension-1', name: 'GitHub Tools', enabled: true },
    ];
    db.findAllExtensions.mockResolvedValue(extensions);

    await expect(service.getAllExtensions()).resolves.toEqual(extensions);
    expect(db.findAllExtensions).toHaveBeenCalledTimes(1);
  });

  it('rejects gateway connections without a verified token', async () => {
    await expect(service.connect({ scopes: ['operator.admin'] }, socket)).rejects.toThrow('Authentication required');
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects refresh tokens for gateway connections', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', teamId: 'team-1', role: 'MEMBER', type: 'refresh' });

    await expect(service.connect({ auth: { token: 'refresh-token' } }, socket)).rejects.toThrow('Authentication required');
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('does not issue service admin tokens from client-provided scopes', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', teamId: 'team-1', role: 'MEMBER', type: 'access' });

    const result = await service.connect({ auth: { token: 'valid-token' }, scopes: ['operator.admin'] }, socket);

    expect(result).toMatchObject({
      ok: true,
      user: {
        id: 'user-1',
        team: { id: 'team-1', role: 'MEMBER' },
      },
    });
    expect(result.token).toBeUndefined();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
