import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('doctor_schedules')
export class DoctorSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  doctorId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'doctorId' })
  doctor: User;

  /** 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi */
  @Column({ type: 'int' })
  dayOfWeek: number;

  /** 'morning' ou 'afternoon' */
  @Column({ type: 'varchar', default: 'morning' })
  period: string;

  /** Heure de début au format "HH:mm" */
  @Column({ type: 'time' })
  startTime: string;

  /** Heure de fin au format "HH:mm" */
  @Column({ type: 'time' })
  endTime: string;

  /** Durée d'un créneau en minutes (défaut 30) */
  @Column({ type: 'int', default: 30 })
  slotDuration: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
