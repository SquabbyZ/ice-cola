import { useEffect, useRef, useState } from 'react';
import { conversationCapabilitiesService } from '@/services/conversation-capabilities-service';
import { conversationMCPService } from '@/services/conversation-mcp-service';
import { conversationSkillService } from '@/services/conversation-skill-service';
import { useExpertStore } from '@/stores/experts';

export function useConversationCapabilities(conversationId: string | null) {
  const [expertId, setExpertId] = useState<string | null>(null);
  const [mcpServerIds, setMcpServerIds] = useState<string[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [extensionIds, setExtensionIds] = useState<string[]>([]);
  const confirmedExpertIdRef = useRef<string | null>(null);
  const confirmedMcpServerIdsRef = useRef<string[]>([]);
  const confirmedSkillIdsRef = useRef<string[]>([]);
  const confirmedExtensionIdsRef = useRef<string[]>([]);
  const latestConversationIdRef = useRef<string | null>(conversationId);
  const saveExpertRequestIdRef = useRef(0);
  const saveRequestIdRef = useRef(0);
  const saveSkillsRequestIdRef = useRef(0);
  const saveExtensionsRequestIdRef = useRef(0);
  const setActiveExpert = useExpertStore((state) => state.setActiveExpert);

  useEffect(() => {
    latestConversationIdRef.current = conversationId;

    if (!conversationId) {
      setExpertId(null);
      setMcpServerIds([]);
      setSkillIds([]);
      setExtensionIds([]);
      confirmedExpertIdRef.current = null;
      confirmedMcpServerIdsRef.current = [];
      confirmedSkillIdsRef.current = [];
      confirmedExtensionIdsRef.current = [];
      return;
    }

    let isCurrent = true;

    conversationCapabilitiesService.getConversationExpert(conversationId)
      .then((id) => {
        if (!isCurrent) return;
        setExpertId(id);
        setActiveExpert(id);
        confirmedExpertIdRef.current = id;
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.error('Failed to load expert for conversation:', err);
        setExpertId(confirmedExpertIdRef.current);
      });

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

    conversationSkillService.getConversationSkills(conversationId)
      .then((skills) => {
        if (!isCurrent) return;
        const ids = skills.map((s) => s.id);
        setSkillIds(ids);
        confirmedSkillIdsRef.current = ids;
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.error('Failed to load skills for conversation:', err);
        setSkillIds(confirmedSkillIdsRef.current);
      });

    conversationCapabilitiesService.getConversationExtensions(conversationId)
      .then((ids) => {
        if (!isCurrent) return;
        setExtensionIds(ids);
        confirmedExtensionIdsRef.current = ids;
      })
      .catch((err) => {
        if (!isCurrent) return;
        console.error('Failed to load extensions for conversation:', err);
        setExtensionIds(confirmedExtensionIdsRef.current);
      });

    return () => {
      isCurrent = false;
    };
  }, [conversationId]);

  const setConversationExpert = async (nextExpertId: string | null, explicitConversationId?: string) => {
    const saveRequestId = ++saveExpertRequestIdRef.current;
    const targetConversationId = explicitConversationId ?? conversationId;
    setExpertId(nextExpertId);
    setActiveExpert(nextExpertId);
    if (!targetConversationId) return;

    try {
      const persisted = await conversationCapabilitiesService.setConversationExpert(targetConversationId, nextExpertId);
      if (latestConversationIdRef.current !== targetConversationId || saveExpertRequestIdRef.current !== saveRequestId) {
        return;
      }
      confirmedExpertIdRef.current = persisted;
      setExpertId(persisted);
      setActiveExpert(persisted);
    } catch (err) {
      if (latestConversationIdRef.current === targetConversationId && saveExpertRequestIdRef.current === saveRequestId) {
        console.error('Failed to save expert selection:', err);
        setExpertId(confirmedExpertIdRef.current);
        setActiveExpert(confirmedExpertIdRef.current);
      }
      throw err;
    }
  };

  const setConversationMcpServers = async (serverIds: string[], explicitConversationId?: string) => {
    const saveRequestId = ++saveRequestIdRef.current;
    const targetConversationId = explicitConversationId ?? conversationId;
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

  const setConversationSkills = async (nextSkillIds: string[], explicitConversationId?: string) => {
    const saveRequestId = ++saveSkillsRequestIdRef.current;
    const targetConversationId = explicitConversationId ?? conversationId;
    setSkillIds(nextSkillIds);
    if (!targetConversationId) return;

    try {
      const persisted = await conversationSkillService.setConversationSkills(targetConversationId, nextSkillIds);
      if (latestConversationIdRef.current !== targetConversationId || saveSkillsRequestIdRef.current !== saveRequestId) {
        return;
      }
      confirmedSkillIdsRef.current = persisted;
      setSkillIds(persisted);
    } catch (err) {
      if (latestConversationIdRef.current === targetConversationId && saveSkillsRequestIdRef.current === saveRequestId) {
        console.error('Failed to save skill selection:', err);
        setSkillIds(confirmedSkillIdsRef.current);
      }
      throw err;
    }
  };

  const setConversationExtensions = async (nextExtensionIds: string[], explicitConversationId?: string) => {
    const saveRequestId = ++saveExtensionsRequestIdRef.current;
    const targetConversationId = explicitConversationId ?? conversationId;
    setExtensionIds(nextExtensionIds);
    if (!targetConversationId) return;

    try {
      const persisted = await conversationCapabilitiesService.setConversationExtensions(targetConversationId, nextExtensionIds);
      if (latestConversationIdRef.current !== targetConversationId || saveExtensionsRequestIdRef.current !== saveRequestId) {
        return;
      }
      confirmedExtensionIdsRef.current = persisted;
      setExtensionIds(persisted);
    } catch (err) {
      if (latestConversationIdRef.current === targetConversationId && saveExtensionsRequestIdRef.current === saveRequestId) {
        console.error('Failed to save extension selection:', err);
        setExtensionIds(confirmedExtensionIdsRef.current);
      }
      throw err;
    }
  };

  return {
    expertId: expertId || undefined,
    setConversationExpert,
    mcpServerIds,
    setConversationMcpServers,
    skillIds,
    setConversationSkills,
    extensionIds,
    setConversationExtensions,
  };
}
