import { IsUUID, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateConsultationDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @IsString()
  motif: string;

  @IsString()
  @IsOptional()
  diagnostic?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsObject()
  @IsOptional()
  examenClinique?: any;
}
