import { Consultation } from './consultation.types';
import { Ordonnance } from './ordonnance.types';
import { Analyse } from './analyse.types';
import { Document } from './document.types';

export interface DossierStats {
  totalConsultations: number;
  totalOrdonnances: number;
  totalAnalyses: number;
  totalDocuments: number;
  ordonnancesEnAttente: number;
  analysesEnAttente: number;
  analysesTerminees: number;
  derniereConsultation: string | null;
}

export interface ConsultationWithDetails extends Consultation {
  ordonnances?: Ordonnance[];
  analyses?: Analyse[];
}

export interface DossierMedical {
  patientId: string;
  stats: DossierStats;
  consultations: ConsultationWithDetails[];
  ordonnances: Ordonnance[];
  analyses: Analyse[];
  documents: Document[];
}
