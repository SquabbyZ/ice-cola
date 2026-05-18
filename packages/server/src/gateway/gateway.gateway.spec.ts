import { GatewayGateway } from './gateway.gateway';
import type { GatewayService } from './gateway.service';
import type { WebSocket } from 'ws';

type GatewayServiceFixture = jest.Mocked<Pick<GatewayService,
  | 'connect'
  | 'sendHermesMessage'
  | 'listSkills'
  | 'createSkill'
  | 'listExperts'
  | 'getExpert'
  | 'createExpert'
  | 'getInstalledExtensions'
  | 'installExtension'
  | 'uninstallExtension'
  | 'enableExtension'
  | 'disableExtension'
  | 'updateExtensionConfig'
  | 'getConfig'
  | 'patchConfig'
  | 'setConfig'
  | 'updateExpert'
  | 'deleteExpert'
  | 'recordExpertUsage'
>>;

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
      sendHermesMessage: jest.fn(),
      listSkills: jest.fn(),
      createSkill: jest.fn(),
      listExperts: jest.fn(),
      getExpert: jest.fn(),
      createExpert: jest.fn(),
      getInstalledExtensions: jest.fn(),
      installExtension: jest.fn(),
      uninstallExtension: jest.fn(),
      enableExtension: jest.fn(),
      disableExtension: jest.fn(),
      updateExtensionConfig: jest.fn(),
      getConfig: jest.fn(),
      patchConfig: jest.fn(),
      setConfig: jest.fn(),
      updateExpert: jest.fn(),
      deleteExpert: jest.fn(),
      recordExpertUsage: jest.fn(),
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

  it('injects authenticated team scope into hermes send requests', async () => {
    service.connect.mockResolvedValue(connectResult);
    service.sendHermesMessage.mockResolvedValue({ ok: true });

    await sendRequest('1', 'connect', { auth: { token: 'access-token' } });
    await sendRequest('2', 'hermes.send', { teamId: 'team-2', message: 'hello' });

    expect(service.sendHermesMessage).toHaveBeenCalledWith({ teamId: 'team-1', message: 'hello' }, socket);
  });

  it('rejects unauthenticated hermes send requests', async () => {
    await sendRequest('1', 'hermes.send', { teamId: 'team-2', message: 'hello' });

    expect(service.sendHermesMessage).not.toHaveBeenCalled();
    expect(sentMessages).toContainEqual(expect.objectContaining({
      id: '1',
      ok: false,
      error: expect.objectContaining({ message: 'Authentication required' }),
    }));
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

  it('injects authenticated team scope into expert requests', async () => {
    service.connect.mockResolvedValue(connectResult);
    service.listExperts.mockResolvedValue({ ok: true, experts: [], total: 0 });
    service.getExpert.mockResolvedValue({ ok: true, expert: { id: 'expert-1' } } as any);
    service.createExpert.mockResolvedValue({ ok: true, expert: { id: 'expert-2' } } as any);
    service.updateExpert.mockResolvedValue({ ok: true, expert: { id: 'expert-1' } } as any);
    service.deleteExpert.mockResolvedValue({ ok: true, message: 'Expert deleted successfully' });
    service.recordExpertUsage.mockResolvedValue({ ok: true });

    await sendRequest('1', 'connect', { auth: { token: 'access-token' } });
    await sendRequest('2', 'experts.list', { teamId: 'team-2' });
    await sendRequest('3', 'experts.get', { id: 'expert-1', teamId: 'team-2' });
    await sendRequest('4', 'experts.create', { name: 'Reviewer', teamId: 'team-2' });
    await sendRequest('5', 'experts.update', { id: 'expert-1', teamId: 'team-2', name: 'Updated' });
    await sendRequest('6', 'experts.delete', { id: 'expert-1', teamId: 'team-2' });
    await sendRequest('7', 'experts.recordUsage', { expertId: 'expert-1', userId: 'user-2', teamId: 'team-2', tokens: 10 });

    expect(service.listExperts).toHaveBeenCalledWith({ teamId: 'team-1' });
    expect(service.getExpert).toHaveBeenCalledWith({ id: 'expert-1', teamId: 'team-1' });
    expect(service.createExpert).toHaveBeenCalledWith({ name: 'Reviewer', teamId: 'team-1' });
    expect(service.updateExpert).toHaveBeenCalledWith({ id: 'expert-1', teamId: 'team-1', name: 'Updated' });
    expect(service.deleteExpert).toHaveBeenCalledWith({ id: 'expert-1', teamId: 'team-1' });
    expect(service.recordExpertUsage).toHaveBeenCalledWith({ expertId: 'expert-1', userId: 'user-1', teamId: 'team-1', tokens: 10 });
  });

  it('requires authentication for config requests', async () => {
    await sendRequest('1', 'config.get', {});
    await sendRequest('2', 'config.patch', { key: 'model', value: 'claude' });
    await sendRequest('3', 'config.set', { raw: '{}' });

    expect(service.getConfig).not.toHaveBeenCalled();
    expect(service.patchConfig).not.toHaveBeenCalled();
    expect(service.setConfig).not.toHaveBeenCalled();
    expect(sentMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: '1',
        ok: false,
        error: expect.objectContaining({ message: 'Authentication required' }),
      }),
      expect.objectContaining({
        id: '2',
        ok: false,
        error: expect.objectContaining({ message: 'Authentication required' }),
      }),
      expect.objectContaining({
        id: '3',
        ok: false,
        error: expect.objectContaining({ message: 'Authentication required' }),
      }),
    ]));
  });

  it('rejects non-admin config requests', async () => {
    service.connect.mockResolvedValue(connectResult);

    await sendRequest('1', 'connect', { auth: { token: 'access-token' } });
    await sendRequest('2', 'config.get', {});
    await sendRequest('3', 'config.patch', { key: 'model', value: 'claude' });
    await sendRequest('4', 'config.set', { raw: '{}' });

    expect(service.getConfig).not.toHaveBeenCalled();
    expect(service.patchConfig).not.toHaveBeenCalled();
    expect(service.setConfig).not.toHaveBeenCalled();
    expect(sentMessages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: '2',
        ok: false,
        error: expect.objectContaining({ message: 'Admin privileges required' }),
      }),
      expect.objectContaining({
        id: '3',
        ok: false,
        error: expect.objectContaining({ message: 'Admin privileges required' }),
      }),
      expect.objectContaining({
        id: '4',
        ok: false,
        error: expect.objectContaining({ message: 'Admin privileges required' }),
      }),
    ]));
  });

  it('rejects config requests without team membership', async () => {
    service.connect.mockResolvedValue({
      ...connectResult,
      user: { ...connectResult.user, team: undefined },
    });

    await sendRequest('1', 'connect', { auth: { token: 'access-token' } });
    await sendRequest('2', 'config.get', {});

    expect(service.getConfig).not.toHaveBeenCalled();
    expect(sentMessages).toContainEqual(expect.objectContaining({
      id: '2',
      ok: false,
      error: expect.objectContaining({ message: 'Authentication required' }),
    }));
  });

  it('allows team admins to use config requests', async () => {
    service.connect.mockResolvedValue({
      ...connectResult,
      user: { ...connectResult.user, team: { ...connectResult.user.team, role: 'ADMIN' } },
    });
    service.getConfig.mockResolvedValue({ ok: true, config: {}, parsed: {}, hash: 'hash', path: 'config.json' });
    service.patchConfig.mockResolvedValue({ ok: true, message: 'Config updated' });
    service.setConfig.mockResolvedValue({ ok: true, needsRestart: false, message: 'Config saved successfully' });

    await sendRequest('1', 'connect', { auth: { token: 'access-token' } });
    await sendRequest('2', 'config.get', {});
    await sendRequest('3', 'config.patch', { key: 'model', value: 'claude' });
    await sendRequest('4', 'config.set', { raw: '{}' });

    expect(service.getConfig).toHaveBeenCalledWith({});
    expect(service.patchConfig).toHaveBeenCalledWith({ key: 'model', value: 'claude' });
    expect(service.setConfig).toHaveBeenCalledWith({ raw: '{}' });
  });

  it('allows team owners to use config requests', async () => {
    service.connect.mockResolvedValue({
      ...connectResult,
      user: { ...connectResult.user, team: { ...connectResult.user.team, role: 'OWNER' } },
    });
    service.getConfig.mockResolvedValue({ ok: true, config: {}, parsed: {}, hash: 'hash', path: 'config.json' });

    await sendRequest('1', 'connect', { auth: { token: 'access-token' } });
    await sendRequest('2', 'config.get', {});

    expect(service.getConfig).toHaveBeenCalledWith({});
  });

  it('injects authenticated user scope into extension requests', async () => {
    service.connect.mockResolvedValue(connectResult);
    service.getInstalledExtensions.mockResolvedValue([]);
    service.installExtension.mockResolvedValue({ id: 'install-1' });
    service.uninstallExtension.mockResolvedValue({ id: 'install-1' });
    service.enableExtension.mockResolvedValue({ id: 'install-1' });
    service.disableExtension.mockResolvedValue({ id: 'install-1' });
    service.updateExtensionConfig.mockResolvedValue({ id: 'install-1' });

    await sendRequest('1', 'connect', { auth: { token: 'access-token' } });
    await sendRequest('2', 'extensions.installed', { userId: 'user-2' });
    await sendRequest('3', 'extensions.install', { extensionId: 'extension-1', userId: 'user-2' });
    await sendRequest('4', 'extensions.uninstall', { extensionId: 'extension-1', userId: 'user-2' });
    await sendRequest('5', 'extensions.enable', { extensionId: 'extension-1', userId: 'user-2' });
    await sendRequest('6', 'extensions.disable', { extensionId: 'extension-1', userId: 'user-2' });
    await sendRequest('7', 'extensions.updateConfig', { extensionId: 'extension-1', userId: 'user-2', config: { enabled: true } });

    expect(service.getInstalledExtensions).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(service.installExtension).toHaveBeenCalledWith({ extensionId: 'extension-1', userId: 'user-1' });
    expect(service.uninstallExtension).toHaveBeenCalledWith({ extensionId: 'extension-1', userId: 'user-1' });
    expect(service.enableExtension).toHaveBeenCalledWith({ extensionId: 'extension-1', userId: 'user-1' });
    expect(service.disableExtension).toHaveBeenCalledWith({ extensionId: 'extension-1', userId: 'user-1' });
    expect(service.updateExtensionConfig).toHaveBeenCalledWith({ extensionId: 'extension-1', userId: 'user-1', config: { enabled: true } });
  });

  it('allows authenticated users without teams to use user-scoped extension requests', async () => {
    service.connect.mockResolvedValue({
      ...connectResult,
      user: { ...connectResult.user, team: undefined },
    });
    service.getInstalledExtensions.mockResolvedValue([]);

    await sendRequest('1', 'connect', { auth: { token: 'access-token' } });
    await sendRequest('2', 'extensions.installed', { userId: 'user-2' });

    expect(service.getInstalledExtensions).toHaveBeenCalledWith({ userId: 'user-1' });
  });

  async function sendRequest(id: string, method: string, params: Record<string, unknown>): Promise<void> {
    if (!messageHandler) {
      throw new Error('Gateway message handler was not registered');
    }
    await messageHandler(Buffer.from(JSON.stringify({ type: 'req', id, method, params })));
  }
});
