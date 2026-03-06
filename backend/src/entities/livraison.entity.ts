import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Ordonnance } from './ordonnance.entity';

export enum LivraisonStatus {
  EN_PREPARATION = 'en_preparation',
  PRETE = 'prete',
  EN_COURS = 'en_cours',
  LIVREE = 'livree',
  ANNULEE = 'annulee',
  ECHEC = 'echec',
}

@Entity('livraisons')
export class Livraison {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ordonnanceId: string;

  @Column('uuid')
  pharmacieId: string;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Ordonnance, { eager: true })
  @JoinColumn({ name: 'ordonnanceId' })
  ordonnance: Ordonnance;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'pharmacieId' })
  pharmacie: User;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'patientId' })
  patient: User;

  @Column({ unique: true })
  codeSuivi: string;

  @Column({ type: 'enum', enum: LivraisonStatus, default: LivraisonStatus.EN_PREPARATION })
  statut: LivraisonStatus;

  @Column()
  adresseLivraison: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fraisLivraison: number;

  @Column({ nullable: true })
  livreurNom: string;

  @Column({ nullable: true })
  livreurTelephone: string;

  @Column({ type: 'timestamp', nullable: true })
  dateLivraison: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('livraison_historique')
export class LivraisonHistorique {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  livraisonId: string;

  @ManyToOne(() => Livraison)
  @JoinColumn({ name: 'livraisonId' })
  livraison: Livraison;

  @Column({ type: 'enum', enum: LivraisonStatus })
  statut: LivraisonStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
