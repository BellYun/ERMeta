import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum TierGroup {
  DIAMOND = 'DIAMOND',
  METEORITE = 'METEORITE',
  MITHRIL = 'MITHRIL',
  IN1000 = 'IN1000',
}

export class RankingQueryDto {
  @IsString()
  @IsOptional()
  patchVersion?: string;

  @IsEnum(TierGroup)
  @IsOptional()
  tier?: TierGroup = TierGroup.DIAMOND;
}

export class CharacterStatsQueryDto {
  @IsString()
  @IsOptional()
  patchVersion?: string;

  @IsEnum(TierGroup)
  @IsOptional()
  tier?: TierGroup = TierGroup.DIAMOND;
}
