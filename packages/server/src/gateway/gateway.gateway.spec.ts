import { GatewayGateway } from './gateway.gateway';
import type { GatewayService } from './gateway.service';
import type { WebSocket } from 'ws';

type GatewayServiceFixture = jest.Mocked<Pick<GatewayService, 'connect' | 'listSkills' | 'createSkill'>>;

type SocketMessageHandler = (data: Buffer) => Promise<void>;

type WebSocketFixture = {
  on: jest.Mock<WebSocketFixture, [string, SocketMessageHandler]>;
  send: jest.Mock<void, [string]>;
};

describe('GatewayGateway Skills authorization', () => {
  let gateway: GatewayGateway;
  let service: GatewayServiceFixture;
  let socket: WebSocketFixture;
  let messageHandler: ((data: Buffer) => Promise<void>) | undefined;
  const sentMessages: unknown[] = [];
  const connectResult = {
    ok: true,
    protocol: 1,
    expiresAt: 1,
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      team: { id: 'team-1', name: 'Team', role: 'MEMBER' },
    },
  };

  beforeEach(() => {
    service = {
      connect: jest.fn(),
      listSkills: jest.fn(),
      createSkill: jest.fn(),
    };
    socket = {
      on: jest.fn((event: string, handler: SocketMessageHandler) => {
        if (event === 'message') {
          messageHandler = handler;
        }
        return socket;
      }),
      send: jest.fn((message: string) => {
        sentMessages.push(JSON.parse(message));
      }),
    };
    sentMessages.length = 0;
    messageHandler = undefined;
    gateway = new GatewayGateway();
    gateway['gatewayService'] = service as unknown as GatewayService;
    gateway['handleConnection'](socket as unknown as WebSocket);
  });

  it('injects authenticated team scope into skills list requests', async () => {
    service.connect.mockResolvedValue(connectResult);
    service.listSkills.mockResolvedValue([]);

    await sendRequest('1', 'connect', { auth: { token: 'access-token' } });
    await sendRequest('2', 'skills.list', { teamId: 'team-2', status: 'team' });

    expect(service.listSkills).toHaveBeenCalledWith({ teamId: 'team-1', status: 'team' });
  });

  it('injects authenticated user and team scope into skills create requests', async () => {
    service.connect.mockResolvedValue(connectResult);
    service.createSkill.mockResolvedValue({ id: 'skill-1' });

    await sendRequest('1', 'connect', { auth: { token: 'access-token' } });
    await sendRequest('2', 'skills.create', {
      teamId: 'team-2',
      authorId: 'user-2',
      name: 'New skill',
      content: 'Prompt',
    });

    expect(service.createSkill).toHaveBeenCalledWith({
      teamId: 'team-1',
      authorId: 'user-1',
      name: 'New skill',
      content: 'Prompt',
    });
  });

  it('rejects unauthenticated skills list requests', async () => {
    await sendRequest('1', 'skills.list', { teamId: 'team-2' });

    expect(service.listSkills).not.toHaveBeenCalled();
    expect(sentMessages).toContainEqual(expect.objectContaining({
      id: '1',
      ok: false,
      error: expect.objectContaining({ message: 'Authentication required' }),
    }));
  });

  async function sendRequest(id: string, method: string, params: Record<string, unknown>): Promise<void> {
    if (!messageHandler) {
      throw new Error('Gateway message handler was not registered');
    }
    await messageHandler(Buffer.from(JSON.stringify({ type: 'req', id, method, params })));
  }
});
