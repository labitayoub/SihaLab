import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Consultation } from './consultation.entity';

export enum AnalyseStatus {
  EN_ATTENTE = 'en_attente',
  EN_COURS = 'en_cours',
  TERMINEE = 'terminee',
}

@Entity('analyses')
export class Analyse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  consultationId: string;

  @Column('uuid', { nullable: true })
  labId: string;

  @ManyToOne(() => Consultation, { eager: true })
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'labId' })
  laboratoire: User;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: AnalyseStatus, default: AnalyseStatus.EN_ATTENTE })
  status: AnalyseStatus;

  @Column({ type: 'text', nullable: true })
  resultat: string;

  @Column({ nullable: true })
  resultatFileUrl: string;

  @Column({ nullable: true })
  pdfUrl: string;

  @Column('simple-array', { nullable: true })
  uploadedFiles: string[];

  @Column({ type: 'timestamp', nullable: true })
  dateResultat: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
