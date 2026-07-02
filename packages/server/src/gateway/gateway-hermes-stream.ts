// Slice 2026-07-02-gateway-split-trio: shared SSE stream helpers for
// GatewayHermesService. Pure functions over the cluster's state-callback
// surface; no DI, no @Injectable. Lives in gateway/ as a sibling module
// (gateway-hermes.service.ts orchestrates these) to keep the service file
// under the 500L cluster budget. NOT a 4th service — it's a helper module.
import { WebSocket } from 'ws';
import {
  extractProviderTextDelta,
  extractProviderTotalTokens,
  isProviderToolCall,
} from './gateway.helpers';
import {
  ActiveStreamEntry,
  HermesMessageParams,
  HermesSendResult,
  ProviderStreamChunk,
} from './gateway.types';

export interface HermesStreamCtx {
  messageId: string;
  stream: NodeJS.ReadableStream;
  senderWs?: WebSocket;
  streamEntry: ActiveStreamEntry;
  fullResponse: { value: string };
  deltaCount: { value: number };
  totalTokens: { value: number };
  state: {
    setActiveStream: (id: string, entry: ActiveStreamEntry) => void;
    deleteActiveStream: (id: string) => boolean;
    sendStreamEvent: (eventType: string, data: unknown, targetWs?: WebSocket) => void;
  };
  logger: { log: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  /** Optional completion hook used by registerHermesAgentStream.
   *  registerDirectProviderStream uses callback paths (onSuccess etc.) instead. */
  onDone?: (finalResult: { ok: boolean; messageId: string; aborted?: boolean; error?: string }) => void;
}

/** Register all hermes-agent SSE handlers on the given stream. */
export function registerHermesAgentStream(ctx: HermesStreamCtx): void {
  let settled = false;
  let errored = false;
  let lineBuffer = '';
  let activeToolCallId: string | undefined;

  const finalize = (data: { ok: boolean; messageId: string; aborted?: boolean; error?: string }) => {
    if (settled) return;
    settled = true;
    ctx.state.deleteActiveStream(ctx.messageId);
    ctx.onDone(data);
  };

  ctx.stream.on('data', (chunk: Buffer) => {
    if (ctx.streamEntry.aborted || settled) return;
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const dataStr = line.substring(6).trim();
      if (dataStr === '[DONE]') {
        ctx.state.sendStreamEvent('hermes.final', { messageId: ctx.messageId, content: ctx.fullResponse.value, totalTokens: ctx.totalTokens.value }, ctx.senderWs);
        finalize({ ok: true, messageId: ctx.messageId });
        return;
      }
      try {
        const data = JSON.parse(dataStr) as ProviderStreamChunk;
        const delta = extractProviderTextDelta(data);
        if (delta) {
          ctx.fullResponse.value += delta;
          ctx.deltaCount.value++;
          ctx.streamEntry.hasBillableOutput = true;
          ctx.state.sendStreamEvent('hermes.delta', { messageId: ctx.messageId, delta, sequenceNumber: ctx.deltaCount.value }, ctx.senderWs);
        }
        const toolCalls = data.choices?.[0]?.delta?.tool_calls;
        if (Array.isArray(toolCalls)) {
          for (const toolCall of toolCalls) {
            if (!isProviderToolCall(toolCall)) continue;
            if (toolCall.id) activeToolCallId = toolCall.id;
            ctx.streamEntry.hasBillableOutput = true;
            ctx.state.sendStreamEvent('hermes.tool', {
              messageId: ctx.messageId,
              toolCallId: toolCall.id || activeToolCallId,
              toolName: toolCall.function?.name,
              input: toolCall.function?.arguments,
              status: 'running',
            }, ctx.senderWs);
          }
        }
        ctx.totalTokens.value = extractProviderTotalTokens(data, ctx.totalTokens.value);
      } catch (e) { /* skip */ }
    }
  });

  ctx.stream.on('end', () => {
    if (settled) return;
    if (ctx.streamEntry.aborted) { finalize({ ok: false, messageId: ctx.messageId, aborted: true }); return; }
    if (errored) return;
    ctx.logger.log('hermes-agent stream ended');
    if (!ctx.fullResponse.value) {
      ctx.state.sendStreamEvent('hermes.error', { messageId: ctx.messageId, error: 'No response from hermes-agent' }, ctx.senderWs);
      finalize({ ok: false, messageId: ctx.messageId, error: 'No response' });
    } else {
      ctx.state.sendStreamEvent('hermes.final', { messageId: ctx.messageId, content: ctx.fullResponse.value, totalTokens: ctx.totalTokens.value }, ctx.senderWs);
      finalize({ ok: true, messageId: ctx.messageId });
    }
  });

  ctx.stream.on('error', (error: Error) => {
    if (settled) return;
    errored = true;
    if (ctx.streamEntry.aborted) { finalize({ ok: false, messageId: ctx.messageId, aborted: true }); return; }
    ctx.logger.error('hermes-agent stream error:', error);
    ctx.state.sendStreamEvent('hermes.error', { messageId: ctx.messageId, error: error.message }, ctx.senderWs);
    finalize({ ok: false, messageId: ctx.messageId, error: error.message });
  });

  ctx.stream.on('close', () => {
    if (settled) return;
    if (ctx.streamEntry.aborted) { finalize({ ok: false, messageId: ctx.messageId, aborted: true }); return; }
    ctx.state.sendStreamEvent('hermes.error', { messageId: ctx.messageId, error: 'Connection closed before completion' }, ctx.senderWs);
    finalize({ ok: false, messageId: ctx.messageId, error: 'Connection closed before completion' });
  });
}

/** Register SSE handlers for the direct-provider (non-hermes-agent) path. */
export function registerDirectProviderStream(
  ctx: HermesStreamCtx & {
    providerName: string;
    modelCode: string;
    onFinalize: (result: HermesSendResult) => Promise<HermesSendResult>;
    onProviderStreamError: () => Promise<HermesSendResult>;
    onEmpty: () => Promise<HermesSendResult>;
    onSuccess: () => Promise<HermesSendResult>;
    onCloseError: () => Promise<HermesSendResult>;
  },
): Promise<HermesSendResult> {
  let fullResponse = '';
  let deltaCount = 0;
  let totalTokens = 0;
  let lineBuffer = '';
  let settled = false;

  const streamEntry: ActiveStreamEntry = ctx.streamEntry;
  const senderWs = ctx.senderWs;

  return new Promise((resolve, reject) => {
    const settle = (r: HermesSendResult) => { ctx.state.deleteActiveStream(ctx.messageId); resolve(r); };
    const finalizeOnce = (createResult: () => Promise<HermesSendResult>) => {
      if (settled) return;
      settled = true;
      createResult().then(settle).catch((error: unknown) => {
        ctx.logger.error('Provider stream finalization failed:', error);
        settle({ ok: false, messageId: ctx.messageId, error: 'Provider stream error' });
      });
    };

    const emitDelta = (delta: string) => {
      fullResponse += delta;
      deltaCount++;
      streamEntry.hasBillableOutput = true;
      ctx.state.sendStreamEvent('hermes.delta', { messageId: ctx.messageId, delta, sequenceNumber: deltaCount }, senderWs);
    };

    ctx.stream.on('data', async (chunk: Buffer) => {
      if (streamEntry.aborted || settled) return;
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.substring(6).trim();
        if (dataStr === '[DONE]') { finalizeOnce(ctx.onSuccess); return; }
        try {
          const data = JSON.parse(dataStr) as ProviderStreamChunk;
          if (data.error) {
            ctx.logger.error(`${ctx.providerName} API error in stream.`);
            finalizeOnce(ctx.onProviderStreamError);
            return;
          }
          const delta = extractProviderTextDelta(data);
          if (delta) emitDelta(delta);
          totalTokens = extractProviderTotalTokens(data, totalTokens);
        } catch (e) { /* skip */ }
      }
    });

    ctx.stream.on('end', () => {
      if (settled) return;
      if (streamEntry.aborted) { finalizeOnce(() => ctx.onFinalize({ ok: false, messageId: ctx.messageId, aborted: true })); return; }
      if (lineBuffer.trim() && lineBuffer.startsWith('data: ')) {
        const dataStr = lineBuffer.substring(6).trim();
        if (dataStr !== '[DONE]') {
          try {
            const data = JSON.parse(dataStr) as ProviderStreamChunk;
            const delta = extractProviderTextDelta(data);
            if (delta) emitDelta(delta);
            totalTokens = extractProviderTotalTokens(data, totalTokens);
          } catch (e) { /* skip */ }
        }
      }
      ctx.fullResponse.value = fullResponse;
      ctx.totalTokens.value = totalTokens;
      ctx.deltaCount.value = deltaCount;
      if (!fullResponse) {
        ctx.logger.error(`Provider stream ended with no response from ${ctx.providerName}/${ctx.modelCode}.`);
        ctx.state.sendStreamEvent('hermes.error', { messageId: ctx.messageId, error: 'Provider returned no response' }, senderWs);
        finalizeOnce(ctx.onEmpty);
      } else {
        ctx.logger.log(`Provider stream ended, ${deltaCount} chunks, ${fullResponse.length} chars`);
        finalizeOnce(ctx.onSuccess);
      }
    });

    ctx.stream.on('error', (error: Error) => {
      if (settled) return;
      if (streamEntry.aborted) { finalizeOnce(() => ctx.onFinalize({ ok: false, messageId: ctx.messageId, aborted: true })); return; }
      ctx.logger.error('Provider stream error.');
      ctx.state.sendStreamEvent('hermes.error', { messageId: ctx.messageId, error: 'Provider stream error' }, senderWs);
      finalizeOnce(ctx.onProviderStreamError);
    });

    ctx.stream.on('close', () => {
      if (settled) return;
      if (streamEntry.aborted) { finalizeOnce(() => ctx.onFinalize({ ok: false, messageId: ctx.messageId, aborted: true })); return; }
      ctx.state.sendStreamEvent('hermes.error', { messageId: ctx.messageId, error: 'Provider connection closed before completion' }, senderWs);
      finalizeOnce(ctx.onCloseError);
    });
  });
}