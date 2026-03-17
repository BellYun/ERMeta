import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { BuildsService } from './builds.service';
import { EquipmentQueryDto, TraitsMainQueryDto, TraitsOptionsQueryDto } from './dto/builds-query.dto';
import { CacheControlInterceptor } from '../../common/interceptors/cache-control.interceptor';

@Controller('builds')
export class BuildsController {
  constructor(private readonly buildsService: BuildsService) {}

  @Get('equipment')
  @UseInterceptors(CacheControlInterceptor('daily'))
  async getEquipment(@Query() query: EquipmentQueryDto) {
    return this.buildsService.getEquipmentBuilds(
      parseInt(query.characterCode, 10),
      query.tier ?? 'DIAMOND',
      query.patchVersion ?? '',
      query.mainCore,
      query.bestWeapon,
    );
  }

  @Get('traits/main')
  @UseInterceptors(CacheControlInterceptor('daily'))
  async getTraitsMain(@Query() query: TraitsMainQueryDto) {
    return this.buildsService.getTraitsMain(
      parseInt(query.characterCode, 10),
      query.tier ?? 'DIAMOND',
      query.patchVersion ?? '10.4',
      query.bestWeapon,
    );
  }

  @Get('traits/options')
  @UseInterceptors(CacheControlInterceptor('daily'))
  async getTraitsOptions(@Query() query: TraitsOptionsQueryDto) {
    return this.buildsService.getTraitsOptions(
      parseInt(query.characterCode, 10),
      query.tier ?? 'DIAMOND',
      query.patchVersion ?? '10.4',
      query.bestWeapon,
      query.mainCore,
    );
  }
}
