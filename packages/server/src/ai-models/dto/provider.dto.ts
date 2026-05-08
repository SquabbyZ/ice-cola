import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  websiteUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateProviderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string | null;

  @IsString()
  @IsOptional()
  websiteUrl?: string | null;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive';
}
