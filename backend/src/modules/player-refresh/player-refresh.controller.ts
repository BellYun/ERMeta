import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { PlayerRefreshRateLimitGuard } from './player-refresh-rate-limit.guard';
import { PlayerRefreshResponse, PlayerRefreshService } from './player-refresh.service';

@Controller('v1/players')
export class PlayerRefreshController {
  constructor(private readonly service: PlayerRefreshService) {}

  @Post(':nickname/refresh')
  @HttpCode(200)
  @RateLimit(5, 60)
  @UseGuards(PlayerRefreshRateLimitGuard)
  refresh(@Param('nickname') nickname: string, @Body() body: unknown): Promise<PlayerRefreshResponse> {
    return this.service.refresh(nickname, body);
  }
}
