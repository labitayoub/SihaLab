import { IsUUID, IsArray, ValidateNested } from 'class-validator';
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicamentDto)
  medicaments: MedicamentDto[];
}
