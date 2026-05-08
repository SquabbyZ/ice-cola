import { IsString, IsNumber, IsOptional, IsNotEmpty, IsArray } from 'class-validator';

export class CreateModelDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsString()
  @IsNotEmpty()
  modelType!: 'chat' | 'vision' | 'embedding' | 'text';

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  contextWindow?: number;

  @IsNumber()
  @IsOptional()
  inputPricePer1m?: number;

  @IsNumber()
  @IsOptional()
  outputPricePer1m?: number;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @IsOptional()
  capabilities?: string[];

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateModelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsNumber()
  @IsOptional()
  contextWindow?: number | null;

  @IsNumber()
  @IsOptional()
  inputPricePer1m?: number | null;

  @IsNumber()
  @IsOptional()
  outputPricePer1m?: number | null;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @IsOptional()
  capabilities?: string[];

  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive';
}
