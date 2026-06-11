import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { MetaService } from './meta.service';
import { CacheControlInterceptor } from '../../common/interceptors/cache-control.interceptor';

export class HoneyPicksQueryDto {
  @IsString() @IsOptional() patchVersion?: string;
  @IsString() @IsOptional() tier?: string = 'DIAMOND';
}

@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('honey-picks')
  @UseInterceptors(CacheControlInterceptor('daily'))
  async getHoneyPicks(@Query() query: HoneyPicksQueryDto) {
    return this.metaService.getHoneyPicks(
      query.patchVersion,
      query.tier ?? 'DIAMOND',
    );
  }
}
