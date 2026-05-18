import { ForbiddenException } from '@nestjs/common';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';

type ConversationServiceFixture = jest.Mocked<Pick<ConversationService,
  | 'create'
  | 'getList'
  | 'getById'
  | 'addMessage'
  | 'updateTitle'
  | 'delete'
  | 'updateMessage'
  | 'deleteMessage'
>>;

const authenticatedRequest = {
  user: {
    sub: 'user-1',
    id: 'user-1',
    teamId: 'team-1',
  },
};

describe('ConversationController team isolation', () => {
  let controller: ConversationController;
  let service: ConversationServiceFixture;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      getList: jest.fn(),
      getById: jest.fn(),
      addMessage: jest.fn(),
      updateTitle: jest.fn(),
      delete: jest.fn(),
      updateMessage: jest.fn(),
      deleteMessage: jest.fn(),
    };
    controller = new ConversationController(service as unknown as ConversationService);
  });

  it('creates conversations with the authenticated team scope', async () => {
    service.create.mockResolvedValue({ id: 'conversation-1' } as any);

    await controller.create('team-1', { title: 'Planning' }, authenticatedRequest);

    expect(service.create).toHaveBeenCalledWith('team-1', 'Planning', 'user-1');
  });

  it('rejects mismatched route team scopes before creating conversations', async () => {
    await expect(controller.create('team-2', { title: 'Planning' }, authenticatedRequest)).rejects.toThrow(ForbiddenException);

    expect(service.create).not.toHaveBeenCalled();
  });

  it('lists conversations with the authenticated team scope', async () => {
    service.getList.mockResolvedValue({ conversations: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } });

    await controller.getList('team-1', { page: 1, pageSize: 20 }, authenticatedRequest);

    expect(service.getList).toHaveBeenCalledWith('team-1', { page: 1, pageSize: 20 });
  });

  it('rejects mismatched route team scopes before listing conversations', async () => {
    await expect(controller.getList('team-2', { page: 1, pageSize: 20 }, authenticatedRequest)).rejects.toThrow(ForbiddenException);

    expect(service.getList).not.toHaveBeenCalled();
  });

  it('loads a conversation with the authenticated team scope', async () => {
    service.getById.mockResolvedValue({ id: 'conversation-1' } as any);

    await controller.getById('team-1', 'conversation-1', authenticatedRequest);

    expect(service.getById).toHaveBeenCalledWith('team-1', 'conversation-1');
  });

  it('rejects mismatched route team scopes before loading conversations', async () => {
    await expect(controller.getById('team-2', 'conversation-1', authenticatedRequest)).rejects.toThrow(ForbiddenException);

    expect(service.getById).not.toHaveBeenCalled();
  });

  it('adds messages with the authenticated team scope', async () => {
    service.addMessage.mockResolvedValue({ id: 'message-1', role: 'user', content: 'Hello', createdAt: new Date() });

    await controller.addMessage('team-1', 'conversation-1', { role: 'user', content: 'Hello' }, authenticatedRequest);

    expect(service.addMessage).toHaveBeenCalledWith('team-1', 'conversation-1', { role: 'user', content: 'Hello' });
  });

  it('rejects mismatched route team scopes before adding messages', async () => {
    await expect(controller.addMessage('team-2', 'conversation-1', { role: 'user', content: 'Hello' }, authenticatedRequest)).rejects.toThrow(ForbiddenException);

    expect(service.addMessage).not.toHaveBeenCalled();
  });

  it('updates titles with the authenticated team scope', async () => {
    service.updateTitle.mockResolvedValue({ success: true });

    await controller.updateTitle('team-1', 'conversation-1', { title: 'Updated' }, authenticatedRequest);

    expect(service.updateTitle).toHaveBeenCalledWith('team-1', 'conversation-1', 'Updated');
  });

  it('rejects mismatched route team scopes before updating titles', async () => {
    await expect(controller.updateTitle('team-2', 'conversation-1', { title: 'Updated' }, authenticatedRequest)).rejects.toThrow(ForbiddenException);

    expect(service.updateTitle).not.toHaveBeenCalled();
  });

  it('rejects mismatched route team scopes before deleting conversations', async () => {
    await expect(controller.delete('team-2', 'conversation-1', authenticatedRequest)).rejects.toThrow(ForbiddenException);

    expect(service.delete).not.toHaveBeenCalled();
  });

  it('updates messages with the authenticated team scope', async () => {
    service.updateMessage.mockResolvedValue({ id: 'message-1', content: 'Updated' } as any);

    await controller.updateMessage('team-1', 'conversation-1', 'message-1', { content: 'Updated' }, authenticatedRequest);

    expect(service.updateMessage).toHaveBeenCalledWith('team-1', 'conversation-1', 'message-1', { content: 'Updated' });
  });

  it('rejects mismatched route team scopes before updating messages', async () => {
    await expect(controller.updateMessage('team-2', 'conversation-1', 'message-1', { content: 'Updated' }, authenticatedRequest)).rejects.toThrow(ForbiddenException);

    expect(service.updateMessage).not.toHaveBeenCalled();
  });

  it('deletes messages with the authenticated team scope', async () => {
    service.deleteMessage.mockResolvedValue({ success: true } as any);

    await controller.deleteMessage('team-1', 'conversation-1', 'message-1', authenticatedRequest);

    expect(service.deleteMessage).toHaveBeenCalledWith('team-1', 'conversation-1', 'message-1');
  });

  it('rejects mismatched route team scopes before deleting messages', async () => {
    await expect(controller.deleteMessage('team-2', 'conversation-1', 'message-1', authenticatedRequest)).rejects.toThrow(ForbiddenException);

    expect(service.deleteMessage).not.toHaveBeenCalled();
  });
});
