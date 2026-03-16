import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ConfirmPrescriptionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  servedBy: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  @Matches(/^[0-9+()\-\s]+$/)
  servedByPhone: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pharmacyNote?: string;
}
