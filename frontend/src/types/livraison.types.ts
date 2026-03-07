import { User } from './user.types';
import { Ordonnance } from './ordonnance.types';

export enum LivraisonStatus {
  EN_PREPARATION = 'en_preparation',
  PRETE = 'prete',
  EN_COURS = 'en_cours',
  LIVREE = 'livree',
  ANNULEE = 'annulee',
  ECHEC = 'echec',
}

export interface Livraison {
  id: string;
  ordonnanceId: string;
  ordonnance?: Ordonnance;
  pharmacieId: string;
  pharmacie?: User;
  patientId: string;
  patient?: User;
  codeSuivi: string;
  statut: LivraisonStatus;
  adresseLivraison: string;
  fraisLivraison: number;
  livreurNom?: string;
  livreurTelephone?: string;
  dateLivraison?: string;
  createdAt: string;
}
