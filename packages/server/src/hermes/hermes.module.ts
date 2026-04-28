import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HermesService } from './hermes.service';
import { HermesController } from './hermes.controller';
import { PlanController } from './plan.controller';
import { QuotaModule } from '../quota/quota.module';
import { ConversationModule } from '../conversation/conversation.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HermesCoreModule } from '../hermes-core/hermes-core.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    QuotaModule,
    ConversationModule,
    HermesCoreModule,
  ],
  controllers: [HermesController, PlanController],
  providers: [HermesService, JwtAuthGuard],
  exports: [HermesService],
})
export class HermesModule {}
