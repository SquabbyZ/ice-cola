import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateUsageLogDto {
  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsNumber()
  @IsOptional()
  inputTokens?: number;

  @IsNumber()
  @IsOptional()
  outputTokens?: number;

  @IsNumber()
  @IsOptional()
  totalTokens?: number;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsNumber()
  @IsOptional()
  latencyMs?: number;

  @IsString()
  @IsOptional()
  endpoint?: string;

  @IsOptional()
  modelParams?: Record<string, any>;

  @IsString()
  @IsOptional()
  responseId?: string;

  @IsString()
  @IsOptional()
  status?: 'success' | 'error' | 'rate_limited';

  @IsString()
  @IsOptional()
  errorMessage?: string;
}
