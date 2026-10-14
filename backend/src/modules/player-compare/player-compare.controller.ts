import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { RateLimit } from '../../common/guards/rate-limit.guard';
import { PlayerCompareResponse, PlayerCompareService } from './player-compare.service';

@Controller('v1/players')
export class PlayerCompareController {
  constructor(private readonly service: PlayerCompareService) {}

  @Post('compare')
  @HttpCode(200)
  @RateLimit(30, 60)
  compare(@Body() body: unknown): Promise<PlayerCompareResponse> {
    return this.service.compare(body);
  }
}
