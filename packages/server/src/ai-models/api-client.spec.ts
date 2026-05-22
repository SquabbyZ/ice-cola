import { of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { AiApiClient } from './api-client';

describe('AiApiClient', () => {
  const httpService = {
    get: jest.fn(),
    post: jest.fn(),
  } as unknown as jest.Mocked<HttpService>;

  let client: AiApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new AiApiClient(httpService);
  });

  it('fetches models from trusted https providers', async () => {
    httpService.get = jest.fn().mockReturnValue(of({ data: { data: [{ id: 'gpt-4' }] } })) as any;

    await expect(client.fetchModels('https://api.openai.com', 'secret', 1000)).resolves.toEqual({
      data: [{ id: 'gpt-4' }],
    });

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer secret' },
        maxRedirects: 0,
        timeout: 1000,
      }),
    );
  });

  it('uses MiniMax Anthropic-compatible model listing auth for trusted base paths', async () => {
    httpService.get = jest.fn().mockReturnValue(of({ data: { data: [{ id: 'MiniMax-M2.7' }] } })) as any;

    await expect(client.fetchModels('https://api.minimaxi.com/anthropic', 'secret')).resolves.toEqual({
      data: [{ id: 'MiniMax-M2.7' }],
    });

    expect(httpService.get).toHaveBeenCalledWith(
      'https://api.minimaxi.com/anthropic/v1/models',
      expect.objectContaining({
        headers: { 'X-Api-Key': 'secret' },
        maxRedirects: 0,
      }),
    );
  });

  it('rejects untrusted provider hosts', async () => {
    await expect(client.fetchModels('https://evil.example.com', 'secret')).rejects.toThrow(
      'Untrusted model provider host',
    );
  });

  it('rejects localhost providers', async () => {
    await expect(client.fetchModels('https://localhost:8000', 'secret')).rejects.toThrow(
      'Untrusted model provider host',
    );
  });

  it('rejects non-https providers', async () => {
    await expect(client.fetchModels('http://api.openai.com', 'secret')).rejects.toThrow(
      'Unsupported model provider URL',
    );
  });
});