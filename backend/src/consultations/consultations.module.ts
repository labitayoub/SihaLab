import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { Consultation } from '../entities/consultation.entity';
import { Ordonnance } from '../entities/ordonnance.entity';
import { Analyse } from '../entities/analyse.entity';
import { Document } from '../entities/document.entity';
import { Appointment } from '../entities/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Consultation, Ordonnance, Analyse, Document, Appointment])],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
