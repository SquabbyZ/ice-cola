import { IsString, IsOptional } from 'class-validator';

export class ApproveSubmissionDto {
  @IsString()
  @IsOptional()
  comment?: string;
}
