import { IsOptional, IsEnum, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { MarketplaceItemType } from './create-item.dto';

export enum MarketplaceItemStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export class QueryItemsDto {
  @IsEnum(MarketplaceItemType)
  @IsOptional()
  type?: MarketplaceItemType;

  @IsEnum(MarketplaceItemStatus)
  @IsOptional()
  status?: MarketplaceItemStatus;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}
