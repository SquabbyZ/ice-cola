import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin-admin/admin.module';
import { QuotaModule } from './quota/quota.module';
import { ConversationModule } from './conversation/conversation.module';
import { HermesModule } from './hermes/hermes.module';
import { GatewayModule } from './gateway/gateway.module';
import { HermesCoreModule } from './hermes-core/hermes-core.module';
import { ToolsModule } from './tools/tools.module';
import { SkillsModule } from './skills/skills.module';
import { WorkordersModule } from './workorders/workorders.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),

    DatabaseModule,
    AuthModule,
    AdminModule,
    QuotaModule,
    ConversationModule,
    HermesModule,
    GatewayModule,
    HermesCoreModule,
    ToolsModule,
    SkillsModule,
    WorkordersModule,
    TeamsModule,
  ],
})
export class AppModule {}