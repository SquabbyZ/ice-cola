import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ToolRegistryService } from './tool-registry.service';
import { ToolsController } from './tools.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getRequiredJwtSecret } from '../config/security-config';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: getRequiredJwtSecret(configService),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ToolsController],
  providers: [ToolRegistryService, JwtAuthGuard, RolesGuard],
  exports: [ToolRegistryService],
})
export class ToolsModule {}
