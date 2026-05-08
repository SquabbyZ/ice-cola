import { IsString, IsNumber, IsBoolean, IsOptional, IsNotEmpty, IsArray } from 'class-validator';

export class CreateModelConfigDto {
  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsString()
  @IsNotEmpty()
  configName!: string;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  maxTokens?: number;

  @IsNumber()
  @IsOptional()
  topP?: number;

  @IsNumber()
  @IsOptional()
  topK?: number;

  @IsNumber()
  @IsOptional()
  frequencyPenalty?: number;

  @IsNumber()
  @IsOptional()
  presencePenalty?: number;

  @IsArray()
  @IsOptional()
  stopSequences?: string[];

  @IsOptional()
  responseFormat?: { type: string };

  @IsOptional()
  extraParams?: Record<string, any>;
}

export class UpdateModelConfigDto {
  @IsString()
  @IsOptional()
  configName?: string;

  @IsNumber()
  @IsOptional()
  temperature?: number | null;

  @IsNumber()
  @IsOptional()
  maxTokens?: number | null;

  @IsNumber()
  @IsOptional()
  topP?: number | null;

  @IsNumber()
  @IsOptional()
  topK?: number | null;

  @IsNumber()
  @IsOptional()
  frequencyPenalty?: number | null;

  @IsNumber()
  @IsOptional()
  presencePenalty?: number | null;

  @IsArray()
  @IsOptional()
  stopSequences?: string[] | null;

  @IsOptional()
  responseFormat?: { type: string } | null;

  @IsOptional()
  extraParams?: Record<string, any> | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
