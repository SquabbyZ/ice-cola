import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';

export enum AdminRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class CreateInvitationDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsEnum(AdminRole, { message: '角色必须是 OWNER, ADMIN 或 MEMBER' })
  role: AdminRole;

  @IsString()
  @IsOptional()
  name?: string;
}

export class AcceptInvitationDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: '密码至少8位' })
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(2, { message: '名称至少2个字符' })
  @MaxLength(50)
  name: string;
}

export class RevokeInvitationDto {
  @IsString()
  id: string;
}

export class GetInvitationsDto {
  @IsOptional()
  @IsString()
  status?: string;
}