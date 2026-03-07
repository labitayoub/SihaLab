export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  period: 'morning' | 'afternoon';
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodScheduleInfo {
  startTime: string;
  endTime: string;
  slotDuration: number;
}

export interface DoctorAvailability {
  date: string;
  dayOfWeek: number;
  hasSchedule: boolean;
  availableSlots: string[];
  bookedSlots: string[];
  morningSlots: string[];
  afternoonSlots: string[];
  schedule: {
    morning: PeriodScheduleInfo | null;
    afternoon: PeriodScheduleInfo | null;
  } | null;
}

export interface DayScheduleForm {
  dayOfWeek: number;
  isActive: boolean;
  morningActive: boolean;
  morningStart: string;
  morningEnd: string;
  afternoonActive: boolean;
  afternoonStart: string;
  afternoonEnd: string;
  slotDuration: number;
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
