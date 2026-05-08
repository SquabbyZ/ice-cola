import { IsString, IsBoolean, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateEndpointDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  baseUrl!: string;

  @IsOptional()
  headers?: Record<string, string>;

  @IsOptional()
  @IsNumber()
  timeoutMs?: number;

  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateEndpointDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  headers?: Record<string, string> | null;

  @IsOptional()
  @IsNumber()
  timeoutMs?: number | null;

  @IsOptional()
  @IsNumber()
  retryCount?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
