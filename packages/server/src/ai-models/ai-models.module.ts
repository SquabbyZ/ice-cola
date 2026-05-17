import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { AiModelsController } from './ai-models.controller';
import { AiModelsService } from './ai-models.service';
import { EncryptionService } from './encryption.service';
import { AiApiClient } from './api-client';

@Module({
  imports: [DatabaseModule, HttpModule.register({ proxy: false }), JwtModule.register({})],
  controllers: [AiModelsController],
  providers: [AiModelsService, EncryptionService, AiApiClient],
  exports: [AiModelsService, EncryptionService],
})
export class AiModelsModule {}