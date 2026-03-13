import { User } from './user.types';
import { Consultation } from './consultation.types';

export enum AnalyseStatus {
  EN_ATTENTE = 'en_attente',
  EN_COURS = 'en_cours',
  TERMINEE = 'terminee',
}

export interface Analyse {
  id: string;
  consultationId: string;
  consultation?: Consultation;
  labId?: string;
  laboratoire?: User;
  description: string;
  status: AnalyseStatus;
  resultat?: string;
  resultatFileUrl?: string;
  pdfUrl?: string;
  dateResultat?: string;
  createdAt: string;
}
