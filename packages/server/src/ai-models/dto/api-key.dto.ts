import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  providerId!: string;

  @IsString()
  @IsNotEmpty()
  keyName!: string;

  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class UpdateApiKeyStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  keyName?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  endpointUrl?: string;
}
