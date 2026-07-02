// Slice 2026-07-02-gateway-gateway-split-foundation: maps internal Error
// instances onto a whitelisted set of public-facing messages so the WebSocket
// gateway only ever leaks user-safe strings to clients. Moved verbatim from
// gateway.gateway.ts (lines 394-424 of the pre-split file).
export class GatewayErrorMapper {
  getPublicErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'Internal error';
    }

    const publicMessages = new Set([
      'Authentication required',
      'Admin privileges required',
      'teamId is required',
      'No active stream',
      'Unauthorized',
      'Invalid hermes send params',
      'Invalid hermes send message',
      'Invalid hermes send sessionId',
      'Invalid hermes send conversationId',
      'Invalid hermes send expertId',
      'Invalid hermes send model',
      'Invalid hermes send messageId',
      'Invalid hermes send attachments',
      'Invalid hermes send attachment',
      'Invalid hermes send attachment type',
      'Invalid hermes send attachment MIME type',
      'Invalid hermes send attachment data',
      'Invalid hermes send skillIds',
      'Invalid hermes send mcpServerIds',
      'Invalid hermes send extensionIds',
    ]);

    return publicMessages.has(error.message) ? error.message : 'Internal error';
  }
}
