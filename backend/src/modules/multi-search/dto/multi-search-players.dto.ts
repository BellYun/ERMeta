import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class MultiSearchPlayersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(16, { each: true })
  nicknames: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  seasonId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  matchingMode?: number;
}
