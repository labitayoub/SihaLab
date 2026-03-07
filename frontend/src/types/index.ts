export enum UserRole {
  ADMIN = 'admin',
  MEDECIN = 'medecin',
  PATIENT = 'patient',
  PHARMACIEN = 'pharmacien',
  LABORATOIRE = 'laboratoire',
  INFIRMIER = 'infirmier',
}

export enum AppointmentStatus {
  EN_ATTENTE = 'en_attente',
  CONFIRME = 'confirme',
  TERMINE = 'termine',
  ANNULE = 'annule',
}

export enum OrdonnanceStatus {
  EN_ATTENTE = 'en_attente',
  DELIVREE = 'delivree',
  ANNULEE = 'annulee',
}

export enum AnalyseStatus {
  EN_ATTENTE = 'en_attente',
  EN_COURS = 'en_cours',
  TERMINEE = 'terminee',
}

export enum LivraisonStatus {
  EN_PREPARATION = 'en_preparation',
  PRETE = 'prete',
  EN_COURS = 'en_cours',
  LIVREE = 'livree',
  ANNULEE = 'annulee',
  ECHEC = 'echec',
}

export enum DocumentType {
  ANALYSE = 'analyse',
  ORDONNANCE = 'ordonnance',
  CONSULTATION = 'consultation',
  AUTRE = 'autre',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  specialite?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  patient?: User;
  doctor?: User;
  date: string;
  time: string;
  status: AppointmentStatus;
  motif?: string;
  notes?: string;
  createdAt: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  patient?: User;
  doctor?: User;
  date: string;
  motif: string;
  diagnostic?: string;
  notes?: string;
  createdAt: string;
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
  dateResultat?: string;
  createdAt: string;
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

export interface Document {
  id: string;
  patientId: string;
  patient?: User;
  uploadedBy: string;
  uploader?: User;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  description?: string;
  createdAt: string;
}
