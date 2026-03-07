export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorAvailability {
  date: string;
  dayOfWeek: number;
  hasSchedule: boolean;
  availableSlots: string[];
  bookedSlots: string[];
  schedule: {
    startTime: string;
    endTime: string;
    slotDuration: number;
  } | null;
}

export interface ScheduleFormEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

export const DAY_LABELS: Record<number, string> = {
  0: 'Dimanche',
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
};
