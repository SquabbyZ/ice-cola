import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlannerServiceImpl } from '../hermes-core/services/planner.service';
import { OrchestratorServiceImpl } from '../hermes-core/services/orchestrator.service';

@Controller('teams/:teamId/plans')
@UseGuards(JwtAuthGuard)
export class PlanController {
  constructor(
    private readonly plannerService: PlannerServiceImpl,
    private readonly orchestratorService: OrchestratorServiceImpl,
  ) {}

  /**
   * 创建任务计划
   */
  @Post()
  async createPlan(
    @Request() req,
    @Param('teamId') teamId: string,
    @Body() body: { input: string; conversationId?: string },
  ) {
    try {
      // 如果没有提供 conversationId，需要创建一个
      const conversationId = body.conversationId || 'temp_' + Date.now();
      
      const plan = await this.plannerService.plan(body.input, conversationId);

      return {
        success: true,
        data: {
          planId: plan.id,
          steps: plan.steps.map(step => ({
            id: step.id,
            order: step.order,
            description: step.description,
            toolName: step.toolName,
            status: step.status,
          })),
        },
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          error: `Failed to create plan: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 执行任务计划
   */
  @Post(':planId/execute')
  async executePlan(
    @Request() req,
    @Param('teamId') teamId: string,
    @Param('planId') planId: string,
  ) {
    try {
      const plan = await this.plannerService.getPlan(planId);

      if (!plan) {
        throw new HttpException(
          {
            success: false,
            error: 'Plan not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const executedPlan = await this.orchestratorService.executePlan(plan);

      return {
        success: true,
        data: {
          planId: executedPlan.id,
          status: executedPlan.status,
          results: executedPlan.steps.map(step => ({
            id: step.id,
            order: step.order,
            description: step.description,
            status: step.status,
            output: step.output,
            error: step.error,
          })),
        },
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          error: `Failed to execute plan: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 查询计划状态
   */
  @Get(':planId')
  async getPlanStatus(
    @Request() req,
    @Param('teamId') teamId: string,
    @Param('planId') planId: string,
  ) {
    try {
      const plan = await this.plannerService.getPlan(planId);

      if (!plan) {
        throw new HttpException(
          {
            success: false,
            error: 'Plan not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: {
          planId: plan.id,
          userInput: plan.userInput,
          status: plan.status,
          steps: plan.steps.map(step => ({
            id: step.id,
            order: step.order,
            description: step.description,
            toolName: step.toolName,
            status: step.status,
            output: step.output,
            error: step.error,
            executedAt: step.executedAt,
          })),
          createdAt: plan.createdAt,
        },
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          error: `Failed to get plan: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
