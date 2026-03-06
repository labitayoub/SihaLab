import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from '../../common/enums/status.enum';

export class UpdateAppointmentDto {
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
