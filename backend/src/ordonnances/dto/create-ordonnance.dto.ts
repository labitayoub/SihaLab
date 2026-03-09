import { IsUUID, IsArray, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class MedicamentDto {
  @IsString()
  nom: string;

  @IsString()
  dosage: string;

  @IsString()
  frequence: string;

  @IsString()
  duree: string;
}

export class CreateOrdonnanceDto {
  @IsUUID()
  consultationId: string;

  @IsOptional()
  @IsUUID()
  pharmacienId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicamentDto)
  medicaments: MedicamentDto[];
}
