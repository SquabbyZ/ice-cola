import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { ConversationCapabilitiesController } from './conversation-capabilities.controller';
import { ConversationCapabilitiesService } from './conversation-capabilities.service';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  controllers: [ConversationCapabilitiesController],
  providers: [ConversationCapabilitiesService],
  exports: [ConversationCapabilitiesService],
})
export class ConversationCapabilitiesModule {}
