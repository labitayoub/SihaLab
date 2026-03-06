import { IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { DocumentType } from '../../common/enums/status.enum';

export class CreateDocumentDto {
  @IsUUID()
  patientId: string;

  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  fileName: string;

  @IsString()
  fileUrl: string;

  @IsString()
  mimeType: string;

  @IsString()
  @IsOptional()
  description?: string;
}
