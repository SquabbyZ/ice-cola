import { IsString, IsOptional } from 'class-validator';

export class RejectSubmissionDto {
  @IsString()
  @IsOptional()
  comment?: string;
}
