import { IsUUID, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class MedicamentDto {
  nom: string;
  dosage: string;
  frequence: string;
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
