import { IsInt, IsString, IsOptional, IsBoolean, Min, Max, Matches } from 'class-validator';

export class CreateScheduleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm format' })
  endTime: string;

  @IsInt()
  @Min(10)
  @Max(120)
  @IsOptional()
  slotDuration?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
