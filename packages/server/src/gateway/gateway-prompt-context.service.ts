// Slice 2026-07-02-gateway-split-trio: prompt-context cluster extracted
// from GatewayService. All 10 methods moved verbatim from
// gateway.service.ts (lines 891-897, 899-1114) with the same signatures
// and the same behavior. `private` access modifiers widened to `public`
// so GatewayService can delegate to them via constructor injection.
//
// Scope:
//   - getHermesSessions                (stub session reporter)
//   - resolveConversationPromptContext (expert + skills + extension + history)
//   - hasConversationMcpSelection       (mcp server selector probe)
//   - addExpertPrompt                   (single-expert system-prompt loader)
//   - getSafeExtensionPromptMessages    (safe extension context loader)
//   - toSafeExtensionPrompt             (extension row -> prompt string)
//   - getConversationHermesMcpServers   (conversation-scoped mcp loader)
//   - getHermesMcpServersByIds          (explicit mcp override loader)
//   - toSafeHermesMcpServers            (rows -> mcp servers reducer)
//   - toSafeHermesMcpServer             (single-row filter)
//
// No facade state required (pure DB lookups + SkillsService calls). The
// facade passes `db` / `skillsService` via constructor injection.
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SkillsService } from '../skills/skills.service';
import {
  ConversationMcpServerRow,
  ConversationPromptMessage,
  ExtensionContextRow,
  HermesMCPServer,
} from './gateway.types';

@Injectable()
export class GatewayPromptContextService {
  private readonly logger = new Logger(GatewayPromptContextService.name);

  constructor(
    private db: DatabaseService,
    private skillsService: SkillsService,
  ) {}

  async getHermesSessions(_params: { teamId: string }) {
    // Return empty sessions - actual hermes integration would go here
    return {
      ok: true,
      sessions: [],
    };
  }

  async resolveConversationPromptContext(params: {
    conversationId?: string;
    expertId?: string;
    teamId?: string;
    userId?: string;
    role?: string;
    skillIds?: string[];
    mcpServerIds?: string[];
    extensionIds?: string[];
  }): Promise<{ messages: ConversationPromptMessage[]; mcpServers: HermesMCPServer[]; hasMcpSelection: boolean }> {
    const messages: ConversationPromptMessage[] = [];
    let isConversationAuthorized = false;
    let persistedExpertId: string | undefined;

    const hasExtensionOverride = Array.isArray(params.extensionIds) && params.extensionIds.length > 0;
    if (hasExtensionOverride && params.userId) {
      const extensionMessages = await this.getSafeExtensionPromptMessages(params.extensionIds!, params.userId);
      messages.push(...extensionMessages);
    }

    if (params.expertId) {
      await this.addExpertPrompt(messages, params.expertId, params.teamId);
    }

    const hasSkillOverride = Array.isArray(params.skillIds) && params.skillIds.length > 0;
    if (hasSkillOverride && params.teamId) {
      try {
        const skills = await this.skillsService.findSkillsByIdsForTeam(
          params.skillIds!,
          params.teamId,
          params.userId,
          params.role,
        );
        const skillsById = new Map(skills.map((skill) => [skill.id, skill]));
        for (const skillId of params.skillIds!) {
          const skill = skillsById.get(skillId);
          if (skill?.content && typeof skill.content === 'string') {
            messages.push({ role: 'system', content: skill.content });
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to load override skills [${params.skillIds!.join(',')}]:`,
          err,
        );
      }
    }

    if (params.conversationId && params.teamId) {
      try {
        const conversation = await this.db.findConversationById(params.conversationId, params.teamId);
        if (conversation) {
          isConversationAuthorized = true;

          persistedExpertId = typeof conversation.expert_id === 'string'
            ? conversation.expert_id
            : typeof conversation.expertId === 'string'
              ? conversation.expertId
              : undefined;

          if (!params.expertId && persistedExpertId) {
            await this.addExpertPrompt(messages, persistedExpertId, params.teamId);
          }

          if (!hasSkillOverride) {
            try {
              const skills = await this.skillsService.findEnabledSkillsForConversation(
                params.conversationId,
                params.teamId,
                params.userId,
                params.role,
              );
              for (const skill of skills) {
                if (skill.content && typeof skill.content === 'string') {
                  messages.push({ role: 'system', content: skill.content });
                }
              }
            } catch (err) {
              this.logger.warn(
                `Failed to load conversation skills for ${params.conversationId}:`,
                err,
              );
            }
          }

          if (!hasExtensionOverride && params.userId) {
            const extensionIds = await this.db.getConversationExtensionIds(params.conversationId, params.userId);
            const extensionMessages = await this.getSafeExtensionPromptMessages(extensionIds, params.userId);
            messages.push(...extensionMessages);
          }

          const history = await this.db.findMessagesByConversationId(params.conversationId);
          const recentHistory = history.slice(-20);
          for (const msg of recentHistory) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              messages.push({ role: msg.role, content: msg.content });
            }
          }
        }
      } catch (err) {
        this.logger.warn('Failed to load conversation history:', err);
      }
    }

    const hasMcpOverride = Array.isArray(params.mcpServerIds) && params.mcpServerIds.length > 0;
    const persistedMcpServerIds = !hasMcpOverride && params.conversationId && isConversationAuthorized
      ? await this.db.getConversationMCPServers(params.conversationId)
      : [];
    const mcpServers = hasMcpOverride && params.teamId
      ? await this.getHermesMcpServersByIds(params.mcpServerIds!, params.teamId)
      : this.toSafeHermesMcpServers(persistedMcpServerIds);
    const hasMcpSelection = hasMcpOverride || persistedMcpServerIds.length > 0;

    return { messages, mcpServers, hasMcpSelection };
  }

  async hasConversationMcpSelection(params: { conversationId?: string; teamId?: string; mcpServerIds?: string[] }): Promise<boolean> {
    if (Array.isArray(params.mcpServerIds) && params.mcpServerIds.length > 0) {
      return true;
    }
    if (!params.conversationId || !params.teamId) {
      return false;
    }
    const conversation = await this.db.findConversationById(params.conversationId, params.teamId);
    if (!conversation) {
      return false;
    }
    const rows = await this.db.getConversationMCPServers(params.conversationId);
    return rows.length > 0;
  }

  async addExpertPrompt(messages: ConversationPromptMessage[], expertId: string, teamId?: string): Promise<void> {
    try {
      const expert = await this.db.findExpertByIdForTeam(expertId, teamId);
      const prompt = expert?.systemprompt || expert?.systemPrompt;
      if (prompt) {
        messages.push({ role: 'system', content: prompt });
      }
    } catch (err) {
      this.logger.warn(`Failed to load expert ${expertId}:`, err);
    }
  }

  async getSafeExtensionPromptMessages(extensionIds: string[], userId: string): Promise<ConversationPromptMessage[]> {
    try {
      const rows = await this.db.findInstalledEnabledExtensionsByIdsForUser(extensionIds, userId) as ExtensionContextRow[];
      const extensionPrompts = rows.map((extension) => this.toSafeExtensionPrompt(extension)).filter((prompt) => prompt.length > 0);
      if (extensionPrompts.length === 0) return [];
      return [{ role: 'system', content: `Enabled plugins for this conversation:\n${extensionPrompts.join('\n')}` }];
    } catch (err) {
      this.logger.warn('Failed to load selected extensions:', err);
      return [];
    }
  }

  toSafeExtensionPrompt(extension: ExtensionContextRow): string {
    const parts = [
      `- ${extension.name}`,
      extension.description ? `description: ${extension.description}` : undefined,
      extension.category ? `category: ${extension.category}` : undefined,
      Array.isArray(extension.tags) && extension.tags.length > 0 ? `tags: ${extension.tags.join(', ')}` : undefined,
      extension.instructions ? `instructions: ${extension.instructions}` : undefined,
    ].filter((part): part is string => Boolean(part));
    return parts.join('; ');
  }

  async getConversationHermesMcpServers(conversationId: string): Promise<HermesMCPServer[]> {
    try {
      const rows = await this.db.getConversationMCPServers(conversationId);
      return this.toSafeHermesMcpServers(rows);
    } catch (error) {
      this.logger.warn(`Failed to load MCP servers for conversation ${conversationId}:`, error);
      return [];
    }
  }

  async getHermesMcpServersByIds(serverIds: string[], teamId: string): Promise<HermesMCPServer[]> {
    try {
      const rows = await this.db.getMCPServersByIdsForTeam(serverIds, teamId);
      const rowsById = new Map(rows.map((row: ConversationMcpServerRow & { id?: string }) => [row.id, row]));
      const orderedRows = serverIds.map((id) => rowsById.get(id)).filter((row): row is ConversationMcpServerRow => Boolean(row));
      return this.toSafeHermesMcpServers(orderedRows);
    } catch (error) {
      this.logger.warn('Failed to load selected MCP servers:', error);
      return [];
    }
  }

  toSafeHermesMcpServers(rows: ConversationMcpServerRow[]): HermesMCPServer[] {
    return rows.reduce<HermesMCPServer[]>((servers, row) => {
      const server = this.toSafeHermesMcpServer(row);
      return server ? [...servers, server] : servers;
    }, []);
  }

  toSafeHermesMcpServer(row: ConversationMcpServerRow): HermesMCPServer | null {
    if (row.server_type !== 'http' && row.server_type !== 'https') return null;

    const config = row.config || {};
    const url = config.url;
    if (typeof url !== 'string') return null;

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') return null;
      if (parsedUrl.username || parsedUrl.password) return null;
    } catch {
      return null;
    }

    return {
      name: row.name,
      type: row.server_type,
      config: { url },
    };
  }
}