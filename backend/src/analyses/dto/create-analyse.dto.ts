import { IsUUID, IsString } from 'class-validator';

export class CreateAnalyseDto {
  @IsUUID()
  consultationId: string;

  @IsString()
  description: string;
}
