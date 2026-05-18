import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conversationMCPService } from './conversation-mcp-service';
import { authService } from './auth-service';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

vi.mock('./auth-service', () => ({
  authService: {
    getToken: vi.fn(),
  },
}));

describe('conversationMCPService', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.mocked(authService.getToken).mockReset();
  });

  it('loads conversation MCP server selections with auth headers', async () => {
    vi.mocked(authService.getToken).mockReturnValue('token-1');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ server_id: 'filesystem' }] }),
    });

    await expect(conversationMCPService.getConversationMCPServers('conversation-1')).resolves.toEqual([
      { server_id: 'filesystem' },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/mcp/conversation/conversation-1/servers',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
        }),
      })
    );
  });

  it('saves conversation MCP selections through the conversation-scoped endpoint', async () => {
    vi.mocked(authService.getToken).mockReturnValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ server_id: 'github' }] }),
    });

    await expect(conversationMCPService.setConversationMCPServers('conversation-1', ['github'])).resolves.toEqual([
      { server_id: 'github' },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/mcp/conversation/conversation-1/servers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ serverIds: ['github'] }),
      })
    );
  });

  it('returns empty fallback for failed MCP config loads only through the service contract', async () => {
    vi.mocked(authService.getToken).mockReturnValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    });

    await expect(conversationMCPService.getConversationMCPConfig('conversation-1')).resolves.toEqual({
      servers: [],
      mcpServers: [],
    });
  });
});
