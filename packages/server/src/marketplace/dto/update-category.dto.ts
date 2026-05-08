import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { MarketplaceItemType } from './create-item.dto';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsEnum(MarketplaceItemType)
  @IsOptional()
  itemType?: MarketplaceItemType;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
