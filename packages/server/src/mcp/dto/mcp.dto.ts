import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, IsUrl } from 'class-validator';

export class CreateMCPServerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  version?: string = '1.0.0';

  @IsOptional()
  @IsString()
  author?: string;

  @IsEnum(['data', 'tool', 'communication', 'development', 'productivity'])
  category: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsUrl()
  homepage?: string;

  @IsOptional()
  @IsUrl()
  repository?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  configSchema?: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    default?: string;
  }>;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class UpdateMCPServerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsEnum(['data', 'tool', 'communication', 'development', 'productivity'])
  category?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsUrl()
  homepage?: string;

  @IsOptional()
  @IsUrl()
  repository?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  configSchema?: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    default?: string;
  }>;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsNumber()
  ratings?: number;

  @IsOptional()
  @IsNumber()
  installs?: number;
}

export class ConnectMCPServerDto {
  @IsString()
  serverId: string;

  @IsOptional()
  config?: Record<string, string>;
}

export class UpdateConnectionConfigDto {
  @IsString()
  config: Record<string, string>;
}

export type CreateMCPServerDtoType = CreateMCPServerDto;
export type UpdateMCPServerDtoType = UpdateMCPServerDto;
export type ConnectMCPServerDtoType = ConnectMCPServerDto;
export type UpdateConnectionConfigDtoType = UpdateConnectionConfigDto;