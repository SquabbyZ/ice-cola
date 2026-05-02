import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService as NestConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { EmailTemplateController } from './email-template.controller';
import { EmailTemplateService } from '../commons/email-template.service';
import { CaptchaService } from '../commons/captcha.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: NestConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [NestConfigService],
    }),
  ],
  controllers: [AdminController, ConfigController, EmailTemplateController],
  providers: [AdminService, ConfigService, EmailTemplateService, CaptchaService],
  exports: [AdminService, ConfigService, EmailTemplateService],
})
export class AdminModule {}