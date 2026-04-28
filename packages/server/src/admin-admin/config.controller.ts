import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from './config.service';

interface UpdateConfigDto {
  value: any;
}

@Controller('admin/config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  async getAllConfigs() {
    const configs = await this.configService.getAllConfigs();
    return {
      success: true,
      data: configs,
    };
  }

  @Get(':key')
  async getConfig(@Param('key') key: string) {
    const config = await this.configService.getConfig(key);
    return {
      success: true,
      data: config,
    };
  }

  @Put(':key')
  @UseGuards(AuthGuard('jwt'))
  async setConfig(@Param('key') key: string, @Body() dto: UpdateConfigDto) {
    const config = await this.configService.setConfig(key, dto.value);
    return {
      success: true,
      data: config,
    };
  }
}