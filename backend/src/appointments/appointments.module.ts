import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { Appointment } from '../entities/appointment.entity';
import { DoctorSchedule } from '../entities/doctor-schedule.entity';
import { SchedulesModule } from '../schedules/schedules.module';
import { ConsultationsModule } from '../consultations/consultations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, DoctorSchedule]),
    SchedulesModule,
    ConsultationsModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
