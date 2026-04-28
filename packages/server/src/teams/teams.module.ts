import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { DatabaseModule } from '../database/database.module';
import { EmailService } from '../commons/email.service';
import { ConfigService } from '../admin-admin/config.service';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({}),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, EmailService, ConfigService],
  exports: [TeamsService],
})
export class TeamsModule {}
