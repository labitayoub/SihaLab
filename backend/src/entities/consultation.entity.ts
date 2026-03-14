import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Appointment } from './appointment.entity';
import { Ordonnance } from './ordonnance.entity';
import { Analyse } from './analyse.entity';
import { ConsultationStatus } from '../common/enums/status.enum';

@Entity('consultations')
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  patientId: string;

  @Column('uuid')
  doctorId: string;

  @Column('uuid', { nullable: true })
  appointmentId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  @ManyToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @OneToMany(() => Ordonnance, (ordonnance) => ordonnance.consultation)
  ordonnances: Ordonnance[];

  @OneToMany(() => Analyse, (analyse) => analyse.consultation)
  analyses: Analyse[];

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'enum', enum: ConsultationStatus, default: ConsultationStatus.EN_COURS })
  status: ConsultationStatus;

  @Column({ type: 'text' })
  motif: string;

  @Column({ type: 'text', nullable: true })
  diagnostic: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  examenClinique: any;

  @Column({ nullable: true })
  ordonnancePdfUrl: string;

  @Column({ nullable: true })
  analysePdfUrl: string;

  @Column('jsonb', { nullable: true })
  uploadedFiles: { name: string; url: string }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
