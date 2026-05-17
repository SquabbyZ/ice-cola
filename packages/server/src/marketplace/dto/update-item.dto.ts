import { Type } from 'class-transformer';
import { IsString, IsOptional, IsArray, IsObject, IsNumber, IsIn } from 'class-validator';

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  name?: string;

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

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsIn(['draft', 'pending_approval', 'approved', 'rejected', 'archived'])
  @IsOptional()
  status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
}
