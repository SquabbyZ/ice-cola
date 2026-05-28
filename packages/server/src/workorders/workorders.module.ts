import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WorkordersController, WorkorderActionsController } from './workorders.controller';
import { WorkordersService } from './workorders.service';
import { DatabaseModule } from '../database/database.module';
import { SkillsModule } from '../skills/skills.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';

@Module({
  imports: [DatabaseModule, JwtModule.register({}), SkillsModule, MarketplaceModule],
  controllers: [WorkordersController, WorkorderActionsController],
  providers: [WorkordersService],
  exports: [WorkordersService],
})
export class WorkordersModule {}
