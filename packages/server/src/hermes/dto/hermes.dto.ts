import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

export class ChatRequestDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsString()
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
