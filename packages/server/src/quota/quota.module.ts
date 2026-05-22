import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QuotaController } from './quota.controller';
import { ModelCatalogController } from './model-catalog.controller';
import { AdminLingqiController } from './admin-lingqi.controller';
import { QuotaService } from './quota.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../common/guards/admin-roles.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRequiredJwtSecret } from '../config/security-config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: getRequiredJwtSecret(configService),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [QuotaController, ModelCatalogController, AdminLingqiController],
  providers: [QuotaService, JwtAuthGuard, AdminJwtAuthGuard, AdminRolesGuard],
  exports: [QuotaService],
})
export class QuotaModule {}
