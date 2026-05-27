import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MarketplaceController } from './marketplace.controller';
import { ExpertsController } from './experts.controller';
import { ExtensionsController } from './extensions.controller';
import { MarketplaceService } from './marketplace.service';
import { SkillsSyncService } from './skills-sync.service';
import { DatabaseModule } from '../database/database.module';
import { AnyJwtAuthGuard } from '../auth/any-jwt-auth.guard';
import { getRequiredJwtSecret } from '../config/security-config';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: getRequiredJwtSecret(configService),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MarketplaceController, ExpertsController, ExtensionsController],
  providers: [MarketplaceService, SkillsSyncService, AnyJwtAuthGuard],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
