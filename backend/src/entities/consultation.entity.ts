import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Appointment } from './appointment.entity';
import { Ordonnance } from './ordonnance.entity';
import { Analyse } from './analyse.entity';

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

  @Column({ type: 'text' })
  motif: string;

  @Column({ type: 'text', nullable: true })
  diagnostic: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  examenClinique: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
