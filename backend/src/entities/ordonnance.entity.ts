import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Consultation } from './consultation.entity';
import { OrdonnanceStatus } from '../common/enums/status.enum';

@Entity('ordonnances')
export class Ordonnance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  consultationId: string;

  @Column('uuid', { nullable: true })
  pharmacienId: string;

  @ManyToOne(() => Consultation)
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'pharmacienId' })
  pharmacien: User;

  @Column({ type: 'enum', enum: OrdonnanceStatus, default: OrdonnanceStatus.EN_ATTENTE })
  status: OrdonnanceStatus;

  @Column({ type: 'jsonb' })
  medicaments: Array<{
    nom: string;
    dosage: string;
    frequence: string;
    duree: string;
  }>;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ nullable: true })
  pdfUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  dateDelivrance: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
