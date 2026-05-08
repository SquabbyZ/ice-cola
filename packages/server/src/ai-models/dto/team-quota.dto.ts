import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateTeamQuotaDto {
  @IsString()
  @IsNotEmpty()
  teamId!: string;

  @IsNumber()
  @IsOptional()
  dailyTokenLimit?: number;

  @IsNumber()
  @IsOptional()
  monthlyTokenLimit?: number;

  @IsNumber()
  @IsOptional()
  dailyRequestLimit?: number;

  @IsNumber()
  @IsOptional()
  monthlyRequestLimit?: number;
}

export class UpdateTeamQuotaDto {
  @IsNumber()
  @IsOptional()
  dailyTokenLimit?: number;

  @IsNumber()
  @IsOptional()
  monthlyTokenLimit?: number;

  @IsNumber()
  @IsOptional()
  dailyRequestLimit?: number;

  @IsNumber()
  @IsOptional()
  monthlyRequestLimit?: number;
}
