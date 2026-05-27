import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MarketplaceController } from './marketplace.controller';
import { ExpertsController } from './experts.controller';
import { ExtensionsController } from './extensions.controller';
import { MarketplaceService } from './marketplace.service';
import { SkillsSyncService } from './skills-sync.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [MarketplaceController, ExpertsController, ExtensionsController],
  providers: [MarketplaceService, SkillsSyncService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
