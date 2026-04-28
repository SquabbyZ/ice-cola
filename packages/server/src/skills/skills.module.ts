import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}