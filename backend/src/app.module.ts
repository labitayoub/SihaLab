import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { OrdonnancesModule } from './ordonnances/ordonnances.module';
import { AnalysesModule } from './analyses/analyses.module';
import { LivraisonsModule } from './livraisons/livraisons.module';
import { DocumentsModule } from './documents/documents.module';
import { User } from './entities/user.entity';
import { Appointment } from './entities/appointment.entity';
import { Consultation } from './entities/consultation.entity';
import { Ordonnance } from './entities/ordonnance.entity';
import { Analyse } from './entities/analyse.entity';
import { Livraison, LivraisonHistorique } from './entities/livraison.entity';
import { Document } from './entities/document.entity';
import { DoctorSchedule } from './entities/doctor-schedule.entity';
import { SchedulesModule } from './schedules/schedules.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'sihatilab'),
        entities: [User, Appointment, Consultation, Ordonnance, Analyse, Livraison, LivraisonHistorique, Document, DoctorSchedule],
        synchronize: true, // false en production
        logging: false,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    AuthModule,
    UsersModule,
    AppointmentsModule,
    ConsultationsModule,
    OrdonnancesModule,
    AnalysesModule,
    LivraisonsModule,
    DocumentsModule,
    SchedulesModule,
  ],
})
export class AppModule {}
