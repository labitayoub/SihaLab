import { User } from './user.types';

export enum AppointmentStatus {
  EN_ATTENTE = 'en_attente',
  CONFIRME = 'confirme',
  TERMINE = 'termine',
  ANNULE = 'annule',
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
