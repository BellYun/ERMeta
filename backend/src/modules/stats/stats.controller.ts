import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { IsString, IsOptional, IsNumberString } from 'class-validator';
import { StatsService } from './stats.service';
import { CacheControlInterceptor } from '../../common/interceptors/cache-control.interceptor';

export class TriosQueryDto {
  @IsString() @IsOptional() sortBy?: string = 'averageRP';
  @IsNumberString() @IsOptional() limit?: string;
  @IsNumberString() @IsOptional() character1?: string;
  @IsNumberString() @IsOptional() character2?: string;
}

export class TriosWeaponQueryDto extends TriosQueryDto {
  @IsNumberString() @IsOptional() weapon1?: string;
  @IsNumberString() @IsOptional() weapon2?: string;
}

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('trios-weapon')
  @UseInterceptors(CacheControlInterceptor('slow'))
  async getTriosWeapon(@Query() query: TriosWeaponQueryDto): Promise<unknown> {
    return this.statsService.getTriosWeapon(
      (query.sortBy ?? 'averageRP') as 'averageRP' | 'winRate' | 'averageRank' | 'totalGames' | 'recommended',
      query.limit ? parseInt(query.limit, 10) : 100,
      query.character1 ? parseInt(query.character1, 10) : null,
      query.character2 ? parseInt(query.character2, 10) : null,
      query.weapon1 ? parseInt(query.weapon1, 10) : null,
      query.weapon2 ? parseInt(query.weapon2, 10) : null,
    );
  }
}
