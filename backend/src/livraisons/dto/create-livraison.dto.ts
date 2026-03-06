import { IsUUID, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateLivraisonDto {
  @IsUUID()
  ordonnanceId: string;

  @IsString()
  adresseLivraison: string;

  @IsNumber()
  @IsOptional()
  fraisLivraison?: number;
}
