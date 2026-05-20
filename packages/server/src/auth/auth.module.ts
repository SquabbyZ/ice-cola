import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { ClientAuthController } from './client-auth.controller';
import { AuthService } from './auth.service';
import { ClientAuthService } from './client-auth.service';
import { EmailService } from '../commons/email.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminModule } from '../admin-admin/admin.module';
import { getRequiredJwtSecret } from '../config/security-config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: getRequiredJwtSecret(configService),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => AdminModule),
  ],
  controllers: [AuthController, ClientAuthController],
  providers: [
    AuthService,
    ClientAuthService,
    EmailService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, ClientAuthService, JwtAuthGuard],
})
export class AuthModule {}
