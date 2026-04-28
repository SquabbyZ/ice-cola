import { Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { GatewayGateway } from './gateway.gateway';
import { GatewayService } from './gateway.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    HttpModule,
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
  ],
  providers: [GatewayService, GatewayGateway],
  exports: [GatewayGateway, GatewayService],
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
