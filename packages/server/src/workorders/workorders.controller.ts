import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { WorkordersService } from './workorders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams/:teamId/workorders')
@UseGuards(JwtAuthGuard)
export class WorkordersController {
  constructor(private readonly workordersService: WorkordersService) {}

  @Post()
  async create(
    @Param('teamId') teamId: string,
    @Request() req: any,
    @Body() body: { type: string; targetId: string; targetName: string; targetIcon?: string; note?: string; visibilityScope?: any },
  ) {
    const result = await this.workordersService.create({
      type: body.type,
      targetId: body.targetId,
      targetName: body.targetName,
      targetIcon: body.targetIcon,
      applicantId: req.user.id,
      applicantName: req.user.name || req.user.email || 'Unknown',
      teamId,
      note: body.note,
      visibilityScope: body.visibilityScope,
    });
    return { success: true, data: result };
  }

  @Get()
  async findAll(@Param('teamId') teamId: string) {
    const result = await this.workordersService.findAll(teamId);
    return { success: true, data: result };
  }

  @Get('history')
  async findHistory(@Param('teamId') teamId: string) {
    const result = await this.workordersService.findHistory(teamId);
    return { success: true, data: result };
  }
}

@Controller('workorders')
@UseGuards(JwtAuthGuard)
export class WorkorderActionsController {
  constructor(private readonly workordersService: WorkordersService) {}

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { comment?: string },
  ) {
    const result = await this.workordersService.approve(id, req.user.id, body.comment);
    return { success: true, data: result };
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { comment: string },
  ) {
    const result = await this.workordersService.reject(id, req.user.id, body.comment);
    return { success: true, data: result };
  }

  @Post('batch-approve')
  async batchApprove(
    @Request() req: any,
    @Body() body: { ids: string[]; comment?: string },
  ) {
    const result = await this.workordersService.batchApprove(body.ids, req.user.id, body.comment);
    return { success: true, data: result };
  }

  @Post('batch-reject')
  async batchReject(
    @Request() req: any,
    @Body() body: { ids: string[]; comment: string },
  ) {
    const result = await this.workordersService.batchReject(body.ids, req.user.id, body.comment);
    return { success: true, data: result };
  }
}
