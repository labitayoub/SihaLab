import { User } from './user.types';
import { Appointment } from './appointment.types';

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  patient?: User;
  doctor?: User;
  appointmentId?: string;
  appointment?: Appointment;
  date: string;
  motif: string;
  diagnostic?: string;
  notes?: string;
  createdAt: string;
}
