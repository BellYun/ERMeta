import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum TierGroup {
  DIAMOND = 'DIAMOND',
  DIAMOND_PLUS = 'DIAMOND_PLUS',
  METEORITE = 'METEORITE',
  METEORITE_PLUS = 'METEORITE_PLUS',
  MITHRIL = 'MITHRIL',
  MITHRIL_PLUS = 'MITHRIL_PLUS',
  IN1000 = 'IN1000',
  IN1000_PLUS = 'IN1000_PLUS',
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

export class CharacterInsightQueryDto extends CharacterStatsQueryDto {
  @IsString()
  @IsOptional()
  locale?: string;
}
