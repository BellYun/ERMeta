import { IsString, IsOptional, IsNumberString } from 'class-validator';

export class EquipmentQueryDto {
  @IsNumberString()
  characterCode: string;

  @IsString()
  @IsOptional()
  tier?: string = 'DIAMOND';

  @IsString()
  @IsOptional()
  patchVersion?: string = '';

  @IsString()
  @IsOptional()
  mainCore?: string;

  @IsString()
  @IsOptional()
  bestWeapon?: string;
}

export class TraitsMainQueryDto {
  @IsNumberString()
  characterCode: string;

  @IsString()
  @IsOptional()
  tier?: string = 'DIAMOND';

  @IsString()
  @IsOptional()
  patchVersion?: string = '10.4';

  @IsString()
  @IsOptional()
  bestWeapon?: string;
}

export class TraitsOptionsQueryDto extends TraitsMainQueryDto {
  @IsString()
  @IsOptional()
  mainCore?: string;
}
