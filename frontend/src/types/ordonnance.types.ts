import { User } from './user.types';
import { Consultation } from './consultation.types';

export enum OrdonnanceStatus {
  EN_ATTENTE = 'en_attente',
  DELIVREE = 'delivree',
  ANNULEE = 'annulee',
}

export interface Medicament {
  nom: string;
  dosage: string;
  frequence: string;
  duree: string;
}

export interface Ordonnance {
  id: string;
  consultationId: string;
  consultation?: Consultation;
  pharmacienId?: string;
  pharmacien?: User;
  status: OrdonnanceStatus;
  medicaments: Medicament[];
  qrCode?: string;
  dateDelivrance?: string;
  createdAt: string;
}
