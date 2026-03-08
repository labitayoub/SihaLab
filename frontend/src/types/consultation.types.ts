import { User } from './user.types';
import { Appointment } from './appointment.types';

export type ConsultationStatus = 'en_cours' | 'terminee' | 'annulee';

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  patient?: User;
  doctor?: User;
  appointmentId?: string;
  appointment?: Appointment;
  date: string;
  status?: ConsultationStatus;
  motif: string;
  diagnostic?: string;
  notes?: string;
  examenClinique?: any;
  ordonnancePdfUrl?: string;
  analysePdfUrl?: string;
  createdAt: string;
}
