import {
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const MODEL_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_CONTEXT_BYTES = 4096;
const MAX_CONTEXT_KEYS = 50;
const MAX_CONTEXT_DEPTH = 4;

@ValidatorConstraint({ name: 'boundedChatContext', async: false })
class BoundedChatContextConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return this.isBoundedContext(value, 0, { keys: 0 }) && Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_CONTEXT_BYTES;
  }

  defaultMessage(): string {
    return 'context is too large or deeply nested';
  }

  private isBoundedContext(value: unknown, depth: number, counter: { keys: number }): boolean {
    if (depth > MAX_CONTEXT_DEPTH) {
      return false;
    }

    if (value === null || typeof value !== 'object') {
      return true;
    }

    if (Array.isArray(value)) {
      if (value.length > MAX_CONTEXT_KEYS) {
        return false;
      }
      counter.keys += value.length;
      return counter.keys <= MAX_CONTEXT_KEYS && value.every((item) => this.isBoundedContext(item, depth + 1, counter));
    }

    const entries = Object.entries(value as Record<string, unknown>);
    counter.keys += entries.length;
    return counter.keys <= MAX_CONTEXT_KEYS && entries.every(([, item]) => this.isBoundedContext(item, depth + 1, counter));
  }
}

export class ChatRequestDto {
  @IsString()
  @Length(1, 20000)
  message: string;

  @IsOptional()
  @IsString()
  @Length(1, 256)
  sessionId?: string;

  @IsOptional()
  @IsObject()
  @Validate(BoundedChatContextConstraint)
  context?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Length(1, 256)
  @Matches(MODEL_ID_PATTERN)
  model?: string;
}

export class ChatResponseDto {
  success: boolean;
  response: string;
  sessionId: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

export class SessionDto {
  id: string;
  createdAt: Date;
  lastActiveAt: Date;
  messageCount: number;
}

export class HermesStatusDto {
  status: 'online' | 'offline' | 'error';
  version: string;
  activeSessions: number;
  model: string;
  provider: string;
}
