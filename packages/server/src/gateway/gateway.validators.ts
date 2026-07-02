// Slice 2026-07-02-gateway-gateway-split-foundation: pure validator helpers
// for the gateway WebSocket entry point. Moved verbatim from gateway.gateway.ts
// (lines 480-572 of the pre-split file) so that the gateway class itself can
// stay under the 500-line cap enforced by ice-cola CLAUDE.md.
import type { HermesAttachmentParams, HermesSendParams } from './gateway.types';

export class GatewayValidators {
  validateHermesSendParams(params: unknown): HermesSendParams {
    if (!this.isRecord(params)) {
      throw new Error('Invalid hermes send params');
    }

    const message = this.requireBoundedString(params.message, 'message', 1, 20000);
    const result: HermesSendParams = {
      sessionId: this.optionalBoundedString(params.sessionId, 'sessionId', 1, 256) ?? 'default',
      message,
    };

    for (const key of ['conversationId', 'expertId', 'model', 'messageId'] as const) {
      const value = params[key];
      if (value !== undefined) {
        result[key] = this.requireBoundedString(value, key, 1, 256);
      }
    }

    if (params.attachments !== undefined) {
      if (!Array.isArray(params.attachments) || params.attachments.length > 5) {
        throw new Error('Invalid hermes send attachments');
      }
      result.attachments = params.attachments.map((attachment) => this.validateHermesAttachment(attachment));
    }

    if (params.skillIds !== undefined) {
      if (!Array.isArray(params.skillIds) || params.skillIds.length > 20) {
        throw new Error('Invalid hermes send skillIds');
      }
      result.skillIds = params.skillIds.map((id) => this.requireBoundedString(id, 'skillId', 1, 64));
    }

    if (params.mcpServerIds !== undefined) {
      if (!Array.isArray(params.mcpServerIds) || params.mcpServerIds.length > 20) {
        throw new Error('Invalid hermes send mcpServerIds');
      }
      result.mcpServerIds = params.mcpServerIds.map((id) => this.requireBoundedString(id, 'mcpServerId', 1, 64));
    }

    if (params.extensionIds !== undefined) {
      if (!Array.isArray(params.extensionIds) || params.extensionIds.length > 20) {
        throw new Error('Invalid hermes send extensionIds');
      }
      result.extensionIds = params.extensionIds.map((id) => this.requireBoundedString(id, 'extensionId', 1, 64));
    }

    return result;
  }

  validateHermesAttachment(attachment: unknown): HermesAttachmentParams {
    if (!this.isRecord(attachment)) {
      throw new Error('Invalid hermes send attachment');
    }

    const type = this.requireBoundedString(attachment.type, 'attachment.type', 1, 32);
    const name = this.requireBoundedString(attachment.name, 'attachment.name', 1, 255);
    const mimeType = this.requireBoundedString(attachment.mimeType, 'attachment.mimeType', 1, 128);
    if (type !== 'image' && type !== 'file') {
      throw new Error('Invalid hermes send attachment type');
    }
    if (!/^[\w.+-]+\/[\w.+-]+$/.test(mimeType)) {
      throw new Error('Invalid hermes send attachment MIME type');
    }

    const data = attachment.data;
    if (data !== undefined) {
      const validatedData = this.requireBoundedString(data, 'attachment.data', 1, 14 * 1024 * 1024);
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(validatedData)) {
        throw new Error('Invalid hermes send attachment data');
      }
      return { type, name, mimeType, data: validatedData };
    }

    return { type, name, mimeType };
  }

  requireBoundedString(value: unknown, field: string, minLength: number, maxLength: number): string {
    if (typeof value !== 'string' || value.length < minLength || value.length > maxLength) {
      throw new Error(`Invalid hermes send ${field}`);
    }
    return value;
  }

  optionalBoundedString(value: unknown, field: string, minLength: number, maxLength: number): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    return this.requireBoundedString(value, field, minLength, maxLength);
  }

  isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
