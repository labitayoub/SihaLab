import { User } from './user.types';

export enum DocumentType {
  ANALYSE = 'analyse',
  ORDONNANCE = 'ordonnance',
  CONSULTATION = 'consultation',
  AUTRE = 'autre',
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
