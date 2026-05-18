import { useEffect, useRef, useState } from 'react';
import { conversationMCPService } from '@/services/conversation-mcp-service';
import { useExpertStore } from '@/stores/experts';

export function useConversationCapabilities(conversationId: string | null) {
  const [mcpServerIds, setMcpServerIds] = useState<string[]>([]);
  const confirmedMcpServerIdsRef = useRef<string[]>([]);
  const latestConversationIdRef = useRef<string | null>(conversationId);
  const saveRequestIdRef = useRef(0);
  const expertId = useExpertStore((state) => state.activeExpertId);

  useEffect(() => {
    latestConversationIdRef.current = conversationId;

    if (!conversationId) {
      setMcpServerIds([]);
      confirmedMcpServerIdsRef.current = [];
      return;
    }

    let isCurrent = true;

    conversationMCPService.getConversationMCPServers(conversationId)
      .then((servers) => {
        if (!isCurrent) return;
        const serverIds = servers.map((server) => server.server_id);
        setMcpServerIds(serverIds);
        confirmedMcpServerIdsRef.current = serverIds;
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.error('Failed to load MCP servers for conversation:', err);
        setMcpServerIds(confirmedMcpServerIdsRef.current);
      });

    return () => {
      isCurrent = false;
    };
  }, [conversationId]);

  const setConversationMcpServers = async (serverIds: string[]) => {
    const saveRequestId = ++saveRequestIdRef.current;
    const targetConversationId = conversationId;
    setMcpServerIds(serverIds);
    if (!targetConversationId) return;

    try {
      await conversationMCPService.setConversationMCPServers(targetConversationId, serverIds);
      if (latestConversationIdRef.current !== targetConversationId || saveRequestIdRef.current !== saveRequestId) {
        return;
      }
      confirmedMcpServerIdsRef.current = serverIds;
    } catch (err) {
      if (latestConversationIdRef.current === targetConversationId && saveRequestIdRef.current === saveRequestId) {
        console.error('Failed to save MCP server selection:', err);
        setMcpServerIds(confirmedMcpServerIdsRef.current);
      }
      throw err;
    }
  };

  return {
    expertId: expertId || undefined,
    mcpServerIds,
    setConversationMcpServers,
  };
}
