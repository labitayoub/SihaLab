import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { Consultation } from '../entities/consultation.entity';
import { Ordonnance } from '../entities/ordonnance.entity';
import { Analyse } from '../entities/analyse.entity';
import { Document } from '../entities/document.entity';
import { Appointment } from '../entities/appointment.entity';
import { PdfGeneratorService } from './pdf-generator.service';
import { MinioModule } from '../common/minio/minio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consultation, Ordonnance, Analyse, Document, Appointment]),
    MinioModule,
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, PdfGeneratorService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
