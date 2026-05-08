import { IsString, IsBoolean, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class CreateDefaultModelDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsOptional()
  @IsString()
  configId?: string;

  @IsString()
  @IsIn(['general', 'coding', 'creative', 'analysis'])
  useCase!: 'general' | 'coding' | 'creative' | 'analysis';

  @IsOptional()
  @IsBoolean()
  isSystemDefault?: boolean;
}

export class UpdateDefaultModelDto {
  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  configId?: string | null;

  @IsOptional()
  @IsBoolean()
  isSystemDefault?: boolean;
}
