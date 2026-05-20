import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
  controllers: [ConversationController],
  providers: [ConversationService, JwtAuthGuard],
  exports: [ConversationService],
})
export class ConversationModule {}
