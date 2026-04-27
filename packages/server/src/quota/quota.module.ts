import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [QuotaController],
  providers: [QuotaService, JwtAuthGuard],
  exports: [QuotaService],
})
export class QuotaModule {}
