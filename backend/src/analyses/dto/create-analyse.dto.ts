import { IsUUID, IsString, IsOptional } from 'class-validator';

export class CreateAnalyseDto {
  @IsUUID()
  consultationId: string;

  @IsOptional()
  @IsUUID()
  labId?: string;

  @IsString()
  description: string;
}
