import { IsArray, IsNotEmpty, ValidateNested, IsOptional, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class TestResultDto {
  @IsNotEmpty()
  @IsString()
  testName: string;

  @IsNotEmpty()
  @IsString()
  resultValue: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  normalRange?: string;

  @IsOptional()
  @IsBoolean()
  isAbnormal?: boolean;
}

export class UpdateAnalyseResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestResultDto)
  results: TestResultDto[];
}
