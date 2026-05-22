import { IsString, IsNumber, IsOptional, IsNotEmpty, IsArray, IsBoolean, Min } from 'class-validator';

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
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  rank?: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  costMultiplier?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  requiredPlanLevel?: number;

  @IsBoolean()
  @IsOptional()
  isCatalogVisible?: boolean;
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
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive';

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  rank?: number;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  costMultiplier?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  requiredPlanLevel?: number;

  @IsBoolean()
  @IsOptional()
  isCatalogVisible?: boolean;
}
