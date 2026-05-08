import { IsString, IsOptional, IsArray, IsObject, IsEnum, IsNumber } from 'class-validator';

export enum MarketplaceItemType {
  SKILL = 'skill',
  MCP = 'mcp',
  PLUGIN = 'plugin',
}

export class CreateItemDto {
  @IsEnum(MarketplaceItemType)
  type: MarketplaceItemType;

  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  sourceId?: string;
}
