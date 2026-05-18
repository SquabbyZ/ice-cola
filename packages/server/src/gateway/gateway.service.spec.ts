import { GatewayService } from './gateway.service';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AiModelsService } from '../ai-models/ai-models.service';
import { WebSocket } from 'ws';
import { PassThrough } from 'stream';
import { of } from 'rxjs';

type ExtensionFixture = {
  id: string;
  name: string;
  enabled: boolean;
};

describe('GatewayService extensions', () => {
  let service: GatewayService;
  let db: jest.Mocked<Pick<DatabaseService, 'findAllExtensions' | 'listExperts' | 'countExperts' | 'createExpert' | 'findExpertById' | 'findExpertByIdForTeam' | 'findTeamExpertById' | 'updateExpert' | 'deleteExpert' | 'findConversationById' | 'findMessagesByConversationId' | 'getConversationMCPServers'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'verify' | 'signAsync'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  const socket = {} as WebSocket;

  beforeEach(() => {
    db = {
      findAllExtensions: jest.fn(),
      listExperts: jest.fn(),
      countExperts: jest.fn(),
      createExpert: jest.fn(),
      findExpertById: jest.fn(),
      findExpertByIdForTeam: jest.fn(),
      findTeamExpertById: jest.fn(),
      updateExpert: jest.fn(),
      deleteExpert: jest.fn(),
      findConversationById: jest.fn(),
      findMessagesByConversationId: jest.fn(),
      getConversationMCPServers: jest.fn(),
    };
    jwtService = {
      verify: jest.fn(),
      signAsync: jest.fn(),
    };
    configService = {
      get: jest.fn(),
    };

    service = new GatewayService(
      db as unknown as DatabaseService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      { post: jest.fn(), get: jest.fn() } as unknown as HttpService,
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

  it('ignores client-supplied MCP servers on the websocket path', async () => {
    configService.get.mockReturnValue('internal-secret');
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      message: 'hello',
      mcpServers: [
        { name: 'filesystem', type: 'stdio', config: { command: 'npx' } },
      ],
    } as any);
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(post).toHaveBeenCalled();
    const [url, body, options] = post.mock.calls[0];
    expect(url).toContain('/v1/chat/completions');
    expect(body.mcp_servers).toBeUndefined();
    expect(options.headers['X-Hermes-Internal-MCP-Key']).toBeUndefined();
  });

  it('adds internal MCP key when forwarding conversation-scoped MCP servers', async () => {
    configService.get.mockReturnValue('internal-secret');
    db.findConversationById.mockResolvedValue({ id: 'conversation-1', teamId: 'team-1' } as any);
    db.findMessagesByConversationId.mockResolvedValue([]);
    db.getConversationMCPServers.mockResolvedValue([
      { name: 'filesystem', server_type: 'stdio', config: { command: 'npx' } },
    ] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      teamId: 'team-1',
      message: 'hello',
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(post).toHaveBeenCalled();
    const [, body, options] = post.mock.calls[0];
    expect(body.mcp_servers).toEqual([
      { name: 'filesystem', type: 'stdio', config: { command: 'npx' } },
    ]);
    expect(options.headers['X-Hermes-Internal-MCP-Key']).toBe('internal-secret');
  });

  it('builds expert context before conversation history and the current message', async () => {
    db.findExpertByIdForTeam.mockResolvedValue({ systemPrompt: 'Expert prompt' } as any);
    db.findConversationById.mockResolvedValue({ id: 'conversation-1', teamId: 'team-1' } as any);
    db.findMessagesByConversationId.mockResolvedValue([
      { role: 'user', content: 'Earlier user' },
      { role: 'assistant', content: 'Earlier assistant' },
    ] as any);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      expertId: 'expert-1',
      teamId: 'team-1',
      message: 'Current user message',
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(post).toHaveBeenCalled();
    const [, body] = post.mock.calls[0];
    expect(body.messages).toEqual([
      { role: 'system', content: 'Expert prompt' },
      { role: 'user', content: 'Earlier user' },
      { role: 'assistant', content: 'Earlier assistant' },
      { role: 'user', content: 'Current user message' },
    ]);
  });

  it('does not load conversation history or MCP servers without team access', async () => {
    db.findConversationById.mockResolvedValue(null);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      teamId: 'team-1',
      message: 'Current user message',
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(db.findConversationById).toHaveBeenCalledWith('conversation-1', 'team-1');
    expect(db.findMessagesByConversationId).not.toHaveBeenCalled();
    expect(db.getConversationMCPServers).not.toHaveBeenCalled();
    const [, body, options] = post.mock.calls[0];
    expect(body.messages).toEqual([
      { role: 'user', content: 'Current user message' },
    ]);
    expect(body.mcp_servers).toBeUndefined();
    expect(options.headers['X-Hermes-Internal-MCP-Key']).toBeUndefined();
  });

  it('does not inject expert prompts without team access', async () => {
    db.findExpertByIdForTeam.mockResolvedValue(null);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      expertId: 'expert-1',
      teamId: 'team-1',
      message: 'Current user message',
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(db.findExpertByIdForTeam).toHaveBeenCalledWith('expert-1', 'team-1');
    const [, body] = post.mock.calls[0];
    expect(body.messages).toEqual([
      { role: 'user', content: 'Current user message' },
    ]);
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

  it('returns expert source fields and quoted camelCase columns', async () => {
    db.listExperts.mockResolvedValue([
      {
        id: 'expert-1',
        name: 'Reviewer',
        description: 'Reviews code',
        systemPrompt: 'Review carefully',
        source_id: 'exp_code_reviewer',
        marketplace_id: 'exp_code_reviewer',
        teamId: 'team-1',
        createdAt: 'created-at',
        updatedAt: 'updated-at',
      },
    ]);
    db.countExperts.mockResolvedValue(1);

    await expect(service.listExperts({ teamId: 'team-1' })).resolves.toMatchObject({
      experts: [
        {
          id: 'expert-1',
          systemPrompt: 'Review carefully',
          sourceId: 'exp_code_reviewer',
          marketplaceId: 'exp_code_reviewer',
          teamId: 'team-1',
          createdAt: 'created-at',
          updatedAt: 'updated-at',
        },
      ],
    });
  });

  it('creates experts without exposing provenance fields through the RPC contract', async () => {
    db.createExpert.mockResolvedValue({
      id: 'expert-1',
      name: 'Reviewer',
      systemPrompt: 'Review carefully',
      source_id: 'exp_code_reviewer',
      marketplace_id: 'exp_code_reviewer',
    });

    await service.createExpert({
      name: 'Reviewer',
      systemPrompt: 'Review carefully',
    });

    expect(db.createExpert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Reviewer',
      systemPrompt: 'Review carefully',
    }));
  });

  it('updates expert system prompt and source fields using database column keys', async () => {
    db.findTeamExpertById.mockResolvedValue({ id: 'expert-1' });
    db.updateExpert.mockResolvedValue({
      id: 'expert-1',
      name: 'Reviewer',
      systemPrompt: 'Updated prompt',
      source_id: 'exp_code_reviewer',
      marketplace_id: 'exp_code_reviewer',
    });

    await service.updateExpert({
      id: 'expert-1',
      teamId: 'team-1',
      systemPrompt: 'Updated prompt',
    });

    expect(db.findTeamExpertById).toHaveBeenCalledWith('expert-1', 'team-1');
    expect(db.updateExpert).toHaveBeenCalledWith('expert-1', expect.objectContaining({
      systemPrompt: 'Updated prompt',
    }));
  });

  it('does not update globally visible experts through team-scoped writes', async () => {
    db.findTeamExpertById.mockResolvedValue(null);

    await expect(service.updateExpert({
      id: 'global-expert',
      teamId: 'team-1',
      systemPrompt: 'Injected prompt',
    })).rejects.toThrow('Expert not found');

    expect(db.updateExpert).not.toHaveBeenCalled();
  });

  it('does not delete globally visible experts through team-scoped writes', async () => {
    db.findTeamExpertById.mockResolvedValue(null);

    await expect(service.deleteExpert({ id: 'global-expert', teamId: 'team-1' })).rejects.toThrow('Expert not found');

    expect(db.deleteExpert).not.toHaveBeenCalled();
  });
});
