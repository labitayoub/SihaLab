import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Consultation } from './consultation.entity';
import { AnalyseStatus } from '../common/enums/status.enum';

@Entity('analyses')
export class Analyse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  consultationId: string;

  @Column('uuid', { nullable: true })
  labId: string;

  @ManyToOne(() => Consultation)
  @JoinColumn({ name: 'consultationId' })
  consultation: Consultation;

  @ManyToOne(() => User, { nullable: true })
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

  @Column({ type: 'timestamp', nullable: true })
  dateResultat: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
