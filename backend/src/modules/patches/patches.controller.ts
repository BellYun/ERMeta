import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { PatchesService } from './patches.service';
import { CacheControlInterceptor } from '../../common/interceptors/cache-control.interceptor';

@Controller('patches')
export class PatchesController {
  constructor(private readonly patchesService: PatchesService) {}

  @Get('history')
  @UseInterceptors(CacheControlInterceptor('slow'))
  async getHistory(
    @Query('limit') limit?: number,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    const patches = await this.patchesService.getPatchHistory(
      limit ?? 50,
      includeInactive ?? false,
    );
    return { patches };
  }
}
