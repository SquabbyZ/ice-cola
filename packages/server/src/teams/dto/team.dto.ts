import { IsString, IsOptional, IsArray, IsEmail, IsEnum } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name: string;
}

export class UpdateTeamDto {
  @IsString()
  @IsOptional()
  name?: string;
}

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(['OWNER', 'ADMIN', 'MEMBER'])
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export class UpdateMemberRoleDto {
  @IsEnum(['OWNER', 'ADMIN', 'MEMBER'])
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(['OWNER', 'ADMIN', 'MEMBER'])
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}
