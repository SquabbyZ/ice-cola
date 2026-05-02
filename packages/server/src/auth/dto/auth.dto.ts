import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  @MinLength(8, { message: '密码至少8位' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: '密码必须包含大写字母' })
  @Matches(/[a-z]/, { message: '密码必须包含小写字母' })
  @Matches(/[0-9]/, { message: '密码必须包含数字' })
  password: string;

  @IsString()
  @MinLength(2, { message: '名称至少2个字符' })
  @MaxLength(50)
  name: string;
}

export class LoginDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: '密码至少8位' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: '密码必须包含大写字母' })
  @Matches(/[a-z]/, { message: '密码必须包含小写字母' })
  @Matches(/[0-9]/, { message: '密码必须包含数字' })
  newPassword: string;
}
