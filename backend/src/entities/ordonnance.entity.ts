import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Consultation } from './consultation.entity';

export enum OrdonnanceStatus {
  EN_ATTENTE = 'en_attente',
  DELIVREE = 'delivree',
  ANNULEE = 'annulee',
}

export enum OrdonnanceVerificationStatus {
  AVAILABLE = 'AVAILABLE',
  SERVED = 'SERVED',
}

@Entity('ordonnances')
export class Ordonnance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  consultationId: string;

  @Column('uuid', { nullable: true })
  pharmacienId: string;

  @ManyToOne(() => Consultation, { eager: true })
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'pharmacienId' })
  pharmacien: User;

  @Column({ type: 'enum', enum: OrdonnanceStatus, default: OrdonnanceStatus.EN_ATTENTE })
  status: OrdonnanceStatus;

  @Column({
    type: 'enum',
    enum: OrdonnanceVerificationStatus,
    default: OrdonnanceVerificationStatus.AVAILABLE,
  })
  verificationStatus: OrdonnanceVerificationStatus;

  @Column({ type: 'varchar', unique: true, nullable: true })
  verificationHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  servedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pharmacyNote: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  servedBy: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  servedByPhone: string | null;

  @Column({ type: 'jsonb' })
  medicaments: Array<{
    nom: string;
    dosage: string;
    frequence: string;
    duree: string;
  }>;

  @Column({ type: 'text', nullable: true })
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
