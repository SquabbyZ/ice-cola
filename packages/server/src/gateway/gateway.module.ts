import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { GatewayGateway } from './gateway.gateway';
import { GatewayService } from './gateway.service';
import { GatewayConnectionService } from './gateway-connection.service';
import { GatewayUsageService } from './gateway-usage.service';
import { GatewayProviderResolutionService } from './gateway-provider-resolution.service';
import { DatabaseModule } from '../database/database.module';
import { AiModelsModule } from '../ai-models/ai-models.module';
import { getRequiredJwtSecret } from '../config/security-config';
import { QuotaModule } from '../quota/quota.module';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [
    DatabaseModule,
    HttpModule.register({
      proxy: false,
    }),
    AiModelsModule,
    QuotaModule,
    SkillsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: getRequiredJwtSecret(configService),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [GatewayService, GatewayConnectionService, GatewayUsageService, GatewayProviderResolutionService, GatewayGateway],
  exports: [GatewayGateway, GatewayService, GatewayConnectionService, GatewayUsageService, GatewayProviderResolutionService],
})
export class GatewayModule implements OnModuleInit {
  constructor(
    private gatewayService: GatewayService,
    private gatewayGateway: GatewayGateway,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const wsPort = this.configService.get<number>('WS_PORT', 3001);
    await this.gatewayGateway.initialize(wsPort, this.gatewayService);
  }
}
