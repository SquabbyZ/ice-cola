import { IsEmail, IsString, IsArray, MinLength, MaxLength, Matches, Length } from 'class-validator';

export class SendCodeDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  captchaToken: string;

  @IsArray()
  @IsString({ each: true })
  captchaAnswer: string[];
}

export class VerifyCodeDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  @Length(6, 6, { message: '验证码必须是6位数字' })
  code: string;
}

export class ClientRegisterDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  @Length(6, 6, { message: '验证码必须是6位数字' })
  code: string;

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