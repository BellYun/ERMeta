import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { PatchesService } from './patches.service';
import { CacheControlInterceptor } from '../../common/interceptors/cache-control.interceptor';

@Controller('patches')
export class PatchesController {
  constructor(private readonly patchesService: PatchesService) {}

  @Get('history')
  @UseInterceptors(CacheControlInterceptor('slow'))
  async getHistory(
    @Query('limit') limit?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.patchesService.getPatchHistory(
      Math.min(Number(limit ?? '10'), 50),
      includeInactive === 'true',
    );
  }
}
