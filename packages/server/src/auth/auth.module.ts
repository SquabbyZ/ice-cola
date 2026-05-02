import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { ClientAuthController } from './client-auth.controller';
import { AuthService } from './auth.service';
import { ClientAuthService } from './client-auth.service';
import { CaptchaService } from '../commons/captcha.service';
import { EmailService } from '../commons/email.service';
import { JwtStrategy } from './jwt.strategy';
import { AdminModule } from '../admin-admin/admin.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    AdminModule,
  ],
  controllers: [AuthController, ClientAuthController],
  providers: [
    AuthService,
    ClientAuthService,
    CaptchaService,
    EmailService,
    JwtStrategy,
  ],
  exports: [AuthService, ClientAuthService],
})
export class AuthModule {}
